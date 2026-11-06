import { describe, expect, it } from "vitest";
import { fixtureFetch, fixtureOptions, fixtureQuotes, fixtureText } from "../server/lib/fixture.js";
import { mark } from "../shared/index.js";
import { matchIssues } from "../src/lib/scan";

const essay = [
  "[fixture:many] Working from home has become normal for many office workers in recent years, and the change has many effects on cities.",
  "On the one hand, people save time because they do not travel, and the time they save can be used for family or study.",
  "On the other hand, some workers feel lonely, and managers find it harder to check the quality of work done at home.",
  "In conclusion, I believe the advantages are greater, as long as companies keep some days in the office for teamwork.",
].join("\n\n");

describe("fixture selection (fixture mode only)", () => {
  it("reads name and delay from essay markers, then env, else the sample after 3.5 s", () => {
    expect(fixtureOptions("text [fixture:clean] [delay:30]", {})).toEqual({ name: "clean", delayMs: 30000 });
    expect(fixtureOptions("text", { MARK_FIXTURE_NAME: "quota", MARK_FIXTURE_DELAY: "0" })).toEqual({ name: "quota", delayMs: 0 });
    expect(fixtureOptions("[fixture:many]", { MARK_FIXTURE_NAME: "clean" }).name).toBe("many");
    expect(fixtureOptions("[fixture:nope] [delay:999]", {})).toEqual({ name: "sample", delayMs: 120000 });
    expect(fixtureOptions("", {})).toEqual({ name: "sample", delayMs: 3500 });
  });
  it("generates exact, distinct quotes incl. the first and last real words, never the marker", () => {
    const q = fixtureQuotes(essay, 36);
    expect(q.length).toBeGreaterThanOrEqual(30);
    expect(new Set(q).size).toBe(q.length);
    expect(q[0]).toBe("Working");
    expect(q[1]).toBe("teamwork.");
    expect(q.every((x) => essay.includes(x) && !x.includes("[fixture") && !x.includes("\n"))).toBe(true);
  });
  it("many: 30+ reviewed issues reach the scan, first and last words boxed", async () => {
    const r = await mark({ task: "t2", question: "Q", essay, words: 90, image: null }, { key: "fixture", fetchFn: fixtureFetch({ essay: essay.replace("[fixture:many]", "[fixture:many] [delay:0]") }) });
    const n = r.report.grammar.length + r.report.upgrades.length;
    expect(n).toBeGreaterThanOrEqual(30);
    const paras = essay.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean);
    const boxes = matchIssues(paras, r.report.grammar, r.report.upgrades);
    expect(boxes.length).toBeGreaterThanOrEqual(28);
    expect(boxes.length).toBeLessThan(n); // the overlapping quote is reported but not boxed
    const texts = boxes.map((b) => paras[b.para].slice(b.start, b.end));
    expect(texts).toContain("Working");
    expect(texts).toContain("teamwork.");
  });
  it("clean has no issues; one has exactly one", async () => {
    const run = (name) => mark({ task: "t2", question: "Q", essay, words: 90, image: null }, { key: "fixture", fetchFn: fixtureFetch({ essay: `[fixture:${name}] [delay:0] ${essay}` }) });
    const clean = (await run("clean")).report;
    expect(clean.grammar.length + clean.upgrades.length).toBe(0);
    const one = (await run("one")).report;
    expect(one.grammar.length + one.upgrades.length).toBe(1);
  });
  it("quota and unreadable fail like the real marker would", async () => {
    const run = (name) => mark({ task: "t2", question: "Q", essay, words: 90, image: null }, { key: "fixture", retryMs: 0, fetchFn: fixtureFetch({ essay: `[fixture:${name}] [delay:0]` }) });
    await expect(run("quota")).rejects.toMatchObject({ code: "quota" });
    await expect(run("unreadable")).rejects.toMatchObject({ code: "unreadable" });
    await expect(run("offline")).rejects.toMatchObject({ code: "unavailable" });
  });
  it("sample stays the default reply", () => {
    expect(JSON.parse(fixtureText("sample", "")).grammar_corrections.length).toBeGreaterThan(0);
  });
});
