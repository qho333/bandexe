import { createScanEvents } from "../src/lib/scan";
import { describe, it, expect } from "vitest";
import { addBoxes, canOpenReport, crawlBudget, HARD_STOP, matchIssues, scanDeadlines, scanProgress, segments, issueTag, mergeLines } from "../src/lib/scan";
import type { Fix } from "../src/lib/types";

const paras = ["Working from home has became normal. In addition, less cars on the road.", "In the other hand, they has solutions."];
const g = (original: string, criterion: Fix["criterion"] = "gra"): Fix => ({ original, corrected: "x", reason: "", criterion });

describe("matchIssues (reviewed issue -> exact essay span)", () => {
  it("finds spans in reading order with paragraph offsets", () => {
    const out = matchIssues(paras, [g("they has"), g("has became"), g("In the other hand", "cc")], [{ original: "less cars", better: "fewer cars", reason: "", criterion: "lr" }]);
    expect(out.map((i) => [i.id, i.para, paras[i.para].slice(i.start, i.end), i.kind])).toEqual([
      [0, 0, "has became", "grammar"], [1, 0, "less cars", "upgrade"], [2, 1, "In the other hand", "grammar"], [3, 1, "they has", "grammar"],
    ]);
  });
  it("skips quotes that are not in the essay, empty, or overlap an earlier span", () => {
    const out = matchIssues(paras, [g("not in the essay"), g(""), g("has became"), g("became normal")], []);
    expect(out).toHaveLength(1);
    expect(out[0].start).toBe(paras[0].indexOf("has became"));
  });
  it("splits a paragraph into plain and issue segments", () => {
    const iss = matchIssues(paras, [g("they has")], []);
    expect(segments(paras[1], 1, iss).map((s) => [s.text, !!s.issue])).toEqual([["In the other hand, ", false], ["they has", true], [" solutions.", false]]);
    expect(issueTag(iss[0])).toBe("GRA · grammar");
  });
  it("merges fragment rects into visual lines", () => {
    expect(mergeLines([{ left: 50, right: 90, top: 10, bottom: 30 }, { left: 0, right: 50, top: 11, bottom: 30 }, { left: 0, right: 20, top: 40, bottom: 60 }])).toEqual([
      { left: 0, right: 90, top: 10, bottom: 30 }, { left: 0, right: 20, top: 40, bottom: 60 },
    ]);
  });
});

describe("canOpenReport (report only after bottom + result ready)", () => {
  it("waits for the result even when the spider reached the bottom", () => {
    expect(canOpenReport({ status: "pending", scanDone: true, skipped: false })).toBe(false);
  });
  it("waits for the spider even when the result is ready", () => {
    expect(canOpenReport({ status: "done", scanDone: false, skipped: false })).toBe(false);
  });
  it("opens when both are true, or when the user skipped and the result is ready", () => {
    expect(canOpenReport({ status: "done", scanDone: true, skipped: false })).toBe(true);
    expect(canOpenReport({ status: "done", scanDone: false, skipped: true })).toBe(true);
    expect(canOpenReport({ status: "error", scanDone: true, skipped: true })).toBe(false);
  });
});

