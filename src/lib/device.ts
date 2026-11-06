import { deviceAvailability } from "./checker";
import { deviceInput, deviceResult, type DeviceInput } from "./device-report";
import type { Engine } from "./engines";
import type { Draft } from "./types";

export interface DeviceProgress { progress: number; text: string; timeElapsed: number }
export interface DeviceRuntime {
  cached(): Promise<boolean>;
  load(signal: AbortSignal, progress: (report: DeviceProgress) => void, options?: { allowDownload: boolean }): Promise<void>;
  generate(input: DeviceInput, signal: AbortSignal): Promise<string>;
  generateText?(system: string, user: string, signal: AbortSignal): Promise<string>;
  remove(): Promise<void>;
  dispose(): void;
}
export interface DeviceState {
  status: "idle" | "checking" | "unsupported" | "consent" | "loading" | "ready" | "marking" | "removing" | "error";
  message: string;
  progress: DeviceProgress | null;
  cached: boolean | null;
}
export type DeviceChecker = ReturnType<typeof createDeviceChecker>;
const cancelled = () => new DOMException("On-device check cancelled. No score was produced.", "AbortError");

/**
 * Downloads require enable(true) with download consent; resume() can only load cached models.
 * resume() may load without a click only when deps.resumable() confirms nothing will download
 * (Nano already "available", or a WebLLM model this browser finished downloading after an earlier consent).
 */
