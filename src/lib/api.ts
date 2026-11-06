import { cloudRequest } from "./cloud-request";
import { getAllowance, updateAllowance } from "./allowance";
import type { Chart, Draft, MarkResult } from "./types";
import { mark, validateMarkRequest } from "../../shared/index.js";
import { type Checker } from "./checker";
import { chromeFeedback } from "./chrome-feedback";
import { assertEvaluation, captureEvaluation, type EvaluationSelection } from "./evaluation";
import { geminiAccess, GeminiAccessError } from "./gemini";
import { testerHeaders } from "./tester";
import { getAuth } from "./auth";

export class ApiError extends Error {
  constructor(message: string, public code: string) { super(message); }
}

export const POOL_EMPTY_MESSAGE = "The free checkers are full right now. Try again in a few minutes — if it keeps happening, today's free capacity is used up and resets at midnight UTC.";

async function markCloud(draft: Draft, chart: Chart | null, mode: Checker, key: string): Promise<MarkResult> {
  const body: Record<string, string> = { feedbackLanguage: draft.feedbackLanguage || "en", task: draft.task, question: draft.question, essay: draft.essay, chartDescription: draft.chartDescription || "" };
  if (draft.task === "ac1" && chart) { body.chartImageBase64 = chart.base64; body.mime = chart.mime; }
  if (mode === "own") {
    if (!key) throw new ApiError("Save your free Gemini key in the editor first. No score was produced.", "missing_key");
    const v = validateMarkRequest(body);
    if (!v.ok) throw new ApiError(v.error, "invalid");
    try { return { ...await mark(v.value, { key }), checker: "own" }; }
    catch (e) { throw new ApiError((e as Error).message, (e as { code?: string }).code || "unavailable"); }
  }
  let res: Response;
  const accountRevision = getAuth().revision;
  try {
    res = await cloudRequest("/api/mark", { method: "POST", headers: { "Content-Type": "application/json", ...testerHeaders(), ...(mode === "site" ? { "X-Age-Confirmed": "1", "X-Provider": "gemini" } : {}) }, body: JSON.stringify(body) });
  } catch {
    throw new ApiError("Cannot reach the BAND.EXE server. Check your connection and try again. No score was produced.", "network");
  }
  const data = await res.json().catch(() => null);
  if (mode === "free" && data && getAuth().revision === accountRevision) updateAllowance(data);
  if (mode === "free" && ["pool_empty", "daily_limit"].includes(data?.error)) throw new ApiError(data.error === "daily_limit" ? `Your ${getAllowance().limit} free checks for today are used up. They reset at midnight UTC — come back tomorrow.` : POOL_EMPTY_MESSAGE, data.error);
  if (!res.ok || !data) throw new ApiError(data?.message || `The server returned an error (${res.status}). No score was produced.`, data?.error || (res.status === 429 ? "429" : "server"));
  // The local Node fallback can still return a calibrated Gemini report or fixture.
  const checker = mode === "free" && String(data.markingVersion).startsWith("report-v1/gemini") ? "site" : mode;
  return { ...data, checker } as MarkResult;
}

/** Only the default cloud path may use Chrome feedback when its model is already available. */
export async function markEssay(draft: Draft, chart: Chart | null, _legacy?: unknown,
  selection: EvaluationSelection = captureEvaluation()): Promise<MarkResult> {
  assertEvaluation(selection);
  const { mode, key } = selection;
  if (mode === "own") try { await geminiAccess.require(); }
  catch (e) { if (e instanceof GeminiAccessError) throw new ApiError(e.message, e.code); throw e; }
  assertEvaluation(selection);
  try {
    const result = await markCloud(draft, chart, mode, key);
    assertEvaluation(selection);
    return result;
  } catch (e) {
    if (mode !== "free" || !(e instanceof ApiError) || !["pool_empty", "daily_limit", "network"].includes(e.code)) throw e;
    const feedback = await chromeFeedback(draft, () => assertEvaluation(selection)).catch(() => null);
    assertEvaluation(selection);
    if (!feedback) throw e;
    return { ...feedback, notice: e.code === "network"
      ? "The cloud checker could not be reached. Chrome's built-in AI supplied feedback only, without a band estimate."
      : "Today's free checks are used up. Chrome's built-in AI supplied feedback only, without a band estimate." };
  }
}

/** Turns a student's picture of a question into editable text (shared helper allowance). */
export async function readQuestionPicture(imageBase64: string, mime: string): Promise<string> {
  let res: Response;
  try { res = await cloudRequest("/api/question-image", { method: "POST", headers: { "Content-Type": "application/json", ...testerHeaders() }, body: JSON.stringify({ imageBase64, mime }) }); }
  catch { throw new ApiError("The picture could not be sent. Check your connection and try again.", "network"); }
  const data = await res.json().catch(() => null);
  if (!res.ok || typeof data?.question !== "string") throw new ApiError(data?.message || "The picture could not be read. Type the question instead.", data?.error || "unavailable");
  return data.question;
}
