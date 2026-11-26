// Past writings: the question, essay and full report of recent checks, so a student can reopen them.
// Kept only in this browser's localStorage (never sent anywhere); chart images are left out to save space.
import type { Draft, MarkResult } from "./types";

export interface Writing {
  id: string; // same id as the history entry
  date: string;
  draft: Draft;
  essay: string;
  minutes: number | null;
  result: MarkResult;
}

export const WRITINGS_KEY = "bandexe-writings-v1";
const MAX = 30;
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const defaultStore = (): Store | null => {
  try { return window.localStorage; } catch { return null; }
};

export function loadWritings(store: Store | null = defaultStore()): Writing[] {
  try {
    const v = JSON.parse(store?.getItem(WRITINGS_KEY) || "[]");
    return Array.isArray(v) ? v.filter((w) => w && typeof w.id === "string" && typeof w.essay === "string"
      && Number.isFinite(Date.parse(w.date)) && w.draft && typeof w.draft.question === "string"
      && w.result && typeof w.result.report === "object" && w.result.report) : [];
  } catch { return []; }
}

export function saveWriting(writing: Writing, store: Store | null = defaultStore()): Writing[] {
  let next = [...loadWritings(store).filter((w) => w.id !== writing.id), writing].slice(-MAX);
  // A full storage drops the oldest writings first; scores in history are kept separately.
  while (next.length) {
    try { store?.setItem(WRITINGS_KEY, JSON.stringify(next)); return next; }
    catch { next = next.slice(1); }
  }
  return next;
}

export function clearWritings(store: Store | null = defaultStore()): void {
  try { store?.removeItem(WRITINGS_KEY); } catch { /* ignore */ }
}
