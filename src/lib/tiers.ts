// "On this device": probe what the device can run, auto-pick an engine (or the student's override),
// and keep one lazily created checker per engine. Probing never imports WebLLM or creates a Nano session.
import { deviceAvailability, getChecker, onCheckerChange, type Checker } from "./checker";
import { createDeviceChecker, type DeviceChecker } from "./device";
import { ENGINES, engineGivesBands, pickEngine, WEBLLM_MODEL, type DeviceProbe, type Engine, type EngineChoice, type EnginePick, type NanoState } from "./engines";

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const CHOICE = "bandexe-device-engine", DONE = (e: Engine) => `bandexe-device-done-${e}`;
const storage = (): Store | null => { try { return localStorage; } catch { return null; } };
const read = (store: Store | null, k: string) => { try { return store?.getItem(k) ?? null; } catch { return null; } };
const write = (store: Store | null, k: string, v: string | null) => { try { if (v === null) store?.removeItem(k); else store?.setItem(k, v); } catch { /* blocked */ } };

export const NANO_UNAVAILABLE = "Chrome's built-in AI is not available in this browser. Choose another engine, or use Gemini.";
// The Prompt API module is lazy too: the main chunk holds no Nano code.
const nanoState = async (): Promise<NanoState> => (await import("./nano")).nanoAvailability();

interface GPUAdapterLike { limits?: { maxBufferSize?: number } }
interface NavigatorLike { gpu?: { requestAdapter: () => Promise<GPUAdapterLike | null> }; deviceMemory?: number }
export async function probeDevice(nav: NavigatorLike | undefined = typeof navigator === "undefined" ? undefined : navigator as NavigatorLike, nano: () => Promise<NanoState> = nanoState): Promise<DeviceProbe> {
  let webgpu = false, maxBufferSize: number | undefined;
  try {
    const adapter = await nav?.gpu?.requestAdapter();
    if (adapter) { webgpu = true; maxBufferSize = adapter.limits?.maxBufferSize; }
  } catch { /* blocked or crashed adapter: treat as no WebGPU */ }
  const nanoNow = await nano().catch((): NanoState => "unavailable");
  return { nano: nanoNow, webgpu, maxBufferSize, deviceMemory: typeof nav?.deviceMemory === "number" ? nav.deviceMemory : undefined };
}

/** Per-engine checkers. A WebLLM engine may resume without a click only after it once finished loading here and is still cached. */
export function engineChecker(engine: Engine, store: Store | null = storage()): DeviceChecker {
  if (engine === "nano") return createDeviceChecker({
    engine,
    availability: async () => ((await nanoState()) === "unavailable" ? NANO_UNAVAILABLE : ""),
    runtime: async () => (await import("./nano")).createNanoRuntime(),
    resumable: async () => (await nanoState()) === "available",
  });
  const runtime = async () => (await import("./device.runtime")).createRuntime({ model: WEBLLM_MODEL[engine], bands: engineGivesBands(engine) });
  return createDeviceChecker({
    engine, availability: deviceAvailability, runtime,
    resumable: async () => {
      if (read(store, DONE(engine)) !== "1" || await deviceAvailability()) return false;
      const r = await runtime();
      try { return await r.cached(); } finally { r.dispose(); }
    },
    remember: (complete) => write(store, DONE(engine), complete ? "1" : null),
  });
}

export interface TiersState { probe: DeviceProbe | null; pick: EnginePick | null; choice: EngineChoice }

export function createTiers(deps: { probe: () => Promise<DeviceProbe>; checker: (engine: Engine) => DeviceChecker; store: Store | null } = {
  probe: () => probeDevice(), checker: (e) => engineChecker(e), store: storage(),
}) {
  const saved = read(deps.store, CHOICE);
  let state: TiersState = { probe: null, pick: null, choice: saved === "auto" || ENGINES.includes(saved as Engine) ? saved as EngineChoice : "auto" };
  const listeners = new Set<() => void>();
  const checkers = new Map<Engine, DeviceChecker>();
  let probing: Promise<void> | undefined;
  let selectionGeneration = 0;
  const update = (patch: Partial<TiersState>) => { state = { ...state, ...patch }; listeners.forEach((fn) => fn()); };
  const checker = (e: Engine) => { let c = checkers.get(e); if (!c) checkers.set(e, c = deps.checker(e)); return c; };
  const engine = (s: TiersState = state): Engine | null => (s.choice !== "auto" ? s.choice : s.pick?.engine ?? null);
  const probe = () => probing ??= deps.probe().then((p) => update({ probe: p, pick: pickEngine(p) }));
  const releaseAll = (keep: Engine | null = null) => checkers.forEach((c, e) => { if (e !== keep) c.release(); });
  const setChoice = (choice: EngineChoice) => {
    if (choice !== state.choice) ++selectionGeneration;
    write(deps.store, CHOICE, choice);
    update({ choice });
    releaseAll(engine()); // switching engines destroys the previous worker/session
  };
  /** For the Gemini-limit fallback: an engine that runs now with no download and no new consent, or null. */
  const readyEngine = async (): Promise<Engine | null> => {
    await probe();
    const first = engine(), order = [first, ...ENGINES.filter((e) => e !== first)].filter((e): e is Engine => !!e);
    for (const e of order) if (checkers.get(e)?.getSnapshot().status === "ready") return e;
    for (const e of order) if (await checker(e).canResume().catch(() => false)) return e;
    return null;
  };
  return {
    getSnapshot: () => state, subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    probe, engine: () => engine(), checker, active: () => { const e = engine(); return e ? checker(e) : null; },
    reconcile: (mode: Checker) => releaseAll(mode === "device" ? engine() : null),
    setChoice, releaseAll, readyEngine, getGeneration: () => selectionGeneration,
  };
}

export const deviceTiers = createTiers();

/** Subscribe synchronously so even batched mode changes reconcile allocations and pending loads. */
export function watchCheckerRuntimes(tiers = deviceTiers) {
  let mode = getChecker().mode;
  tiers.reconcile(mode);
  const unsubscribe = onCheckerChange(() => {
    const next = getChecker().mode;
    if (next !== mode) { mode = next; tiers.reconcile(mode); }
  });
  return () => { unsubscribe(); tiers.releaseAll(); };
}
