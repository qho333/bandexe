const $ = (s) => document.querySelector(s);
const echo = $("#echo"), stateEl = $("#state");
let mouth = $("#mouth");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const LOG = { chat: "#log", kids: "#kidsLog", test: "#testLog" };
let mode = "chat", voice = "bf_emma", live = false, busy = false, history = [], session = 0;
const words = { chat: true, kids: true, test: false };   // mock test hides words by default, like the real exam

// ---------- tabs, show-words ----------
document.querySelectorAll(".tabs button").forEach((b) => b.onclick = () => setMode(b.dataset.mode));
$("#showWords").onchange = (e) => { words[mode] = e.target.checked; applyWords(); };
function applyWords() { $("#showWords").checked = words[mode]; $("#right").classList.toggle("words-off", !words[mode]); }
function setMode(m) {
  endLive(); mode = m; history = [];
  document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.mode === m));
  $(".tabs").dataset.current = m;
  document.body.classList.toggle("kids", m === "kids");
  $("#chatView").hidden = m !== "chat"; $("#kidsView").hidden = m !== "kids"; $("#testView").hidden = m !== "test";
  const view = $("#" + m + "View"); view.classList.remove("panel-in"); void view.offsetWidth; view.classList.add("panel-in");
  $("#stars").hidden = m !== "kids";
  $("#modeLabel").textContent = { chat: "chat partner", kids: "kids buddy · ages 6–12", test: "examiner" }[m];
  $("#rightTitle").textContent = { chat: "Conversation", kids: "Let's make sentences", test: "IELTS Speaking · mock test" }[m];
  $("#micHint").textContent = m === "kids" ? "Ask a grown-up first. Tap once and talk with Echo!"
    : m === "test" ? "Tap once to start the test. The examiner asks, you answer. No feedback until the end."
    : "Tap once and just talk. Echo listens, answers, then listens again. Tap again to stop.";
  $(LOG[m]).innerHTML = ""; $("#cue").hidden = $("#timers").hidden = true; setPart(0);
  applyWords();
}

// ---------- robot states ----------
function setState(s, label) {
  echo.classList.remove("listening", "thinking", "speaking");
  if (s !== "idle") echo.classList.add(s);
  stateEl.classList.toggle("on", s === "listening");
  stateEl.querySelector("span").textContent = label || s;
}
(function blinkLoop() {
  if (!reduced) { echo.classList.add("blink"); setTimeout(() => echo.classList.remove("blink"), 160); }
  setTimeout(blinkLoop, 2500 + Math.random() * 2500);
})();

// ---------- audio + lip sync (mouth computed from the audio actually playing) ----------
let ctx, analyser, timeBuf, freqBuf, raf, open = 0, wide = 0.3, peak = 0.08, floor = 0, playing = null;
function ensureAudio() {
  if (ctx) return;
  ctx = new AudioContext();
  analyser = ctx.createAnalyser(); analyser.fftSize = 1024; analyser.smoothingTimeConstant = 0.2;
  analyser.connect(ctx.destination);
  timeBuf = new Float32Array(analyser.fftSize); freqBuf = new Float32Array(analyser.frequencyBinCount);
}
function bandEnergy(lo, hi) {
  const hz = ctx.sampleRate / analyser.fftSize; let e = 0;
  for (let i = Math.floor(lo / hz); i <= Math.ceil(hi / hz); i++) e += Math.pow(10, freqBuf[i] / 10);
  return e;
}
// Where the talking mouth sits. Echo's own face by default; wearSkin() moves it for a coach skin.
const MOUTH = { x: 32, y: 44, s: 1, rest: "M29 43.5 Q32 45.5 35 43.5", smile: null, beak: null };
function drawMouth(o, w) {
  if (o < 0.08) { mouth.setAttribute("d", MOUTH.rest); MOUTH.smile?.classList.remove("talk-hide"); echo.classList.remove("talking"); return; }
  MOUTH.smile?.classList.add("talk-hide"); echo.classList.add("talking");   // a skin's own smile hides while the open mouth talks
  const cx = MOUTH.x, cy = MOUTH.y, hw = (2.6 + 4.2 * w + 1.2 * o) * MOUTH.s, hh = (0.8 + 5.2 * o * (1 - 0.45 * w)) * MOUTH.s, k = 0.55;
  mouth.setAttribute("d",
    `M${cx - hw} ${cy} C${cx - hw} ${cy - hh * k * 1.6} ${cx - hw * k} ${cy - hh} ${cx} ${cy - hh * 0.9}` +
    ` C${cx + hw * k} ${cy - hh} ${cx + hw} ${cy - hh * k * 1.6} ${cx + hw} ${cy}` +
    ` C${cx + hw} ${cy + hh * k * 1.8} ${cx + hw * k} ${cy + hh * 1.15} ${cx} ${cy + hh * 1.15}` +
    ` C${cx - hw * k} ${cy + hh * 1.15} ${cx - hw} ${cy + hh * k * 1.8} ${cx - hw} ${cy} Z`);
}
function waves(a) {   // only Echo's own art has signal waves
  ["#w1", "#w3"].forEach((s) => { const e = $(s); if (e) e.style.opacity = a; });
  ["#w2", "#w4"].forEach((s) => { const e = $(s); if (e) e.style.opacity = Math.max(0, a - 0.35); });
}
function frame() {
  analyser.getFloatTimeDomainData(timeBuf); analyser.getFloatFrequencyData(freqBuf);
  let sum = 0; for (const v of timeBuf) sum += v * v;
  const rms = Math.sqrt(sum / timeBuf.length);
  // Syllable-level envelope: auto gain against a slow peak plus a fast floor, so the mouth
  // shuts in the dips between syllables and words, not only at the end of a sentence.
  peak = Math.max(peak * 0.995, rms, 0.03);
  floor = rms < floor ? rms : floor + (rms - floor) * 0.04;
  const target = Math.min(1, Math.max(0, (rms - floor - 0.15 * peak) / (0.6 * peak)));
  open += (target - open) * (target > open ? 0.7 : 0.5);
  const lo = bandEnergy(250, 1000), hi = bandEnergy(1800, 5000);
  wide += ((hi / (lo + hi + 1e-12)) - wide) * 0.3;
  if (reduced) { const t = open > 0.1; mouth.setAttribute("d", t ? `M${MOUTH.x - 4 * MOUTH.s} ${MOUTH.y - 1} H${MOUTH.x + 4 * MOUTH.s}` : MOUTH.rest); MOUTH.smile?.classList.toggle("talk-hide", t); }
  else {
    drawMouth(open, Math.min(1, wide * 1.6)); waves(Math.min(1, open * 1.4)); $("#bodyG").style.transform = `translateY(${-open * 0.6}px)`;
    if (MOUTH.beak) MOUTH.beak.style.transform = `translateY(${open * 1.4}px) scaleY(${1 + open * 0.45})`;   // beak skins talk with the beak
  }
  raf = requestAnimationFrame(frame);
}
function rest() { cancelAnimationFrame(raf); open = 0; drawMouth(0, 0); waves(0); $("#bodyG").style.transform = ""; if (MOUTH.beak) MOUTH.beak.style.transform = ""; }

