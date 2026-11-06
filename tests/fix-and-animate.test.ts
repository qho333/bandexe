import { fakeD1 } from "./fake-d1";
import { afterEach, expect, it, vi } from "vitest";
import { reviewCorrections } from "../src/lib/corrections";
import { createExamClock, timerExpired } from "../src/lib/exam-clock";
import { createDebounce } from "../src/lib/debounce";
import { captureSubmission } from "../src/lib/submission";
import { loadDraft } from "../src/lib/draft";
import { loadHistory } from "../src/lib/history";
import { getAllowance, updateAllowance } from "../src/lib/allowance";
import { getModelAnswer } from "../src/lib/study";
import { setChecker } from "../src/lib/checker";
import { geminiAccess } from "../src/lib/gemini";
import { onRequest } from "../functions/api/[[path]]";
import type { Fix } from "../src/lib/types";
const fix: Fix = { original: "they has", corrected: "they have", reason: "Agreement", criterion: "gra" };
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); setChecker({ mode: "free", key: "" }); });
it("rejects at the submitted span, preserving an earlier identical corrected phrase", () => {
  const submitted = "they have a bike; they has a car";
  const a = reviewCorrections(submitted, submitted, [fix], [], {}, ["g0"], true);
  expect(a.text).toBe("they have a bike; they have a car");
  expect(reviewCorrections(submitted, a.text, [fix], [], a.states, ["g0"], false).text).toBe(submitted);
  expect(reviewCorrections(submitted, a.text, [fix], [], a.states, ["g0"], true).text).toBe(a.text);
});
it("bulk review is idempotent and refuses overlapping suggestions and manual edits", () => {
  const submitted = "they has a bike";
  const a = reviewCorrections(submitted, submitted, [fix], [{ ...fix, better: "they own" }], {}, ["g0", "u0"], true);
  expect(a.text).toBe("they have a bike"); expect(a.states.u0).toBe("missing");
  expect(reviewCorrections(submitted, a.text + " edited", [fix], [], a.states, ["g0"], false)).toMatchObject({ failed: true, text: a.text + " edited" });
  expect(reviewCorrections(submitted, a.text, [fix], [], a.states, ["g0"], false).text).toBe(submitted);
});
it("exam time catches up after throttling, excludes pauses and permits count up past the preset", () => {
  let now = 0; const clock = createExamClock(() => now);
  clock.start(); now = 90_500; expect(clock.seconds()).toBe(90);
  clock.pause(); now += 60_000; expect(clock.seconds()).toBe(90);
  clock.start(); now += 500; expect(clock.seconds()).toBe(91);
  expect(timerExpired("up", 0)).toBe(false); expect(timerExpired("down", 0)).toBe(true);
  clock.reset(); expect(clock.seconds()).toBe(0);
});
it("repairs saved drafts with absent or non-string questions before rendering or evaluation", () => {
  for (const question of [null, 12, undefined]) {
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify({ task: "t2", essay: "saved essay", question }) });
    expect(loadDraft()).toMatchObject({ task: "t2", essay: "saved essay", question: expect.any(String) });
  }
});
it("filters damaged history rows independently and removes legacy feedback-only scores", () => {
  const valid = { id: "ok", task: "t2", date: "2026-10-26T12:00:00Z", overall: 6, range: { lo: 5, hi: 7 }, bands: { tr: 6, cc: 6, lr: 6, gra: 6 }, words: 250, priorities: ["Check articles"] };
  const store = { getItem: () => JSON.stringify([null, {}, valid, { ...valid, id: "fb", feedbackOnly: true }, { ...valid, bands: null }, { ...valid, priorities: [42] }, { ...valid, date: "bad" }]), setItem: vi.fn(), removeItem: vi.fn() };
  const history = loadHistory(store); expect(history).toHaveLength(2); expect(history[1]).toMatchObject({ overall: null, range: null, bands: { tr: null, cc: null, lr: null, gra: null } });
});
it("uses the owner daily limit when the response does not supply a limit", () => {
  updateAllowance({ remainingToday: 9 }); expect(getAllowance()).toEqual({ remaining: 9, limit: 10 });
});
it("Free study models work without Gemini gates, retain provider labels and do not overwrite mark allowance", async () => {
  setChecker({ mode: "free", key: "" }); updateAllowance({ remainingToday: 8, dailyLimit: 10 });
  const gate = vi.spyOn(geminiAccess, "require").mockRejectedValue(new Error("Must not ask age"));
  const network = vi.fn(async () => new Response(JSON.stringify({ reply: "A study example.", model: "free-model", remainingToday: 39, dailyLimit: 40 })));
  vi.stubGlobal("fetch", network);
  const input = { task: "t2" as const, essay: "A new model-answer regression essay", question: "Discuss home working.", words: 250, image: null };
  expect(await getModelAnswer(input)).toEqual({ text: "A study example.", engine: "free-model" });
  await getModelAnswer(input); expect(network).toHaveBeenCalledOnce(); expect(gate).not.toHaveBeenCalled();
  expect((network.mock.calls[0] as unknown as [string, RequestInit])[1].headers).not.toHaveProperty("X-Age-Confirmed"); expect(getAllowance()).toEqual({ remaining: 8, limit: 10 });
});
it("Pages Free model answers use the helper allowance in blocked Gemini countries", async () => {
  const db = fakeD1(2);
  const request = Object.assign(new Request("https://example.test/api/model-answer", { method: "POST", headers: { "Content-Type": "application/json", "X-Requested-With": "bandexe", "CF-Connecting-IP": "1.2.3.4" }, body: JSON.stringify({ task: "t2", question: "Discuss working from home.", essay: "Home working has many benefits. ".repeat(12) }) }), { cf: { country: "GB" } });
  const result = await onRequest({ request, env: {  AI: { run: async () => ({ response: "A study example." }) }, QUOTA_SALT: "test-salt", DB: db } });
  expect(result.status).toBe(200); expect(await result.json()).toMatchObject({ reply: "A study example.", dailyLimit: 40, remainingToday: 37 });
  expect(db.writes.every(([key]) => String(key).startsWith("helper:"))).toBe(true);
});

