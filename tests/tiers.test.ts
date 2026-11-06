import { geminiAccess } from "../src/lib/gemini";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { engineGivesBands, FEEDBACK_ONLY_LABEL, isStrongDevice, NANO_BANDS_VALIDATED, NANO_FEEDBACK_LABEL, pickEngine, type DeviceProbe } from "../src/lib/engines";
import { createTiers, engineChecker, probeDevice, watchCheckerRuntimes } from "../src/lib/tiers";
import { createNanoRuntime, nanoAvailability } from "../src/lib/nano";
import { deviceInput, deviceMessages, deviceResult } from "../src/lib/device-report";
import { isGeminiLimit, loadChecker, setChecker } from "../src/lib/checker";
import { markEssay } from "../src/lib/api";
import { addEntry, loadHistory, personalBest, toEntry } from "../src/lib/history";
import { Report } from "../src/components/Results";
import Overview from "../src/components/Overview";
import { CheckerPicker, CheckerSetup } from "../src/components/Checker";
import { DEFAULT_PREFS } from "../src/lib/prefs";
import { feedbackText } from "../src/lib/feedback";
import { createDeviceChecker, type DeviceChecker } from "../src/lib/device";
import type { Draft, MarkResult } from "../src/lib/types";

const webllm = vi.hoisted(() => {
  const runtime = { cached: vi.fn(async () => true), load: vi.fn(async () => {}), generate: vi.fn(async () => "{}"), remove: vi.fn(async () => {}), dispose: vi.fn() };
  return { runtime, createRuntime: vi.fn(async () => runtime) };
});
vi.mock("../src/lib/device.runtime", () => ({ createRuntime: webllm.createRuntime }));

const GB = 1024 ** 3;
const draft: Draft = { task: "t2", question: "Should cities invest more in public transport?", essay: `People is waiting for a bus.\n\n${"Public transport helps people travel to work and reduces traffic. ".repeat(8)}` };
const input = deviceInput(draft);
const feedback = {
  criteria: { tr: { band: 8 }, cc: { band: 8 }, lr: { band: 8 }, gra: { band: 8 } }, // sent anyway by a model: must be stripped
  grammar_corrections: [{ original: "People is waiting", corrected: "People are waiting", reason: "Subject agreement" }],
  word_choice_upgrades: [{ original: "helps people travel", better: "enables commuters to travel", reason: "More precise" }],
  paragraphs: [{ label: "Opening", original_start: "People is waiting", comments: { tr: "", cc: "Link this to your main point.", lr: "", gra: "" } }],
  top_3_priorities: ["Check subject–verb agreement in every sentence."],
};
const memStore = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};
function fakeLanguageModel(state: string) {
  const child = { prompt: vi.fn(async () => JSON.stringify(feedback)), destroy: vi.fn() };
  const session = { prompt: vi.fn(async () => JSON.stringify(feedback)), clone: vi.fn(async () => child), destroy: vi.fn() };
  const lm = {
    availability: vi.fn(async () => state),
    create: vi.fn(async (opts?: { monitor?: (m: { addEventListener: (t: string, fn: (e: { loaded: number }) => void) => void }) => void }) => {
      opts?.monitor?.({ addEventListener: (_t, fn) => fn({ loaded: 0.5 }) });
      return session;
    }),
  };
  return { lm, session, child };
}
beforeEach(async () => {
  await geminiAccess.load(async () => new Response(JSON.stringify({ ok: true, gemini: { allowed: true } })));
  geminiAccess.confirmAge();
});
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("localStorage", memStore()); });
afterEach(() => { setChecker({ mode: "site", key: "" }); vi.unstubAllGlobals(); });

