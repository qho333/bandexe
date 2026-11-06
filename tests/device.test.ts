import { describe, expect, it, vi } from "vitest";
import { createDeviceChecker, type DeviceRuntime } from "../src/lib/device";
import { deviceInput, deviceMessages, deviceResult, parseDeviceJson, stripThinking, DEVICE_MODEL } from "../src/lib/device-report";
import { deviceAvailability, setChecker } from "../src/lib/checker";
import { markEssay } from "../src/lib/api";
import type { Draft } from "../src/lib/types";

const draft: Draft = { task: "t2", question: "Should cities invest more in public transport?", essay: `People is waiting for a bus. ${"Public transport helps people travel to work and reduces traffic. ".repeat(8)}` };
const report = { criteria: { tr: { band: 7 }, cc: { band: 6 }, lr: { band: 7 }, gra: { band: 6 } },
  grammar_corrections: [{ original: "People is waiting", corrected: "People are waiting", reason: "Subject agreement" }, { original: "invented quote", corrected: "fix" }], top_3_priorities: ["Check subject–verb agreement."] };
const text = JSON.stringify(report);
const input = deviceInput(draft);
function setup(availability = vi.fn(async () => "")) {
  const runtime: DeviceRuntime = { cached: vi.fn(async () => true), load: vi.fn(async () => {}), generate: vi.fn(async () => text), remove: vi.fn(async () => {}), dispose: vi.fn() };
  const loader = vi.fn(async () => runtime);
  return { checker: createDeviceChecker({ availability, runtime: loader }), runtime, loader, availability };
}

describe("local report parsing and review", () => {
  it("strips complete, multiple, case-insensitive and truncated think blocks before parsing", () => {
    expect(stripThinking(`<think>{"fake":true}</think><THINK>more reasoning</THINK>\n${text}`)).toBe(text);
    expect(parseDeviceJson(`<think>{"tr":9}</think>\n\`\`\`json\n${text}\n\`\`\``)).toEqual(report);
    expect(stripThinking("<think>unclosed JSON {\"tr\":9}")).toBe("");
    expect(() => parseDeviceJson("<think>{\"criteria\":{}} never closed")).toThrow(/unreadable/);
    for (const invalid of ["[]", "null", "1", "text {\"criteria\":{}} trailing"]) expect(() => parseDeviceJson(invalid)).toThrow();
  });
  it("normalises a short report, reviews exact quotes and keeps raw bands without Gemini calibration", () => {
    const result = deviceResult(`<think>Reasoning</think>${text}`, input, "qwen4b", true);
    expect(result.report.criteria.gra).toEqual({ band: 6, summary: "", subskills: [] });
    expect(result.overall).toBe(6.5);
    expect(result.range).toEqual({ lo: 5.5, hi: 7.5 });
    expect(result.report.grammar).toHaveLength(1);
    expect(result.report.dropped.grammar).toBe(1);
    expect(result.report.upgrades).toEqual([]);
    expect(result.report.paragraphs).toEqual([]);
    expect(result.report.strengths).toEqual([]);
    expect(result.report.structureAdvice).toBe("");
    expect(result.checker).toBe("device");
    expect(result.markingVersion).toContain(`${DEVICE_MODEL}/uncalibrated`);
    expect(result.label).toBe("Checked on this device (feedback only)");
    expect(result.note).toContain("no Gemini calibration");
  });
  it("withholds invalid/missing bands, never guesses a band or overall", () => {
    const result = deviceResult(JSON.stringify({ criteria: { tr: { band: 6 }, gra: { band: 6.5 } } }), input, "qwen4b", true);
    expect(result.overall).toBeNull(); expect(result.range).toBeNull();
    expect(result.withheld).toEqual(["cc", "lr", "gra"]);
    expect(result.report.criteria.gra.band).toBeNull();
    expect(() => deviceResult("{}", input, "qwen4b", true)).toThrow(/no valid bands/);
  });
  it("uses the v2 method and shorter JSON format with student data isolated", () => {
    const messages = deviceMessages(input);
    expect(messages[0].content).toContain("Start every criterion at band 7 and test it");
    expect(messages[0].content).toContain("At most 3 corrections, 2 upgrades");
    expect(messages[0].content).not.toContain(draft.essay);
    expect(messages[1].content).toContain(`/no_think\n<<<QUESTION\n${draft.question}`);
    expect(messages[1].content).toContain(draft.essay.trim());
  });
  it("requires a separate typed description for Academic T1, never passes image data", () => {
    expect(() => deviceInput({ ...draft, task: "ac1" })).toThrow(/cannot read images.*chart description/);
    const ac = deviceInput({ ...draft, task: "ac1", chartDescription: "Bus ridership increased from 20 to 40 million between 2000 and 2020." });
    expect(deviceMessages(ac)[0].content).toContain("No image is visible");
    expect(deviceMessages(ac)[1].content).toContain(ac.chartDescription);
    expect(deviceMessages(deviceInput({ ...draft, task: "gt1" }))[0].content).toContain("letter with three bullet points");
  });
});

