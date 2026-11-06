import { describe, it, expect } from "vitest";
import type { HistoryEntry } from "../src/lib/history";
import {
  chooseNextStep, criterionTrends, keyTokens, normalisePriority, practiceRhythm, recurringDifficulties,
  samePriority, signed, summarize, weakestCriterion,
} from "../src/lib/progress";

// Local noon dates keep day bucketing independent of the test machine's time zone.
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).toISOString();

const e = (id: string, date: string, overall: number | null, b: [number | null, number | null, number | null, number | null], priorities: string[] = [], extra: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id, date, task: "t2", overall, range: null, bands: { tr: b[0], cc: b[1], lr: b[2], gra: b[3] },
  words: 260, markingVersion: "v", priorities, ...extra,
});

const seed = [
  e("1", at(2026, 9, 30), 5.5, [6, 5, 6, 5], ["Check subject and verb agreement", "Support every body idea with an example", "Learn fixed linking phrases"]),
  e("3", at(2026, 10, 12), 6, [6, 6, 6, 6], ["Support every body idea with an example", "Vary sentence openings", "Check articles"]),
  e("5", at(2026, 10, 19), 6.5, [7, 6, 7, 6], ["Check articles", "Keep new ideas out of the conclusion", "Vary sentence openings"]),
  e("6", at(2026, 10, 23), 6.5, [7, 7, 7, 6], ["Check \"articles\".", "Use a wider range of complex sentences", "Support every body idea with an example"]),
];

describe("summary", () => {
  it("reports latest, best, change since first and counts (range not required)", () => {
    const s = summarize(seed);
    expect(s.checks).toBe(4);
    expect(s.banded).toBe(4);
    expect(s.latest?.value).toBe(6.5);
    expect(s.best).toEqual({ value: 6.5, date: seed[2].date }); // earliest best on ties
    expect(s.first?.value).toBe(5.5);
    expect(s.change).toBe(1);
    expect(signed(s.change!)).toBe("+1.0");
    expect(signed(-0.5)).toBe("-0.5");
    expect(signed(0)).toBe("0.0");
  });
  it("counts feedback-only and withheld results without giving them a band", () => {
    const list = [...seed, e("7", at(2026, 10, 24), null, [null, null, null, null], ["Check articles"], { feedbackOnly: true }), e("8", at(2026, 10, 25), null, [6, null, 6, 6])];
    const s = summarize(list);
    expect(s.checks).toBe(6);
    expect(s.banded).toBe(4);
    expect(s.feedbackOnly).toBe(1);
    expect(s.withheld).toBe(1);
    expect(s.latest?.value).toBe(6.5);
  });
  it("has no change with a single estimate and nothing at all when empty", () => {
    expect(summarize(seed.slice(0, 1)).change).toBeNull();
    const s = summarize([]);
    expect(s.latest).toBeNull();
    expect(s.best).toBeNull();
    expect(s.checks).toBe(0);
  });
});

describe("criterion trends", () => {
  it("gives the latest band and the direction against the previous band", () => {
    const t = criterionTrends(seed);
    const by = Object.fromEntries(t.map((x) => [x.crit, x]));
    expect(by.tr.latest).toBe(7);
    expect(by.tr.direction).toBe("flat");
    expect(by.cc.direction).toBe("up");
    expect(by.cc.delta).toBe(1);
    expect(by.gra.points.map((p) => p.value)).toEqual([5, 6, 6, 6]);
    expect(weakestCriterion(t)?.crit).toBe("gra");
  });
  it("skips feedback-only results and missing bands", () => {
    const t = criterionTrends([e("a", at(2026, 10, 1), null, [null, null, null, null], [], { feedbackOnly: true }), e("b", at(2026, 10, 2), 6, [6, null, 6, 6])]);
    expect(t.find((x) => x.crit === "cc")?.latest).toBeNull();
    expect(t.find((x) => x.crit === "tr")?.direction).toBeNull();
  });
});

