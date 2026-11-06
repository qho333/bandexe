import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cloudRequest } from "../src/lib/cloud-request";
import { evaluateDraft } from "../src/lib/evaluation";
import { STILL_WORKING, BUSY_NOTICE } from "../src/lib/use-slow-reply";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import StudyTools from "../src/components/StudyTools";
import raw from "../server/fixtures/sample-report.fixture.json?raw";
import { deviceInput, deviceResult } from "../src/lib/device-report";

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const init = { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" };
const draft = { task: "t2" as const, question: "Discuss learning through practice.", essay: "People learn through practice and clear examples in their everyday lives. ".repeat(8) };

describe("cloud operations and slow-reply UI", () => {
  it("retries a lost connection once using the same request ID and payload", async () => {
    const network = vi.fn<typeof fetch>().mockRejectedValueOnce(new TypeError("connection reset"))
      .mockResolvedValueOnce(new Response('{"reply":"ok"}'));
    vi.stubGlobal("fetch", network);
    const pending = cloudRequest("/api/helper", init);
    await vi.advanceTimersByTimeAsync(500);
    expect(await (await pending).json()).toEqual({ reply: "ok" }); expect(network).toHaveBeenCalledTimes(2);
    const calls = network.mock.calls;
    const id = new Headers(calls[0][1]?.headers).get("Idempotency-Key");
    expect(id).toMatch(/^[\w-]{16,128}$/);
    expect(calls[0][1]?.body).toBe(calls[1][1]?.body);
    expect(new Headers(calls[1][1]?.headers).get("Idempotency-Key")).toBe(id);
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each([429, 500, 503])("never retries HTTP %i", async (status) => {
    const network = vi.fn(async () => new Response('{"error":"busy"}', { status })); vi.stubGlobal("fetch", network);
    expect((await cloudRequest("/api/mark", init)).status).toBe(status); expect(network).toHaveBeenCalledOnce();
  });
  it("does not retry aborts, programming errors or a malformed JSON body", async () => {
    for (const error of [new DOMException("aborted", "AbortError"), new Error("programming bug")]) {
      const network = vi.fn().mockRejectedValue(error); vi.stubGlobal("fetch", network);
      await expect(cloudRequest("/api/mark", init)).rejects.toBe(error); expect(network).toHaveBeenCalledOnce();
    }
    const network = vi.fn(async () => new Response("{broken")); vi.stubGlobal("fetch", network);
    await expect((await cloudRequest("/api/mark", init)).json()).rejects.toThrow(); expect(network).toHaveBeenCalledOnce();
  });
  it("caps transport retries at two calls", async () => {
    const network = vi.fn().mockRejectedValue(new TypeError("offline")); vi.stubGlobal("fetch", network);
    const failure = cloudRequest("/api/mark", init).catch((error) => error);
    await vi.advanceTimersByTimeAsync(500);
    expect(await failure).toBeInstanceOf(TypeError); expect(network).toHaveBeenCalledTimes(2);
  });
  it("keeps slow requests alive through 20–40 seconds and bounds a stalled body", async () => {
    const network = vi.fn<typeof fetch>(async (_url, options) => new Response(new ReadableStream({ start(controller) {
      const timer = setTimeout(() => { controller.enqueue(new TextEncoder().encode('{"reply":"ready"}')); controller.close(); }, 40000);
      options?.signal?.addEventListener("abort", () => { clearTimeout(timer); controller.error(new DOMException("timeout", "AbortError")); });
    } })));
    vi.stubGlobal("fetch", network);
    let done = false; const pending = cloudRequest("/api/helper", init).then((res) => { done = true; return res; });
    await vi.advanceTimersByTimeAsync(20000); expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(20000); expect(await (await pending).json()).toEqual({ reply: "ready" });
    const stalled = vi.fn<typeof fetch>(async (_url, options) => new Response(new ReadableStream({ start(controller) {
      options?.signal?.addEventListener("abort", () => controller.error(new DOMException("timeout", "AbortError")));
    } })));
    vi.stubGlobal("fetch", stalled);
    const failure = cloudRequest("/api/helper", init).catch((error) => error);
    await vi.advanceTimersByTimeAsync(195000); expect((await failure).name).toBe("AbortError"); expect(stalled).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("guards rapid repeated Evaluate calls synchronously", async () => {
    const lock = { current: false };
    let release!: () => void;
    const evaluate = vi.fn(async () => { await new Promise<void>((resolve) => { release = resolve; }); });
    const first = evaluateDraft(lock, false, draft, null, evaluate);
    const rest = Array.from({ length: 50 }, () => evaluateDraft(lock, false, draft, null, evaluate));
    expect(evaluate).toHaveBeenCalledOnce(); release(); await Promise.all([first, ...rest]); expect(lock.current).toBe(false);
  });
  it("keeps status text within the existing Mono components", () => {
    expect(STILL_WORKING).toContain("Still working"); expect(BUSY_NOTICE).toContain("trying another free model");
    const result = deviceResult(raw, deviceInput(draft), "nano");
    const html = renderToStaticMarkup(createElement(StudyTools, { result, essay: draft.essay, question: draft.question, memory: "" }));
    expect(html).toContain("Show a band-9 version"); expect(html).not.toMatch(/download|payment/i);
  });
});
