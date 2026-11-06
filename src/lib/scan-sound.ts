import { createCueGate, createSynth, type SynthOptions } from "./sound";

export const SCAN_SOUND_GAP_MS = { foot: 65, issue: 70, dash: 600 };
export const createScanSoundGate = () => createCueGate(SCAN_SOUND_GAP_MS);
/** Quiet stereo placement across the actual canvas; invalid/empty geometry stays centred. */
export const footPan = (x: number, width: number) =>
  Number.isFinite(x) && Number.isFinite(width) && width > 0 ? Math.max(-0.8, Math.min(0.8, (x / width * 2 - 1) * 0.8)) : 0;
/** A gentle semitone rise per newly boxed issue, capped after eight increments. */
export const issuePitch = (index: number) => 660 * 2 ** (Math.min(8, Math.max(0, Math.floor(Number.isFinite(index) ? index : 0))) / 12);

export interface ScanSound {
  setActive(active: boolean): void;
  foot(x: number, width: number): void;
  walking(active: boolean): void;
  issue(): void;
  dash(): void;
  finish(): void;
  complete(): void;
  stop(): void;
}

/** Created/resumed in the Evaluate gesture, before any asynchronous preflight. */
export function createScanSound({ now = () => performance.now(), random = Math.random, ...options }: SynthOptions & { now?: () => number }): ScanSound {
  const synth = createSynth({ ...options, random });
  if (!synth) return { setActive() {}, foot() {}, walking() {}, issue() {}, dash() {}, finish() {}, complete() {}, stop() {} };
  const gate = createScanSoundGate();
  let ended = false, stopped = false, completed = false, audible = true, issueIndex = 0;
  let humming: ((active: boolean) => void) | null = null;
  let walking = false;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  const finish = () => {
    if (ended || stopped) return;
    ended = true;
    humming = null;
    synth.clear();
  };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearTimeout(closeTimer);
    synth.stop();
  };
  return {
    setActive(active) {
      if (stopped || audible === active) return;
      audible = active;
      if (active) synth.resume();
      else { humming = null; walking = false; synth.clear(); }
    },
    foot(x, width) {
      if (ended || stopped || !audible || !synth.ready() || !gate("foot", now())) return;
      const pitch = 540 + random() * 100;
      synth.tone(pitch, pitch * 0.58, 0.027, 0.045, "triangle", footPan(x, width));
    },
    walking(active) {
      if (ended || stopped || !audible) return;
      // Retry lazily after resume resolves, without creating oscillators while suspended.
      if (active && !humming) humming = synth.hum(108, 0.045) ?? null;
      if (active !== walking) humming?.(active);
      // If the context was suspended, keep retrying until a hum exists.
      walking = active && !!humming;
    },
    issue() {
      const pitch = issuePitch(issueIndex++);
      if (ended || stopped || !audible || !synth.ready() || !gate("issue", now())) return;
      synth.tone(pitch, pitch * 1.12, 0.13, 0.12);
      synth.tone(pitch * 1.5, pitch * 1.52, 0.17, 0.045);
    },
    dash() {
      if (ended || stopped || !audible || !synth.ready() || !gate("dash", now())) return;
      synth.hiss(0.34, 0.08, 280, 1400);
      synth.tone(180, 410, 0.3, 0.055);
    },
    finish,
    complete() {
      if (stopped || completed) return;
      finish();
      completed = true;
      // C major in a comfortable register; summed envelopes stay well below clipping.
      if (audible) for (const pitch of [523.25, 659.25, 783.99]) synth.tone(pitch, pitch, 0.42, 0.10);
      closeTimer = setTimeout(stop, 470);
    },
    stop,
  };
}