export function createDeviceChecker(deps: {
  availability: () => Promise<string>;
  runtime: () => Promise<DeviceRuntime>;
  engine?: Engine;
  resumable?: () => Promise<boolean>;
  remember?: (complete: boolean) => void;
} = {
  availability: deviceAvailability,
  runtime: async () => (await import("./device.runtime")).createRuntime(),
}) {
  let state: DeviceState = { status: "idle", message: "Checking WebGPU support…", progress: null, cached: null };
  const listeners = new Set<() => void>();
  let runtime: DeviceRuntime | undefined, operation: AbortController | undefined;
  let consent = false, generation = 0;
  const begin = () => { operation?.abort(cancelled()); const op = new AbortController(); operation = op; const id = ++generation; return { op, current: () => generation === id && !op.signal.aborted }; };
  const update = (patch: Partial<DeviceState>) => { state = { ...state, ...patch }; listeners.forEach((fn) => fn()); };
  const check = async () => {
    if (!["idle", "unsupported"].includes(state.status)) return;
    const { op, current } = begin();
    update({ status: "checking", message: "Checking WebGPU support…" });
    try {
      const message = await deps.availability();
      if (current()) update({ status: message ? "unsupported" : "consent", message });
    } finally { if (operation === op) operation = undefined; }
  };
  const load = async (allowDownload: boolean, op: AbortController, current: () => boolean) => {
    consent = false;
    update({ status: "loading", message: "Preparing the on-device checker…", progress: null });
    let loaded: DeviceRuntime | undefined;
    try {
      const unavailable = await deps.availability();
      if (!current()) return;
      if (unavailable) { update({ status: "unsupported", message: unavailable }); return; }
      loaded = await deps.runtime();
      if (!current()) { loaded.dispose(); return; }
      runtime = loaded;
      const cached = await loaded.cached();
      if (!current()) return;
      update({ cached });
      // A resumed WebLLM cache may have been evicted since resumable() ran.
      if (!allowDownload && !cached) {
        loaded.dispose(); runtime = undefined;
        update({ status: "consent", message: "The model needs downloading. Choose Download and enable first.", cached: false, progress: null });
        return;
      }
      await loaded.load(op.signal, (progress) => {
        if (current()) update({ progress, message: progress.text });
      }, { allowDownload });
      if (current()) {
        consent = true;
        deps.remember?.(true);
        update({ status: "ready", cached: true, message: "Ready. Unlimited, on your device. The model is cached for next time.", progress: null });
      }
    } catch (e) {
      if (current()) {
        loaded?.dispose(); runtime = undefined; consent = false;
        if ((e as Error).name === "DownloadConsentError") {
          update({ status: "consent", cached: false, message: (e as Error).message, progress: null });
        } else update({ status: "error", message: `Could not load the on-device checker: ${(e as Error).message}. Check free storage and graphics memory, or use My own key.`, progress: null });
      }
    }
  };
  const enable = async (accepted: boolean, options = { allowDownload: true }) => {
    if (!accepted || !["consent", "error"].includes(state.status)) return;
    const { op, current } = begin();
    try { await load(options.allowDownload, op, current); }
    finally { if (operation === op) operation = undefined; }
  };
  const release = () => {
    ++generation; operation?.abort(cancelled()); operation = undefined;
    runtime?.dispose(); runtime = undefined; consent = false;
    if (["checking", "loading", "marking", "ready"].includes(state.status)) update({ status: "consent", message: "Unloaded to free memory. Nothing downloads until you choose Download and enable again.", progress: null });
  };
  const cancel = () => {
    if (!["loading", "marking", "checking"].includes(state.status)) return;
    release();
    update({ status: "consent", message: "Cancelled. Downloaded files may remain cached; you can remove them below.", progress: null });
  };
  const resume = async (): Promise<boolean> => {
    if (consent && state.status === "ready" && runtime) return true;
    if (operation || !["idle", "unsupported", "consent", "error"].includes(state.status)) return false;
    // Own the operation BEFORE the first await, including the cache/availability probe.
    const { op, current } = begin();
    try {
      const resumable = await (deps.resumable?.() ?? false);
      if (!current() || !resumable) return false;
      await load(false, op, current);
      return current() && (state as DeviceState).status === "ready";
    } finally { if (operation === op) operation = undefined; }
  };
  const mark = async (draft: Draft) => {
    // Validate before any model operation; an Evaluate click is never download consent.
    const input = deviceInput(draft);
    if (!consent || state.status !== "ready" || !runtime) {
      const resuming = resume(), expectedGeneration = generation;
      const resumed = await resuming;
      if (generation !== expectedGeneration) throw cancelled();
      if (!resumed) throw new Error("Enable the on-device checker with Download and enable in the editor first. No model was downloaded by this check.");
    }
    if (!consent || state.status !== "ready" || !runtime) throw new Error("Enable the on-device checker with Download and enable in the editor first. No model was downloaded by this check.");
    const { op, current } = begin();
    update({ status: "marking", message: "Checking your essay on this device…" });
    try {
      const text = await runtime.generate(input, op.signal);
      if (!current()) throw cancelled();
      return deviceResult(text, input, deps.engine);
    } catch (e) {
      if (!current()) throw cancelled();
      runtime?.dispose(); runtime = undefined; consent = false;
      update({ status: "error", message: `${(e as Error).message} Enable the model again to retry.` });
      throw e;
    } finally {
      if (operation === op) operation = undefined;
      if (current() && (state as DeviceState).status === "marking") update({ status: "ready", message: "Ready. Unlimited, on your device." });
    }
  };
  const text = async (system: string, user: string) => {
    if (state.status !== "ready" && !await resume()) throw new Error("No ready on-device helper. Nothing was downloaded.");
    if (!runtime?.generateText || state.status !== "ready" || operation) throw new Error("The on-device helper is busy or unavailable.");
    const { op, current } = begin();
    update({ status: "marking", message: "Thinking on this device…" });
    try {
      const answer = await runtime.generateText(system, user, op.signal);
      if (!current()) throw cancelled();
      return answer;
    } finally {
      if (operation === op) operation = undefined;
      if (current()) update({ status: "ready", message: "Ready. Unlimited, on your device." });
    }
  };
  const remove = async () => {
    if (["loading", "marking", "removing", "checking"].includes(state.status)) return;
    // Cache deletion is a separate explicit action; it never calls engine.reload().
    consent = false; runtime?.dispose(); runtime = undefined; deps.remember?.(false);
    update({ status: "removing", message: "Removing downloaded model…", progress: null });
    let cleaner: DeviceRuntime | undefined;
    try {
      cleaner = await deps.runtime();
      await cleaner.remove();
      update({ cached: false });
      const unavailable = await deps.availability();
      update({ status: unavailable ? "unsupported" : "consent", message: unavailable || "Downloaded model removed." });
    } catch (e) { update({ status: "error", message: `Could not remove the downloaded model: ${(e as Error).message}. Clear this site's browser data to remove it.` }); }
    finally { cleaner?.dispose(); }
  };
  return { getSnapshot: () => state, subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; }, check, enable, cancel, mark, text, remove, resume, release,
    canResume: () => deps.resumable?.() ?? Promise.resolve(false) };
}