describe("recurring difficulties", () => {
  it.each([
    ["Use passive voice", "Avoid passive voice"],
    ["Use passive voice", "Don't use passive voice"],
    ["Use passive voice", "Never use passive voice"],
    ["Use more passive voice", "Use less passive voice"],
    ["Use more examples", "Use fewer examples"],
    ["Use examples", "Use more examples"],
    ["Use passive voice", "Use passive voice less"],
    ["Use passive voice and avoid active voice", "Avoid passive voice and use active voice"],
  ])("keeps opposing or qualified instructions separate: %s / %s", (a, b) => {
    expect(samePriority(keyTokens(a), keyTokens(b))).toBe(false);
    const list = [
      e("a", at(2026, 10, 1), 6, [6, 6, 6, 6], [a]),
      e("b", at(2026, 10, 2), 6, [6, 6, 6, 6], [b]),
    ];
    expect(recurringDifficulties(list)).toEqual([]);
    expect(recurringDifficulties([...list, { ...list[0], id: "c", date: at(2026, 10, 3) }]))
      .toEqual([expect.objectContaining({ label: a, count: 2, hits: [true, false, true] })]);
  });
  it("groups the article wording variants through an explicit alias", () => {
    const variants = ["Check articles", 'Check "articles".', "Check your articles!", "Check the use of articles (a/an/the)"];
    const list = variants.map((p, i) => e(String(i), at(2026, 10, i + 1), 6, [6, 6, 6, 6], [p]));
    expect(recurringDifficulties(list)).toEqual([expect.objectContaining({ count: 4, hits: [true, true, true, true] })]);
    expect(samePriority(keyTokens("Check articles"), keyTokens("Don't check articles"))).toBe(false);
  });
  it("normalises wording simply", () => {
    expect(normalisePriority("Check \"articles\".")).toBe("check articles");
    expect(keyTokens("Check your articles!")).toEqual(["check", "article"]);
    expect(samePriority(keyTokens("Check articles"), keyTokens("Check the use of articles (a/an/the)"))).toBe(true);
    expect(samePriority(keyTokens("Check articles"), keyTokens("Check subject and verb agreement"))).toBe(false);
  });
  it("groups repeated priorities, most frequent first, with honest counts", () => {
    const d = recurringDifficulties(seed);
    expect(d[0]).toMatchObject({ count: 3, window: 4, label: "Check \"articles\".", hits: [false, true, true, true] });
    expect(d.map((x) => x.label)).toContain("Support every body idea with an example");
    expect(d.find((x) => x.label === "Vary sentence openings")?.count).toBe(2);
    expect(d.some((x) => x.label === "Learn fixed linking phrases")).toBe(false); // only once
  });
  it("includes feedback-only results and caps the list", () => {
    const fb = e("fb", at(2026, 10, 25), null, [null, null, null, null], ["Learn fixed linking phrases"], { feedbackOnly: true });
    const d = recurringDifficulties([...seed, fb], 6, 2);
    expect(d).toHaveLength(2);
    expect(recurringDifficulties([...seed, fb]).some((x) => x.label === "Learn fixed linking phrases")).toBe(true);
  });
  it("only looks at the recent window", () => {
    expect(recurringDifficulties(seed, 2)[0]).toMatchObject({ count: 2, window: 2 });
    expect(recurringDifficulties([])).toEqual([]);
  });
});

describe("practice rhythm", () => {
  const now = new Date(2026, 9, 26, 9); // Monday 26 Oct 2026
  it("builds a Monday-first 5-week grid ending this week", () => {
    const r = practiceRhythm(seed, now);
    expect(r.weeks).toHaveLength(5);
    expect(r.weeks.every((w) => w.length === 7)).toBe(true);
    expect(r.weeks[0][0].date.getDay()).toBe(1);
    expect(r.weeks[4][0].today).toBe(true);
    expect(r.weeks[4][1].future).toBe(true);
    expect(r.checks).toBe(4);
    expect(r.activeDays).toBe(4);
  });
  it("counts the streak ending today or yesterday, and 0 otherwise", () => {
    expect(practiceRhythm(seed, now).streak).toBe(0);
    const h = [e("a", at(2026, 10, 24), 6, [6, 6, 6, 6]), e("b", at(2026, 10, 25), 6, [6, 6, 6, 6]), e("c", at(2026, 10, 25), 6, [6, 6, 6, 6])];
    expect(practiceRhythm(h, now).streak).toBe(2);
    expect(practiceRhythm([...h, e("d", at(2026, 10, 26), 6, [6, 6, 6, 6])], now).streak).toBe(3);
    expect(practiceRhythm([], now).streak).toBe(0);
  });
});

describe("next step", () => {
  it("uses the top recurring difficulty and the weakest criterion", () => {
    const d = recurringDifficulties(seed);
    const n = chooseNextStep(seed, d, criterionTrends(seed));
    expect(n?.focus).toBe("Check \"articles\".");
    expect(n?.crit).toBe("gra");
    expect(n?.reasons[0]).toBe("It came up in 3 of your last 4 checks.");
    expect(n?.reasons[1]).toContain("GRA");
  });
  it("falls back to the latest first priority, then to the weakest criterion, then nothing", () => {
    const one = [seed[0]];
    expect(chooseNextStep(one, [], criterionTrends(one))?.focus).toBe("Check subject and verb agreement");
    const bare = [e("x", at(2026, 10, 1), 6, [6, 5, 6, 6])];
    expect(chooseNextStep(bare, [], criterionTrends(bare))?.crit).toBe("cc");
    expect(chooseNextStep([], [], criterionTrends([]))).toBeNull();
  });
});
