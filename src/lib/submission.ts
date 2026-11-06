import type { Chart, Draft } from "./types";

/** Keep the exact submitted inputs in page memory so Retry cannot mark a later draft by mistake. */
export function captureSubmission(draft: Draft, chart: Chart | null) {
  return { draft: { ...draft }, chart: chart ? { ...chart } : null };
}