describe("auto-pick decision table", () => {
  const probe = (p: Partial<DeviceProbe>): DeviceProbe => ({ nano: "unavailable", webgpu: false, ...p });
  it.each([
    [{ nano: "available", webgpu: true, maxBufferSize: 4 * GB }, "nano"],
    [{ nano: "available" }, "nano"],
    [{ nano: "downloadable", webgpu: true, maxBufferSize: 4 * GB }, "qwen4b"],
    [{ webgpu: true, deviceMemory: 8 }, "qwen4b"],
    [{ webgpu: true, maxBufferSize: 2 * GB }, "qwen4b"],
    [{ webgpu: true, maxBufferSize: 1 * GB }, "small"],
    [{ webgpu: true, maxBufferSize: 4 * GB, deviceMemory: 4 }, "small"], // low RAM vetoes the 4B model
    [{ webgpu: true }, "small"],
    [{ nano: "downloadable", webgpu: true }, "small"],
    [{ nano: "downloadable" }, "nano"],
    [{ nano: "downloading" }, "nano"],
    [{}, null],
  ] as [Partial<DeviceProbe>, string | null][])("%o picks %s", (p, engine) => {
    const pick = pickEngine(probe(p));
    expect(pick.engine).toBe(engine);
    expect(pick.reason.length).toBeGreaterThan(10);
  });
  it("is conservative about strength", () => {
    expect(isStrongDevice({})).toBe(false);
    expect(isStrongDevice({ maxBufferSize: 2 * GB - 1 })).toBe(false);
    expect(isStrongDevice({ deviceMemory: 8 })).toBe(true);
  });
  it("probes WebGPU limits and Nano state without creating a session", async () => {
    const { lm } = fakeLanguageModel("downloadable");
    const nav = { gpu: { requestAdapter: async () => ({ limits: { maxBufferSize: 4 * GB } }) }, deviceMemory: 8 };
    expect(await probeDevice(nav, () => nanoAvailability(lm))).toEqual({ nano: "downloadable", webgpu: true, maxBufferSize: 4 * GB, deviceMemory: 8 });
    expect(await probeDevice({ gpu: { requestAdapter: async () => { throw new Error("blocked"); } } }, async () => "unavailable")).toMatchObject({ webgpu: false });
    expect(lm.create).not.toHaveBeenCalled();
    for (const [raw, state] of [["readily", "available"], ["after-download", "downloadable"], ["no", "unavailable"], ["weird", "unavailable"]]) {
      expect(await nanoAvailability({ ...lm, availability: async () => raw })).toBe(state);
    }
    expect(await nanoAvailability(undefined)).toBe("unavailable");
  });
  it("switching engines releases the previous worker/session and persists the override", async () => {
    const store = memStore();
    const made: Record<string, { release: ReturnType<typeof vi.fn> }> = {};
    const tiers = createTiers({
      store, probe: async () => ({ nano: "unavailable", webgpu: true, maxBufferSize: 4 * GB }),
      checker: (e) => (made[e] = { release: vi.fn(), getSnapshot: () => ({ status: "ready" }), canResume: async () => false } as never) as unknown as DeviceChecker,
    });
    await tiers.probe();
    expect(tiers.engine()).toBe("qwen4b");
    tiers.active();
    tiers.setChoice("small");
    expect(tiers.engine()).toBe("small");
    expect(made.qwen4b.release).toHaveBeenCalled();
    expect(store.getItem("bandexe-device-engine")).toBe("small");
    expect(createTiers({ store, probe: async () => ({ nano: "unavailable", webgpu: false }), checker: () => ({}) as DeviceChecker }).getSnapshot().choice).toBe("small");
  });
});

