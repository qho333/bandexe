import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import raw from "../server/fixtures/sample-report.fixture.json?raw";
import { POOL_MESSAGE } from "../shared/free.js";
import { deviceInput, deviceResult } from "../src/lib/device-report";

const draft = { task: "t2" as const, question: "Discuss working from home.", essay: "Working from home has became normal. " + "More people can work from home today. ".repeat(8) };
const report = { ...deviceResult(raw, deviceInput(draft), "nano"), checker: "free", markingVersion: "open-report-v1/test/uncalibrated", remainingToday: 3, dailyLimit: 5 };
const memory = (seed: Record<string, string> = {}) => {
  const data = new Map(Object.entries(seed));
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } };
};
beforeEach(() => vi.resetModules());
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Evaluate reaches a report with fresh and old browser storage", () => {
  it.each([null, "device", "site", "unknown", "own", "free"])("migrates %s to free, ignoring saved model flags and engine overrides", async (mode) => {
    const store = memory({ ...(mode ? { "bandexe-checker": mode } : {}), "bandexe-device-done-qwen4b": "1", "bandexe-device-done-small": "1", "bandexe-device-done-nano": "1", "bandexe-device-engine": "qwen4b", "bandexe-draft": JSON.stringify(draft) });
    vi.stubGlobal("localStorage", store);
    const { evaluateDraft } = await import("../src/lib/evaluation"); const { markEssay } = await import("../src/lib/api");
    const { geminiAccess } = await import("../src/lib/gemini"); const gate = vi.spyOn(geminiAccess, "require").mockRejectedValue(new Error("Must not gate free"));
    const network = vi.fn(async () => new Response(JSON.stringify(report))); vi.stubGlobal("fetch", network);
    const lm = { availability: vi.fn(), create: vi.fn() }; vi.stubGlobal("LanguageModel", lm);
    await evaluateDraft({ current: false }, false, draft, null, async (selection) => {
      expect(selection.mode).toBe("free"); const result = await markEssay(draft, null, undefined, selection); expect(result.checker).toBe("free");
      const { Report } = await import("../src/components/Results"); const { DEFAULT_PREFS } = await import("../src/lib/prefs");
      const html = renderToStaticMarkup(createElement(Report, { active: true, job: { id: 1, status: "done", result, essay: draft.essay, minutes: null }, result, essay: draft.essay, setEssay: () => {}, prefs: { ...DEFAULT_PREFS, reduced: "on" }, setPrefs: () => {}, onReplayBoot: () => {}, onRetry: () => {}, onWrite: () => {} }));
      expect(html).toContain("res-main"); expect(html).toContain("Check subject"); expect(html).not.toMatch(/download|unlimited/i);
    });
    expect(store.getItem("bandexe-checker")).toBe("free"); expect(gate).not.toHaveBeenCalled(); expect(lm.availability).not.toHaveBeenCalled(); expect(network).toHaveBeenCalledOnce();
    const call = network.mock.calls[0] as unknown as [string, RequestInit]; expect(call[0]).toBe("/api/mark"); expect(call[1].headers).not.toHaveProperty("X-Age-Confirmed");
    const { getAllowance } = await import("../src/lib/allowance"); expect(getAllowance()).toEqual({ remaining: 3, limit: 5 });
  });
  it.each(["site", "device", "nonsense", "free"])("ignores a saved key in %s mode", async (mode) => {
    vi.stubGlobal("localStorage", memory({ "bandexe-checker": mode, "bandexe-own-key": "unused-secret" }));
    const { markEssay } = await import("../src/lib/api");
    const network = vi.fn(async () => new Response(JSON.stringify(report))); vi.stubGlobal("fetch", network);
    expect((await markEssay(draft, null)).checker).toBe("free"); expect(JSON.stringify(network.mock.calls)).not.toContain("unused-secret");
  });
  it("keeps own only when a key is saved", async () => {
    vi.stubGlobal("localStorage", memory({ "bandexe-checker": "own", "bandexe-own-key": "saved-key" }));
    const { getChecker } = await import("../src/lib/checker"); expect(getChecker()).toEqual({ mode: "own", key: "saved-key" });
  });
});

describe("Chrome feedback fallback", () => {
  it.each(["downloadable", "downloading", "unavailable", "readily"])("never creates a %s model even with completed device flags", async (state) => {
    vi.stubGlobal("localStorage", memory({ "bandexe-checker": "device", "bandexe-device-done-nano": "1", "bandexe-device-done-qwen4b": "1", "bandexe-device-engine": "nano" }));
    const lm = { availability: vi.fn(async () => state), create: vi.fn() }; vi.stubGlobal("LanguageModel", lm);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "pool_empty", message: "obsolete setup offer" }), { status: 503 })));
    const { markEssay, POOL_EMPTY_MESSAGE } = await import("../src/lib/api");
    expect(POOL_EMPTY_MESSAGE).toBe(POOL_MESSAGE);
    await expect(markEssay(draft, null)).rejects.toMatchObject({ code: "pool_empty", message: POOL_EMPTY_MESSAGE }); expect(lm.create).not.toHaveBeenCalled();
  });
  it.each(["pool_empty", "daily_limit", "network"])("uses an available Chrome model only after %s, strips bands and disposes the session", async (failure) => {
    vi.stubGlobal("localStorage", memory());
    vi.stubGlobal("fetch", vi.fn(async () => { if (failure === "network") throw new TypeError("offline"); return new Response(JSON.stringify({ error: failure }), { status: 503 }); }));
    const session = { prompt: vi.fn(async () => raw), destroy: vi.fn() };
    const lm = { availability: vi.fn(async () => "available"), create: vi.fn(async () => session) }; vi.stubGlobal("LanguageModel", lm);
    const { markEssay } = await import("../src/lib/api"); const result = await markEssay(draft, null);
    expect(result).toMatchObject({ checker: "device", engine: "nano", feedbackOnly: true, overall: null, range: null });
    expect(Object.values(result.report.criteria).every((c) => c.band === null && !c.subskills.length)).toBe(true);
    expect(result.notice).toContain("feedback only"); expect(lm.create).toHaveBeenCalledOnce(); expect(session.destroy).toHaveBeenCalledOnce();
    expect(lm.create.mock.calls[0]).not.toHaveProperty("monitor");
  });
  it("rechecks immediately before create and refuses a model evicted after the first probe", async () => {
    vi.stubGlobal("localStorage", memory()); const lm = { availability: vi.fn().mockResolvedValueOnce("available").mockResolvedValue("downloadable"), create: vi.fn() }; vi.stubGlobal("LanguageModel", lm);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "pool_empty" }), { status: 503 })));
    const { markEssay } = await import("../src/lib/api"); await expect(markEssay(draft, null)).rejects.toMatchObject({ code: "pool_empty" }); expect(lm.create).not.toHaveBeenCalled();
  });
  it("returns the original cloud error if Chrome fails and frees the session", async () => {
    vi.stubGlobal("localStorage", memory()); const session = { prompt: vi.fn(async () => { throw new Error("Session lost"); }), destroy: vi.fn() };
    vi.stubGlobal("LanguageModel", { availability: async () => "available", create: async () => session });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "pool_empty" }), { status: 503 })));
    const { markEssay, POOL_EMPTY_MESSAGE } = await import("../src/lib/api"); await expect(markEssay(draft, null)).rejects.toThrow(POOL_EMPTY_MESSAGE); expect(session.destroy).toHaveBeenCalledOnce();
  });
});
