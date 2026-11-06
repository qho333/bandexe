import { SAMPLE_QUESTIONS } from "../content";
import type { Draft, Task } from "./types";
export const DRAFT_KEY = "bandexe-draft";
export function loadDraft(): Draft {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if (d && typeof d.essay === "string" && ["t2", "gt1", "ac1"].includes(d.task)) return {
      task: d.task, essay: d.essay, question: typeof d.question === "string" ? d.question : SAMPLE_QUESTIONS[d.task as Task][0],
      ...(typeof d.chartDescription === "string" ? { chartDescription: d.chartDescription } : {}),
    };
  } catch { /* Storage may be blocked or corrupt. */ }
  return { task: "t2", question: SAMPLE_QUESTIONS.t2[0], essay: "" };
}

/** Report storage failure to the editor instead of promising that an unsaved draft is safe. */
export function persistDraft(draft: Draft): boolean {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); return true; }
  catch { return false; }
}