describe("Nano gate and feedback-only results", () => {
  it("keeps Nano bands off until the blind test passes", () => {
    expect(NANO_BANDS_VALIDATED).toBe(false);
    expect(engineGivesBands("nano")).toBe(false);
    expect(engineGivesBands("nano", true)).toBe(true);
    expect(engineGivesBands("small", true)).toBe(false);
    expect(engineGivesBands("qwen4b")).toBe(false); // measured: no better than guessing in the browser test
    expect(engineGivesBands("qwen4b", false, true)).toBe(true);
  });
  it("strips any bands the small model or Nano sends and keeps reviewed feedback", () => {
    for (const [engine, label] of [["small", FEEDBACK_ONLY_LABEL], ["nano", NANO_FEEDBACK_LABEL]] as const) {
      const r = deviceResult(JSON.stringify(feedback), input, engine);
      expect(r).toMatchObject({ feedbackOnly: true, overall: null, range: null, label, engine, checker: "device" });
      expect(Object.values(r.report.criteria).every((c) => c.band === null && !c.subskills.length)).toBe(true);
      expect(r.report.grammar).toHaveLength(1); expect(r.report.upgrades).toHaveLength(1);
      expect(r.report.paragraphs).toHaveLength(1); expect(r.report.priorities).toHaveLength(1);
      expect(r.markingVersion).toContain("no-band");
    }
    expect(() => deviceResult("{}", input, "small")).toThrow(/no usable feedback/);
    expect(deviceResult(JSON.stringify(feedback), input, "qwen4b", true).overall).toBe(8);
  });
  it("never asks a feedback-only engine for bands", () => {
    const [system] = deviceMessages(input, false);
    expect(system.content).toContain("Do not give any band");
    expect(system.content).not.toContain('"criteria"');
    expect(deviceMessages(input, true)[0].content).toContain('"criteria"');
  });
  it("renders no band anywhere: number, range bar, criterion bands, criteria section or celebration", () => {
    const result = deviceResult(JSON.stringify(feedback), input, "small");
    const job = { id: 1, status: "done" as const, result, essay: draft.essay, minutes: 12, best: { prev: 6, next: 8 } };
    const html = renderToStaticMarkup(createElement(Report, {
      active: true, job, result, essay: draft.essay, setEssay: () => {}, prefs: { ...DEFAULT_PREFS, reduced: "on" }, setPrefs: () => {},
      onReplayBoot: () => {}, onRetry: () => {}, onWrite: () => {},
    }));
    for (const banned of ["score-num", 'class="ruler"', "r-range", "score-criteria", "crit__band", "Likely range", 'id="r-criteria"', "#r-criteria", "Overall withheld", "celebrate"]) expect(html).not.toContain(banned);
    expect(html).not.toMatch(/>[^<]*\b[1-9]\.[05]\b/); // no band-like number in any visible text
    expect(html).not.toContain("estimate does not change");
    for (const kept of [FEEDBACK_ONLY_LABEL, "People are waiting", "enables commuters to travel", "Link this to your main point.", "Check subject–verb agreement", "not an IELTS score"]) expect(html).toContain(kept);
  });
  it("stores feedback-only history without bands, excluded from charts and personal bests", () => {
    const result = deviceResult(JSON.stringify(feedback), input, "small");
    const entry = toEntry(result);
    expect(entry).toMatchObject({ overall: null, range: null, feedbackOnly: true, bands: { tr: null, cc: null, lr: null, gra: null } });
    const banded = { ...entry, id: "old", feedbackOnly: undefined, overall: 5, range: { lo: 4, hi: 6 } };
    expect(personalBest([banded], { ...entry, overall: 9 })).toBeNull();
    const html = renderToStaticMarkup(createElement(Overview, { active: true, history: [entry], prefs: DEFAULT_PREFS, setPrefs: () => {}, onReplayBoot: () => {}, onDelete: () => {}, onClearDraft: () => {} }));
    expect(html).toContain("No overall estimates to plot yet"); expect(html).toContain("Feedback only");
    expect(html).not.toContain('class="pt"');
  });
  it("keeps all device setup and model removal controls out of checker UI", () => {
    setChecker({ mode: "device", key: "" });
    const html = renderToStaticMarkup(createElement(CheckerPicker)) + renderToStaticMarkup(createElement(CheckerSetup));
    expect(html).toContain("Free checker"); expect(html).not.toMatch(/download|unlimited|Qwen|Advanced|Enable/i);
  });
});

