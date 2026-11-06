import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBootSound, createSoundGate, MASTER_GAIN, SOUND_GAP_MS, type BootCue } from "../src/lib/boot-sound";

import { audioFixture } from "./audio-fixture";

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.runOnlyPendingTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("boot sound gates", () => {
  it.each(Object.keys(SOUND_GAP_MS) as BootCue[])("throttles %s independently and allows the next exact boundary", (cue) => {
    const gate = createSoundGate();
    expect(gate(cue, 0)).toBe(true);
    expect(gate(cue, 0)).toBe(false);
    expect(gate(cue, SOUND_GAP_MS[cue] - 1)).toBe(false);
    expect(gate(cue, SOUND_GAP_MS[cue])).toBe(true);
    expect(gate(cue, NaN)).toBe(false);
    expect(gate(cue, Infinity)).toBe(false);
  });
  it("lets headings and glitch frames sound without being silenced by the data stream", () => {
    const gate = createSoundGate();
    expect(gate("stream", 100)).toBe(true);
    expect(gate("ok", 100)).toBe(true);
    expect(gate("glitch", 100)).toBe(true);
    expect(gate("stream", 120)).toBe(false);
  });

});

describe("boot audio lifecycle", () => {
  it("allocates nothing when sound is disabled", () => {
    const createContext = vi.fn(), onBlocked = vi.fn();
    const sound = createBootSound({ enabled: false, createContext, onBlocked });
    sound.play("key"); sound.resume(); sound.stop();
    expect(createContext).not.toHaveBeenCalled();
    expect(onBlocked).not.toHaveBeenCalled();
  });
  it("quietly survives unavailable Web Audio and closes partial setup", () => {
    const onBlocked = vi.fn();
    expect(() => createBootSound({ enabled: true, onBlocked, createContext: () => { throw new Error("unavailable"); } }).stop()).not.toThrow();
    const fixture = audioFixture();
    fixture.ctx.createGain.mockImplementation(() => { throw new Error("device lost"); });
    createBootSound({ enabled: true, onBlocked, createContext: fixture.createContext });
    expect(fixture.ctx.close).toHaveBeenCalledOnce();
  });
  it("reports suspended audio immediately even when resume never settles; the gate retries in the gesture", async () => {
    const fixture = audioFixture("suspended"), onBlocked = vi.fn();
    fixture.ctx.resume.mockImplementationOnce(() => new Promise<void>(() => {}));
    const sound = createBootSound({ enabled: true, onBlocked, createContext: fixture.createContext });
    expect(onBlocked).toHaveBeenLastCalledWith(true);
    sound.play("ok");
    expect(fixture.sources).toHaveLength(0);
    fixture.ctx.resume.mockImplementationOnce(() => { fixture.ctx.state = "running"; return Promise.resolve(); });
    void sound.resume();
    await Promise.resolve();
    expect(fixture.ctx.resume).toHaveBeenCalledTimes(2);
    expect(onBlocked).toHaveBeenLastCalledWith(false);
    sound.stop();
  });
  it("uses modest gain, throttles catch-up batches and randomizes key pitch", () => {
    vi.useFakeTimers();
    const fixture = audioFixture();
    let now = 0;
    const random = vi.fn().mockReturnValue(0.2);
    const sound = createBootSound({ enabled: true, onBlocked: vi.fn(), createContext: fixture.createContext, now: () => now, random });
    expect(fixture.gains[0].gain.setValueAtTime).toHaveBeenCalledWith(MASTER_GAIN, 2);
    for (let i = 0; i < 100; i++) sound.play("key");
    expect(fixture.sources).toHaveLength(1);
    const first = fixture.sources[0].frequency.setValueAtTime.mock.calls[0][0];
    random.mockReturnValue(0.8); now = SOUND_GAP_MS.key;
    sound.play("key");
    expect(fixture.sources).toHaveLength(2);
    expect(fixture.sources[1].frequency.setValueAtTime.mock.calls[0][0]).not.toBe(first);
    sound.stop(); vi.runAllTimers();
  });
  it("synthesizes all five cues and closes every voice after a quick fade on finish/skip/unmount", async () => {
    vi.useFakeTimers();
    const fixture = audioFixture(), onBlocked = vi.fn();
    const sound = createBootSound({ enabled: true, onBlocked, createContext: fixture.createContext });
    for (const cue of Object.keys(SOUND_GAP_MS) as BootCue[]) sound.play(cue);
    expect(fixture.ctx.createOscillator).toHaveBeenCalled();
    expect(fixture.ctx.createBufferSource).toHaveBeenCalled();
    const count = fixture.sources.length;
    sound.stop(); sound.stop(); sound.resume(); sound.play("key");
    expect(fixture.sources).toHaveLength(count);
    expect(fixture.gains[0].gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, 2.035);
    expect(fixture.ctx.close).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(fixture.ctx.close).toHaveBeenCalledOnce();
    for (const source of fixture.sources) {
      expect(source.stop).toHaveBeenCalledTimes(2);
      expect(source.disconnect).toHaveBeenCalledOnce();
      expect(source.onended).toBeNull();
    }
    expect(fixture.gains.every((node) => node.disconnect.mock.calls.length === 1)).toBe(true);
    const reports = onBlocked.mock.calls.length;
    fixture.ctx.dispatchEvent(new Event("statechange"));
    await Promise.resolve(); // late resume resolution must not show a hint after teardown
    expect(onBlocked).toHaveBeenCalledTimes(reports);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("closes immediately while suspended and ignores a rejected resume", async () => {
    const fixture = audioFixture("suspended"), onBlocked = vi.fn();
    fixture.ctx.resume.mockRejectedValue(new Error("autoplay"));
    const sound = createBootSound({ enabled: true, onBlocked, createContext: fixture.createContext });
    await Promise.resolve();
    expect(onBlocked).toHaveBeenLastCalledWith(true);
    sound.stop();
    expect(fixture.ctx.close).toHaveBeenCalledOnce();
    expect(onBlocked).toHaveBeenLastCalledWith(false);
  });
  it("disconnects completed voices before the intro ends", () => {
    const fixture = audioFixture("running");
    const sound = createBootSound({ enabled: true, onBlocked: vi.fn(), createContext: fixture.createContext });
    sound.play("key");
    fixture.sources[0].onended?.();
    expect(fixture.sources[0].disconnect).toHaveBeenCalledOnce();
    fixture.ctx.state = "suspended";
    sound.stop();
    expect(fixture.sources[0].disconnect).toHaveBeenCalledOnce();
  });
});

describe("page-wide gesture unlock", () => {
  it("unlocks active audio on a click anywhere and removes gesture listeners on stop", async () => {
    const document = new EventTarget();
    vi.stubGlobal("document", document);
    const fixture = audioFixture("suspended");
    const sound = createBootSound({ enabled: true, createContext: fixture.createContext });
    fixture.ctx.resume.mockImplementation(() => { fixture.ctx.state = "running"; return Promise.resolve(); });
    document.dispatchEvent(new Event("pointerdown"));
    await Promise.resolve();
    expect(fixture.ctx.state).toBe("running"); expect(fixture.ctx.resume).toHaveBeenCalledTimes(2);
    sound.play("ok"); expect(fixture.sources.length).toBeGreaterThan(0);
    sound.stop();
    document.dispatchEvent(new Event("pointerdown")); document.dispatchEvent(new Event("keydown"));
    expect(fixture.ctx.resume).toHaveBeenCalledTimes(2);
  });
});
