import { getTesterMode, testerHeaders } from "./tester";
import type { Stats } from "../../shared/storage.js";
export const VISIT_KEY = "bandexe-visited";
export const FIRST_SEEN_KEY = "bandexe-first-seen";
export const FIRST_REPORT_KEY = "bandexe-first-report";
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
function localStore(): Store | undefined {
  try { return localStorage; } catch { return undefined; }
}
// Only same-tab calls are coalesced; the server never receives a session identifier.
let pendingVisit: Promise<void> | undefined;
export function recordVisit(storage?: Store, fetchFn: typeof fetch = fetch, local = localStore()): Promise<void> {
  if (pendingVisit) return pendingVisit;
  try {
    storage ??= sessionStorage;
    if (storage.getItem(VISIT_KEY)) return Promise.resolve();
    storage.setItem(VISIT_KEY, "1");
  } catch { return Promise.resolve(); } // Without dedupe storage, avoid counting every reload.
  let first = false;
  try {
    first = Boolean(local && !getTesterMode() && !local.getItem(FIRST_SEEN_KEY));
    if (first) local?.setItem(FIRST_SEEN_KEY, "1");
  } catch { first = false; }
  pendingVisit = Promise.resolve().then(async () => {
    try {
      const res = await fetchFn("/api/hit", { method: "POST", credentials: "omit", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(10000),
        headers: { ...testerHeaders(), "Content-Type": "application/json", "X-Requested-With": "bandexe" },
        body: JSON.stringify(first ? { first: true } : {}) });
      if (!res.ok) throw new Error("hit");
    } catch {
      try { storage?.removeItem(VISIT_KEY); } catch { /* no persistence */ }
      try { if (first) local?.removeItem(FIRST_SEEN_KEY); } catch { /* no persistence */ }
    }
  }).finally(() => { pendingVisit = undefined; });
  return pendingVisit;
}
// Called only once a scored report is visible; never send essay/report content.
export async function recordStudent(storage = localStore(), fetchFn: typeof fetch = fetch): Promise<void> {
  try {
    if (!storage || getTesterMode() || storage.getItem(FIRST_REPORT_KEY)) return;
    storage.setItem(FIRST_REPORT_KEY, "1");
  } catch { return; }
  try {
    const res = await fetchFn("/api/hit", { method: "POST", credentials: "omit", referrerPolicy: "no-referrer",
      headers: { "Content-Type": "application/json", "X-Requested-With": "bandexe", ...testerHeaders() }, body: JSON.stringify({ student: true }), signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error("hit");
  } catch { try { storage?.removeItem(FIRST_REPORT_KEY); } catch { /* Optional stats. */ } }
}
export function countryName(code: string, locale = "en"): string {
  try { return new Intl.DisplayNames([locale], { type: "region" }).of(code) || code; }
  catch { return code; }
}
export const formatCount = (n: number) => new Intl.NumberFormat("en", { notation: n >= 1000000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);
export function sparkline(values: number[], width = 600, height = 100): string {
  const max = Math.max(1, ...values);
  return values.map((n, i) => `${(i * width / Math.max(1, values.length - 1)).toFixed(2)},${(height - Math.max(0, n) / max * height).toFixed(2)}`).join(" ");
}
let cached: { until: number; value: Stats } | undefined;
let inFlight: Promise<Stats> | undefined;
export function loadStats(): Promise<Stats> {
  if (cached && cached.until > Date.now()) return Promise.resolve(cached.value);
  if (inFlight) return inFlight;
  inFlight = fetch("/api/stats", { credentials: "omit", signal: AbortSignal.timeout(5000) }).then(async (res) => {
    if (!res.ok) throw new Error("stats");
    const value = await res.json() as Stats;
    if (!Array.isArray(value.days) || !Number.isFinite(value.visits) || !Number.isFinite(value.essays)) throw new Error("stats");
    cached = { until: Date.now() + 300000, value };
    return value;
  }).finally(() => { inFlight = undefined; });
  return inFlight;
}
