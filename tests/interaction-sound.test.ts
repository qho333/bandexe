import { afterEach, describe, expect, it, vi } from "vitest";
import { createInteractionGate, interactionCue, INTERACTION_GAP_MS, type InteractionCue } from "../src/lib/interaction-sound";
import { audioFixture } from "./audio-fixture";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("interaction feedback", () => {
  it.each(Object.keys(INTERACTION_GAP_MS) as InteractionCue[])("throttles %s at its boundary", (cue) => {
    const gate = createInteractionGate(), gap = INTERACTION_GAP_MS[cue];
    expect(gate(cue, 0)).toBe(true);
    expect(gate(cue, gap - 1)).toBe(false);
    expect(gate(cue, gap)).toBe(true);
    expect(gate(cue, NaN)).toBe(false);
  });
  it("maps button, navigation, toggle, theme and explicit actions", () => {
    expect(interactionCue("press", {})).toBe("click");
    expect(interactionCue("press", { nav: true })).toBe("switch");
    expect(interactionCue("press", { toggle: true })).toBe("toggle");
    expect(interactionCue("change", {})).toBe("toggle");
    expect(interactionCue("change", { cue: "power" })).toBe("power");
    for (const cue of ["engage", "accept", "reject", "bulk", "mascot", "hop", "error", "confirm"])
      expect(interactionCue("press", { cue })).toBe(cue);
    expect(interactionCue("press", { cue: "handled" })).toBeNull();
    expect(interactionCue("press", { cue: "engage", disabled: true })).toBeNull();
    expect(interactionCue("press", { cue: "toString" })).toBe("click");
  });
  it.each(["hover", "focus"] as const)("only ticks primary %s, without touch", (event) => {
    expect(interactionCue(event, { primary: true })).toBe("hover");
    expect(interactionCue(event, {})).toBeNull();
    expect(interactionCue(event, { primary: true, touch: true })).toBeNull();
    expect(interactionCue(event, { primary: true, disabled: true })).toBeNull();
  });
  it("shares one lazy context across boot, scan and UI, without one session closing another", async () => {
    vi.resetModules(); vi.useFakeTimers();
    const fixture = audioFixture();
    const Context = vi.fn(function () { return fixture.ctx; });
    vi.stubGlobal("AudioContext", Context);
    const { createSynth, silenceSounds } = await import("../src/lib/sound");
    expect(Context).not.toHaveBeenCalled();
    expect(createSynth({ enabled: false })).toBeNull();
    const boot = createSynth({ enabled: true })!, scan = createSynth({ enabled: true })!;
    expect(Context).toHaveBeenCalledOnce();
    boot.tone(440, 660, 0.1, 0.1); scan.tone(660, 880, 0.1, 0.1);
    boot.stop(); vi.advanceTimersByTime(50);
    expect(fixture.ctx.close).not.toHaveBeenCalled();
    expect(scan.ready()).toBe(true);
    scan.tone(880, 990, 0.1, 0.1);
    expect(fixture.sources).toHaveLength(3);
    silenceSounds(); vi.advanceTimersByTime(50);
    expect(fixture.sources[2].disconnect).toHaveBeenCalledOnce();
    scan.stop(); vi.advanceTimersByTime(50);
    expect(fixture.ctx.close).not.toHaveBeenCalled();
  });
});

it("keeps typing opt-in and silences both stored and system reduced-motion settings", async () => {
  vi.resetModules(); vi.useFakeTimers();
  let systemReduced = false;
  vi.stubGlobal("window", { matchMedia: () => ({ get matches() { return systemReduced; } }) });
  const fixture = audioFixture();
  const Context = vi.fn(function () { return fixture.ctx; });
  vi.stubGlobal("AudioContext", Context);
  const { configureInteractionSound, playInteraction } = await import("../src/lib/interaction-sound");
  const { DEFAULT_PREFS } = await import("../src/lib/prefs");
  configureInteractionSound(DEFAULT_PREFS);
  playInteraction("typing");
  expect(Context).not.toHaveBeenCalled();
  configureInteractionSound({ ...DEFAULT_PREFS, sound: "off" });
  playInteraction("engage");
  configureInteractionSound({ ...DEFAULT_PREFS, reduced: "on" });
  playInteraction("accept");
  configureInteractionSound(DEFAULT_PREFS); systemReduced = true;
  playInteraction("confirm");
  expect(Context).not.toHaveBeenCalled();
  systemReduced = false;
  configureInteractionSound({ ...DEFAULT_PREFS, typingSounds: "on" });
  playInteraction("typing");
  expect(Context).toHaveBeenCalledOnce(); expect(fixture.sources).toHaveLength(1);
  configureInteractionSound({ ...DEFAULT_PREFS, sound: "off" });
  vi.advanceTimersByTime(50);
  expect(fixture.sources[0].disconnect).toHaveBeenCalledOnce();
  playInteraction("error");
  expect(fixture.sources).toHaveLength(1);
});