it("retry inputs retain the submitted task, essay, question, chart and feedback language", () => {
  const draft = { task: "ac1" as const, essay: "Original report", question: "Original chart question", feedbackLanguage: "vi" as const };
  const chart = { base64: "original-image", mime: "image/png" as const, url: "blob:chart", name: "chart.png" };
  const snapshot = captureSubmission(draft, chart);
  draft.essay = "Edited essay"; draft.question = "Another question"; chart.base64 = "replacement-image";
  expect(snapshot.draft).toMatchObject({ essay: "Original report", question: "Original chart question", task: "ac1", feedbackLanguage: "vi" });
  expect(snapshot.chart?.base64).toBe("original-image");
});

it("renders a usable estimate even when a returned range is missing", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { Report } = await import("../src/components/Results");
  const { DEFAULT_PREFS } = await import("../src/lib/prefs");
  const { deviceInput, deviceResult } = await import("../src/lib/device-report");
  const raw = (await import("../server/fixtures/sample-report.fixture.json?raw")).default;
  const draft = { task: "t2" as const, essay: "Working from home has became normal. " + "Home working has many benefits. ".repeat(12), question: "Discuss working from home." };
  const result = { ...deviceResult(raw, deviceInput(draft), "nano"), feedbackOnly: false, checker: "free" as const, overall: 6.5, range: null };
  expect(() => renderToStaticMarkup(createElement(Report, {
    active: true, job: { id: 1, status: "done", result, essay: draft.essay, minutes: null }, result, essay: draft.essay, setEssay: () => {},
    prefs: { ...DEFAULT_PREFS, reduced: "on" }, setPrefs: () => {}, onWrite: () => {}, onRetry: () => {}, onReplayBoot: () => {},
  }))).not.toThrow();
});

it("new edits replace pending save-status work and leaving the editor cancels it", () => {
  vi.useFakeTimers(); const saved = vi.fn(), pending = createDebounce(saved, 600);
  pending.schedule(); vi.advanceTimersByTime(500); pending.schedule();
  vi.advanceTimersByTime(500); expect(saved).not.toHaveBeenCalled();
  vi.advanceTimersByTime(100); expect(saved).toHaveBeenCalledOnce();
  pending.schedule(); pending.cancel(); vi.advanceTimersByTime(1000);
  expect(saved).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
});

it("keeps an explicit own-key study model direct, gated and separate from the Free cache", async () => {
  const input = { task: "t2" as const, essay: "Separate model provider cache regression", question: "Discuss working from home.", words: 250, image: null };
  setChecker({ mode: "free", key: "" });
  const network = vi.fn(async (url: string | URL | Request) => new Response(JSON.stringify(String(url).startsWith("/api")
    ? { reply: "Free study example.", model: "free-model" }
    : { candidates: [{ content: { parts: [{ text: "Own-key study example." }] } }] })));
  vi.stubGlobal("fetch", network);
  expect((await getModelAnswer(input)).text).toBe("Free study example.");
  setChecker({ mode: "own", key: "test-only-own-key" });
  const gate = vi.spyOn(geminiAccess, "require").mockResolvedValue();
  expect((await getModelAnswer(input)).text).toBe("Own-key study example.");
  expect(gate).toHaveBeenCalledOnce(); expect(network).toHaveBeenCalledTimes(2);
  const call = network.mock.calls[1] as unknown as [string, RequestInit];
  expect(call[0]).toMatch(/^https:\/\/generativelanguage.googleapis.com\//);
  expect(call[0]).not.toContain("test-only-own-key"); expect(call[1].headers).toHaveProperty("x-goog-api-key", "test-only-own-key");
});

it("refuses an ineligible own-key study model before any upstream request", async () => {
  setChecker({ mode: "own", key: "test-only-own-key" });
  vi.spyOn(geminiAccess, "require").mockRejectedValue(new Error("Gemini eligibility required"));
  const network = vi.fn(); vi.stubGlobal("fetch", network);
  await expect(getModelAnswer({ task: "t2", essay: "Own eligibility regression", question: "Discuss home working.", words: 250, image: null })).rejects.toThrow("eligibility");
  expect(network).not.toHaveBeenCalled();
});