describe("no download before consent", () => {
  it("Nano never calls create on a model that is not already available, even with old consent", async () => {
    const { lm } = fakeLanguageModel("downloadable"); vi.stubGlobal("LanguageModel", lm);
    const c = engineChecker("nano", null); await c.check();
    expect(await c.canResume()).toBe(false); await expect(c.mark(draft)).rejects.toThrow();
    await c.enable(false); await c.enable(true); expect(lm.create).not.toHaveBeenCalled(); c.release();
  });
  it("Nano: an already-available model may run without a click because nothing downloads", async () => {
    const { lm } = fakeLanguageModel("available");
    vi.stubGlobal("LanguageModel", lm);
    const c = engineChecker("nano", null);
    expect(await c.canResume()).toBe(true);
    expect((await c.mark(draft)).feedbackOnly).toBe(true);
    expect(lm.create).toHaveBeenCalledOnce();
  });
  it("Nano runtime retries without responseConstraint when unsupported", async () => {
    const { lm, child } = fakeLanguageModel("available");
    const progress = vi.fn();
    const rt = createNanoRuntime(lm);
    await rt.load(new AbortController().signal, progress, { allowDownload: true });
    expect(progress).not.toHaveBeenCalled();
    child.prompt.mockRejectedValueOnce(new TypeError("responseConstraint"));
    expect(await rt.generate(input, new AbortController().signal)).toContain("People are waiting");
    expect(child.prompt).toHaveBeenCalledTimes(2);
    await expect(rt.remove()).rejects.toThrow(/Chrome manages/);
  });
  it("WebLLM: resumes without a click only after a completed earlier load that is still cached", async () => {
    vi.stubGlobal("navigator", { gpu: { requestAdapter: async () => ({}) } });
    const store = memStore();
    const c = engineChecker("small", store);
    expect(await c.canResume()).toBe(false);
    expect(webllm.createRuntime).not.toHaveBeenCalled(); // not even the lazy chunk
    await c.check(); await expect(c.mark(draft)).rejects.toThrow(/Download and enable/);
    expect(webllm.runtime.load).not.toHaveBeenCalled();
    await c.enable(true);
    expect(webllm.createRuntime).toHaveBeenCalledWith({ model: "Qwen3-1.7B-q4f16_1-MLC", bands: false });
    expect(store.getItem("bandexe-device-done-small")).toBe("1");
    expect(await c.canResume()).toBe(true);
    webllm.runtime.cached.mockResolvedValueOnce(false); // evicted: must ask again
    expect(await c.canResume()).toBe(false);
    await c.remove();
    expect(store.getItem("bandexe-device-done-small")).toBeNull();
  });
});

describe("retired checker and fallback routes", () => {
  it("still recognizes historical Gemini allowance codes", () => {
    for (const code of ["limit", "busy", "quota", "429"]) { expect(isGeminiLimit("site", code)).toBe(true); expect(isGeminiLimit("own", code)).toBe(true); }
    expect(isGeminiLimit("device", "quota")).toBe(false);
  });
  it.each(["site", "device"] as const)("routes retired %s to Free checker and ignores ready WebLLM engines", async (mode) => {
    setChecker({ mode, key: "unused-key" });
    const network = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ task: "t2" }))); vi.stubGlobal("fetch", network);
    const tiers = { readyEngine: vi.fn(async () => "qwen4b"), checker: vi.fn() };
    expect((await markEssay(draft, null, tiers)).checker).toBe("free");
    expect(network.mock.calls[0][0]).toBe("/api/mark"); expect(JSON.stringify(network.mock.calls)).not.toContain("unused-key");
    expect(tiers.readyEngine).not.toHaveBeenCalled(); expect(tiers.checker).not.toHaveBeenCalled();
  });
  it("an own-key quota error stays an own-key error and never starts Chrome", async () => {
    setChecker({ mode: "own", key: "student-key" }); const { lm } = fakeLanguageModel("available"); vi.stubGlobal("LanguageModel", lm);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 429 })));
    await expect(markEssay(draft, null)).rejects.toMatchObject({ code: "quota" }); expect(lm.create).not.toHaveBeenCalled();
  });
  it.each(["invalid", "server", "unavailable"])("does not mask cloud %s errors with local feedback", async (code) => {
    setChecker({ mode: "free", key: "" }); const { lm } = fakeLanguageModel("available"); vi.stubGlobal("LanguageModel", lm);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: code }), { status: 502 })));
    await expect(markEssay(draft, null)).rejects.toMatchObject({ code }); expect(lm.create).not.toHaveBeenCalled();
  });
});

