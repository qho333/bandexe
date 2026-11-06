import { updateAllowance } from "./allowance";
import { REGION_MESSAGE } from "../../shared/eligibility.js";
import { getAuth } from "./auth";
import { browserId } from "./cloud-request";

type Store = Pick<Storage, "getItem" | "setItem">;
const AGE = "bandexe-age-confirmed";
const storage = (): Store | null => { try { return localStorage; } catch { return null; } };
export const AGE_MESSAGE = "Gemini checking is for people aged 18 or over (Google's rule). The Free checker is open to everyone.";
export interface GeminiAccess { allowed: boolean | null; reason?: "region" | "unavailable"; confirmed: boolean; fixture: boolean }
export class GeminiAccessError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

export function createGeminiAccess(getStore: () => Store | null = storage) {
  const readAge = () => { try { return getStore()?.getItem(AGE) === "1"; } catch { return false; } };
  let state: GeminiAccess = { allowed: null, confirmed: readAge(), fixture: false };
  let loading: Promise<void> | undefined;
  const listeners = new Set<() => void>();
  const update = (patch: Partial<GeminiAccess>) => { state = { ...state, ...patch }; listeners.forEach((fn) => fn()); };
  const load = (fetchFn: typeof fetch = fetch) => loading ??= (async () => {
    const accountRevision = getAuth().revision;
    try {
      const browser = browserId();
      const res = await fetchFn("/api/health", { cache: "no-store", ...(browser ? { headers: { "X-Browser": browser } } : {}) });
      if (!res.ok) throw new Error("health");
      const h = await res.json();
      if (getAuth().revision === accountRevision) updateAllowance(h);
      // The local Node server predates the region field; Pages always sends it.
      const local = typeof location !== "undefined" && ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
      if (h?.ok !== true || (h.gemini ? typeof h.gemini.allowed !== "boolean" : !local)) throw new Error("health");
      update({ allowed: h.gemini?.allowed ?? true, reason: h.gemini?.allowed === false ? "region" : undefined, fixture: Boolean(h.fixture) });
    } catch { update({ allowed: false, reason: "unavailable" }); }
  })();
  const confirmAge = () => {
    try { getStore()?.setItem(AGE, "1"); } catch { /* this page only */ }
    update({ confirmed: true });
  };
  const assert = () => {
    if (state.allowed !== true) throw new GeminiAccessError(state.reason || "unavailable", state.reason === "region" ? REGION_MESSAGE : "Gemini availability could not be checked. Use the Free checker or reload to try again.");
    if (!state.confirmed && !readAge()) throw new GeminiAccessError("age", AGE_MESSAGE);
  };
  return {
    getSnapshot: () => state,
    subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    load, confirmAge, assert,
    require: async () => { await load(); assert(); },
  };
}

export const geminiAccess = createGeminiAccess();
export const geminiAccessMessage = (access: GeminiAccess) => access.reason === "region" ? REGION_MESSAGE
  : access.allowed === null ? "Checking Gemini availability. The Free checker is open to everyone."
    : "Gemini availability could not be checked. Use the Free checker or reload to try again.";
