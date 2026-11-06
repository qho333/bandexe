import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyGrammarSuggestion, checkGrammar, grammarContext, grammarDisabled, grammarRequest, LANGUAGE_TOOL_URL, mapGrammarResponse, remainingGrammar, TIMED_GRAMMAR_NOTE } from "../src/lib/language-tool";
import { exportReport, reportContent, type ExportInput } from "../src/lib/report-export";
import { PrintableReport, ReportActions } from "../src/components/ReportExport";
import GrammarCheck from "../src/components/GrammarCheck";
import Privacy from "../src/components/Privacy";
import Footer from "../src/components/Footer";
import { screenFromHash } from "../src/lib/routes";
import { DEFAULT_PREFS } from "../src/lib/prefs";
import { NANO_FEEDBACK_LABEL } from "../src/lib/engines";

const input: ExportInput = {
  essay: "They has a great idea.\n\nIt is very good.", date: "2026-10-26T12:00:00.000Z", states: {},
  result: { task: "t2", words: 10, overall: 6.5, range: { lo: 5.5, hi: 7.5 }, label: "AI practice estimate (provisional calibration)", withheld: [], markingVersion: "v2", checker: "own", fixture: true,
    report: {
      criteria: { tr: { band: 7, summary: "Answers the question.", subskills: [] }, cc: { band: 6, summary: "Logical order.", subskills: [] }, lr: { band: 7, summary: "Appropriate vocabulary.", subskills: [] }, gra: { band: 6, summary: "Check agreement.", subskills: [] } },
      grammar: [{ original: "They has", corrected: "They have", reason: "Plural agreement.", criterion: "gra" }],
      upgrades: [{ original: "very good", better: "excellent", reason: "More precise.", criterion: "lr" }],
      paragraphs: [{ label: "Introduction", quote: "They has", comments: { tr: "Clear position.", cc: "Good linking.", lr: "Precise.", gra: "Check verbs." }, rewrite: "Expand the example." }],
      structureAdvice: "Use clear paragraphs.", priorities: ["Check agreement."], strengths: ["A clear position."], dropped: { grammar: 0, upgrades: 0 },
    },
  },
};
const render = (element: ReturnType<typeof createElement>) => renderToStaticMarkup(element);
afterEach(() => vi.unstubAllGlobals());

describe("report downloads and print", () => {
  it.each(["md", "txt"] as const)("exports complete %s content and honest labels", (format) => {
    const report = exportReport(input, format);
    for (const text of ["Task 2 essay", input.date, "Checked with your own Gemini key", input.result.label, "Fixture data", "not an official IELTS", "Band: 6.5", "Likely range: 5.5 to 7.5", "TR — Task response: 7.0", "Answers the question.", "[They has → They have] a great idea.", "[very good → excellent]", "Grammar corrections", "Word-choice upgrades", "Paragraph 1", "GRA: Check verbs.", "Expand the example.", "Priorities", "Strengths", "Use clear paragraphs."]) expect(report).toContain(text);
    expect(report).toContain("Rejected suggestions remain listed as Rejected");
  });
  it("reflects review states, leaving rejected text intact in the essay", () => {
    const changed = { ...input, states: { g0: "accepted", u0: "rejected" } };
    const data = reportContent(changed);
    expect(data.sections.find((s) => s.title === "Essay with corrections")!.lines[0]).toBe("[They has → They have] a great idea.\n\nIt is very good.");
    expect(exportReport(changed, "txt")).toContain("Accepted: [They has → They have]");
    expect(exportReport(changed, "txt")).toContain("Rejected: [very good → excellent]");
  });
  it.each(["md", "txt"] as const)("omits every score field for feedback-only %s even with stale numbers", (format) => {
    const fb = { ...input, result: { ...input.result, checker: "device" as const, engine: "nano" as const, feedbackOnly: true, label: NANO_FEEDBACK_LABEL } };
    const report = exportReport(fb, format);
    expect(report).toContain(NANO_FEEDBACK_LABEL);
    expect(report).toContain("Chrome built-in AI (Gemini Nano)");
    expect(report).not.toContain("4 in 5");
    expect(report).not.toContain("On-device estimate");
    expect(report).toContain("Check agreement.");
    expect(report).not.toMatch(/Band:|Likely range:|6\.5|5\.5|7\.5|TR — Task response: 7/);
    const html = render(createElement(PrintableReport, { input: fb }));
    expect(html).not.toMatch(/6\.5|5\.5|7\.5|TR — Task response: 7/);
  });
  it("withholds invalid overall and does not invent a range", () => {
    const result = { ...input.result, overall: null, range: null, withheld: ["gra" as const], report: { ...input.result.report, criteria: { ...input.result.report.criteria, gra: { band: null, summary: "No reliable band.", subskills: [] } } } };
    const report = exportReport({ ...input, result }, "txt");
    expect(report).toContain("Overall estimate withheld.");
    expect(report).toContain("Grammatical range and accuracy: Withheld");
    expect(report).not.toContain("Likely range:");
  });
  it("prints bracketed fixes with underlined originals and keeps printing available", () => {
    const html = render(createElement(PrintableReport, { input }));
    expect(html).toContain("[<u>They has</u> → They have]");
    expect(html).toContain("Fixture data");
    expect(html).toContain("2026-10-26");
    const buttons = render(createElement(ReportActions, { input }));
    expect(buttons).toContain("Print / Save as PDF"); expect(buttons).not.toMatch(/download/i);
  });
  it("does not annotate a second occurrence or create overlapping inline fixes", () => {
    const duplicate = { ...input, essay: "They has They has", result: { ...input.result, report: { ...input.result.report, upgrades: [{ ...input.result.report.upgrades[0], original: "has", better: "have" }] } } };
    expect(reportContent(duplicate).sections.find((s) => s.title === "Essay with corrections")!.lines[0]).toBe("[They has → They have] They has");
  });
});