describe("default checker mode", () => {
  it("migrates retired choices and unsaved own-key mode to Free checker", () => {
    expect(loadChecker(memStore()).mode).toBe("free");
    expect(loadChecker(memStore({ "bandexe-checker": "site" })).mode).toBe("free");
    expect(loadChecker(memStore({ "bandexe-checker": "own" })).mode).toBe("free");
    expect(loadChecker(memStore({ "bandexe-own-key": "k" })).mode).toBe("free");
    expect(loadChecker(memStore({ "bandexe-history-v1": "[]" })).mode).toBe("free");
    expect(loadChecker(memStore({ "bandexe-draft": "{}" })).mode).toBe("free");
  });
  it("persists the first default so the mode does not flip once a draft exists", async () => {
    vi.resetModules();
    const store = memStore();
    vi.stubGlobal("localStorage", store);
    const fresh = await import("../src/lib/checker");
    expect(fresh.getChecker().mode).toBe("free");
    expect(store.getItem("bandexe-checker")).toBe("free");
    store.setItem("bandexe-draft", "{}");
    expect(fresh.loadChecker(store).mode).toBe("free");
  });
});

// Type-only guard: MarkResult carries the flag the UI relies on.
const _typed: Pick<MarkResult, "feedbackOnly" | "notice"> = { feedbackOnly: true, notice: "" };
void _typed;

