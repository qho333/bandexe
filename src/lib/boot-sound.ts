import { createCueGate, createSynth, type SynthOptions } from "./sound";
export { MASTER_GAIN } from "./sound";

/** Original, local Web Audio synthesis. No media, network, or persistent audio graph. */
export type BootCue = "key" | "stream" | "ok" | "glitch" | "handoff";
export const SOUND_GAP_MS: Record<BootCue, number> = { key: 35, stream: 55, ok: 160, glitch: 75, handoff: 600 };

/** A separate gate per texture: catch-up batches cannot multiply the volume. */
export const createSoundGate = () => createCueGate(SOUND_GAP_MS);

export interface BootSound {
  play(cue: BootCue): void;
  resume(): Promise<void> | void;
  state(): AudioContextState | "unavailable";
  stop(): void;
}
interface Options extends SynthOptions { now?: () => number }

export function createBootSound({ now = () => performance.now(), random = Math.random, ...options }: Options): BootSound {
  const silent: BootSound = { play() {}, resume() {}, state: () => "unavailable", stop() {} };
  const synth = createSynth({ ...options, random });
  if (!synth) return silent;
  const gate = createSoundGate();
  const { tone, hiss } = synth;
  return {
    resume: synth.resume,
    state: synth.state,
    stop: synth.stop,
    play(cue) {
      if (!synth.ready() || !gate(cue, now())) return;
      if (cue === "key") tone(750 + random() * 1100, 180 + random() * 180, 0.018, 0.09, "triangle");
      if (cue === "stream") {
        hiss(0.065, 0.045, 1600 + random() * 1200, 550);
        tone(1000 + random() * 1000, 650, 0.025, 0.025, "triangle");
      }
      if (cue === "ok") tone(820, 1120, 0.055, 0.13);
      if (cue === "glitch") {
        hiss(0.085, 0.14, 2800, 180);
        tone(75 + random() * 70, 45, 0.07, 0.06, "sawtooth");
      }
      if (cue === "handoff") {
        hiss(0.5, 0.18, 160, 1200);
        tone(48, 115, 0.5, 0.15);
      }
    },
  };
}