// ---------- coach skins: the skin applied in Collection is also Echo's look (called by boot.js) ----------
function wearSkin(svgText) {
  const t = document.createElement("template"); t.innerHTML = svgText;   // HTML parsing gives real SVG elements (the art has no xmlns)
  const src = t.content.querySelector("svg");
  if (!src || !src.querySelector(".m-eyes")) return false;
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.id = "bodyG"; g.setAttribute("class", "body-g");
  g.append(...[...src.childNodes].map((n) => document.importNode(n, true)));
  mouth = document.createElementNS("http://www.w3.org/2000/svg", "path");
  mouth.id = "mouth"; mouth.setAttribute("class", "mouth"); g.append(mouth);
  echo.replaceChildren(g); echo.setAttribute("viewBox", "-4 -2 72 68"); echo.classList.add("skin", "mascot");
  echo.dataset.mascot = src.getAttribute("data-mascot") || "";
  placeMouth();
  return true;
}
function placeMouth() {
  // Find each skin's face from its own drawing: the eyes, then a smile or beak just below them.
  const eyesG = echo.querySelector(".m-eyes"); if (!eyesG) return;
  const e = eyesG.getBBox(); if (!e.width) { MOUTH.pending = true; return; }   // hidden: measure on next speak
  MOUTH.pending = false;
  const pupils = [...eyesG.querySelectorAll(".m-eye")].map((el) => { const b = el.getBBox(); return b.x + b.width / 2; });
  const ex = e.x + e.width / 2, eb = e.y + e.height;
  MOUTH.s = Math.min(1.3, Math.max(0.6, (pupils.length > 1 ? Math.abs(pupils[1] - pupils[0]) : 14) / 14));
  // Skip special-move parts (Sandy's falling grain, Cert's ribbon): they are not faces.
  const near = [...echo.querySelectorAll(".m-face, .m-tip")].filter((el) => !el.closest(".m-eyes") && !/\bsx-/.test(el.getAttribute("class") || "")).map((el) => ({ el, b: el.getBBox() }))
    .filter(({ b }) => Math.abs(b.x + b.width / 2 - ex) < 4 && b.y >= eb - 1 && b.y <= eb + 14 && b.width <= (b.height < 1 ? 2 * e.width : e.width + 2));   // flat lines (Scan's slot) may be wider
  const smile = near.find(({ el }) => el.classList.contains("m-face")), beak = !smile && near.find(({ el }) => el.classList.contains("m-tip"));
  MOUTH.smile = smile ? smile.el : null; MOUTH.beak = beak ? beak.el : null;
  if (smile) {   // a special-move part riding on the smile (Scan's beam) hides with it
    const sb = smile.b, rider = [...echo.querySelectorAll("[class*='sx-']")].find((el) => { const b = el.getBBox(); return Math.abs(b.y - sb.y) < 3 && b.x >= sb.x - 1 && b.x + b.width <= sb.x + sb.width + 1; });
    rider?.classList.add("talk-rider");
  }
  if (beak) beak.el.classList.add("talk-beak");
  MOUTH.x = smile ? smile.b.x + smile.b.width / 2 : ex;
  MOUTH.y = smile ? smile.b.y + smile.b.height / 2 : beak ? beak.b.y + beak.b.height + 2 * MOUTH.s : eb + 5.5 * MOUTH.s;
  eyesG.parentNode.append(mouth);   // same group as the eyes, so special moves (flip, swivel) carry the mouth too
  MOUTH.rest = "";   // at rest a skin shows its own face
  mouth.style.display = beak ? "none" : "";
}
function playBuffer(buf) {
  return new Promise((res) => {
    const src = ctx.createBufferSource(); src.buffer = buf; src.connect(analyser);
    playing = src; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    src.onended = () => { if (playing === src) playing = null; res(); };
    src.start();
  });
}
function stopSpeech() { if (playing) { const p = playing; playing = null; try { p.stop(); } catch {} } speechSynthesis.cancel(); rest(); }