describe("tier finding regressions", () => {
  it("refuses Nano if availability changes immediately before create", async () => {
    const { lm } = fakeLanguageModel("downloadable");
    lm.availability.mockResolvedValueOnce("available").mockResolvedValueOnce("available").mockResolvedValueOnce("available");
    vi.stubGlobal("LanguageModel", lm); const c = engineChecker("nano", null);
    expect(await c.resume()).toBe(false); expect(lm.create).not.toHaveBeenCalled();
    await c.enable(true); expect(lm.create).not.toHaveBeenCalled(); c.release();
  });
  it("a stale Nano Enable button carries no download consent", async () => {
    const { lm } = fakeLanguageModel("downloadable"); vi.stubGlobal("LanguageModel", lm);
    const c = engineChecker("nano", null); await c.check();
    await c.enable(true, { allowDownload: false });
    expect(lm.create).not.toHaveBeenCalled(); expect(c.getSnapshot().status).toBe("consent");
    await c.enable(true, { allowDownload: true }); expect(lm.create).not.toHaveBeenCalled(); c.release();
  });
  it("a released pending resume cannot load, generate, or overwrite a newer operation", async () => {
    let resolve!: (resumable: boolean) => void;
    const resumable = vi.fn(() => new Promise<boolean>((r) => { resolve = r; }));
    const runtime = { cached: vi.fn(async () => true), load: vi.fn(async () => {}), generate: vi.fn(async () => JSON.stringify(feedback)), remove: vi.fn(async () => {}), dispose: vi.fn() };
    const factory = vi.fn(async () => runtime);
    const c = createDeviceChecker({ availability: async () => "", runtime: factory, resumable });
    const marking = c.mark(draft);
    const failure = expect(marking).rejects.toMatchObject({ name: "AbortError" });
    expect(resumable).toHaveBeenCalledOnce();
    c.release(); resolve(true); await failure;
    expect(factory).not.toHaveBeenCalled(); expect(runtime.load).not.toHaveBeenCalled(); expect(runtime.generate).not.toHaveBeenCalled();
    const stale = c.resume(); // another delayed resume, released while in its first await
    c.release();
    await c.check(); await c.enable(true);
    expect(c.getSnapshot().status).toBe("ready");
    resolve(true); expect(await stale).toBe(false);
    expect(c.getSnapshot().status).toBe("ready"); expect(runtime.load).toHaveBeenCalledOnce();
    c.release();
  });
  it("a stale mark cannot generate on a newly enabled runtime after release", async () => {
    let resolve!: (value: boolean) => void;
    const runtime = { cached: async () => true, load: vi.fn(async () => {}), generate: vi.fn(async () => JSON.stringify(feedback)), remove: async () => {}, dispose: vi.fn() };
    const c = createDeviceChecker({ availability: async () => "", runtime: async () => runtime, resumable: () => new Promise<boolean>((r) => { resolve = r; }) });
    const marking = c.mark(draft);
    const failure = expect(marking).rejects.toMatchObject({ name: "AbortError" });
    c.release(); await c.check(); await c.enable(true);
    resolve(true); await failure;
    expect(runtime.generate).not.toHaveBeenCalled(); expect(c.getSnapshot().status).toBe("ready"); c.release();
  });
  it("release during Nano's final availability await prevents create even when availability resolves later", async () => {
    const { lm } = fakeLanguageModel("available");
    let resolve!: (state: string) => void;
    lm.availability.mockResolvedValueOnce("available").mockResolvedValueOnce("available").mockResolvedValueOnce("available")
      .mockImplementationOnce(() => new Promise<string>((r) => { resolve = r; }));
    vi.stubGlobal("LanguageModel", lm);
    const c = engineChecker("nano", null); const resuming = c.resume();
    await vi.waitFor(() => expect(lm.availability).toHaveBeenCalledTimes(4));
    c.release(); resolve("available");
    expect(await resuming).toBe(false); expect(lm.create).not.toHaveBeenCalled(); expect(c.getSnapshot().status).toBe("consent");
  });
  it.each([false, true])("releases a temporary Chrome fallback in finally (inference fails: %s)", async (fails) => {
    setChecker({ mode: "free", key: "" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "pool_empty" }), { status: 503 })));
    const { lm, session, child } = fakeLanguageModel("available"); vi.stubGlobal("LanguageModel", lm);
    if (fails) child.prompt.mockRejectedValue(new Error("Session lost"));
    if (fails) await expect(markEssay(draft, null)).rejects.toMatchObject({ code: "pool_empty" });
    else expect((await markEssay(draft, null)).feedbackOnly).toBe(true);
    expect(lm.create).toHaveBeenCalledOnce(); expect(session.destroy).toHaveBeenCalledOnce(); expect(child.destroy).toHaveBeenCalledOnce();
  });
  it("cloud mode transitions and unmount release all dormant model allocations", async () => {
    const allocated = new Set<string>();
    const tiers = createTiers({ store: null, probe: async () => ({ nano: "unavailable", webgpu: true }), checker: (engine) => ({ release: () => allocated.delete(engine) }) as unknown as DeviceChecker });
    for (const engine of ["nano", "small", "qwen4b"] as const) { tiers.checker(engine); allocated.add(engine); }
    setChecker({ mode: "free", key: "" }); const unmount = watchCheckerRuntimes(tiers); expect(allocated.size).toBe(0);
    allocated.add("qwen4b"); setChecker({ mode: "own", key: "test" }); expect(allocated.size).toBe(0);
    allocated.add("small"); setChecker({ mode: "free" }); expect(allocated.size).toBe(0);
    allocated.add("nano"); unmount(); expect(allocated.size).toBe(0);
  });
  it("rejects common band phrasings, formatting and reports left with no feedback", () => {
    for (const text of ["band 7", "overall 6.5", "Band: 8.0", "IELTS 7", "Band **7**", "overall score is about 6.5", "a band between 6 and 7", "IELTS band: ７", "band seven"]) expect(feedbackText(text)).toBe("");
    expect(feedbackText("Use the figures 20 and 40 to support this comparison.")).toContain("20 and 40");
    expect(() => deviceResult(JSON.stringify({ top_3_priorities: ["Estimated overall band: 8.0"] }), input, "nano")).toThrow(/no usable feedback/);
  });
  it.each(["small", "nano"] as const)("rejects band estimates in every authored field before %s rendering and history", (engine) => {
    const contaminated = {
      criteria: Object.fromEntries(["tr", "cc", "lr", "gra"].map((c) => [c, { band: 8, summary: "IELTS 7", subskills: { idea: 7 } }])),
      grammar_corrections: [
        { original: "People is waiting", corrected: "People are waiting", reason: "Band: 8.0" },
        { original: "for a bus", corrected: "overall 6.5", reason: "Improve this" },
      ],
      word_choice_upgrades: [{ original: "helps people travel", better: "enables commuters to travel", reason: "band 7" }],
      paragraphs: [{ label: "IELTS 7", original_start: "People is waiting", comments: { tr: "Band: 8.0", cc: "overall 6.5", lr: "band 7", gra: "Check agreement." }, how_to_rewrite: "Estimated overall band: 8.0" }],
      strengths: ["IELTS 7", "Keep the clear position."], structure_advice: "overall 6.5",
      top_3_priorities: ["Estimated overall band: 8.0", "IELTS 7", "Check agreement."],
    };
    const r = deviceResult(JSON.stringify(contaminated), input, engine);
    const banned = /band\s*:?\s*[0-9]|overall\s+[0-9]|ielts\s+[0-9]/i;
    expect(JSON.stringify(r)).not.toMatch(banned);
    expect(r.report.grammar).toHaveLength(1); expect(r.report.grammar[0].reason).toBe("");
    expect(r.report.paragraphs[0].comments.gra).toBe("Check agreement.");
    expect(r.report.priorities).toEqual(["Check agreement."]);
    const job = { id: 1, status: "done" as const, result: r, essay: draft.essay, minutes: null };
    const html = renderToStaticMarkup(createElement(Report, { active: true, job, result: r, essay: draft.essay, setEssay: () => {}, prefs: { ...DEFAULT_PREFS, reduced: "on" }, setPrefs: () => {}, onReplayBoot: () => {}, onRetry: () => {}, onWrite: () => {} }));
    expect(html).not.toMatch(banned); expect(html).toContain("Check agreement.");
    const store = memStore(); const entry = toEntry(r); addEntry(entry, store);
    expect(store.getItem("bandexe-history-v1")).not.toMatch(banned);
    const overview = renderToStaticMarkup(createElement(Overview, { active: true, history: loadHistory(store), prefs: DEFAULT_PREFS, setPrefs: () => {}, onReplayBoot: () => {}, onDelete: () => {}, onClearDraft: () => {} }));
    expect(overview).not.toMatch(banned);
    // Persistence also protects callers that hand it an older/unfiltered feedback-only result.
    expect(toEntry({ ...r, report: { ...r.report, priorities: ["Band: 8.0", "overall 6.5", "IELTS 7"] } }).priorities).toEqual([]);
    store.setItem("bandexe-history-v1", JSON.stringify([{ ...entry, priorities: ["band 7", "Keep practising."] }]));
    expect(loadHistory(store)[0].priorities).toEqual(["Keep practising."]);
  });
});
