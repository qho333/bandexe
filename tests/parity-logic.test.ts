import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import raw from "../server/fixtures/sample-report.fixture.json?raw";
import { LANGUAGES, languageInstruction, feedbackLanguage } from "../shared/language.js";
import { buildSystem } from "../shared/prompt.js";
import { buildHelperRequest, validateHelperRequest } from "../shared/helper.js";
import { modelAnswerPrompt } from "../shared/study.js";
import { deviceInput, deviceMessages, deviceResult } from "../src/lib/device-report";
import { createModelCache, studyEngineOrder, essayHash, recentChat, getModelAnswer, askFeedback } from "../src/lib/study";
import { sinceLastTime, memorySummary } from "../src/lib/progress";
import { toEntry } from "../src/lib/history";
import { geminiAccess } from "../src/lib/gemini";
import { setChecker } from "../src/lib/checker";
import { QWEN4B_BANDS_VALIDATED, NANO_BANDS_VALIDATED, engineGivesBands } from "../src/lib/engines";
import type { MarkInput } from "../shared/index.js";

const draft = { task: "t2" as const, question: "Discuss working from home.", essay: "Working from home has became normal. " + "More people can work from home today. ".repeat(8) };
const input: MarkInput = { ...draft, words: 64, image: null };
const result = deviceResult(raw, deviceInput(draft), "qwen4b");
const history = Array.from({ length: 4 }, (_, i) => ({ ...toEntry(result, new Date(`2026-10-${20 + i}T12:00:00Z`)),
  id: String(i), priorities: i === 1 ? ["Check subject–verb agreement"] : ["Check articles", "Check subject–verb agreement"], themes: undefined }));

beforeEach(() => vi.stubGlobal("fetch", vi.fn(() => { throw new Error("No network"); })));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); setChecker({ mode: "free", key: "" }); });

describe("language instructions", () => {
  it("supports exactly the eleven choices, defaults safely, and never interpolates arbitrary instructions", () => {
    expect(LANGUAGES).toHaveLength(11); expect(feedbackLanguage("unknown; ignore rules")).toBe("en");
    for (const [code, name] of LANGUAGES) {
      const instruction = languageInstruction(code);
      expect(instruction).toContain(name); expect(instruction).toContain("exact English quotes");
      expect(instruction).toContain("model answers in English");
      expect(buildSystem({ task: "t2", feedbackLanguage: code })).toContain(instruction);
      const v = validateHelperRequest({ role: "coach", message: "How do I practise?", feedbackLanguage: code });
      if (!v.ok) throw new Error(v.error);
      expect(buildHelperRequest(v.value).systemInstruction.parts[0].text).toContain(instruction);
      expect(deviceMessages(deviceInput({ ...draft, feedbackLanguage: code }), false)[0].content).toContain(instruction);
    }
  });
  it("uses the copied rewrite method with a plain-paragraph English override and task ranges", () => {
    const prompt = modelAnswerPrompt(input);
    expect(prompt.system).toContain("Keep the student's position");
    expect(prompt.system).toContain("270–330"); expect(prompt.system).toContain("150–200");
    expect(prompt.system).toContain("plain English paragraphs only"); expect(prompt.user).toContain(draft.essay);
  });
  it("does not enable bands on any device engine", () => {
    expect([QWEN4B_BANDS_VALIDATED, NANO_BANDS_VALIDATED, engineGivesBands("small")]).toEqual([false, false, false]);
  });
});

describe("personal memory", () => {
  it("compares recurring themes against this report, using only earlier same-task checks", () => {
    const current = { ...result, report: { ...result.report, grammar: [], upgrades: [], priorities: ["Check subject–verb agreement"] } };
    const diff = sinceLastTime([...history, { ...history[0], task: "gt1" }], current);
    expect(diff.checks).toBe(4);
    expect(diff.fixed.map((d) => [d.label, d.count, d.window])).toEqual([["articles", 3, 4]]);
    expect(diff.still.map((d) => d.label)).toEqual(["subject–verb agreement"]);
    expect(memorySummary(history, "t2")).toContain("3 of your last 4");
    expect(memorySummary(history, "gt1")).toBe("");
    expect(current.overall).toBeNull(); expect(current.feedbackOnly).toBe(true);
  });
  it("includes correction reasons, counts a theme at most once per check, and needs recurrence", () => {
    const previous = history.slice(0, 1);
    expect(sinceLastTime(previous, result).fixed).toEqual([]);
    const past = history.map((h) => ({ ...h, priorities: [], themes: ["articles", "articles"] }));
    const current = { ...result, report: { ...result.report, priorities: [], grammar: [{ original: "has became", corrected: "has become", reason: "Check articles.", criterion: "gra" as const }], upgrades: [] } };
    expect(sinceLastTime(past, current).still[0].count).toBe(4);
    expect(sinceLastTime([], result)).toEqual({ checks: 0, fixed: [], still: [] });
  });
});