describe("matchIssues edge cases (what the spider can box)", () => {
  const essay = ["Technology changes how people work and how people rest.", "Some say technology is harmful; others say technology helps."];
  it("boxes the first and the last word of the essay", () => {
    const out = matchIssues(essay, [g("Technology"), g("helps.")], []);
    expect(out.map((i) => [i.para, i.start, i.end])).toEqual([[0, 0, 10], [1, essay[1].length - 6, essay[1].length]]);
  });
  it("a quote that appears more than once boxes its first occurrence (the one Accept replaces)", () => {
    const out = matchIssues(essay, [g("how people")], []);
    expect(out).toHaveLength(1);
    expect([out[0].para, out[0].start]).toEqual([0, essay[0].indexOf("how people")]);
    const later = matchIssues(essay, [g("say technology")], []);
    expect([later[0].para, later[0].start]).toEqual([1, essay[1].indexOf("say technology")]);
  });
  it("adjacent quotes both get boxes; an overlapping one does not (it stays in the report)", () => {
    const out = matchIssues(essay, [g("changes how"), g("people work"), g("work and")], []);
    expect(out.map((i) => essay[i.para].slice(i.start, i.end))).toEqual(["changes how", "people work"]);
  });
  it("zero issues and many issues", () => {
    expect(matchIssues(essay, [], [])).toEqual([]);
    const words = Array.from({ length: 40 }, (_, i) => `word${i}`);
    const many = matchIssues([words.join(" ")], words.slice(0, 25).map((w) => g(w)), words.slice(25, 36).map((w) => ({ original: w, better: "x", reason: "", criterion: "lr" as const })));
    expect(many).toHaveLength(36);
    expect(many.map((i) => i.id)).toEqual([...Array(36).keys()]);
    expect(many.every((m, k) => k === 0 || m.start > many[k - 1].start)).toBe(true);
  });
  it("a quote that crosses a paragraph break gets no box", () => {
    expect(matchIssues(essay, [g("rest.\nSome")], [])).toEqual([]);
  });
});

describe("crawl cap once the result exists", () => {
  it("budget grows with issues and is capped", () => {
    expect(crawlBudget(0)).toBe(6);
    expect(crawlBudget(10)).toBeCloseTo(10.5);
    expect(crawlBudget(36)).toBe(16);
  });
  it("deadlines count from when the result arrived, so returning later finishes at once", () => {
    expect(scanDeadlines(1000, 1000, 0)).toEqual({ wrapIn: 6000, stopIn: 6000 + HARD_STOP * 1000 });
    expect(scanDeadlines(1000, 5000, 0)).toEqual({ wrapIn: 2000, stopIn: 5000 });
    expect(scanDeadlines(1000, 60000, 3)).toEqual({ wrapIn: 0, stopIn: 0 });
  });
  it("boxes are added once each, in order", () => {
    const a = [2, 0];
    expect(addBoxes(a, [0, 1, 2, 1])).toEqual([2, 0, 1]);
    expect(addBoxes(a, [0])).toBe(a); // unchanged: same array, no re-render
  });
  it("progress text comes from the paragraph reached", () => {
    expect(scanProgress(0, 4).text).toBe("Scanning paragraph 1 of 4");
    expect(scanProgress(9, 4).text).toBe("Scanning paragraph 4 of 4");
    expect(scanProgress(1, 4, true)).toEqual({ text: "Scan complete", value: 4, max: 4 });
    expect(scanProgress(0, 0).text).toBe("Waiting for essay text");
  });
});

describe("scan events for mascots", () => {
  it("dispatches each CustomEvent once with no payload, in lifecycle order", () => {
    const seen: Event[] = [];
    const events = createScanEvents((event) => seen.push(event));
    events.start(); events.start(); events.end(); events.end(); events.report(); events.report(); events.end();
    expect(seen.map((e) => e.type)).toEqual(["bandexe:scan-start", "bandexe:scan-end", "bandexe:report-open"]);
    expect(seen.every((e) => e instanceof CustomEvent && e.detail === null)).toBe(true);
  });
  it("keeps ordering on fast completion, and gives every evaluation its own events", () => {
    const seen: string[] = [];
    const first = createScanEvents((e) => seen.push(e.type));
    first.report(); first.end(); first.start();
    const retry = createScanEvents((e) => seen.push(e.type));
    retry.start(); retry.end(); retry.end();
    expect(seen).toEqual(["bandexe:scan-start", "bandexe:scan-end", "bandexe:report-open", "bandexe:scan-start", "bandexe:scan-end"]);
  });
  it("dispatches to window by default", () => {
    const previous = globalThis.window;
    const target = new EventTarget();
    Object.assign(globalThis, { window: target });
    try {
      const seen: string[] = [];
      target.addEventListener("bandexe:scan-start", (e) => seen.push(e.type));
      const run = createScanEvents();
      run.start(); run.start();
      expect(seen).toEqual(["bandexe:scan-start"]);
    } finally {
      if (previous === undefined) Reflect.deleteProperty(globalThis, "window"); else Object.assign(globalThis, { window: previous });
    }
  });
});
