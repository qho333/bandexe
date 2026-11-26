import { describe, expect, it } from "vitest";
import { clearWritings, loadWritings, saveWriting, WRITINGS_KEY, type Writing } from "../src/lib/writings";
import type { MarkResult } from "../src/lib/types";

const memory = (limit = Infinity) => {
  const data = new Map<string, string>();
  return { data, getItem: (k: string) => data.get(k) ?? null, removeItem: (k: string) => { data.delete(k); },
    setItem: (k: string, v: string) => { if (v.length > limit) throw new Error("QuotaExceededError"); data.set(k, v); } };
};
const writing = (i: number): Writing => ({ id: `id${i}`, date: new Date(2026, 0, i + 1).toISOString(), essay: `Essay ${i}`, minutes: null,
  draft: { task: "t2", question: `Question ${i}`, essay: `Essay ${i}` }, result: { task: "t2", overall: 6, words: 2, report: { grammar: [] } } as unknown as MarkResult });

describe("past writings", () => {
  it("saves, reopens, keeps the newest 30 and clears", () => {
    const store = memory();
    for (let i = 0; i < 33; i++) saveWriting(writing(i), store);
    const list = loadWritings(store);
    expect(list).toHaveLength(30);
    expect(list[0].id).toBe("id3"); expect(list.at(-1)?.essay).toBe("Essay 32");
    clearWritings(store); expect(loadWritings(store)).toEqual([]);
  });
  it("drops the oldest when storage is full and ignores broken data", () => {
    const one = JSON.stringify([writing(0)]).length;
    const store = memory(one * 2 + 10);
    for (let i = 0; i < 5; i++) saveWriting(writing(i), store);
    expect(loadWritings(store).map((w) => w.id)).toEqual(["id3", "id4"]);
    store.data.set(WRITINGS_KEY, JSON.stringify([{ id: 1 }, null, writing(9)]));
    expect(loadWritings(store).map((w) => w.id)).toEqual(["id9"]);
    store.data.set(WRITINGS_KEY, "{bad");
    expect(loadWritings(store)).toEqual([]);
  });
});
