import { matchIssues } from "./scan";
import type { Fix } from "./types";

/** Rebuild from submitted spans so rejecting never replaces an unrelated copy of a correction. */
export function reviewCorrections(submitted: string, current: string, grammar: Fix[], upgrades: Fix[], states: Record<string, string>, ids: string[], accept: boolean) {
  const issues = matchIssues([submitted], grammar, upgrades);
  const key = (i: typeof issues[number]) => (i.kind === "grammar" ? "g" : "u") + i.index;
  const render = (review: Record<string, string>) => {
    let text = submitted;
    for (const issue of issues.slice().reverse()) {
      if (review[key(issue)] !== "accepted") continue;
      const f = (issue.kind === "grammar" ? grammar : upgrades)[issue.index];
      text = text.slice(0, issue.start) + (f.corrected ?? f.better ?? f.original) + text.slice(issue.end);
    }
    return text;
  };
  const next = { ...states };
  let failed = false;
  // A manual edit invalidates the submitted offsets. Never guess which occurrence to change.
  if (current !== render(states)) return { text: current, states: next, failed: true };
  for (const id of ids) {
    if (accept && !issues.some((issue) => key(issue) === id)) { next[id] = "missing"; failed = true; }
    else next[id] = accept ? "accepted" : "rejected";
  }
  return { text: render(next), states: next, failed };
}
