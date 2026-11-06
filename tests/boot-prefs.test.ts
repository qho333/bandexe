import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let storage: Map<string, string>;
let reduced = false;
beforeEach(() => {
  vi.resetModules();
  storage = new Map(); reduced = false;
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  vi.stubGlobal("window", { matchMedia: () => ({ get matches() { return reduced; } }) });
});
afterEach(() => vi.unstubAllGlobals());

describe("boot sound preference", () => {
  it("defaults Sound on and migrates old saved preferences", async () => {
    const { loadPrefs, DEFAULT_PREFS, bootSoundEnabled } = await import("../src/lib/prefs");
    expect(DEFAULT_PREFS.sound).toBe("on");
    expect(DEFAULT_PREFS.typingSounds).toBe("off");
    expect(bootSoundEnabled(false)).toBe(true);
    expect(bootSoundEnabled(true)).toBe(true);
    storage.set("bandexe-prefs", JSON.stringify({ theme: "amber", boot: "on" }));
    expect(loadPrefs()).toMatchObject({ theme: "amber", sound: "on" });
    expect(bootSoundEnabled(true)).toBe(true);
  });
  it("persists explicit on/off on every visit", async () => {
    const { loadPrefs, savePrefs, bootSoundEnabled } = await import("../src/lib/prefs");
    savePrefs({ ...loadPrefs(), sound: "off" });
    expect(loadPrefs().sound).toBe("off");
    expect(bootSoundEnabled(false)).toBe(false);
    expect(bootSoundEnabled(true)).toBe(false);
    savePrefs({ ...loadPrefs(), sound: "on" });
    expect(bootSoundEnabled(false)).toBe(true);
    expect(bootSoundEnabled(true)).toBe(true);
  });
  it("never enables boot audio with Boot off or either reduced-motion setting", async () => {
    const { DEFAULT_PREFS, savePrefs, bootSoundEnabled } = await import("../src/lib/prefs");
    savePrefs({ ...DEFAULT_PREFS, boot: "off" });
    expect(bootSoundEnabled(false)).toBe(false);
    savePrefs({ ...DEFAULT_PREFS, reduced: "on" });
    expect(bootSoundEnabled(false)).toBe(false);
    savePrefs(DEFAULT_PREFS); reduced = true;
    expect(bootSoundEnabled(false)).toBe(false);
    expect(bootSoundEnabled(true)).toBe(false);
  });
  it("handles blocked or corrupt preference storage", async () => {
    const { loadPrefs, bootSoundEnabled } = await import("../src/lib/prefs");
    storage.set("bandexe-prefs", "bad json");
    expect(loadPrefs().sound).toBe("on");
    expect(bootSoundEnabled(true)).toBe(true);
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); } });
    expect(bootSoundEnabled(false)).toBe(true);
    expect(bootSoundEnabled(true)).toBe(true);
  });
});


describe("scan sound preference", () => {
  it("follows Sound and both motion preferences while allowing Boot off", async () => {
    const { DEFAULT_PREFS, scanSoundEnabled } = await import("../src/lib/prefs");
    expect(scanSoundEnabled(DEFAULT_PREFS)).toBe(true);
    expect(scanSoundEnabled({ ...DEFAULT_PREFS, boot: "off" })).toBe(true);
    expect(scanSoundEnabled({ ...DEFAULT_PREFS, sound: "off" })).toBe(false);
    expect(scanSoundEnabled({ ...DEFAULT_PREFS, reduced: "on" })).toBe(false);
    reduced = true;
    expect(scanSoundEnabled(DEFAULT_PREFS)).toBe(false);
  });
});

it("rejects valid JSON with corrupt theme, sound and font values", async () => {
  const { loadPrefs, DEFAULT_PREFS } = await import("../src/lib/prefs");
  storage.set("bandexe-prefs", JSON.stringify({ theme: "unknown", edSize: "300", sound: null, reduced: true }));
  expect(loadPrefs()).toEqual(DEFAULT_PREFS);
});
