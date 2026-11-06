// Pure helpers for the "Checking your answer" scan: which phrases get a box, and when the report may open.
import type { Crit, Fix } from "./types";

export type IssueKind = "grammar" | "upgrade";
export interface Issue {
  id: number;
  para: number; // paragraph index (after paragraphs() splitting)
  start: number; // UTF-16 offsets inside that paragraph
  end: number;
  crit: Crit;
  kind: IssueKind;
  index: number; // position of the fix in its list (grammar or upgrades)
}

/**
 * Map reviewed fixes to exact spans of the essay, in reading order.
 * First occurrence of each quote wins; a quote that is not found inside one paragraph, or that
 * overlaps an earlier span, gets no box (it is still listed in the report).
 */
export function matchIssues(paras: string[], grammar: Fix[], upgrades: Fix[]): Issue[] {
  const found: Omit<Issue, "id">[] = [];
  const add = (f: Fix, kind: IssueKind, index: number) => {
    if (!f.original || !f.original.trim()) return;
    for (let p = 0; p < paras.length; p++) {
      const at = paras[p].indexOf(f.original);
      if (at < 0) continue;
      const end = at + f.original.length;
      if (!found.some((h) => h.para === p && at < h.end && end > h.start)) found.push({ para: p, start: at, end, crit: f.criterion, kind, index });
      return;
    }
  };
  grammar.forEach((f, i) => add(f, "grammar", i));
  upgrades.forEach((f, i) => add(f, "upgrade", i));
  found.sort((a, b) => a.para - b.para || a.start - b.start);
  return found.map((h, id) => ({ ...h, id }));
}

/** Split one paragraph into plain text and issue segments (for rendering spans). */
export function segments(text: string, para: number, issues: Issue[]): { text: string; issue?: Issue }[] {
  const out: { text: string; issue?: Issue }[] = [];
  let pos = 0;
  for (const h of issues.filter((i) => i.para === para)) {
    if (h.start > pos) out.push({ text: text.slice(pos, h.start) });
    out.push({ text: text.slice(h.start, h.end), issue: h });
    pos = h.end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos) });
  return out;
}

/**
 * The report opens only when the result is back AND the scan has finished
 * (spider reached the bottom and boxed every issue, or the fallback sequence ended, or the user skipped).
 */
export function canOpenReport(s: { status: "pending" | "done" | "error"; scanDone: boolean; skipped: boolean }): boolean {
  return s.status === "done" && (s.scanDone || s.skipped);
}

/**
 * Once the result is back the crawl gets a bounded budget (seconds): it hurries, and at the end of the budget the
 * spider wraps up (boxes the rest, dashes to the bottom). HARD_STOP seconds later the scan ends regardless.
 */
export const crawlBudget = (issues: number) => Math.min(16, 6 + 0.45 * Math.max(0, issues));
export const HARD_STOP = 3;

/** Milliseconds from `now` until the wrap-up and until the forced finish, given when the result arrived (0 = now). */
export function scanDeadlines(doneAt: number, now: number, issues: number) {
  const wrap = doneAt + crawlBudget(issues) * 1000 - now;
  return { wrapIn: Math.max(0, wrap), stopIn: Math.max(0, wrap + HARD_STOP * 1000) };
}

/** Add box ids once each, keeping the order they were boxed in. */
export const addBoxes = (have: number[], ids: number[]) => {
  const out = have.slice();
  for (const id of ids) if (!out.includes(id)) out.push(id);
  return out.length === have.length ? have : out;
};

export const CODE: Record<Crit, string> = { tr: "TR", cc: "CC", lr: "LR", gra: "GRA" };
export const issueTag = (i: Pick<Issue, "crit" | "kind">) => `${CODE[i.crit]} · ${i.kind === "grammar" ? "grammar" : "word choice"}`;

/** Merge per-fragment client rects into one rect per visual line (same top within 4px). */
export function mergeLines<R extends { left: number; right: number; top: number; bottom: number }>(rects: R[]) {
  const lines: { left: number; right: number; top: number; bottom: number }[] = [];
  for (const r of rects) {
    if (r.right - r.left < 1) continue;
    const l = lines.find((q) => Math.abs(q.top - r.top) < 4);
    if (l) { l.left = Math.min(l.left, r.left); l.right = Math.max(l.right, r.right); l.bottom = Math.max(l.bottom, r.bottom); }
    else lines.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
  }
  return lines.sort((a, b) => a.top - b.top);
}

/** Reading progress uses the furthest paragraph actually reached, never the marker's elapsed time. */
export function scanProgress(reached: number, total: number, complete = false) {
  const count = Math.max(0, Math.floor(total));
  const paragraph = count ? Math.min(count, Math.max(1, Math.floor(reached) + 1)) : 0;
  return {
    text: complete ? "Scan complete" : paragraph ? `Scanning paragraph ${paragraph} of ${count}` : "Waiting for essay text",
    value: complete ? count : Math.max(0, paragraph - 1),
    max: count || 1,
  };
}

export const SCAN_EVENTS = { start: "bandexe:scan-start", end: "bandexe:scan-end", report: "bandexe:report-open" } as const;
/** Per evaluation, independent of renders, motion, sound and scan re-entry. No essay or result payload. */
export function createScanEvents(dispatch: (event: CustomEvent) => void = (event) => { window.dispatchEvent(event); }) {
  const sent = new Set<keyof typeof SCAN_EVENTS>();
  const emit = (name: keyof typeof SCAN_EVENTS) => {
    if (sent.has(name)) return;
    sent.add(name);
    dispatch(new CustomEvent(SCAN_EVENTS[name]));
  };
  return {
    start: () => emit("start"),
    end: () => { emit("start"); emit("end"); },
    report: () => { emit("start"); emit("end"); emit("report"); },
  };
}