const text = "🙂 They has a idea.";
const raw = { matches: [
  { offset: 8, length: 3, message: "Use have.", replacements: [{ value: "have" }, { value: "had" }, { value: "have got" }, { value: "had got" }] },
  { offset: 12, length: 1, message: "Use an.", replacements: [{ value: "an" }] },
] };

describe("LanguageTool, with mocked fetch only", () => {
  it("POSTs form text and British English directly, mapping UTF-16 offsets and at most three suggestions", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(raw)));
    const matches = await checkGrammar(text, fetchFn);
    expect(fetchFn).toHaveBeenCalledOnce();
    const [url, options] = fetchFn.mock.calls[0];
    expect(url).toBe(LANGUAGE_TOOL_URL);
    expect(options?.method).toBe("POST");
    expect(options?.headers).toEqual({ "Content-Type": "application/x-www-form-urlencoded" });
    const body = options?.body as URLSearchParams;
    expect([...body.entries()]).toEqual([["text", text], ["language", "en-GB"]]);
    expect(matches[0]).toEqual({ id: 0, offset: 8, length: 3, original: "has", message: "Use have.", suggestions: ["have", "had", "have got"] });
  });
  it("replaces only the checked span and shifts later matches safely", () => {
    const matches = mapGrammarResponse(raw, text), first = matches[0];
    const updated = applyGrammarSuggestion(text, text, first, "have");
    expect(updated).toBe("🙂 They have a idea.");
    const remaining = remainingGrammar(matches, first, "have");
    expect(remaining[0].offset).toBe(13);
    expect(applyGrammarSuggestion(updated!, updated!, remaining[0], "an")).toBe("🙂 They have an idea.");
  });
  it("shows the problem in its sentence context", () => {
    const source = "Before. They has a plan. After.";
    const match = mapGrammarResponse({ matches: [{ ...raw.matches[0], offset: 13 }] }, source)[0];
    expect(grammarContext(source, match)).toEqual({ before: "They ", problem: "has", after: " a plan." });
  });
  it("requires a re-check after any external edit, including changes after the match", () => {
    const match = mapGrammarResponse(raw, text)[0];
    expect(applyGrammarSuggestion("Prefix " + text, text, match, "have")).toBeNull();
    expect(applyGrammarSuggestion(text + " More.", text, match, "have")).toBeNull();
    expect(applyGrammarSuggestion(text, text, { ...match, offset: 0 }, "have")).toBeNull();
    expect(applyGrammarSuggestion(text, text, match, "unoffered")).toBeNull();
  });
  it("ignores invalid spans and supports insertion and deletion suggestions", () => {
    const matches = mapGrammarResponse({ matches: [null, { ...raw.matches[0], offset: -1 }, { ...raw.matches[0], offset: 999 }, { ...raw.matches[0], offset: 1.5 }, { offset: 2, length: 0, message: "Space.", replacements: [{ value: " " }, null, { value: 3 }] }] }, "hi!");
    expect(matches).toHaveLength(1);
    expect(applyGrammarSuggestion("hi!", "hi!", matches[0], " ")).toBe("hi !");
    const deletion = mapGrammarResponse({ matches: [{ offset: 2, length: 1, message: "Remove.", replacements: [{ value: "" }] }] }, "hi!")[0];
    expect(applyGrammarSuggestion("hi!", "hi!", deletion, "")).toBe("hi");
  });
  it("handles 429, server failures, bad replies and offline errors", async () => {
    await expect(checkGrammar(text, vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 429 })))).rejects.toThrow("Try again in a minute");
    await expect(checkGrammar(text, vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 503 })))).rejects.toThrow("503");
    await expect(checkGrammar(text, vi.fn<typeof fetch>().mockResolvedValue(new Response("not JSON")))).rejects.toThrow("reply could not be read");
    await expect(checkGrammar(text, vi.fn<typeof fetch>().mockResolvedValue(new Response("{}")))).rejects.toThrow("reply could not be read");
    await expect(checkGrammar(text, vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline")))).rejects.toThrow("Cannot reach LanguageTool");
  });
  it("enforces the byte limit before contacting the API", async () => {
    const fetchFn = vi.fn<typeof fetch>();
    await expect(checkGrammar("é".repeat(10_001), fetchFn)).rejects.toThrow("20 KB");
    expect(fetchFn).not.toHaveBeenCalled();
    expect(() => grammarRequest(" ")).toThrow("Write something");
    expect(() => grammarRequest("a".repeat(20_000))).not.toThrow();
  });
  it("disables the real control and hides suggestions during a timed attempt; mounting never fetches", () => {
    const fetchFn = vi.fn(); vi.stubGlobal("fetch", fetchFn);
    const props = { text, setText: () => {}, locked: false, editor: { current: null } };
    const html = render(createElement(GrammarCheck, { ...props, running: true }));
    expect(html).toMatch(/<button[^>]*disabled=""/);
    expect(html).toContain(TIMED_GRAMMAR_NOTE);
    expect(html).not.toContain("grammar-list");
    expect(render(createElement(GrammarCheck, { ...props, running: false }))).toContain("Sends this essay to LanguageTool when you click");
    expect(fetchFn).not.toHaveBeenCalled();
    expect(grammarDisabled(text, true)).toBe(true);
    expect(grammarDisabled(text, false)).toBe(false);
    expect(grammarDisabled(text, false, true)).toBe(true);
    expect(grammarDisabled(text, false, false, true)).toBe(true);
  });
});

