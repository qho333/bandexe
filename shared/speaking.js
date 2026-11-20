// Speaking: Echo chat, kids chat (safety-checked), fresh IELTS question sets, Whisper hearing and mock-test marking.
// Shared by the Cloudflare function (functions/api/speak/[[path]].ts) and the local prototype (mockups/speaking/server.mjs).
// Keys come from the server environment through setKeys(); they never reach the page.
const KEYS = { groq: "", gemini: "" };
export function setKeys(env) { KEYS.groq = env.GROQ_API_KEY || ""; KEYS.gemini = env.GEMINI_API_KEY || ""; }

const MODELS = ["openai/gpt-oss-20b", "openai/gpt-oss-120b"]; // fast first, bigger one if rate-limited

const SAY_ONLY = "Write only the words you will say out loud: no labels, lists, markdown or emoji.";
const HEARD = "The learner's words come from speech recognition, so expect recognition mistakes and accented phrasing: work out what they meant and answer that.";
export const PROMPTS = {
  chat: `You are Echo, a warm, upbeat English conversation partner in BAND.EXE, a free IELTS practice site. Sound like a cheerful friend who is genuinely happy to chat: open with a short, warm reaction that fits what they just said (happy for good news, sympathetic for bad news; vary it every time), then answer what the learner actually said in 1-3 short spoken sentences with a real detail or opinion, and always end with one short, curious follow-up question. Be encouraging, never formal or stiff. Plain spoken words only: no lists, markdown or emoji. ${HEARD} ${SAY_ONLY} Then check the learner's last message for grammar or word-choice mistakes (verb tense, missing -s, articles, prepositions, word order, wrong word). Ignore capital letters and punctuation, because speech recognition decides those. Never mention, quote or explain a mistake in your spoken reply: just reply naturally and ask your question. If there is a mistake, add one final line exactly like: BETTER: <their whole sentence, corrected, keeping their meaning>. If it was correct, add nothing. Never correct an accent.`,
  kids: `You are Echo, a kind robot friend helping a child aged 6 to 12 learn English. Use very simple words and 1-2 short, cheerful sentences. If the child's sentence had a mistake, say it back correctly and naturally, without saying "wrong". Praise full sentences. Ask one simple question. Talk only about animals, colours, food, family, school, toys, weather, sports, hobbies and their day. Never ask for or repeat a name, school, address, age, phone number or location; if the child shares one, do not repeat it and gently change the topic. If the child mentions anything scary, unsafe or sad, kindly tell them to talk to a grown-up they trust. ${HEARD} ${SAY_ONLY}`,
};
const START = "(The learner just tapped the mic. Start now: greet them briefly and ask your first question.)";
// Mock-test marker: free Gemma via the Gemini API (adults only; kids never reach it).
// Gemma first (best calibrated); if it is busy or slow, Groq gpt-oss-120b with its own calibration.
// shortcut: oss calibration from only 20 Ross samples; refit on more data before launch.
const MARKERS = [
  // Fitted on this exact prompt over 58 rated recordings (research-data/speaking/fit_server_cal.py): LOO MAE 0.89, 28/58 within 0.5.
  { model: "openai/gpt-oss-120b", cal: { a: -3.438, b: 2.111 } },
  // shortcut: Gemma's calibration came from the research prompt, not this one; it is only a fallback (often 503 / timeout).
  { model: "gemma-4-31b-it", cal: { a: -3.708, b: 1.789 } },
];
// shortcut: calibration fitted on 54 Ross Part 2 transcripts (Gemma raw -> examiner band); refit on full tests once we have them.
const GUIDE = `IELTS Speaking band guide (paraphrased from the official public descriptors). A candidate must fully fit a band's positive features to get it; rate the average performance across all parts.
FLUENCY & COHERENCE: 9 rare repetition/self-correction, pauses only to plan content, fully coherent, well extended. 8 pauses mostly for ideas, occasionally to find words. 7 long turns without noticeable effort; some mid-sentence hesitation for language but coherence holds; flexible discourse markers. 6 willing to speak at length but hesitation or repetition sometimes break coherence; linkers not always appropriate. 5 keeps going only with repetition, self-correction or slow speech; overuses some linkers. 4 noticeable pauses, slow, frequent repetition, some breakdowns. 3 long pauses, little beyond simple phrases.
LEXICAL RESOURCE: 9 fully flexible, precise, idiomatic. 8 wide and precise; skilful less common items with occasional slips. 7 flexible across topics; some less common items with some misuse. 6 enough to talk at length; some wrong word choices but meaning clear. 5 enough for familiar topics, little flexibility. 4 familiar topics only; frequent word-choice errors. 3 very limited.
GRAMMATICAL RANGE & ACCURACY: 9 precise and accurate throughout. 8 wide range, most sentences error-free. 7 range used flexibly; error-free sentences frequent; a few basic errors. 6 mix of simple and complex; complex ones often have errors that rarely block meaning. 5 basic forms fairly accurate; complex forms rare and nearly always wrong. 4 basic forms, few subordinate clauses, frequent errors. 3 mostly memorised or broken sentences.
PRONUNCIATION (rough: you only see a transcript and which words speech recognition found hard): 9 effortless to understand. 8 easy throughout. 7 clear with occasional lapses. 6 generally understood, occasional unclear words. 5 some unclear words. 4 frequent mispronunciation. Never penalise an accent itself, only lost clarity. If no words were hard to catch, do not claim unclear words; judge pronunciation from rhythm and fluency evidence instead.
Natural speech from strong and even native speakers also contains fillers, repetitions and cut-off words, so judge whether hesitation interrupts the message. Use the whole 1-9 scale.`;
const half = (x) => Math.min(9, Math.max(1, Math.round(x * 2) / 2));
const ieltsOverall = (b) => { const x = b.reduce((s, v) => s + v, 0) / 4, f = x % 1; return Math.floor(x) + (f >= 0.25 ? 0.5 : 0) + (f >= 0.75 ? 0.5 : 0); };
const PII = /\b[\w.+-]+@[\w-]+\.[\w.]+\b|\+?\d[\d\s().-]{7,}\d/g; // emails, phone numbers