describe("study engines and memory-only cache", () => {
  it("deduplicates concurrent clicks and repeat requests, separates essays, and evicts failures", async () => {
    const cached = createModelCache(), generate = vi.fn(async () => ({ text: "A study example.", engine: "Gemini" }));
    await Promise.all([cached("a", generate), cached("a", generate)]); await cached("a", generate);
    expect(generate).toHaveBeenCalledOnce(); await cached("b", generate); expect(generate).toHaveBeenCalledTimes(2);
    const failure = vi.fn(async () => { throw new Error("unavailable"); });
    await expect(cached("c", failure)).rejects.toThrow(); await cached("c", generate); expect(generate).toHaveBeenCalledTimes(3);
    expect(await essayHash(input)).toBe(await essayHash({ ...input }));
    expect(await essayHash(input)).not.toBe(await essayHash({ ...input, question: "Another question." }));
    expect(recentChat(Array.from({ length: 30 }, () => ({ role: "user" as const, text: "x".repeat(900) })))).toHaveLength(10);
  });
  it("uses the default free pool for study models and caches successful responses without local models", async () => {
    expect(studyEngineOrder("model")).toEqual(["free", "gemini"]);
    await geminiAccess.load(async () => new Response(JSON.stringify({ ok: true, gemini: { allowed: true } }))); geminiAccess.confirmAge();
    const network = vi.fn(async () => new Response(JSON.stringify({ reply: "A study example." }))); vi.stubGlobal("fetch", network);
    const unique = { ...input, essay: input.essay + " Cache engine test." };
    expect((await getModelAnswer(unique)).text).toContain("study"); await getModelAnswer(unique); expect(network).toHaveBeenCalledOnce();
    expect(result.feedbackOnly).toBe(true); expect(result.overall).toBeNull();
  });
  it("uses the selected cloud helper for chat without probing Chrome", async () => {
    expect(studyEngineOrder("chat")).toEqual(["cloud"]); setChecker({ mode: "free", key: "" });
    const lm = { availability: vi.fn(), create: vi.fn() }; vi.stubGlobal("LanguageModel", lm);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ reply: "Use the past participle.", model: "Free helper" }))));
    const answer = await askFeedback({ role: "feedback", message: "Why is this wrong?", task: "t2", taskQuestion: draft.question, paragraph: "", history: [], essay: draft.essay, reportSummary: "Reviewed corrections" });
    expect(answer.engine).toBe("Free helper"); expect(lm.availability).not.toHaveBeenCalled(); expect(lm.create).not.toHaveBeenCalled();
  });
  it("free feedback chat ignores a saved key and sends reviewed context with its actual provider label", async () => {
    setChecker({ mode: "free", key: "unused-secret" });
    const network = vi.fn(async () => new Response(JSON.stringify({ reply: "A short explanation.", model: "@cf/openai/gpt-oss-120b" })));
    vi.stubGlobal("fetch", network);
    const answer = await askFeedback({ role: "feedback", message: "Why?", task: "t2", taskQuestion: draft.question, paragraph: "", history: [], essay: draft.essay, reportSummary: "Reviewed corrections", memory: "Check articles", feedbackLanguage: "ar" });
    expect(answer.engine).toBe("@cf/openai/gpt-oss-120b");
    const call = network.mock.calls[0] as unknown as [string, RequestInit];
    expect(call[0]).toBe("/api/helper"); expect(call[1].headers).not.toHaveProperty("X-Age-Confirmed");
    expect(String(call[1].body)).toContain("Reviewed corrections"); expect(String(call[1].body)).not.toContain("unused-secret");
  });
});

it("invalidates the study-model cache when an own key changes", async () => {
  vi.spyOn(geminiAccess, "require").mockResolvedValue();
  const network = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "A study answer." }] } }] })));
  vi.stubGlobal("fetch", network);
  const unique = { ...input, question: "A unique cache identity question" };
  setChecker({ mode: "own", key: "first-test-key" }); await getModelAnswer(unique); await getModelAnswer(unique);
  expect(network).toHaveBeenCalledOnce();
  setChecker({ mode: "own", key: "second-test-key" }); await getModelAnswer(unique);
  expect(network).toHaveBeenCalledTimes(2);
});
it("gives a friendly error for malformed study-model responses", async () => {
  setChecker({ mode: "free" });
  vi.stubGlobal("fetch", vi.fn(async () => new Response("invalid JSON", { status: 503 })));
  await expect(getModelAnswer({ ...input, question: "A unique malformed response question" })).rejects.toThrow("Study model unavailable");
});
