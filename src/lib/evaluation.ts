import { getChecker, getCheckerGeneration, type CheckerSettings } from "./checker";
import { countWords } from "./fixes";
import type { Chart, Draft } from "./types";

export interface EvaluationSelection extends CheckerSettings {
  modeGeneration: number;
}
export class EvaluationCancelled extends Error {
  code = "cancelled";
  constructor() { super("Checker changed. Press Evaluate again to check with your new choice."); }
}
export function captureEvaluation(_legacy?: unknown): EvaluationSelection {
  return { ...getChecker(), modeGeneration: getCheckerGeneration() };
}
export function assertEvaluation(selection: EvaluationSelection, _legacy?: unknown) {
  if (selection.mode !== getChecker().mode || selection.key !== getChecker().key
    || selection.modeGeneration !== getCheckerGeneration()) throw new EvaluationCancelled();
}

/** The ref lock covers submission synchronously, including two clicks in one render. */
export async function evaluateDraft(lock: { current: boolean }, pending: boolean, draft: Draft, chart: Chart | null,
  submit: (selection: EvaluationSelection) => Promise<void>, _legacy?: unknown) {
  if (lock.current || pending) return;
  lock.current = true;
  try {
    const requested = captureEvaluation();
    if (draft.question.trim().length < 10) throw new Error("Add the question you are answering.");
    if (countWords(draft.essay) < 50) throw new Error("Write at least 50 words before asking for an estimate.");
    if (draft.task === "ac1" && !chart && !draft.chartDescription?.trim()) throw new Error("Academic Task 1 needs a chart image or a typed chart description so the marker can check your data.");
    if (requested.mode === "own" && !requested.key) throw new Error("Save your free Gemini key below before checking.");
    const reason = evaluationReason(draft, chart, false, requested);
    if (reason) throw new Error(reason);
    assertEvaluation(requested);
    await submit(requested);
  } finally { lock.current = false; }
}

/** Shared visible preflight copy for the sidebar and phone action bar. */
export function evaluationReason(draft: Draft, chart: Chart | null, pending = false, checker = getChecker()): string {
  if (pending) return "A check is already running. Open Results to see its progress.";
  if (draft.question.trim().length < 10) return "Add the question you are answering (at least 10 characters).";
  if (draft.question.length > 3000) return "Shorten the question to 3,000 characters or fewer.";
  const words = countWords(draft.essay);
  if (words < 50) return `Write at least 50 words — ${words} so far.`;
  if (words > 1200 || draft.essay.length > 12000) return "Shorten your answer to at most 1,200 words and 12,000 characters.";
  if (draft.task === "ac1" && !chart && !draft.chartDescription?.trim()) return "Upload a chart image or type its title, labels, units, key figures and trends before checking Academic Task 1.";
  if ((draft.chartDescription?.length || 0) > 6000) return "Keep the chart description to 6,000 characters or fewer.";
  if (checker.mode === "own" && !checker.key) return "Save your free Gemini key in Check below before checking.";
  return "";
}
