import { describe, expect, it } from "vitest";
import { loadHistory, HISTORY_KEY } from "../src/lib/history";
import { dropForeignScript } from "../src/lib/feedback";

const memory = (value: unknown) => { const data = new Map([[HISTORY_KEY, JSON.stringify(value)]]); return { getItem: (k: string) => data.get(k) ?? null, setItem: () => {}, removeItem: () => {} }; };
const entry = { id: "a", date: "2026-11-07T00:00:00Z", task: "ac1", overall: 6.5, range: { lo: 6, hi: 7 }, bands: { tr: 4, cc: 7, lr: 7, gra: 7 }, words: 180, markingVersion: "v", priorities: ["ตรวจสอบคำถาม", "Kiểm tra số liệu"], language: "vi" };

describe("wrong-alphabet feedback", () => {
  it("hides saved priorities written in another alphabet", () => {
    expect(loadHistory(memory([entry]))[0].priorities).toEqual(["Kiểm tra số liệu"]);
    expect(loadHistory(memory([{ ...entry, language: "th" }]))[0].priorities).toHaveLength(2);
  });
  it("drops foreign explanations from a fresh report but keeps quotes", () => {
    const fix = { original: "datas", corrected: "data", reason: "ข้อมูล", criterion: "gra" as const };
    const c = { band: 6, summary: "ดี", subskills: [] };
    const r = dropForeignScript({ criteria: { tr: c, cc: { ...c, summary: "Tốt" }, lr: c, gra: c }, grammar: [fix], upgrades: [], paragraphs: [],
      structureAdvice: "Rõ ràng", strengths: ["ดี"], priorities: ["Viết rõ hơn", "เขียน"], dropped: { grammar: 0, upgrades: 0 } }, "vi");
    expect([r.criteria.tr.summary, r.criteria.cc.summary, r.grammar[0].reason, r.grammar[0].original]).toEqual(["", "Tốt", "", "datas"]);
    expect([r.strengths, r.priorities, r.structureAdvice]).toEqual([[], ["Viết rõ hơn"], "Rõ ràng"]);
  });
});
