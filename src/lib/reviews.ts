import type { PendingReview, Review } from "../../shared/storage.js";
import { testerHeaders } from "./tester";

export const RATING_KEY = "bandexe-ratings";
type Store = Pick<Storage, "getItem" | "setItem">;
const today = () => new Date().toISOString().slice(0, 10);
function localStore(): Store | undefined {
  try { return localStorage; } catch { return undefined; }
}
function usedToday(storage?: Store): number {
  try {
    const value = JSON.parse(storage?.getItem(RATING_KEY) || "null");
    return value?.day === today() && Number.isSafeInteger(value.n) && value.n > 0 ? value.n : 0;
  } catch { return 0; }
}
// Reserve synchronously, including across reports in this tab. Only day/count persist.
export function reserveRating(storage = localStore()): (() => void) | null {
  const used = usedToday(storage);
  if (used >= 5) return null;
  try { storage?.setItem(RATING_KEY, JSON.stringify({ day: today(), n: used + 1 })); } catch { /* Server still limits. */ }
  const day = today();
  return () => {
    if (day !== today()) return;
    try { storage?.setItem(RATING_KEY, JSON.stringify({ day, n: Math.max(0, usedToday(storage) - 1) })); } catch { /* Optional storage. */ }
  };
}
async function request(path: string, body?: object, fetchFn: typeof fetch = fetch) {
  const res = await fetchFn(path, { method: body ? "POST" : "GET", credentials: "omit", referrerPolicy: "no-referrer",
    headers: { ...testerHeaders(), ...(body ? { "Content-Type": "application/json", "X-Requested-With": "bandexe" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000) });
  const value = await res.json();
  if (!res.ok) throw new Error(value.message || "Feedback is temporarily unavailable. Your report is ready.");
  return value;
}
export async function sendReview(review: Review, fetchFn: typeof fetch = fetch, storage = localStore()) {
  const release = reserveRating(storage);
  if (!release) throw new Error("You can send up to five ratings per UTC day. Thanks for your feedback.");
  try { await request("/api/review", review, fetchFn); }
  catch (error) { release(); throw error; }
}
export async function loadPendingReviews(): Promise<PendingReview[]> {
  return (await request("/api/reviews/pending")).reviews;
}
export async function moderateReview(id: number, status: "approved" | "hidden") {
  await request("/api/reviews/moderate", { id, status });
}
