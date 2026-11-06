/** Shared, original Web Audio voices. No files, network or permanent voices. */
let sharedContext: AudioContext | undefined;
const active = new Set<() => void>();
const getContext = () => {
  if (!sharedContext || sharedContext.state === "closed") sharedContext = new AudioContext();
  return sharedContext;
};
export const silenceSounds = () => active.forEach((clear) => clear());
export const MASTER_GAIN = 0.15;
export interface SynthOptions {
  enabled: boolean;
  onBlocked?: (blocked: boolean) => void;
  createContext?: () => AudioContext;
  random?: () => number;
}

/** Independent gates also suppress catch-up batches of animation frames. */
export function createCueGate<C extends string>(gaps: Record<C, number>) {
  const last: Partial<Record<C, number>> = {};
  return (cue: C, now: number) => {
    if (!Number.isFinite(now) || now - (last[cue] ?? -Infinity) < gaps[cue]) return false;
    last[cue] = now;
    return true;
  };
}

export function createSynth({ enabled, onBlocked = () => {}, createContext = getContext, random = Math.random }: SynthOptions) {
  if (!enabled) return null;
  let ctx: AudioContext;
  let master: GainNode;
  let noise: AudioBuffer;
  try {
    ctx = createContext();
    master = ctx.createGain();
    master.gain.setValueAtTime(MASTER_GAIN, ctx.currentTime);
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.6), ctx.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = random() * 2 - 1;
  } catch {
    if (createContext !== getContext) void ctx!?.close().catch(() => {});
    return null;
  }
  let stopped = false;
  const voices = new Map<AudioScheduledSourceNode, { chain: AudioNode[]; gain: GainNode; timer?: ReturnType<typeof setTimeout> }>();
  const ready = () => !stopped && ctx.state === "running" && voices.size < 12;
  const report = () => { if (!stopped) onBlocked(ctx.state !== "running" && ctx.state !== "closed"); };
  const resume = () => {
    if (stopped || ctx.state === "closed") return Promise.resolve();
    let pending: Promise<void>;
    try { pending = ctx.resume().then(report, report); } catch { report(); return Promise.resolve(); }
    report(); // Some browsers leave resume pending until a user gesture.
    return pending;
  };
  const unlock = () => resume();
  if (typeof document !== "undefined") {
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
  }
  ctx.addEventListener("statechange", report);
  resume();

  const dispose = (source: AudioScheduledSourceNode) => {
    const voice = voices.get(source);
    if (!voice) return;
    clearTimeout(voice.timer);
    source.onended = null;
    source.disconnect();
    voice.chain.forEach((node) => node.disconnect());
    voices.delete(source);
  };
  type OwnNode = <N extends AudioNode>(node: N) => N;
  // Own nodes immediately, including a partially constructed voice if a device/API call fails.
  const build = <S extends AudioScheduledSourceNode, T>(factory: () => S, setup: (source: S, own: OwnNode, chain: AudioNode[]) => T): T | null => {
    let source: S | undefined;
    const chain: AudioNode[] = [];
    const own: OwnNode = (node) => { chain.push(node); return node; };
    try { source = factory(); return setup(source, own, chain); } catch {
      if (source) {
        try { source.stop(); } catch { /* not started/already ended */ }
        if (voices.has(source)) dispose(source);
        else { source.disconnect(); chain.forEach((node) => node.disconnect()); }
      }
      return null;
    }
  };
  const envelope = (duration: number, volume: number, own: OwnNode, delay = 0) => {
    const gain = own(ctx.createGain()), at = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + Math.min(0.015, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    gain.connect(master);
    return gain;
  };
  const start = (source: AudioScheduledSourceNode, chain: AudioNode[], gain: GainNode, duration?: number, delay = 0) => {
    voices.set(source, { chain, gain });
    source.onended = () => dispose(source);
    source.start(ctx.currentTime + delay);
    if (duration !== undefined) source.stop(ctx.currentTime + delay + duration);
  };
  const tone = (frequency: number, end: number, duration: number, volume: number, type: OscillatorType = "sine", pan?: number, delay = 0) => {
    if (!ready()) return;
    build(() => ctx.createOscillator(), (source, own, chain) => {
      const gain = envelope(duration, volume, own, delay);
      source.type = type;
      source.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
      source.frequency.exponentialRampToValueAtTime(end, ctx.currentTime + delay + duration);
      if (pan !== undefined && typeof ctx.createStereoPanner === "function") {
        const panner = own(ctx.createStereoPanner());
        panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), ctx.currentTime);
        source.connect(panner); panner.connect(gain);
      } else source.connect(gain);
      start(source, chain, gain, duration, delay);
    });
  };
  const hiss = (duration: number, volume: number, frequency: number, end: number) => {
    if (!ready()) return;
    build(() => ctx.createBufferSource(), (source, own, chain) => {
      const filter = own(ctx.createBiquadFilter()), gain = envelope(duration, volume, own);
      source.buffer = noise;
      filter.type = "lowpass";
      filter.Q.value = 0.6;
      filter.frequency.setValueAtTime(frequency, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(end, ctx.currentTime + duration);
      source.connect(filter); filter.connect(gain);
      start(source, chain, gain, duration);
    });
  };
  const hum = (frequency: number, volume: number) => {
    if (!ready()) return null;
    return build(() => ctx.createOscillator(), (source, own, chain) => {
      const gain = own(ctx.createGain());
      source.type = "sine";
      source.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      source.connect(gain); gain.connect(master);
      start(source, chain, gain);
      return (walking: boolean) => {
        if (stopped || !voices.has(source)) return;
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(walking ? volume : 0, ctx.currentTime + 0.07);
      };
    });
  };
  /** End every source with a short fade, retaining only the idle context for the report chord. */
  const clear = () => {
    voices.forEach((voice, source) => {
      if (voice.timer) return;
      try {
        voice.gain.gain.cancelScheduledValues(ctx.currentTime);
        voice.gain.gain.setValueAtTime(voice.gain.gain.value, ctx.currentTime);
        voice.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.035);
        source.stop(ctx.currentTime + 0.035);
      } catch { /* already ended */ }
      voice.timer = setTimeout(() => { try { source.stop(); } catch { /* ended */ } dispose(source); }, 50);
    });
  };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    active.delete(clear);
    ctx.removeEventListener("statechange", report);
    if (typeof document !== "undefined") {
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
    }
    onBlocked(false);
    const close = () => {
      voices.forEach((_, source) => {
        try { source.stop(); } catch { /* already ended */ }
        dispose(source);
      });
      master.disconnect();
      if (createContext !== getContext) void ctx.close().catch(() => {});
    };
    if (ctx.state !== "running") { close(); return; }
    try {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.035);
    } catch { close(); return; }
    setTimeout(close, 50);
  };
  active.add(clear);
  return { ready, state: () => ctx.state, resume, tone, hiss, hum, clear, stop };
}
