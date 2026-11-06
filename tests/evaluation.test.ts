import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { evaluateDraft, captureEvaluation } from "../src/lib/evaluation";
import { markEssay } from "../src/lib/api";
import { setChecker } from "../src/lib/checker";
import type { Draft } from "../src/lib/types";

const draft: Draft = { task: "t2", question: "Should cities improve public transport?", essay: "Public transport reduces traffic and helps people travel to work. ".repeat(8) };
beforeEach(() => { vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} }); setChecker({ mode: "free", key: "" }); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Evaluate selection", () => {
  it.each(["own", "free"] as const)("cancels a switch through %s before sending, including away and back", async (mode) => {
    const selection = captureEvaluation();
    setChecker({ mode: "own", key: "key" });
    if (mode === "free") setChecker({ mode: "free" });
    const network = vi.fn(); vi.stubGlobal("fetch", network);
    await expect(markEssay(draft, null, undefined, selection)).rejects.toMatchObject({ code: "cancelled" });
    expect(network).not.toHaveBeenCalled();
  });
  it("cancels a key change before sending", async () => {
    setChecker({ mode: "own", key: "first" }); const selection = captureEvaluation(); setChecker({ key: "second" });
    const network = vi.fn(); vi.stubGlobal("fetch", network);
    await expect(markEssay(draft, null, undefined, selection)).rejects.toMatchObject({ code: "cancelled" }); expect(network).not.toHaveBeenCalled();
  });
  it("ignores obsolete engine state and never probes hardware", async () => {
    const legacy = { engine: vi.fn(() => "small"), probe: vi.fn(), getGeneration: vi.fn(() => 999) };
    const submit = vi.fn(async () => {});
    await evaluateDraft({ current: false }, false, draft, null, submit, legacy);
    expect(submit).toHaveBeenCalledOnce(); Object.values(legacy).forEach((fn) => expect(fn).not.toHaveBeenCalled());
  });
});
describe("synchronous Evaluate lock and validation", () => {
  it("submits only once during same-render double clicks and releases the lock on completion", async () => {
    let done!: () => void; const submit = vi.fn(() => new Promise<void>((resolve) => { done = resolve; })); const lock = { current: false };
    const first = evaluateDraft(lock, false, draft, null, submit);
    await evaluateDraft(lock, false, draft, null, submit); expect(submit).toHaveBeenCalledOnce(); expect(lock.current).toBe(true);
    done(); await first; expect(lock.current).toBe(false);
  });
  it("releases after validation failure and honors pending jobs", async () => {
    const submit = vi.fn(); const lock = { current: false };
    await expect(evaluateDraft(lock, false, { ...draft, essay: "short" }, null, submit)).rejects.toThrow(/50 words/);
    expect(lock.current).toBe(false); await evaluateDraft(lock, true, draft, null, submit); expect(submit).not.toHaveBeenCalled();
    await evaluateDraft(lock, false, draft, null, submit); expect(submit).toHaveBeenCalledOnce();
  });
  it("requires the academic chart and an own key when explicitly selected", async () => {
    const submit = vi.fn();
    await expect(evaluateDraft({ current: false }, false, { ...draft, task: "ac1" }, null, submit)).rejects.toThrow(/chart image/);
    setChecker({ mode: "own", key: "" });
    await expect(evaluateDraft({ current: false }, false, draft, null, submit)).rejects.toThrow(/Save your free Gemini key/);
    expect(submit).not.toHaveBeenCalled();
  });
});
