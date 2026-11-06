import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { beginBoot, BOOT_TIMELINE, describeAgent, GATE_TIMEOUT_MS, initialBootPhase, isCrawler, bootTransition, SAFETY_MS, stamp } from "../src/lib/boot";

const SEEN = "bandexe-boot-seen-v1";
let doc: EventTarget;
let win: EventTarget;
let storage: Map<string, string>;

beforeEach(() => {
  vi.useFakeTimers();
  doc = new EventTarget();
  win = new EventTarget();
  storage = new Map();
  vi.stubGlobal("document", doc);
  vi.stubGlobal("window", Object.assign(win, { setTimeout: globalThis.setTimeout }));
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
  });
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("boot lifetime", () => {
  it.each(["Escape", "a", "Enter", "Tab", "Shift"])("skips from the first frame with %s and consumes the key", (key) => {
    const done = vi.fn();
    const boot = beginBoot(done);
    const keyEvent = Object.assign(new Event("keydown", { cancelable: true }), { key });
    const backgroundKey = vi.fn();
    doc.addEventListener("keydown", backgroundKey);
    doc.dispatchEvent(keyEvent);
    expect(keyEvent.defaultPrevented).toBe(true);
    expect(backgroundKey).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalledTimes(1);
    expect(storage.get(SEEN)).toBe("1");
    boot.finish();
    vi.advanceTimersByTime(19000);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("plays the full sequence on every load, including after a previous visit and on replay", () => {
    const first = beginBoot(vi.fn());
    expect(first.returning).toBe(false);
    first.finish();
    const again = beginBoot(vi.fn());
    expect(again.returning).toBe(false);
    again.dispose();
    const replay = beginBoot(vi.fn(), true);
    expect(replay.returning).toBe(false);
    replay.dispose();
  });

  it("still completes when reads and writes to storage are blocked", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
    });
    const done = vi.fn();
    const boot = beginBoot(done);
    expect(boot.returning).toBe(false);
    expect(() => boot.finish()).not.toThrow();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("escapes a stalled animation without any animation frames", () => {
    const done = vi.fn();
    beginBoot(done);
    vi.advanceTimersByTime(SAFETY_MS.full - 1);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(done).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the full safety net after a previous visit", () => {
    storage.set(SEEN, "1");
    const done = vi.fn();
    expect(beginBoot(done).returning).toBe(false);
    vi.advanceTimersByTime(SAFETY_MS.full - 1);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("keeps both safety nets beyond the animated timelines", () => {
    expect(SAFETY_MS.full).toBeGreaterThanOrEqual(BOOT_TIMELINE.full.end * 1000 + 2000);
    expect(SAFETY_MS.returning).toBeGreaterThanOrEqual(BOOT_TIMELINE.returning.end * 1000 + 2000);
  });

  it.each(["visibilitychange", "pageshow"])("checks elapsed wall time on %s when a background timer was suspended", (type) => {
    const done = vi.fn();
    beginBoot(done);
    const target = type === "visibilitychange" ? doc : win;
    target.dispatchEvent(new Event(type));
    expect(done).not.toHaveBeenCalled();
    vi.setSystemTime(Date.now() + SAFETY_MS.full - 1000);
    target.dispatchEvent(new Event(type));
    expect(done).not.toHaveBeenCalled();
    vi.setSystemTime(Date.now() + 1000);
    target.dispatchEvent(new Event(type));
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("swallows auto-repeats of the held skip key until it is released", () => {
    beginBoot(vi.fn());
    const key = (type: string, code: string) => {
      const event = Object.assign(new Event(type, { cancelable: true }), { code });
      doc.dispatchEvent(event);
      return event.defaultPrevented;
    };
    key("keydown", "KeyA");
    expect(key("keydown", "KeyA")).toBe(true);
    expect(key("keydown", "KeyB")).toBe(false);
    key("keyup", "KeyA");
    expect(key("keydown", "KeyA")).toBe(false);
  });

  it("keeps playing through viewport changes (rotation, moving a side panel)", () => {
    const done = vi.fn();
    beginBoot(done);
    win.dispatchEvent(new Event("resize"));
    expect(done).not.toHaveBeenCalled();
  });

  it("cleans up on unmount without marking a visit or leaving skip handlers behind", () => {
    const done = vi.fn();
    const boot = beginBoot(done);
    boot.dispose();
    const keyEvent = new Event("keydown", { cancelable: true });
    doc.dispatchEvent(keyEvent);
    win.dispatchEvent(new Event("resize"));
    vi.advanceTimersByTime(19000);
    expect(done).not.toHaveBeenCalled();
    expect(keyEvent.defaultPrevented).toBe(false);
    expect(storage.has(SEEN)).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("boot timeline and environment", () => {
  it("formats dmesg-style stamps from real elapsed seconds", () => {
    expect(stamp(0.412318)).toBe("[   0.412318]");
    expect(stamp(12.5)).toBe("[  12.500000]");
    expect(stamp(-1)).toBe("[   0.000000]");
  });

  it("uses 3.8 s of typing, 3.1 s of logo, and a 0.6 s handoff", () => {
    const full = BOOT_TIMELINE.full, short = BOOT_TIMELINE.returning;
    expect(full.codeAt).toBe(0.25);
    expect(full.floodAt).toBeGreaterThan(full.codeAt + 1);
    expect(full.kernelAt).toBeGreaterThan(full.floodAt);
    expect(full.logoAt).toBe(3.8);
    expect(full.handoffAt - full.logoAt).toBeCloseTo(3.1);
    expect(full.end - full.handoffAt).toBeCloseTo(0.6);
    expect(full.end).toBeCloseTo(7.5);
    expect(short.logoAt).toBe(0);
    expect(short.end - short.handoffAt).toBeCloseTo(0.6);
    expect(short.end).toBe(2);
    expect(SAFETY_MS).toEqual({ full: 10000, returning: 4000 });
  });

  it.each([
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36", "CHROME 141", "MACOS"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0", "EDGE 141", "WINDOWS"],
    ["Mozilla/5.0 (X11; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0", "FIREFOX 144", "LINUX"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1", "SAFARI 18", "IOS"],
    ["Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36", "CHROME 141", "ANDROID"],
  ])("reads browser and OS names from %s", (ua, browser, os) => {
    expect(describeAgent(ua)).toEqual({ browser, os });
  });

  it("says UNKNOWN instead of guessing", () => {
    expect(describeAgent("curious-bot/1.0")).toEqual({ browser: "UNKNOWN", os: "UNKNOWN" });
  });
});

describe("boot gate", () => {
  it("starts running/unavailable audio and waits for suspended audio", () => {
    expect(initialBootPhase("running")).toBe("playing");
    expect(initialBootPhase("unavailable")).toBe("playing");
    expect(initialBootPhase("suspended")).toBe("gate");
    expect(bootTransition("gate", "gesture")).toBe("playing");
    expect(bootTransition("playing", "gesture")).toBe("done");
    expect(bootTransition("gate", "timeout")).toBe("playing");
    expect(bootTransition("done", "gesture")).toBe("done");
  });
  it("starts immediately when running", () => {
    const start = vi.fn();
    const boot = beginBoot(vi.fn(), false, { audioState: "running", onStart: start });
    expect(start).toHaveBeenCalledExactlyOnceWith(false);
    boot.dispose();
  });
  it.each(["keydown", "pointerdown"])("consumes the first %s to start, then permits skip", (type) => {
    const done = vi.fn(), start = vi.fn(), background = vi.fn();
    const boot = beginBoot(done, false, { audioState: "suspended", onStart: start });
    doc.addEventListener(type, background);
    vi.advanceTimersByTime(500);
    expect(done).not.toHaveBeenCalled(); expect(start).not.toHaveBeenCalled();
    const first = Object.assign(new Event(type, { cancelable: true }), { code: "KeyA", button: 0 });
    doc.dispatchEvent(first);
    expect(first.defaultPrevented).toBe(true); expect(background).not.toHaveBeenCalled();
    expect(start).toHaveBeenCalledExactlyOnceWith(true); expect(done).not.toHaveBeenCalled();
    if (type === "keydown") {
      doc.dispatchEvent(Object.assign(new Event("keydown"), { code: "KeyA" }));
      expect(done).not.toHaveBeenCalled();
      doc.dispatchEvent(Object.assign(new Event("keyup"), { code: "KeyA" }));
    }
    doc.dispatchEvent(Object.assign(new Event("keydown"), { code: "Escape" }));
    expect(done).toHaveBeenCalledOnce();
    boot.dispose();
  });
  it("auto-starts silently after two seconds and still escapes a stalled intro", () => {
    const done = vi.fn(), start = vi.fn();
    beginBoot(done, false, { audioState: "suspended", onStart: start });
    vi.advanceTimersByTime(GATE_TIMEOUT_MS - 1); expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(done).not.toHaveBeenCalled(); expect(start).toHaveBeenCalledExactlyOnceWith(false);
    expect(GATE_TIMEOUT_MS).toBe(2000);
    vi.advanceTimersByTime(SAFETY_MS.full); expect(done).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("lets the gate's Skip intro button bypass audio", () => {
    const start = vi.fn(), done = vi.fn();
    const boot = beginBoot(done, true, { audioState: "suspended", onStart: start });
    boot.finish();
    expect(done).toHaveBeenCalledOnce(); expect(start).not.toHaveBeenCalled();
  });
});

it.each(["keydown", "pointerdown"])("unlocks sound on the first %s during an auto-started intro without skipping", (type) => {
  const done = vi.fn(), start = vi.fn(), unlock = vi.fn();
  const boot = beginBoot(done, false, { audioState: "suspended", onStart: start, onUnlock: unlock });
  vi.advanceTimersByTime(2000);
  doc.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), { code: "KeyA", button: 0 }));
  expect(unlock).toHaveBeenCalledOnce(); expect(done).not.toHaveBeenCalled(); expect(start).toHaveBeenCalledOnce();
  doc.dispatchEvent(Object.assign(new Event("keyup"), { code: "KeyA" }));
  doc.dispatchEvent(Object.assign(new Event("keydown"), { code: "Escape" }));
  expect(done).toHaveBeenCalledOnce(); boot.dispose();
});
it("starts after a suspended wall-clock gate and disposes all handlers", () => {
  const start = vi.fn(), done = vi.fn();
  const boot = beginBoot(done, true, { audioState: "interrupted", onStart: start });
  vi.setSystemTime(Date.now() + 2100); win.dispatchEvent(new Event("pageshow"));
  expect(start).toHaveBeenCalledExactlyOnceWith(false); expect(done).not.toHaveBeenCalled();
  boot.dispose(); vi.advanceTimersByTime(20000); expect(done).not.toHaveBeenCalled();
});

describe("press any key gate (owner rule)", () => {
  it("never starts by itself on a fresh load, whatever the audio state", () => {
    for (const audioState of ["running", "suspended"]) {
      const done = vi.fn(), start = vi.fn();
      const boot = beginBoot(done, false, { audioState, onStart: start, waitForKey: true });
      vi.advanceTimersByTime(60_000);
      vi.setSystemTime(Date.now() + 60_000); win.dispatchEvent(new Event("pageshow"));
      expect(start).not.toHaveBeenCalled(); expect(done).not.toHaveBeenCalled();
      boot.dispose();
    }
  });
  it.each(["keydown", "pointerdown"])("starts on a %s and can then be skipped", (type) => {
    const done = vi.fn(), start = vi.fn();
    const boot = beginBoot(done, false, { audioState: "running", onStart: start, waitForKey: true });
    doc.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), { code: "KeyA", button: 0 }));
    expect(start).toHaveBeenCalledExactlyOnceWith(true); expect(done).not.toHaveBeenCalled();
    doc.dispatchEvent(Object.assign(new Event("keyup"), { code: "KeyA" }));
    doc.dispatchEvent(Object.assign(new Event("keydown"), { code: "Escape" }));
    expect(done).toHaveBeenCalledOnce(); boot.dispose();
  });
  it("Skip intro still works at the gate, and Replay intro plays at once", () => {
    const done = vi.fn();
    beginBoot(done, false, { waitForKey: true }).finish();
    expect(done).toHaveBeenCalledOnce();
    const start = vi.fn();
    const replay = beginBoot(vi.fn(), true, { audioState: "running", onStart: start, waitForKey: true });
    expect(start).toHaveBeenCalledExactlyOnceWith(false); replay.dispose();
  });
  it("lets search crawlers skip the intro, but not ordinary phones", () => {
    expect(isCrawler("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
    expect(isCrawler("Mozilla/5.0 (Linux; Android 13; CUBOT KingKong) AppleWebKit/537.36 Chrome/150 Mobile Safari/537.36")).toBe(false);
    expect(isCrawler("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/151 Safari/537.36")).toBe(false);
  });
});
