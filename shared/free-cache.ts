import { digest, type QuotaStore } from "./traffic";
import type { MarkInput } from "./index.js";
import type { MarkResult } from "../src/lib/types";
import { buildOpenSystem, FREE_PROMPT_VERSION } from "./prompt.js";
import { OPEN_CALIBRATIONS } from "./score.js";
import { timedCall } from "./free-traffic.js";

export const FREE_CACHE_TTL = 86400;
// Only content and marking semantics identify a report; never credentials or identity.
// Include the chart so identical prose about different figures cannot share a report.
export async function freeCacheKey(input: MarkInput, version = FREE_PROMPT_VERSION) {
  return `cache:${await digest(JSON.stringify([input.task, input.question, input.essay,
    input.feedbackLanguage || "en", version, buildOpenSystem(input), OPEN_CALIBRATIONS, input.image ?? null, input.chartDescription ?? null]))}`;
}

export async function readFreeCache(store: QuotaStore, key: string): Promise<MarkResult | null> {
  try {
    const text = await timedCall(() => store.get(key), 2000);
    if (!text) return null;
    const result = JSON.parse(text);
    if (result.checker !== "free" || typeof result.markingVersion !== "string" || !result.report?.criteria
      || typeof result.overall !== "number" || result.withheld?.length !== 0) return null;
    return result;
  } catch { return null; } // Optional cache outages must not disable marking or log content.
}

export async function writeFreeCache(store: QuotaStore, key: string, result: MarkResult) {
  // Do not preserve partial/unreadable feedback for a day.
  if (result.overall == null || result.withheld.length) return;
  try { await timedCall(() => store.put(key, JSON.stringify(result), { expirationTtl: FREE_CACHE_TTL }), 2000); }
  catch { /* KV capacity/write collisions must not discard a reviewed report. */ }
}