describe("privacy route and copy", () => {
  it("recognises privacy, its measurement link and existing routes", () => {
    expect(screenFromHash("#privacy")).toBe("privacy");
    expect(screenFromHash("#privacy-accuracy")).toBe("privacy");
    expect(screenFromHash("#r-grammar")).toBe("results");
    expect(screenFromHash("#write")).toBe("write");
    expect(screenFromHash("#unknown")).toBe("write");
    expect(screenFromHash("")).toBe("write");
    expect(screenFromHash("#r-model")).toBe("results");
    expect(screenFromHash("#r-chat")).toBe("results");
  });
  it("covers storage, recipients, server metadata, measurements and terms", () => {
    const html = render(createElement(Privacy, { active: true, prefs: DEFAULT_PREFS, setPrefs: () => {}, onReplayBoot: () => {} }));
    for (const text of ["localStorage", "Sign-in is coming soon", "Datamuse", "LanguageTool", "Google Fonts", "Console logs", "24-hour", "5,000-ID", "2 November 2026", "Groq", "quoted essay excerpts", "no API keys or IP addresses", "British Council", "IDP", "Cambridge", "band accuracy test", "27 official scripts", 'href="#privacy-accuracy"']) expect(html).toContain(text);
    expect(render(createElement(Footer))).toContain('href="#privacy"');
  });
});