describe("device consent gate", () => {
  it("routes retired device selection to the free endpoint without a model loader", async () => {
    const network = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ task: "t2" })));
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} }); setChecker({ mode: "device", key: "" });
    try { expect((await markEssay(draft, null)).checker).toBe("free"); expect(network).toHaveBeenCalledWith("/api/mark", expect.any(Object)); }
    finally { network.mockRestore(); setChecker({ mode: "free" }); vi.unstubAllGlobals(); }
  });
  it("never imports/loads/downloads on selection, support check, refused consent, or Evaluate", async () => {
    const { checker, loader, runtime } = setup();
    expect(checker.getSnapshot().status).toBe("idle");
    await checker.check(); await checker.enable(false);
    expect(checker.getSnapshot().status).toBe("consent");
    await expect(checker.mark(draft)).rejects.toThrow(/Download and enable/);
    expect(loader).not.toHaveBeenCalled(); expect(runtime.load).not.toHaveBeenCalled();
    await checker.enable(true);
    expect(loader).toHaveBeenCalledOnce(); expect(runtime.load).toHaveBeenCalledOnce();
    expect(checker.getSnapshot().status).toBe("ready");
    // Qwen3-4B has not passed the band test, so the real checker returns feedback without a band.
    expect(await checker.mark(draft)).toMatchObject({ overall: null, feedbackOnly: true });
  });
  it("reports unsupported/denied/no adapter and suggests own key, without importing WebLLM", async () => {
    for (const gpu of [undefined, { requestAdapter: async () => null }, { requestAdapter: async () => { throw Error("denied"); } }]) {
      const availability = vi.fn(() => deviceAvailability(gpu));
      const { checker, loader } = setup(availability);
      await checker.check(); await checker.enable(true);
      expect(checker.getSnapshot().status).toBe("unsupported");
      expect(checker.getSnapshot().message).toContain("My own key");
      expect(loader).not.toHaveBeenCalled();
    }
  });
  it("rechecks WebGPU after consent and handles an unavailable adapter before loading", async () => {
    const { checker, loader, availability } = setup();
    await checker.check(); availability.mockResolvedValue("WebGPU not available. Use My own key.");
    await checker.enable(true);
    expect(checker.getSnapshot().status).toBe("unsupported"); expect(loader).not.toHaveBeenCalled();
  });
  it("shows real initialization progress, cancels, ignores late completion and requires consent again", async () => {
    const { checker, runtime } = setup();
    let finish!: () => void;
    vi.mocked(runtime.load).mockImplementation(async (_signal, progress) => {
      progress({ progress: 0.42, text: "Fetching param_7.bin", timeElapsed: 12 });
      await new Promise<void>((resolve) => { finish = resolve; });
    });
    await checker.check(); const loading = checker.enable(true);
    await vi.waitFor(() => expect(checker.getSnapshot().progress?.progress).toBe(0.42));
    expect(checker.getSnapshot().message).toBe("Fetching param_7.bin");
    checker.cancel(); finish(); await loading;
    expect(runtime.dispose).toHaveBeenCalled(); expect(checker.getSnapshot().status).toBe("consent");
    await expect(checker.mark(draft)).rejects.toThrow(/Download and enable/);
  });
  it("cancels during lazy import before a worker or download can start", async () => {
    const { checker, loader, runtime } = setup();
    let finish!: (value: DeviceRuntime) => void;
    loader.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    await checker.check(); const loading = checker.enable(true);
    await vi.waitFor(() => expect(loader).toHaveBeenCalled());
    checker.cancel(); finish(runtime); await loading;
    expect(runtime.load).not.toHaveBeenCalled(); expect(runtime.dispose).toHaveBeenCalled();
    expect(checker.getSnapshot().status).toBe("consent");
  });
  it("removes cached/partial files without consent or loading an engine", async () => {
    const { checker, runtime } = setup();
    await checker.remove();
    expect(runtime.remove).toHaveBeenCalledOnce(); expect(runtime.load).not.toHaveBeenCalled();
    expect(runtime.generate).not.toHaveBeenCalled(); expect(checker.getSnapshot().cached).toBe(false);
    await expect(checker.mark(draft)).rejects.toThrow(/Download and enable/);
  });
  it("handles cache/loading failures and permits an explicit retry", async () => {
    const { checker, runtime } = setup();
    vi.mocked(runtime.load).mockRejectedValueOnce(new Error("out of memory"));
    await checker.check(); await checker.enable(true);
    expect(checker.getSnapshot().status).toBe("error"); expect(checker.getSnapshot().message).toContain("out of memory");
    await checker.enable(false); expect(runtime.load).toHaveBeenCalledOnce();
    await checker.enable(true); expect(checker.getSnapshot().status).toBe("ready");
  });
});
