import { cloudRequest } from "./cloud-request";
import { mark } from "../../shared/index.js";
import type { MarkInput } from "../../shared/index.js";
import { getChecker } from "./checker";
import { geminiAccess } from "./gemini";
import { testerHeaders } from "./tester";
import type { MarkResult, Report } from "./types";

/** Expanding explanations must never change scores or invalidate accepted suggestion IDs. */
export function expandReport(original: MarkResult, detail: MarkResult): MarkResult {
  const append = (before: Report["grammar"], after: Report["grammar"]) => [...before, ...after.filter((f) => !before.some((old) => old.original === f.original))];
  return { ...original, reportMode: "full", report: { ...detail.report,
    criteria: Object.fromEntries(Object.entries(original.report.criteria).map(([key, c]) => [key, {
      ...detail.report.criteria[key as keyof Report["criteria"]], band: c.band,
      // Additional model judgements are not the original evaluation's subskill scores.
      subskills: c.subskills,
    }])) as Report["criteria"],
    grammar: append(original.report.grammar, detail.report.grammar), upgrades: append(original.report.upgrades, detail.report.upgrades),
  } };
}

export function createDetailCache() {
  const cache = new Map<string, Promise<MarkResult>>();
  return (key: string, generate: () => Promise<MarkResult>) => {
    let result = cache.get(key);
    if (!result) {
      result = generate().catch((error) => { cache.delete(key); throw error; });
      cache.set(key, result);
      if (cache.size > 20) cache.delete(cache.keys().next().value!);
    }
    return result;
  };
}
const cachedDetail = createDetailCache();
export async function getReportDetail(input: MarkInput): Promise<MarkResult> {
  const { mode, key } = getChecker();
  // Include language, chart and checker identity; never write credentials or this cache to storage.
  return cachedDetail(JSON.stringify([mode, key, input]), async () => {
    if (mode === "own") {
      await geminiAccess.require();
      if (!key) throw new Error("Save your Gemini key in the editor first.");
      return mark({ ...input, reportMode: "full" }, { key });
    }
    let res: Response;
    try { res = await cloudRequest("/api/report-detail", { method: "POST", headers: { "Content-Type": "application/json", ...testerHeaders() },
      body: JSON.stringify({ ...input, reportMode: "full", ...(input.image ? { chartImageBase64: input.image.data, mime: input.image.mime } : {}) }) }); }
    catch { throw new Error("Cannot reach the server. Check your connection, then press Full detail again."); }
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.report?.criteria) throw new Error(data?.message || "Full detail is unavailable. Try again in a minute; your compact report is ready below.");
    return data;
  });
}
