import { describe, expect, it } from "vitest";
import { noBands, reviewReport } from "../shared/review.js";

describe("feedback text cleanup", () => {
  it("drops raw band numbers that could contradict the calibrated bands", () => {
    expect(noBands("Fix agreement errors (e.g., 'it have') to raise Grammar to band 6.")).toBe("Fix agreement errors (e.g., 'it have').");
    expect(noBands("Add one specific detail to move from band 6 to 7 in Task Response.")).toBe("Add one specific detail.");
    expect(noBands("Clear position (band 7 feature) but thin ideas.")).toBe("Clear position but thin ideas.");
    expect(noBands("Accuracy needed for band 7 is missing.")).toBe("Accuracy needed is missing.");
    expect(noBands("Use precise collocations to enhance Lexical Resource.")).toBe("Use precise collocations to enhance Lexical Resource.");
  });
  it("cleans every advice field and hides upgrades that repeat a correction", () => {
    const essay = "It make the country more richer. It is not waste.";
    const r = reviewReport({
      criteria: { tr: { band: 6, summary: "Thin ideas, typical (band 6)." }, cc: { band: 6, summary: "ok" }, lr: { band: 6, summary: "ok" }, gra: { band: 5, summary: "ok" } },
      grammar_corrections: [{ original: "make the country more richer", corrected: "make the country richer", reason: "Double comparative." }],
      word_choice_upgrades: [{ original: "more richer", better: "wealthier", reason: "x" }, { original: "not waste", better: "not a waste of money", reason: "y" }],
      paragraphs: [], structure_advice: "Develop ideas to reach band 7.", strengths: [], top_3_priorities: ["Fix errors to raise Grammar to band 6."],
    }, essay);
    expect(r.criteria.tr.summary).toBe("Thin ideas, typical.");
    expect(r.structureAdvice).toBe("Develop ideas.");
    expect(r.priorities).toEqual(["Fix errors."]);
    expect(r.upgrades.map((u) => u.original)).toEqual(["not waste"]);
    expect(r.dropped.upgrades).toBe(0);
  });
});

describe("exact-quote review", () => {
  const base = { criteria: {}, paragraphs: [], strengths: [], top_3_priorities: [] };
  it("rejects quotes that cut a word but keeps whole-word and punctuation quotes", () => {
    const essay = "They make the country more richer, so it is good. Café owners agree.";
    const r = reviewReport({ ...base, grammar_corrections: [], word_choice_upgrades: [
      { original: "rich", better: "wealthy", reason: "x" }, { original: "ichér", better: "y", reason: "x" },
      { original: "richer, so", better: "richer; so", reason: "x" }, { original: ", so it", better: "; it", reason: "x" },
      { original: "Café", better: "Coffee shop", reason: "x" }] }, essay);
    expect(r.upgrades.map((u) => u.original)).toEqual(["richer, so", ", so it", "Café"]);
    expect(r.dropped.upgrades).toBe(2);
  });
  it("rejects a quote whose first occurrence cuts a word, since fixes apply there", () => {
    const r = reviewReport({ ...base, grammar_corrections: [], word_choice_upgrades: [{ original: "rich", better: "wealthy", reason: "x" }] },
      "It is richer than other rich countries.");
    expect(r.upgrades).toEqual([]);
  });
});
