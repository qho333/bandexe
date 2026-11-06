const SEEN_KEY = "bandexe-boot-seen-v1";
/** Seconds from mount. One continuous typing phase, logo, then handoff. */
export const BOOT_TIMELINE = {
  full: { codeAt: 0.25, floodAt: 1.4, kernelAt: 2.25, logoAt: 3.8, handoffAt: 6.9, end: 7.5 },
  returning: { logoAt: 0, handoffAt: 1.4, end: 2 },
} as const;
/** Independent escape hatches, comfortably beyond the animated timelines. */
export const SAFETY_MS = { full: 10000, returning: 4000 };

/** dmesg-style stamp of real elapsed seconds since the intro began. */
export const stamp = (seconds: number) => `[${Math.max(0, seconds).toFixed(6).padStart(11)}]`;

const BROWSERS: [RegExp, string][] = [
  [/Edg\/(\d+)/, "EDGE"], [/OPR\/(\d+)/, "OPERA"], [/Firefox\/(\d+)/, "FIREFOX"],
  [/Chrome\/(\d+)/, "CHROME"], [/Version\/(\d+)[\d.]* .*Safari/, "SAFARI"],
];
const SYSTEMS: [RegExp, string][] = [
  [/iPhone|iPad/, "IOS"], [/Android/, "ANDROID"], [/CrOS/, "CHROMEOS"],
  [/Mac OS X|Macintosh/, "MACOS"], [/Windows/, "WINDOWS"], [/Linux/, "LINUX"],
];
/** Best-effort names read from the user agent; "UNKNOWN" rather than a guess. */
export function describeAgent(ua: string) {
  const hit = BROWSERS.map(([re, name]) => [re.exec(ua), name] as const).find(([match]) => match);
  return {
    browser: hit ? `${hit[1]} ${hit[0]![1]}` : "UNKNOWN",
    os: SYSTEMS.find(([re]) => re.test(ua))?.[1] ?? "UNKNOWN",
  };
}

export const GATE_TIMEOUT_MS = 2000;
/** Search crawlers never press a key: they get the same page without the decorative intro. */
export const isCrawler = (ua: string) => /Googlebot|Google-InspectionTool|Storebot-Google|bingbot|BingPreview|DuckDuckBot|Applebot|YandexBot|Baiduspider|Slurp|facebookexternalhit|Twitterbot|LinkedInBot|Chrome-Lighthouse/i.test(ua);
export type BootPhase = "gate" | "playing" | "done";
export const initialBootPhase = (audioState: string): BootPhase => audioState === "suspended" || audioState === "interrupted" ? "gate" : "playing";
export const bootTransition = (phase: BootPhase, event: "gesture" | "skip" | "timeout"): BootPhase =>
  phase === "gate" && event !== "skip" ? "playing" : "done";

/** Gate and animation each have an independent escape deadline, even without animation frames. */
export function beginBoot(onDone: () => void, replay = false, options: { audioState?: string; onStart?: (gesture: boolean) => void; onUnlock?: () => void; waitForKey?: boolean } = {}) {
  // Owner rule: a fresh load always stops at PRESS ANY KEY and never starts by itself. A replay was already a click.
  const holdGate = Boolean(options.waitForKey) && !replay;
  let phase: BootPhase = holdGate ? "gate" : initialBootPhase(options.audioState ?? "running");
  const returning = false;
  void replay;
  let safety: ReturnType<typeof setTimeout>;
  let deadline = 0;
  let heldKey: string | undefined;
  let unlocked = !["suspended", "interrupted"].includes(options.audioState ?? "running");
  const unlock = () => { if (!unlocked) { unlocked = true; options.onUnlock?.(); } };
  const arm = (limit: number) => { clearTimeout(safety); deadline = Date.now() + limit; safety = setTimeout(expire, limit); };
  const dispose = () => {
    phase = "done";
    clearTimeout(safety);
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("keyup", onRelease, true);
    window.removeEventListener("blur", onBlur);
    document.removeEventListener("pointerdown", onPointer, true);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("pageshow", onVisible);
  };
  const finish = () => {
    if (phase === "done") return;
    dispose();
    try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* private browsing */ }
    onDone();
  };
  const expire = () => {
    if (phase === "gate" && holdGate) return; // waits for a key, click or tap (Skip intro still works)
    if (phase === "gate") { phase = "playing"; arm(SAFETY_MS.full); options.onStart?.(false); }
    else finish();
  };
  const gesture = () => {
    unlock();
    phase = bootTransition(phase, "gesture");
    if (phase === "playing") { arm(SAFETY_MS.full); options.onStart?.(true); }
  };
  const isSkip = (event: Event) => (event.target as Element | null)?.closest?.(".boot__skip");
  const onKey = (event: KeyboardEvent) => {
    const firstUnlock = !unlocked;
    unlock();
    event.preventDefault();
    event.stopImmediatePropagation();
    if (heldKey !== undefined && heldKey === event.code) return;
    heldKey = event.code;
    if (phase === "playing" && firstUnlock) return;
    if (phase === "gate" && !(isSkip(event) && (event.key === "Enter" || event.key === " "))) gesture();
    else { holdUntilKeyUp(event.code); finish(); }
  };
  const onRelease = (event: KeyboardEvent) => {
    if (event.code !== heldKey) return;
    event.preventDefault();
    heldKey = undefined;
  };
  const onBlur = () => { heldKey = undefined; };
  const onPointer = (event: PointerEvent) => {
    if (event.button !== 0 || event.isPrimary === false || isSkip(event)) return;
    unlock();
    if (phase !== "gate") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    gesture();
  };
  const onVisible = () => { if (Date.now() >= deadline && !(phase === "gate" && holdGate)) expire(); };
  document.addEventListener("keydown", onKey, true);
  document.addEventListener("keyup", onRelease, true);
  window.addEventListener("blur", onBlur);
  document.addEventListener("pointerdown", onPointer, true);
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("pageshow", onVisible);
  if (phase === "gate" && holdGate) { deadline = Infinity; } else arm(phase === "gate" ? GATE_TIMEOUT_MS : SAFETY_MS.full);
  if (phase === "playing") options.onStart?.(false);
  return { returning, finish, dispose };
}

/** Swallows auto-repeats of the skip key, which would otherwise type into the freshly focused editor. */
function holdUntilKeyUp(code: string) {
  const block = (event: KeyboardEvent) => {
    if (event.code !== code) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const release = (event?: Event) => {
    if (event?.type === "keyup" && (event as KeyboardEvent).code !== code) return;
    document.removeEventListener("keydown", block, true);
    document.removeEventListener("keyup", release, true);
    window.removeEventListener("blur", release);
  };
  document.addEventListener("keydown", block, true);
  document.addEventListener("keyup", release, true);
  window.addEventListener("blur", release);
}
