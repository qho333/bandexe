import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createScanSound, createScanSoundGate, footPan, issuePitch, SCAN_SOUND_GAP_MS } from "../src/lib/scan-sound";
import { MASTER_GAIN } from "../src/lib/sound";
import { audioFixture } from "./audio-fixture";

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.runOnlyPendingTimers(); vi.useRealTimers(); });

describe("scan sound helpers", () => {
  it.each(Object.keys(SCAN_SOUND_GAP_MS) as (keyof typeof SCAN_SOUND_GAP_MS)[])("throttles %s at the exact boundary", (cue) => {
    const gate = createScanSoundGate();
    expect(gate(cue, 0)).toBe(true);
    for (let i = 0; i < 100; i++) expect(gate(cue, 0)).toBe(false);
    expect(gate(cue, SCAN_SOUND_GAP_MS[cue] - 1)).toBe(false);
    expect(gate(cue, SCAN_SOUND_GAP_MS[cue])).toBe(true);
    expect(gate(cue, NaN)).toBe(false);
    expect(gate(cue, Infinity)).toBe(false);
  });
  it("feet cannot silence a lock-on or dash in the same frame", () => {
    const gate = createScanSoundGate();
    expect([gate("foot", 100), gate("issue", 100), gate("dash", 100)]).toEqual([true, true, true]);
  });
  it("maps foot x across the canvas to soft stereo, clamping overflow and centring invalid geometry", () => {
    expect(footPan(0, 800)).toBe(-0.8);
    expect(footPan(400, 800)).toBe(0);
    expect(footPan(800, 800)).toBe(0.8);
    expect(footPan(-50, 800)).toBe(-0.8);
    expect(footPan(900, 800)).toBe(0.8);
    expect(footPan(0, 0)).toBe(0);
    expect(footPan(1, -1)).toBe(0);
    expect(footPan(NaN, 800)).toBe(0);
    expect(footPan(10, Infinity)).toBe(0);
  });
  it("raises lock-on pitch gently and caps it for essays with many issues", () => {
    expect(issuePitch(0)).toBe(660);
    for (let i = 1; i <= 8; i++) {
      expect(issuePitch(i)).toBeGreaterThan(issuePitch(i - 1));
      expect(issuePitch(i) / issuePitch(i - 1)).toBeCloseTo(2 ** (1 / 12));
    }
    expect(issuePitch(9)).toBe(issuePitch(8));
    expect(issuePitch(10000)).toBe(issuePitch(8));
    expect(issuePitch(-1)).toBe(issuePitch(0));
    expect(issuePitch(NaN)).toBe(issuePitch(0));
  });
});

