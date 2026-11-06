// Guest history: results only (bands, overall, word count, priorities), never the essay text.
// Stored in this browser's localStorage; every access is wrapped because storage can be blocked.
import { reportThemes } from "./progress";
import type { Crit, MarkResult, Task } from "./types";
import { feedbackText } from "./feedback";

export interface HistoryEntry {
  id: string;
  date: string; // ISO
  task: Task;
  overall: number | null;
  range: { lo: number; hi: number } | null;
  bands: Record<Crit, number | null>;
  words: number;
  markingVersion: string;
  checker?: MarkResult["checker"];
  feedbackOnly?: boolean; // stored without any band; never plotted or celebrated
  priorities: string[];
  themes?: string[];
}

export const HISTORY_KEY = "bandexe-history-v1";
const KEY = HISTORY_KEY;
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const defaultStore = (): Store | null => {
  try { return window.localStorage; } catch { return null; }
};

export function loadHistory(store: Store | null = defaultStore()): HistoryEntry[] {
  try {
    const v = JSON.parse(store?.getItem(KEY) || "[]");
    if (!Array.isArray(v)) return [];
    const band = (n: unknown) => n === null || typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 9;
    return v.filter((entry): entry is HistoryEntry => entry && typeof entry.id === "string"
      && ["t2", "gt1", "ac1"].includes(entry.task) && Number.isFinite(Date.parse(entry.date))
      && band(entry.overall) && ["tr", "cc", "lr", "gra"].every((c) => band(entry.bands?.[c]))
      && typeof entry.words === "number" && Number.isFinite(entry.words) && entry.words >= 0
      && Array.isArray(entry.priorities) && entry.priorities.every((p: unknown) => typeof p === "string")
      && (!entry.themes || Array.isArray(entry.themes) && entry.themes.every((t: unknown) => typeof t === "string"))
      && (entry.range === null || entry.range && band(entry.range.lo) && band(entry.range.hi)
        && typeof entry.range.lo === "number" && typeof entry.range.hi === "number" && entry.range.lo <= entry.range.hi))
      .map((entry) => entry.feedbackOnly ? { ...entry, overall: null, range: null,
        bands: { tr: null, cc: null, lr: null, gra: null }, priorities: entry.priorities.map(feedbackText).filter(Boolean) } : entry).slice(-200);
  } catch {
    return [];
  }
}

export function toEntry(r: MarkResult, now = new Date()): HistoryEntry {
  const feedbackOnly = r.feedbackOnly === true;
  return {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    date: now.toISOString(),
    task: r.task,
    overall: feedbackOnly ? null : r.overall,
    range: feedbackOnly ? null : r.range,
    bands: Object.fromEntries(Object.entries(r.report.criteria).map(([k, c]) => [k, feedbackOnly ? null : c.band])) as Record<Crit, number | null>,
    words: r.words,
    markingVersion: r.markingVersion,
    checker: r.checker || "site",
    ...(feedbackOnly ? { feedbackOnly } : {}),
    themes: reportThemes(r.report),
    priorities: (feedbackOnly ? r.report.priorities.map(feedbackText).filter(Boolean) : r.report.priorities).slice(0, 3),
  };
}

/** Best previous valid overall for the same task type, or null when there is none. */
export function previousBest(history: HistoryEntry[], task: Task): number | null {
  const vals = history.filter((h) => h.task === task && !h.feedbackOnly && typeof h.overall === "number").map((h) => h.overall as number);
  return vals.length ? Math.max(...vals) : null;
}

/** A personal best needs a valid new overall that beats an earlier result of the same task type. */
export function personalBest(history: HistoryEntry[], entry: HistoryEntry): { prev: number; next: number } | null {
  if (entry.overall === null || entry.feedbackOnly) return null;
  const prev = previousBest(history.filter((h) => h.id !== entry.id), entry.task);
  return prev !== null && entry.overall > prev ? { prev, next: entry.overall } : null;
}

export function addEntry(entry: HistoryEntry, store: Store | null = defaultStore()): HistoryEntry[] {
  const next = [...loadHistory(store), entry].slice(-200);
  try { store?.setItem(KEY, JSON.stringify(next)); } catch { /* storage full or blocked: keep in memory */ }
  return next;
}

export function clearHistory(store: Store | null = defaultStore()): void {
  try { store?.removeItem(KEY); } catch { /* ignore */ }
}
