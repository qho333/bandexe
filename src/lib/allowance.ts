import { DAILY_LIMITS } from "../../shared/limits.js";
let state: { remaining: number | null; limit: number } = { remaining: null, limit: DAILY_LIMITS.checksPerDay };
const listeners = new Set<() => void>();
export const getAllowance = () => state;
export const onAllowance = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export function updateAllowance(data: { remainingToday?: unknown; dailyLimit?: unknown }) {
  state = { remaining: typeof data.remainingToday === "number" ? data.remainingToday : null,
    limit: typeof data.dailyLimit === "number" ? data.dailyLimit : state.limit };
  listeners.forEach((fn) => fn());
}
