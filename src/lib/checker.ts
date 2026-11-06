// Checker settings and the student's key stay in this browser; storage may be blocked.
export type Checker = "free" | "site" | "own" | "device";
export interface CheckerSettings { mode: Checker; key: string }
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const MODE = "bandexe-checker", KEY = "bandexe-own-key";
const storage = (): Store | null => { try { return localStorage; } catch { return null; } };

/** Retired or corrupt choices always return to the working default. */
export function loadChecker(store: Store | null = storage()): CheckerSettings {
  try {
    const key = store?.getItem(KEY)?.trim() || "", saved = store?.getItem(MODE);
    const mode = saved === "own" && key ? "own" : "free";
    if (saved !== mode) { try { store?.setItem(MODE, mode); } catch { /* read-only storage */ } }
    return { key, mode };
  } catch { return { mode: "free", key: "" }; }
}

export function saveChecker(settings: CheckerSettings, store: Store | null = storage()): boolean {
  try {
    if (!store) return false;
    store.setItem(MODE, settings.mode);
    if (settings.key) store.setItem(KEY, settings.key); else store.removeItem(KEY);
    return true;
  } catch { return false; }
}

let current: CheckerSettings | undefined;
let modeGeneration = 0;
export const getCheckerGeneration = () => modeGeneration;
const listeners = new Set<() => void>();
export const getChecker = () => {
  if (current) return current;
  return current = loadChecker();
};
const storageChanged = (e: StorageEvent) => {
  if (e.key !== null && e.key !== MODE && e.key !== KEY) return;
  const next = loadChecker();
  if (next.mode !== getChecker().mode || next.key !== getChecker().key) ++modeGeneration;
  current = next; listeners.forEach((fn) => fn());
};
export function onCheckerChange(fn: () => void) {
  listeners.add(fn);
  if (listeners.size === 1 && typeof window !== "undefined") window.addEventListener("storage", storageChanged);
  return () => {
    listeners.delete(fn);
    if (!listeners.size && typeof window !== "undefined") window.removeEventListener("storage", storageChanged);
  };
}
export function setChecker(patch: Partial<CheckerSettings>): boolean {
  if (patch.mode && patch.mode !== "own") patch = { ...patch, mode: "free" };
  if (patch.mode && patch.mode !== getChecker().mode || patch.key !== undefined && patch.key !== getChecker().key) ++modeGeneration;
  current = { ...getChecker(), ...patch };
  const saved = saveChecker(current);
  listeners.forEach((fn) => fn());
  return saved;
}

export const checkerLabel = (checker: Checker = "free") => ({
  free: "Checked with the Free checker", site: "Checked with the site checker", own: "Checked with your own Gemini key", device: "Checked on this device (feedback only)",
})[checker];
export const isSiteLimit = (checker?: Checker, code?: string) => checker === "site" && ["limit", "busy", "quota"].includes(code || "");
/** Codes that mean Gemini's allowance (site or own key) is used up: our server's limit/busy, or Google's quota/429. */
export const LIMIT_CODES = ["limit", "busy", "quota", "429"];
export const isGeminiLimit = (checker?: Checker, code?: string) => (checker === "site" || checker === "own") && LIMIT_CODES.includes(code || "");
export const FALLBACK_NOTICE = "Gemini's free daily allowance is used up, so this was checked on your device instead.";

interface GPU { requestAdapter: () => Promise<unknown> }
export async function deviceAvailability(gpu: GPU | undefined = (typeof navigator === "undefined" ? undefined : (navigator as Navigator & { gpu?: GPU }).gpu)): Promise<string> {
  try {
    if (!gpu || !await gpu.requestAdapter()) return "WebGPU is not supported in this browser. Use My own key for your own quota.";
  } catch { return "WebGPU is not available in this browser. Use My own key for your own quota."; }
  return ""; // Support alone is not consent. Do not import WebLLM or touch model files here.
}