describe("scan synth lifecycle", () => {
  it("creates no context or nodes with sound/reduced-motion audio disabled", () => {
    const createContext = vi.fn();
    const sound = createScanSound({ enabled: false, createContext });
    sound.walking(true); sound.foot(0, 800); sound.issue(); sound.dash(); sound.finish(); sound.complete(); sound.stop();
    expect(createContext).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("uses modest gain, throttles all feet together, randomizes pitch and pans the actual foot", () => {
    const f = audioFixture();
    let now = 0;
    const random = vi.fn(() => 0.2);
    const sound = createScanSound({ enabled: true, createContext: f.createContext, random, now: () => now });
    expect(f.ctx.resume).toHaveBeenCalledOnce();
    expect(f.gains[0].gain.setValueAtTime).toHaveBeenCalledWith(MASTER_GAIN, 2);
    for (let i = 0; i < 20; i++) sound.foot(0, 800);
    expect(f.sources).toHaveLength(1);
    expect(f.panners[0].pan.setValueAtTime).toHaveBeenCalledWith(-0.8, 2);
    const pitch = f.sources[0].frequency.setValueAtTime.mock.calls[0][0];
    now = 65; random.mockReturnValue(0.8); sound.foot(800, 800);
    expect(f.sources).toHaveLength(2);
    expect(f.sources[1].frequency.setValueAtTime.mock.calls[0][0]).not.toBe(pitch);
    expect(f.panners[1].pan.setValueAtTime).toHaveBeenCalledWith(0.8, 2);
    sound.stop(); vi.runAllTimers();
    expect(f.panners.every((p) => p.disconnect.mock.calls.length === 1)).toBe(true);
  });
  it("fades one quiet hum between walking bursts, and releases it at scan finish", () => {
    const f = audioFixture();
    const sound = createScanSound({ enabled: true, createContext: f.createContext });
    sound.walking(true); sound.walking(true); sound.walking(false);
    expect(f.sources).toHaveLength(1);
    expect(f.gains[1].gain.linearRampToValueAtTime.mock.calls).toEqual([[0.045, 2.07], [0, 2.07]]);
    sound.finish(); sound.finish();
    const count = f.sources.length;
    sound.walking(true); sound.foot(20, 800); sound.issue(); sound.dash();
    expect(f.sources).toHaveLength(count);
    vi.advanceTimersByTime(50);
    expect(f.sources[0].disconnect).toHaveBeenCalledOnce();
    expect(f.ctx.close).not.toHaveBeenCalled(); // idle context reserved for the completion chord
    sound.stop(); vi.advanceTimersByTime(50);
    expect(f.ctx.close).toHaveBeenCalledOnce();
  });
  it("waits for gesture resume before allocating voices, then starts the hum", () => {
    const f = audioFixture("suspended");
    const sound = createScanSound({ enabled: true, createContext: f.createContext });
    sound.walking(true); sound.foot(20, 800); sound.issue(); sound.dash();
    expect(f.sources).toHaveLength(0);
    f.ctx.state = "running";
    sound.walking(true);
    expect(f.sources).toHaveLength(1);
    expect(f.gains[1].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.045, 2.07);
    sound.stop();
  });
  it("counts boxed issues for pitch even when a catch-up batch is throttled", () => {
    const f = audioFixture();
    let now = 0;
    const sound = createScanSound({ enabled: true, createContext: f.createContext, now: () => now });
    sound.issue(); sound.issue();
    expect(f.sources).toHaveLength(2);
    for (const source of f.sources) source.onended?.();
    now = 70; sound.issue();
    expect(f.sources[2].frequency.setValueAtTime).toHaveBeenCalledWith(issuePitch(2), 2);
    for (let i = 0; i < 12; i++) {
      for (const source of f.sources) source.onended?.();
      now += 70; sound.issue();
    }
    expect(f.sources.at(-2)!.frequency.setValueAtTime).toHaveBeenCalledWith(issuePitch(8), 2);
    sound.stop();
  });
  it("plays a gentle dash sweep, then the completion chord once, and closes automatically", () => {
    const f = audioFixture();
    const sound = createScanSound({ enabled: true, createContext: f.createContext });
    sound.dash(); sound.dash();
    expect(f.ctx.createBufferSource).toHaveBeenCalledOnce();
    expect(f.sources).toHaveLength(2);
    sound.finish(); vi.advanceTimersByTime(50);
    sound.complete(); sound.complete();
    expect(f.sources).toHaveLength(5);
    expect(f.sources.slice(-3).map((s) => s.frequency.setValueAtTime.mock.calls[0][0])).toEqual([523.25, 659.25, 783.99]);
    vi.advanceTimersByTime(520);
    expect(f.ctx.close).toHaveBeenCalledOnce();
    expect(f.sources.every((s) => s.disconnect.mock.calls.length === 1)).toBe(true);
    expect(f.gains.every((g) => g.disconnect.mock.calls.length === 1)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("cancels the completion timer and every source on stop/error/unmount", () => {
    const f = audioFixture();
    const sound = createScanSound({ enabled: true, createContext: f.createContext });
    sound.walking(true); sound.issue(); sound.complete(); sound.stop(); sound.stop();
    vi.runAllTimers();
    expect(f.ctx.close).toHaveBeenCalledOnce();
    expect(f.sources.every((s) => s.disconnect.mock.calls.length === 1 && s.onended === null)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("caps simultaneous sources and disposes partial voices on API failure", () => {
    const f = audioFixture();
    let now = 0;
    const sound = createScanSound({ enabled: true, createContext: f.createContext, now: () => now });
    for (let i = 0; i < 20; i++) { sound.issue(); now += 70; }
    expect(f.sources).toHaveLength(12);
    sound.stop(); vi.runAllTimers();
    const broken = audioFixture();
    const quiet = createScanSound({ enabled: true, createContext: broken.createContext });
    broken.ctx.createGain.mockImplementationOnce(() => { throw new Error("device lost"); });
    expect(() => quiet.foot(20, 800)).not.toThrow();
    expect(broken.sources[0].stop).toHaveBeenCalledOnce();
    expect(broken.sources[0].disconnect).toHaveBeenCalledOnce();
    quiet.stop(); vi.runAllTimers();
    expect(broken.ctx.close).toHaveBeenCalledOnce();
  });
});

describe("inactive/hidden scans", () => {
  it("releases all walking voices while hidden and resumes without duplicate hums", () => {
    const f = audioFixture();
    const sound = createScanSound({ enabled: true, createContext: f.createContext });
    sound.walking(true);
    sound.setActive(false); sound.setActive(false);
    sound.foot(0, 800); sound.issue(); sound.dash(); sound.walking(true);
    expect(f.sources).toHaveLength(1);
    vi.advanceTimersByTime(50);
    expect(f.sources[0].disconnect).toHaveBeenCalledOnce();
    sound.setActive(true); sound.walking(true); sound.walking(true);
    expect(f.ctx.resume).toHaveBeenCalledTimes(2);
    expect(f.sources).toHaveLength(2);
    sound.stop(); vi.runAllTimers();
    expect(f.ctx.close).toHaveBeenCalledOnce();
  });
  it("stays silent if the report opens in a hidden tab and closes its idle context", () => {
    const f = audioFixture();
    const sound = createScanSound({ enabled: true, createContext: f.createContext });
    sound.setActive(false); sound.finish(); sound.complete();
    expect(f.sources).toHaveLength(0);
    vi.runAllTimers();
    expect(f.ctx.close).toHaveBeenCalledOnce();
  });
});