// ---------- live voice: Kokoro in the browser (natural voice, real audio, so the mouth syncs) ----------
let tts = null;
const ttsReady = (async () => {
  try {
    const { KokoroTTS } = await import("https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm");
    const webgpu = !!navigator.gpu;
    tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
      dtype: webgpu ? "fp32" : "q8", device: webgpu ? "webgpu" : "wasm",
      progress_callback: (p) => { if (p.status === "progress" && p.total > 5e6) $("#voiceStatus").textContent = `Loading Echo's voice… ${Math.round(p.progress)}%`; },
    });
    $("#voiceStatus").textContent = `Voice ready (${webgpu ? "WebGPU" : "WASM"}). Saved for next time.`;
  } catch (e) {
    $("#voiceStatus").textContent = "Natural voice could not load here; using your device voice.";
    console.warn(e);
  }
})();
const sentences = (t) => t.match(/[^.!?]+[.!?]+["”’)]*|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) || [];
async function speak(text, run) {
  if (MOUTH.pending) placeMouth();
  ensureAudio(); await ctx.resume();   // the mic is opened by startLive, so typing never asks for it
  if (live && !lvlRaf && !reduced) lvlRaf = requestAnimationFrame(levelLoop);
  setState("speaking", "speaking");
  if (!tts) await ttsReady;   // wait for Echo's voice rather than the robotic device voice
  if (run !== session) return;
  if (tts) {
    // Generate sentence 1, start playing it, and generate the next while it plays.
    const parts = sentences(text);
    let next = tts.generate(parts[0], { voice, speed: 1.08 });
    for (let i = 0; i < parts.length; i++) {
      const audio = await next;
      if (run !== session) return;
      if (i + 1 < parts.length) next = tts.generate(parts[i + 1], { voice, speed: 1.08 });
      const buf = ctx.createBuffer(1, audio.audio.length, audio.sampling_rate); buf.copyToChannel(audio.audio, 0);
      await playBuffer(buf);
      if (run !== session) return;
    }
    rest();
  } else {
    // Fallback only if the natural voice failed to load: device voice. Browsers give no audio, so the mouth pulses on word boundaries.
    await new Promise((res) => {
      const u = new SpeechSynthesisUtterance(text); u.lang = "en-US";
      u.onboundary = () => { drawMouth(0.8, 0.4); setTimeout(() => drawMouth(0.2, 0.3), 120); };
      u.onend = u.onerror = () => { rest(); res(); };
      speechSynthesis.speak(u);
    });
  }
}

// ---------- listening: browser speech recognition ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
// Record each answer too, so Whisper can re-hear it (better with accents than the browser).
let micStream = null;
let micAnalyser = null, micBuf = null, lvlRaf = 0, micPeak = 0.05;
async function getMic() {
  try { micStream ??= await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { micStream = null; }
  if (micStream && !micAnalyser) {
    micAnalyser = ctx.createAnalyser(); micAnalyser.fftSize = 512; micBuf = new Float32Array(micAnalyser.fftSize);
    ctx.createMediaStreamSource(micStream).connect(micAnalyser);   // measured only, never played back
  }
  return micStream;
}
function levelLoop() {
  // Drive the mic rings: your voice while listening, Echo's voice while it talks.
  const mic = $("#mic"); let lvl = 0;
  if (echo.classList.contains("speaking")) lvl = open;
  else if (echo.classList.contains("listening") && micAnalyser) {
    micAnalyser.getFloatTimeDomainData(micBuf); let s2 = 0; for (const v of micBuf) s2 += v * v;
    const rms = Math.sqrt(s2 / micBuf.length); micPeak = Math.max(micPeak * 0.995, rms, 0.02); lvl = Math.min(1, rms / micPeak);
  }
  const prev = +mic.style.getPropertyValue("--lvl") || 0;
  mic.style.setProperty("--lvl", (prev + (lvl - prev) * 0.35).toFixed(3));
  mic.classList.toggle("waiting", live && lvl < 0.05 && !echo.classList.contains("speaking"));
  lvlRaf = live && !reduced ? requestAnimationFrame(levelLoop) : 0;
  if (!lvlRaf) { mic.style.setProperty("--lvl", 0); mic.classList.remove("waiting"); }
}
function startRecorder() {
  if (!micStream || !window.MediaRecorder || mode === "kids") return null;   // kids audio never leaves the device
  const rec = new MediaRecorder(micStream), parts = [];
  rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
  rec.done = new Promise((ok) => { rec.onstop = () => ok(new Blob(parts, { type: rec.mimeType })); });
  rec.start(); return rec;
}
async function rehear(said, full = false) {
  // Swap in Whisper's transcript when it heard something; keep the browser's text otherwise.
  // full: the slower, more accurate model (mock test answers).
  if (!said.recorder) return said;
  try {
    const blob = await said.recorder;
    const r = await fetch("/api/speak/hear" + (full ? "?full=1" : ""), { method: "POST", headers: { "Content-Type": blob.type || "audio/webm" }, body: blob });
    const j = await r.json();
    if (r.ok && j.text) return { ...said, text: j.text, whisper: true };
  } catch {}
  return said;
}
function listen({ continuous = false, maxMs = 0 } = {}) {
  // Resolves with { text, alts, conf } when the learner stops talking (or maxMs passes).
  return new Promise((resolve) => {
    const el = add(LOG[mode], "me", ""); el.classList.add("live");
    let finals = "", alts = [], conf = 1, timer; const t0 = Date.now(), unsure = new Map(), recorder = startRecorder();
    rec = new SR(); rec.lang = "en-US"; rec.interimResults = true; rec.continuous = continuous; rec.maxAlternatives = 3;
    setState("listening", continuous ? "listening… take your time" : "listening…");
    rec.onresult = (e) => {
      let interim = ""; finals = "";
      for (const [n, r] of Array.from(e.results).entries()) { if (r.isFinal) { finals += r[0].transcript + " "; alts = Array.from(r).map((a) => a.transcript); conf = r[0].confidence || 1; unsure.set(n, unsureWords(r[0].transcript, alts, conf)); } else interim += r[0].transcript; }
      el.querySelector(".txt").textContent = (finals + interim).trim();
    };
    rec.onerror = (e) => { if (e.error === "not-allowed") showErr("Microphone blocked. Allow the mic in the address bar, or type below."); };
    rec.onend = () => {
      clearTimeout(timer); rec = null;
      const text = el.querySelector(".txt").textContent.trim();
      el.classList.remove("live"); if (!text) el.remove();
      if (recorder && recorder.state !== "inactive") recorder.stop();
      resolve({ text, alts, conf, sec: (Date.now() - t0) / 1000, unsure: [...new Set([...unsure.values()].flat())], recorder: text && recorder ? recorder.done : null, el });
    };
    if (maxMs) timer = setTimeout(() => rec?.stop(), maxMs);
    rec.start();
  });
}
function stopListening() { if (rec) try { rec.stop(); } catch {} }
function showErr(m) { $("#err").textContent = m; $("#err").hidden = !m; }

// ---------- the conversation loop ----------
async function askEcho(run) {
  setState("thinking", "thinking…");
  const r = await fetch("/api/speak/talk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, history }) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Echo can't answer right now.");
  if (run !== session) return null;
  history.push({ role: "assistant", content: j.reply });
  return j;
}
async function turn(run, said) {
  // One exchange: what the learner said -> Echo's reply (shown + spoken).
  if (said) history.push({ role: "user", content: said.text });
  const j = await askEcho(run);
  if (!j) return null;
  const tip = mode === "chat" && j.better && said ? betterTip(said.text, j.better) : "";
  const unsure = mode !== "test" && said ? (said.unsure || []) : [];
  add(LOG[mode], "bot", esc(j.reply), [tip, unsure.length ? "Hard to catch, tap to hear: " + unsure.map(wordBtn).join(" ") : ""].filter(Boolean).join("<br>"));
  if (mode === "kids" && said && said.text.split(" ").length >= 3) star();
  await speak(j.reply, run);
  return j;
}
async function startLive() {
  if (!SR) { showErr("This browser can't listen (try Chrome, Edge or Safari). You can type below."); }
  ensureAudio(); await ctx.resume();
  live = true; const run = ++session; showErr("");
  await getMic(); if (!lvlRaf && !reduced) lvlRaf = requestAnimationFrame(levelLoop);
  $("#mic").classList.add("live"); $("#mic").setAttribute("aria-pressed", "true"); $("#mic").setAttribute("aria-label", "Stop talking to Echo");
  try {
    if (mode === "test") { await runTest(run); return; }
    let j = history.length ? null : await turn(run, null);    // Echo speaks first
    let quiet = 0;
    while (live && run === session && SR) {
      let said = await listen();
      if (!live || run !== session) break;
      if (!said.text) { if (++quiet >= 3) { endLive(); setState("idle", "paused, tap to talk again"); } continue; }
      quiet = 0;
      if (said.conf < 0.6) { setState("thinking", "listening again…"); said = await rehear(said); if (said.whisper && said.el) said.el.querySelector(".txt").textContent = said.text; }
      j = await turn(run, said);
    }
  } catch (e) { if (e !== STOP) { showErr(e.message); endLive(); } }
}
function endLive() { $("#testScope").disabled = false; live = false; session++; stopListening(); stopSpeech(); clearInterval(barTimer); $("#mic").classList.remove("live"); $("#mic").setAttribute("aria-pressed", "false"); $("#mic").setAttribute("aria-label", "Start talking to Echo"); setState("idle"); }
$("#mic").onclick = () => live ? endLive() : startLive();
document.querySelector('[data-mode="test"]').addEventListener("click", () => { nextSet ??= freshSet(); });
document.addEventListener("visibilitychange", () => { if (document.hidden && live) endLive(); });

// typing works in every mode and browser
$("#typebar").onsubmit = async (e) => {
  e.preventDefault(); const v = $("#typeIn").value.trim(); if (!v) return;
  $("#typeIn").value = ""; stopListening(); stopSpeech();
  const run = live ? session : ++session;
  add(LOG[mode], "me", esc(v));
  try { await turn(run, { text: v, alts: [], conf: 1 }); } catch (e2) { showErr(e2.message); }
  if (!live && run === session) setState("idle");
};

// ---------- mock test: a fixed examiner script from our question bank (real examiners read set questions) ----------
const STOP = Symbol("stop");
const bankReady = fetch("bank.json").then((r) => r.json());
// A fresh AI-written question set per test; the fixed bank is the fallback if it is slow or fails checks.
const freshSet = () => Promise.race([fetch("/api/speak/questions", { method: "POST" }).then((r) => r.ok ? r.json() : null).catch(() => null), new Promise((ok) => setTimeout(() => ok(null), 8000))]);
let nextSet = null;
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
let answers = [], heard = [];   // heard: Whisper re-hearings still running in the background
async function examiner(run, text, part) {
  if (!live || run !== session) throw STOP;
  if (part) setPart(part);
  history.push({ role: "assistant", content: text }); add(LOG.test, "bot", esc(text));
  await speak(text, run);
  if (!live || run !== session) throw STOP;
}
async function ask(run, text, part, opts = {}) {
  await examiner(run, text, part);
  let said = await listen(opts);
  for (let tries = 0; !said.text && tries < 2 && live && run === session; tries++) said = await listen(opts);   // wait quietly, like an examiner
  if (!live || run !== session) throw STOP;
  if (!opts.unmarked) {
    const entry = { part, q: text, a: said.text, unsure: said.unsure || [], sec: said.sec };
    answers.push(entry);
    heard.push(rehear(said, true).then((x) => { if (x.whisper) { entry.a = x.text; if (x.el) x.el.querySelector(".txt").textContent = x.text; } }));
  }
  // Like a real examiner: one neutral prompt when an answer is very short (never a hint).
  const m = opts.more, n = said.text.split(/\s+/).filter(Boolean).length;
  if (m && live && run === session && (n < (m.words || 0) || said.sec < (m.sec || 0)))
    await ask(run, m.line, part, { ...opts, more: null, maxMs: m.maxMs ?? opts.maxMs });
  return said;
}
async function runTest(run) {
  const bank = await bankReady; answers = []; heard = [];
  const fresh = await (nextSet || freshSet()); nextSet = freshSet();   // prefetch the next test's set
  let [opening] = shuffle(bank.frames.slice(0, 2)), others = shuffle(bank.frames.slice(2)).slice(0, 2), card = shuffle(bank.cards)[0];
  if (fresh) { [opening, ...others] = fresh.frames; card = fresh.card; }
  const scope = +$("#testScope").value, has = (p) => !scope || scope === p;
  $("#testScope").disabled = true;
  if (!scope) await ask(run, "Hello, I'm your examiner today. Can you tell me your full name, please?", 1, { unmarked: true });
  if (has(1)) {
  await examiner(run, (scope ? "Hello. " : "Thank you. ") + "In this first part, I'd like to ask you some questions about yourself.", 1);
  for (const [i, f] of [opening, ...others].entries())
    for (const [k, q] of f.qs.entries()) await ask(run, (k === 0 && i > 0 ? `Now let's talk about ${lower(f.topic)}. ` : "") + q, 1);
  }
  if (has(2)) {
  await examiner(run, "Now I'm going to give you a topic, and I'd like you to talk about it for one to two minutes. Before you talk, you'll have one minute to think about what you're going to say. You can make some notes if you wish. Here is your topic.", 2);
  $("#cue").hidden = false;
  $("#cue").innerHTML = `<strong>${esc(card.prompt)}</strong> You should say:<ul>${card.points.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>${esc(card.explain)}`;
  await examiner(run, card.prompt, 2);
  await prepare(run);
  if (!live || run !== session) throw STOP;
  await ask(run, "All right? Remember you have one to two minutes for this. I'll tell you when the time is up. Can you start speaking now, please?", 2, { continuous: true, maxMs: 120000, more: { sec: 60, line: "Can you tell me anything more about that?", maxMs: 60000 } });
  $("#timers").hidden = true; clearInterval(barTimer);
  await ask(run, "Thank you. " + card.round, 2);
  }
  const topic = lower(card.prompt.replace(/^Describe /, "").replace(/\.$/, ""));
  if (has(3)) for (const [i, th] of card.themes.entries())
    for (const [k, q] of th.qs.entries())
      await ask(run, (i === 0 && k === 0 ? (scope ? `Hello. In this part, I'd like to discuss some general questions related to ${topic}. Let's consider first ${lower(th.theme)}. ` : `We've been talking about ${topic}, and I'd like to discuss with you one or two more general questions related to this. Let's consider first ${lower(th.theme)}. `)
        : k === 0 ? `Now let's talk about ${lower(th.theme)}. ` : "") + q, 3, { more: { words: 10, line: shuffle(["Why do you think that is?", "Can you give me an example?", "Why?", "Can you say a bit more about that?"])[0] } });
  await examiner(run, scope ? "Thank you. That is the end of this practice." : "Thank you. That is the end of the speaking test.", scope || 3);
  endLive(); setPart(0); $("#testScope").disabled = false; $("#notes").hidden = true; showSummary();
}
function showSummary() {
  // Honest numbers only; the band report comes from the marker in the real build.
  const said = answers.filter((x) => x.a), count = said.reduce((n, x) => n + x.a.split(/\s+/).length, 0);
  const longTurn = answers.find((x) => x.part === 2 && x.sec > 30);
  const unsure = [...new Set(answers.flatMap((x) => x.unsure))].slice(0, 8);
  const stat = (v, k) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`;
  const html = `<p class="summary-title">Test finished. Here is how you did.</p>
    <div class="stats">${stat(`${said.length}/${answers.length}`, "questions answered")}${stat(count, "words spoken")}${longTurn ? stat(`${Math.round(longTurn.sec)} s`, "Part 2 talk (aim: 1–2 min)") : ""}</div>` +
    (unsure.length ? `<div class="catch">Hard-to-catch words, tap to hear them: ${unsure.map(wordBtn).join(" ")}<small>A rough clarity check. Your accent is never marked wrong.</small></div>` : "") +
    `<p class="band-wait">Marking your test… (up to a minute)<span class="thinking-bar"></span></p>`;
  const el = add(LOG.test, "bot", html); el.classList.add("summary");
  el.insertAdjacentHTML("beforeend", `<div class="transcript" hidden></div>`);
  words.test = true; applyWords();   // show the summary even if words were hidden during the test
  markTest(el.querySelector(".band-wait"), unsure);
}
// Past results stay on this device only (shortcut: localStorage; move to the account history in the real build).
const HIST_KEY = "bandexe-speaking-history";
function saveResult(j) {
  let h = []; try { h = JSON.parse(localStorage.getItem(HIST_KEY) || "[]"); } catch {}
  h.push({ at: Date.now(), scope: +$("#testScope").value, overall: j.overall, bands: j.bands });
  h = h.slice(-20); try { localStorage.setItem(HIST_KEY, JSON.stringify(h)); } catch {}
  return h;
}
function progressHTML(h) {
  if (h.length < 2) return `<p class="progress">This is your first saved test. Take another to see your progress.</p>`;
  const d = h.at(-1).overall - h.at(-2).overall;
  const msg = d > 0 ? `<b>+${d.toFixed(1)}</b> since your last test. Nice work!` : d < 0 ? `<b>${d.toFixed(1)}</b> since your last test. One test is only a rough sign; keep practising.` : `Same band as your last test.`;
  return `<div class="progress">${msg}<div class="spark" aria-label="Your last ${h.length} test bands">${h.slice(-10).map((x) => `<span><i style="height:${Math.round(x.overall / 9 * 56)}px"></i>${x.overall.toFixed(1)}</span>`).join("")}</div></div>`;
}
function countUp(el, to) {
  // band number rolls up from 0 (skipped for reduced motion)
  if (reduced) return; const t0 = performance.now();
  const step = (t) => { const k = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - k, 3); el.textContent = (Math.round(to * e * 2) / 2).toFixed(1); if (k < 1) requestAnimationFrame(step); };
  el.textContent = "0.0"; requestAnimationFrame(step);
}
const CRIT = { fc: "Fluency and coherence", lr: "Vocabulary", gra: "Grammar", pron: "Pronunciation (rough)" };
async function markTest(slot, unsure) {
  setState("thinking", "marking…");
  try {
    await Promise.all(heard);   // use Whisper's accent-robust text where it finished
    showTranscript(slot.closest(".summary"));
    const r = await fetch("/api/speak/mark", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers, unsure }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Marking failed.");
    const low = Object.keys(CRIT).reduce((m, k) => j.bands[k] < j.bands[m] ? k : m);
    const unq = (t) => String(t || "").trim().replace(/^["“'‘]+|["”'’]+$/g, "");
    Object.values(j.notes).forEach((n) => { n.quote = unq(n.quote); n.example = unq(n.example); });
    const same = (a, b) => a.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim() === b.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
    const fix = (n) => n.quote && n.example ? (same(n.quote, n.example) ? "" : betterTip(n.quote, n.example)) : n.example ? `<span class="fix"><span class="fix-row"><span class="fix-k">Try</span><span><span class="ins">${esc(n.example)}</span></span></span></span>` : "";
    const row = (k) => { const n = j.notes[k] || {};
      return `<div class="crit${k === low ? " focus" : ""}">
        <div class="crit-head"><h4>${CRIT[k]}${k === low ? '<span class="tag">work on this first</span>' : ""}</h4><b>${j.bands[k].toFixed(1)}</b></div>
        <div class="meter" aria-hidden="true"><i style="width:${j.bands[k] / 9 * 100}%"></i></div>
        ${n.why ? `<p class="why">${esc(n.why)}</p>` : ""}
        ${k === "pron" ? "" : fix(n)}
        ${n.fix ? `<p class="tipline"><b>Tip:</b> ${esc(n.fix)}</p>` : ""}</div>`; };
    slot.outerHTML = `<div class="report" id="report">
      <div class="overall"><span class="big">${j.overall.toFixed(1)}</span><p>Your estimated band<small>A practice estimate: in our tests it was usually within about 1 band of a real examiner.</small></p></div>
      <div class="start-here"><span class="k">Start here</span>${CRIT[low]}: ${esc(j.notes[low]?.fix || "")}</div>
      ${Object.keys(CRIT).map(row).join("")}</div>`;
    const rep = document.getElementById("report"); rep.removeAttribute("id");
    [...rep.children].forEach((c, i) => { c.style.setProperty("--i", i); c.querySelector(".meter i")?.style.setProperty("--i", i); });
    countUp(rep.querySelector(".big"), j.overall);
    rep.querySelector(".overall").insertAdjacentHTML("afterend", progressHTML(saveResult(j)));
  } catch (e) { slot.textContent = e.message; showTranscript(slot.closest?.(".summary")); }
  setState("idle");
}
function showTranscript(box) {
  // Everything the learner said, question by question, after the report.
  const t = box?.querySelector(".transcript"); if (!t || !t.hidden) return;
  const parts = [1, 2, 3].filter((p) => answers.some((x) => x.part === p));
  t.innerHTML = `<h4>What you said</h4>` + parts.map((p) => `<div class="tr-part"><span class="k">Part ${p}</span>` +
    answers.filter((x) => x.part === p).map((x) => `<p class="tr-q">${esc(x.q)}</p><p class="tr-a">${x.a ? esc(x.a) : '<i>(no answer)</i>'}</p>`).join("") + `</div>`).join("");
  t.hidden = false;
}
// ---------- mock test: parts, cue card, 1 min prep, 2 min long turn ----------
let barTimer;
function setPart(p) { document.querySelectorAll("#parts span").forEach((s) => s.classList.toggle("now", +s.dataset.p === p)); }
function showCue(text) { $("#cue").hidden = false; $("#cue").textContent = text; }
function prepare(run) {
  // 60 s to prepare (skippable), then a 2:00 bar while the learner talks.
  return new Promise((res) => {
    $("#timers").hidden = false; $("#skipPrep").hidden = false; $("#doneTalk").hidden = true;
    $("#notes").hidden = false; $("#notes").value = ""; $("#notes").focus({ preventScroll: true });
    $("#barLabel").textContent = "prepare: make notes if you like"; setState("idle", "your preparation time");
    let left = 60; const C = 201;
    const tick = () => { $("#ringText").textContent = `0:${String(left).padStart(2, "0")}`; $("#ringFg").style.strokeDashoffset = C * (1 - left / 60); };
    tick(); clearInterval(barTimer);
    const go = () => {
      clearInterval(barTimer); $("#skipPrep").hidden = true; $("#doneTalk").hidden = false;
      $("#barLabel").textContent = "talk: up to 2 minutes"; const t0 = Date.now();
      barTimer = setInterval(() => { const s = (Date.now() - t0) / 1000; $("#barFill").style.width = Math.min(100, s / 1.2) + "%"; $("#ringText").textContent = `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`; }, 250);
      res();
    };
    barTimer = setInterval(() => { if (run !== session) { clearInterval(barTimer); return res(); } if (--left <= 0) go(); else tick(); }, 1000);
    $("#skipPrep").onclick = go;
  });
}
$("#doneTalk").onclick = stopListening;

// ---------- pronunciation help: flag only words that were hard to understand; accent is never "wrong" ----------
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const norm = (s) => s.toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/).filter(Boolean);
function unsureWords(said, alternatives, confidence) {
  const top = norm(said), others = alternatives.slice(1).map((a) => new Set(norm(a)));
  const shaky = top.filter((w) => others.length && others.some((s) => !s.has(w)));
  return [...new Set(confidence < 0.6 && !shaky.length ? top.filter((w) => w.length > 3) : shaky)].slice(0, 4);
}
function matchWords(a, b) {
  // Longest common subsequence: which word indexes match in a (okA) and in b (okB).
  const L = a.map(() => Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
    L[i][j] = a[i] === b[j] ? 1 + (L[i + 1]?.[j + 1] ?? 0) : Math.max(L[i + 1]?.[j] ?? 0, L[i][j + 1]);
  const okA = new Set(), okB = new Set(); let i = 0, j = 0;
  while (i < a.length && j < b.length) { if (a[i] === b[j]) { okA.add(i); okB.add(j); i++; j++; } else if ((L[i + 1]?.[j] ?? 0) >= L[i][j + 1]) i++; else j++; }
  return [okA, okB];
}
function betterTip(said, better) {
  // "You said" with changed words struck, "Better" with new words marked.
  const a = said.split(/\s+/).filter(Boolean), b = better.split(/\s+/).filter(Boolean);
  const key = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, "");
  const [okA, okB] = matchWords(a.map(key), b.map(key));
  // join neighbouring changed words into one highlight
  const show = (ws, ok, cls) => ws.map((w, k) => ok.has(k) ? esc(w) : (ok.has(k - 1) || !k ? `<span class="${cls}">` : "") + esc(w) + (ok.has(k + 1) || k === ws.length - 1 ? "</span>" : "")).join(" ");
  return `<span class="fix"><span class="fix-row was"><span class="fix-k">You said</span><span>${show(a, okA, "del")}</span></span><span class="fix-row"><span class="fix-k">Say</span><span>${show(b, okB, "ins")}</span></span></span>`;
}
function checkTarget(logSel, tg, said) {
  const a = norm(tg), b = norm(said), [ok] = matchWords(a, b);
  const missed = a.length - ok.size;
  const text = missed ? `Good try! I heard: “${said}”. Tap the words to hear them, then try again.` : "Perfect! Every word was clear.";
  add(logSel, "bot", esc(text), a.map((w, k) => ok.has(k) ? `<span class="pw ok">${w}</span>` : wordBtn(w)).join(""));
  if (!missed) star();
  speak(missed ? "Good try! Listen, and try again." : "Perfect! Every word was clear.", session);
}
const wordBtn = (w) => `<button class="pw bad" data-w="${esc(w)}">${esc(w)}</button>`;
document.addEventListener("click", (e) => { const w = e.target.closest?.(".pw.bad")?.dataset.w; if (w) speak(w, session); });

// ---------- log ----------
function add(logSel, who, html, tip) {
  const el = document.createElement("div");
  el.className = "msg " + (who === "me" ? "me" : "bot");
  const body = who !== "me" && !/[<>]/.test(html) ? html.split(/(\s+)/).map((w, i) => /\S/.test(w) ? `<span class="w" style="--i:${i >> 1}">${w}</span>` : w).join("") : html;
  el.innerHTML = `<span class="who">${who === "me" ? "you" : "echo"}</span><span class="txt">${body}</span>` + (tip ? `<span class="tip">${tip}</span>` : "");
  $(logSel).appendChild(el); el.scrollIntoView({ block: "nearest" });
  return el;
}

// ---------- voice picker ----------
document.querySelectorAll("#voices button").forEach((b) => b.onclick = async () => {
  voice = b.dataset.v;
  document.querySelectorAll("#voices button").forEach((x) => x.setAttribute("aria-pressed", x === b));
  stopSpeech(); ensureAudio(); await ctx.resume();
  if (tts) speak("Hi! I'm Echo. This is how I sound.", session);
  else { const buf = await fetch(`audio/voice_${voice}.mp3`).then((r) => r.arrayBuffer()).then((a) => ctx.decodeAudioData(a)); setState("speaking"); await playBuffer(buf); rest(); setState("idle"); }
});

// ---------- kids: stars + word puzzle ----------
let stars = 0;
function drawStars() {
  $("#stars").innerHTML = Array.from({ length: 5 }, (_, i) => `<svg viewBox="0 0 24 24" class="${i < Math.min(stars, 5) ? "got" : ""}"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>`).join("") + `<span>${stars}</span>`;
}
function star() { stars++; drawStars(); }
const SENT = ["I", "have", "a", "black", "cat"];
function puzzle() {
  $("#answer").innerHTML = ""; const chips = $("#chips"); chips.innerHTML = "";
  let mixed; do { mixed = [...SENT].sort(() => Math.random() - 0.5); } while (mixed.join() === SENT.join());
  mixed.forEach((w) => {
    const b = document.createElement("button"); b.textContent = w;
    b.onclick = () => {
      if (w !== SENT[$("#answer").children.length]) { b.animate?.([{ transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "none" }], 180); return; }
      b.disabled = true; const s = document.createElement("span"); s.textContent = w; $("#answer").appendChild(s);
      if ($("#answer").children.length === SENT.length) { star(); speak("Yay! I have a black cat. Now say it out loud!", session); }
    };
    chips.appendChild(b);
  });
}
$("#resetPuzzle").onclick = puzzle;
$("#sayIt").onclick = async () => {
  if (!SR) return showErr("This browser can't listen. Try Chrome, Edge or Safari.");
  endLive(); ensureAudio(); await ctx.resume();
  const said = await listen();
  setState("idle");
  if (said.text) checkTarget("#kidsLog", SENT.join(" "), said.text);
};
drawStars(); puzzle(); drawMouth(0, 0); applyWords();
