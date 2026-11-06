import { describe, it, expect } from "vitest";
import { addEntry, clearHistory, loadHistory, personalBest, previousBest, type HistoryEntry } from "../src/lib/history";

const e = (id: string, task: HistoryEntry["task"], overall: number | null): HistoryEntry => ({
  id, task, overall, date: "2026-10-25T00:00:00Z", range: null,
  bands: { tr: 7, cc: 6, lr: 7, gra: 6 }, words: 260, markingVersion: "v", priorities: [],
});

function memStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}

describe("history comparison", () => {
  const hist = [e("a", "t2", 6), e("b", "t2", null), e("c", "gt1", 7.5)];
  it("finds the previous best per task type, ignoring withheld results", () => {
    expect(previousBest(hist, "t2")).toBe(6);
    expect(previousBest(hist, "gt1")).toBe(7.5);
    expect(previousBest(hist, "ac1")).toBeNull();
  });
  it("celebrates only a valid overall that beats the same task type", () => {
    expect(personalBest(hist, e("d", "t2", 6.5))).toEqual({ prev: 6, next: 6.5 });
    expect(personalBest(hist, e("d", "t2", 6))).toBeNull(); // equal is not a new best
    expect(personalBest(hist, e("d", "gt1", 7))).toBeNull(); // Task 2 score does not count
    expect(personalBest(hist, e("d", "ac1", 9))).toBeNull(); // first result of a type
    expect(personalBest(hist, e("d", "t2", null))).toBeNull(); // withheld
  });
  it("does not compare an entry with itself once saved", () => {
    const d = e("d", "t2", 6.5);
    expect(personalBest([...hist, d], d)).toEqual({ prev: 6, next: 6.5 });
  });
});

describe("history storage", () => {
  it("saves, loads and deletes, tolerating bad data", () => {
    const s = memStore();
    addEntry(e("a", "t2", 6), s);
    expect(loadHistory(s)).toHaveLength(1);
    clearHistory(s);
    expect(loadHistory(s)).toEqual([]);
    s.setItem("bandexe-history-v1", "{broken");
    expect(loadHistory(s)).toEqual([]);
    expect(loadHistory(null)).toEqual([]);
  });
});
