import { vi } from "vitest";

const param = () => ({ value: 0.15, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() });
export function audioFixture(state = "running") {
  const sources: ReturnType<typeof source>[] = [];
  const gains: ReturnType<typeof gain>[] = [];
  const source = () => ({ connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null as null | (() => void), frequency: param(), type: "", buffer: null });
  const gain = () => ({ connect: vi.fn(), disconnect: vi.fn(), gain: param() });
  const panners: { connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; pan: ReturnType<typeof param> }[] = [];
  const ctx = Object.assign(new EventTarget(), {
    state, currentTime: 2, sampleRate: 1000, destination: {},
    createStereoPanner: vi.fn(() => { const node = { connect: vi.fn(), disconnect: vi.fn(), pan: param() }; panners.push(node); return node; }),
    createGain: vi.fn(() => { const node = gain(); gains.push(node); return node; }),
    createBuffer: vi.fn(() => ({ getChannelData: () => new Float32Array(600) })),
    createOscillator: vi.fn(() => { const node = source(); sources.push(node); return node; }),
    createBufferSource: vi.fn(() => { const node = source(); sources.push(node); return node; }),
    createBiquadFilter: vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn(), frequency: param(), Q: { value: 0 }, type: "" })),
    resume: vi.fn(() => Promise.resolve()), close: vi.fn(() => Promise.resolve()),
  });
  const createContext = vi.fn(() => ctx as unknown as AudioContext);
  return { ctx, sources, gains, panners, createContext };
}