export function cleanHistory(h) {
  if (!Array.isArray(h) || h.length > 40) return null;
  const out = [];
  for (const t of h) {
    if (!t || !["user", "assistant"].includes(t.role) || typeof t.content !== "string" || t.content.length > 1200) return null;
    out.push({ role: t.role, content: t.content.replace(PII, "[removed]") });
  }
  return out;
}

// Kids mode: every child message and every Echo reply passes a safety check (fail closed).
const KIDS_POLICY = `You check messages in an English-learning chat between a child (age 6-12) and a robot tutor.
UNSAFE if the message contains or asks for: violence, weapons, self-harm or suicide, sexual or romantic content, drugs, alcohol, smoking, gambling, hate or bullying, swearing, scary or disturbing detail, personal information (full name, address, school name, phone, email, location, passwords, photos), meeting in person, or anything a child should tell a trusted adult (abuse, danger, being hurt, feeling very sad).
SAFE: ordinary talk about animals, colours, food, family, school life, toys, weather, sport, hobbies, their day, simple feelings, and English practice. Speech-recognition mistakes are normal; judge the likely meaning.
Answer with exactly one word: SAFE or UNSAFE.`;
const KIDS_FALLBACK = "That sounds important. Please talk to a grown-up you trust about it. Shall we talk about animals instead? What is your favourite animal?";
// gpt-oss-safeguard-20b is only 3 requests/min on the free tier, so the general models apply the same policy.
async function kidSafe(text) {
  let last;
  for (const model of MODELS) {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST", signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${KEYS.groq}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "system", content: KIDS_POLICY }, { role: "user", content: `Message to check:\n"""${text.slice(0, 1200)}"""` }], temperature: 0, max_completion_tokens: 300, reasoning_effort: "low" }),
    });
    if (r.ok) return /^\s*SAFE\b/i.test((await r.json()).choices[0].message.content || "");
    last = `safety ${model} ${r.status}`;
  }
  throw new Error(last);
}

export async function talk(mode, history) {
  if (mode === "kids") {
    const last = history.at(-1);
    let ok = false;
    try { ok = !last || last.role !== "user" || await kidSafe(last.content); } catch (e) { console.error(String(e.message)); }
    if (!ok) return { reply: KIDS_FALLBACK, better: "", model: "safety" };
  }
  const out = await talkModel(mode, history);
  if (mode === "kids") {
    let ok = false;
    try { ok = await kidSafe(out.reply); } catch (e) { console.error(String(e.message)); }
    if (!ok) return { reply: "Let's talk about something fun! What did you eat today?", better: "", model: "safety" };
  }
  return out;
}

async function talkModel(mode, history) {
  const messages = [{ role: "system", content: PROMPTS[mode] }, ...history.slice(-20)];
  if (!history.length) messages.push({ role: "user", content: START });
  let last;
  for (const model of MODELS) {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEYS.groq}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, temperature: 0.7, max_completion_tokens: 600, reasoning_effort: "low" }),
    });
    if (!r.ok) {
      const err = (await r.text()).slice(0, 200);
      last = `${model} ${r.status} ${err}`;
      if (r.status === 429 || r.status === 404 || r.status >= 500) { console.error(last); continue; }
      throw new Error(last);
    }
    const text = String((await r.json()).choices[0].message.content || "").trim();
    const m = text.match(/^\s*BETTER:\s*(.+)$/im);
    const reply = text.replace(/^\s*BETTER:.*$/im, "").replace(/[*_#`]/g, "").trim();
    if (!reply) { last = `${model} empty`; continue; }
    return { reply, better: m ? m[1].trim() : "", model };
  }
  throw new Error(`all models busy (${last})`);
}

// Accent-robust transcript: Groq Whisper (free 28,800 audio s/day). Audio is forwarded, never saved.
const FILLER_PROMPT = "Umm, let me think like, hmm... Okay, uh, here's what I'm, like, thinking. I- I mean, er, the the thing is...";
export async function hear(buf, type, full = false) {
  const fd = new FormData();
  fd.append("file", new Blob([buf], { type }), type.includes("mp4") ? "a.mp4" : "a.webm");
  fd.append("model", full ? "whisper-large-v3" : "whisper-large-v3-turbo");   // full: more accurate, for marked answers fd.append("language", "en");
  fd.append("response_format", "verbose_json"); fd.append("temperature", "0"); fd.append("prompt", FILLER_PROMPT);   // tested: adding the question made v3 skip words and turbo invent some
  const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${KEYS.groq}` }, body: fd });
  if (!r.ok) throw new Error(`whisper ${r.status} ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  // drop segments Whisper thinks are silence (it can invent words there)
  const segs = (j.segments || []).filter((x) => x.no_speech_prob < 0.6);
  return { text: segs.map((x) => x.text).join(" ").replace(/\s+/g, " ").trim(), unclear: segs.filter((x) => x.avg_logprob < -0.7).map((x) => x.text.trim()) };
}

// Fresh examiner questions each test (IELTS format), from random topic seeds so tests don't repeat.
const P1_TOPICS = ["hobbies", "music", "films", "books", "sport", "weather", "food", "cooking", "shopping", "clothes", "transport", "travel", "holidays", "friends", "family", "neighbours", "parks", "the sea", "animals", "pets", "flowers", "colours", "art", "photography", "museums", "birthdays", "gifts", "festivals", "mornings", "evenings", "sleep", "weekends", "phones", "apps", "the internet", "social media", "computers", "email", "news", "handwriting", "maths", "history", "languages", "teachers", "childhood", "toys", "games", "puzzles", "walking", "cycling", "swimming", "running", "noise", "patience", "being busy", "time management", "daily routine", "rain", "the sky", "stars", "maps", "names", "jewellery", "hats", "bags", "cakes", "fruit", "coffee and tea", "snacks", "restaurants", "public places", "libraries", "cafes", "concerts", "dancing", "singing", "drawing", "boats", "trains", "cars", "bicycles"];
const P2_SEEDS = ["a person you admire", "a family member", "a friend from childhood", "a teacher", "a neighbour", "a famous person you would like to meet", "a place you want to visit", "a city you have visited", "a quiet place", "a park or garden", "a shop you like", "a restaurant", "a building", "a room", "an object you use every day", "a gift you gave or received", "a photo you like", "a book", "a film", "a song", "an app or website", "a piece of clothing", "a journey", "a holiday", "a celebration", "a sports event", "a time you learned something new", "a time you were proud", "a time you were surprised", "a time you changed your mind", "a time you helped someone", "a time you waited for something", "a mistake you made", "a challenge you faced", "a goal you have", "a habit you want to change", "a skill you learned", "an interesting conversation", "an advertisement", "a law or rule", "an invention", "a tradition in your country", "a game you played as a child", "a meal you cooked", "a walk you enjoyed", "a piece of good advice", "a day without technology", "an outdoor activity"];
const pick = (a, n) => [...a].sort(() => Math.random() - 0.5).slice(0, n);
const isQ = (q) => typeof q === "string" && q.trim().endsWith("?") && q.length >= 8 && q.length <= 130 && !q.includes("\n");
function checkSet(j) {
  // Validate shape and IELTS form before the examiner may read it.
  const f = j?.frames, c = j?.card;
  if (!Array.isArray(f) || f.length !== 3 || !f.every((x) => typeof x.topic === "string" && x.topic.length <= 40 && Array.isArray(x.qs) && x.qs.length === 4 && x.qs.every(isQ))) return null;
  if (!c || typeof c.prompt !== "string" || !/^Describe /.test(c.prompt) || c.prompt.length > 120 || !Array.isArray(c.points) || c.points.length !== 3
    || !c.points.every((p) => typeof p === "string" && p.length <= 60 && !p.trim().endsWith("?")) || typeof c.explain !== "string" || !/^and explain /.test(c.explain) || !isQ(c.round)
    || !Array.isArray(c.themes) || c.themes.length !== 2 || !c.themes.every((t) => typeof t.theme === "string" && t.theme.length <= 40 && Array.isArray(t.qs) && t.qs.length === 3 && t.qs.every(isQ))) return null;
  return { frames: f.map((x) => ({ topic: x.topic.trim(), qs: x.qs.map((q) => q.trim()) })), card: { title: c.prompt, prompt: c.prompt.trim().replace(/[.?]?$/, "."), points: c.points.map((p) => p.trim().replace(/[.;,]$/, "")), explain: c.explain.trim().replace(/[.?]?$/, "."), round: c.round.trim(), themes: c.themes.map((t) => ({ theme: t.theme.trim(), qs: t.qs.map((q) => q.trim()) })) } };
}
export async function questions() {
  const opening = Math.random() < 0.5
    ? ["Work or studies", 'only about their work or studies; the first question is exactly "Do you work or are you a student?"']
    : ["Home", 'only about where they live; the first question asks whether they live in a house or an apartment'], [t1, t2] = pick(P1_TOPICS, 2), seed = pick(P2_SEEDS, 1)[0];
  const prompt = `Write a fresh, original IELTS Speaking test in the official format. Do not copy real exam questions.
Part 1: three topic frames, each with exactly 4 short, simple personal questions (present habits, likes, past, future). Frame 1 topic "${opening[0]}": ${opening[1]}. Frame 2 topic: ${t1}. Frame 3 topic: ${t2}. Mix question forms (Do you…? What…? How often…? When did you last…? Did you… as a child? Would you like to…?) and keep them about the candidate's own life, not society.
Part 2: one cue card that must be about ${seed}. "prompt" starts with "Describe" and ends with a full stop. "points" are exactly 3 short noun-clause prompts in lower case, never questions, written for this card's topic (start with who/what/when/where/how/why + "you"/"it"/"this"). "explain" starts with "and explain" and ends with a full stop. "round" is one short rounding-off yes/no question.
Part 3: two themes linked to the cue card, each with exactly 3 discussion questions about people in general, comparisons, causes or the future (not personal), in plain words a learner can understand.
Every question is one sentence, at most 18 words, ends with "?", and uses natural examiner wording.
Reply with JSON only: {"frames":[{"topic":"...","qs":["?","?","?","?"]},{...},{...}],"card":{"prompt":"Describe ...","points":["...","...","..."],"explain":"and explain ...","round":"...?","themes":[{"theme":"...","qs":["?","?","?"]},{...}]}}`;
  for (const model of MODELS) {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEYS.groq}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.9, max_completion_tokens: 2000, reasoning_effort: "low", response_format: { type: "json_object" } }),
    });
    if (!r.ok) { console.error(`questions ${model} ${r.status}`); continue; }
    try { const set = checkSet(JSON.parse((await r.json()).choices[0].message.content)); if (set) return { ...set, seed }; console.error(`questions ${model} failed checks`); } catch { console.error(`questions ${model} bad JSON`); }
  }
  return null;
}

export function cleanAnswers(a) {
  if (!Array.isArray(a) || !a.length || a.length > 40) return null;
  const out = [];
  for (const x of a) {
    if (!x || ![1, 2, 3].includes(x.part) || typeof x.q !== "string" || typeof x.a !== "string" || x.q.length > 600 || x.a.length > 4000) return null;
    out.push({ part: x.part, q: x.q, a: x.a.replace(PII, "[removed]"), sec: Math.max(0, Math.min(300, Number(x.sec) || 0)) });
  }
  return out;
}

async function askGemini(model, prompt) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST", signal: AbortSignal.timeout(30000),
    headers: { "Content-Type": "application/json", "x-goog-api-key": KEYS.gemini },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0 } }),
  });
  if (!r.ok) throw new Error(String(r.status));
  return ((await r.json()).candidates?.[0]?.content?.parts || []).filter((x) => !x.thought).map((x) => x.text || "").join("");
}
async function askGroq(model, prompt) {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST", signal: AbortSignal.timeout(30000),
    headers: { Authorization: `Bearer ${KEYS.groq}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0, max_completion_tokens: 2500, reasoning_effort: "low", response_format: { type: "json_object" } }),
  });
  if (!r.ok) throw new Error(String(r.status));
  return (await r.json()).choices[0].message.content || "";
}

export async function mark(answers, unsure, only, { gemini = true } = {}) {  // only: one MARKERS index, for calibration runs; gemini: false where Google's free tier is not offered
  const said = answers.filter((x) => x.a.trim());
  if (said.reduce((n, x) => n + x.a.split(/\s+/).length, 0) < 40) return { error: "Too little speech to mark. Answer more of the questions and try again." };
  const p2 = answers.find((x) => x.part === 2 && x.sec > 30);
  const p2w = p2 ? p2.a.split(/\s+/).length : 0;
  const nums = p2 ? `Part 2 long turn: ${Math.round(p2.sec)} s, ${p2w} words, about ${Math.round(p2w / p2.sec * 60)} words per minute (timing includes pauses).` : "No Part 2 long turn was recorded.";
  const transcript = answers.map((x) => `[Part ${x.part}] Examiner: ${x.q}\nCandidate: ${x.a || "(no answer)"}`).join("\n\n");
  const prompt = `You are an experienced IELTS Speaking examiner. Mark this speaking practice (parts included: ${[...new Set(answers.map((x) => x.part))].join(", ")}; mark only what is there).\n\n${GUIDE}\n\nMeasured: ${nums} Words speech recognition found hard to catch: ${unsure.slice(0, 20).join(", ") || "none"}.\n\nTranscript (automatic speech recognition, punctuation unreliable):\n"""${transcript}"""\n\nReply with JSON only: {"fc": n, "lr": n, "gra": n, "pron": n, "notes": {"fc": NOTE, "lr": NOTE, "gra": NOTE, "pron": NOTE}} where n is a whole band 1-9 and each NOTE is {"why": "...", "quote": "...", "fix": "...", "example": "..."}. Write for a learner in plain, simple English; never mention ASR or speech recognition. why: the main reason for that band in at most 15 words. quote: up to 8 of the candidate's exact words that show it ("" if none). fix: one concrete thing to do next time, at most 15 words. example: the candidate's quote rewritten better, or a short model phrase ("" if none).`;
  const keys = ["fc", "lr", "gra", "pron"];
  let j, used, last;
  for (const m of only == null ? MARKERS : [MARKERS[only]]) {
    if (!m.model.includes("/") && (!gemini || !KEYS.gemini)) continue;
    try {
      const text = m.model.includes("/") ? await askGroq(m.model, prompt) : await askGemini(m.model, prompt);
      j = JSON.parse((text.match(/\{[\s\S]*\}/) || ["{}"])[0]);
      if (keys.every((k) => Number(j[k]) >= 1 && Number(j[k]) <= 9)) { used = m; break; }
      last = `${m.model} gave no bands`;
    } catch (e) { last = `${m.model} ${e.message}`; }
    console.error(last);
  }
  if (!used) throw new Error(`marker busy (${last})`);
  const model = used.model, CAL = used.cal;
  const bands = Object.fromEntries(keys.map((k) => [k, half(CAL.a + CAL.b * Number(j[k]))]));
  // Pronunciation from a transcript is weak and the steep calibration can push it to 9 beside 3s; keep it within 1 band above the other three (LOO MAE 0.91 vs 0.89).
  bands.pron = Math.min(bands.pron, half((bands.fc + bands.lr + bands.gra) / 3 + 1));
  return { bands, overall: ieltsOverall(keys.map((k) => bands[k])), raw: Object.fromEntries(keys.map((k) => [k, Number(j[k])])), notes: Object.fromEntries(keys.map((k) => { const n = j.notes?.[k] || {}; return [k, Object.fromEntries(["why", "quote", "fix", "example"].map((f) => [f, String(n[f] || "").slice(0, 200)]))]; })), model };
}
