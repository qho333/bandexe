import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRuntime } from "../src/lib/device.runtime";
import { DEVICE_MODEL, deviceInput } from "../src/lib/device-report";

const llm = vi.hoisted(() => {
  const create = vi.fn(async () => ({ choices: [{ message: { content: "{}" }, finish_reason: "stop" }] }));
  const engine = { resetChat: vi.fn(async () => {}), chat: { completions: { create } } };
  return { engine, create, CreateWebWorkerMLCEngine: vi.fn(async () => engine), prebuiltAppConfig: { model_list: [] }, hasModelInCache: vi.fn(async () => true), deleteModelAllInfoInCache: vi.fn(async () => {}) };
});
vi.mock("@mlc-ai/web-llm", () => llm);

class FakeWorker extends EventTarget {
  static instances: FakeWorker[] = [];
  terminate = vi.fn();
  constructor(public url: URL, public options: WorkerOptions) { super(); FakeWorker.instances.push(this); }
}
const input = deviceInput({ task: "t2", question: "Should cities improve public transport?", essay: "Public transport helps people travel to work and reduces traffic. ".repeat(8) });
beforeEach(() => { vi.clearAllMocks(); FakeWorker.instances = []; vi.stubGlobal("Worker", FakeWorker); });
afterEach(() => vi.unstubAllGlobals());

describe("WebLLM 0.2.85 worker adapter", () => {
  it("creates no worker/model on import, cache inspection or deletion", async () => {
    const runtime = await createRuntime();
    expect(FakeWorker.instances).toHaveLength(0);
    expect(await runtime.cached()).toBe(true);
    await runtime.remove();
    expect(llm.hasModelInCache).toHaveBeenCalledWith(DEVICE_MODEL, llm.prebuiltAppConfig);
    expect(llm.deleteModelAllInfoInCache).toHaveBeenCalledWith(DEVICE_MODEL, llm.prebuiltAppConfig);
    expect(llm.CreateWebWorkerMLCEngine).not.toHaveBeenCalled();
  });
  it("uses a Vite module worker, real progress callback, JSON and supported thinking control", async () => {
    const runtime = await createRuntime(), progress = vi.fn(), op = new AbortController();
    await runtime.load(op.signal, progress);
    const worker = FakeWorker.instances[0];
    expect(worker.url.pathname).toMatch(/device.worker.ts$/); expect(worker.options.type).toBe("module");
    expect(llm.CreateWebWorkerMLCEngine).toHaveBeenCalledWith(worker, DEVICE_MODEL, { appConfig: llm.prebuiltAppConfig, initProgressCallback: progress }, { context_window_size: 8192 });
    expect(await runtime.generate(input, op.signal)).toBe("{}");
    expect(llm.engine.resetChat).toHaveBeenCalledOnce();
    expect(llm.create).toHaveBeenCalledWith(expect.objectContaining({ temperature: 0, response_format: { type: "json_object", schema: expect.any(String) }, extra_body: { enable_thinking: false } }));
    // WebLLM's grammar matcher needs the schema as a JSON string (a real-browser run failed without it).
    expect(() => JSON.parse((llm.create.mock.calls as unknown as [{ response_format: { schema: string } }][])[0][0].response_format.schema)).not.toThrow();
    await runtime.remove(); expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it("settles a cancelled model-load promise and terminates the worker even if WebLLM never replies", async () => {
    llm.CreateWebWorkerMLCEngine.mockImplementationOnce(() => new Promise(() => {}));
    const runtime = await createRuntime(), op = new AbortController();
    const loading = runtime.load(op.signal, vi.fn());
    await vi.waitFor(() => expect(llm.CreateWebWorkerMLCEngine).toHaveBeenCalled());
    op.abort(new DOMException("Cancelled", "AbortError"));
    await expect(loading).rejects.toMatchObject({ name: "AbortError" });
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
  });
  it("cancels a pending inference and rejects truncated output instead of guessing a score", async () => {
    const runtime = await createRuntime(), op = new AbortController();
    await runtime.load(op.signal, vi.fn());
    llm.create.mockImplementationOnce(() => new Promise(() => {}));
    const inference = runtime.generate(input, op.signal);
    await vi.waitFor(() => expect(llm.create).toHaveBeenCalled());
    op.abort(new DOMException("Cancelled", "AbortError"));
    await expect(inference).rejects.toMatchObject({ name: "AbortError" });
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
    await runtime.load(new AbortController().signal, vi.fn());
    llm.create.mockResolvedValueOnce({ choices: [{ message: { content: "partial" }, finish_reason: "length" }] });
    await expect(runtime.generate(input, new AbortController().signal)).rejects.toThrow(/cut short/);
  });
  it("rejects worker failures promptly instead of leaving the loading UI stuck", async () => {
    llm.CreateWebWorkerMLCEngine.mockImplementationOnce(() => new Promise(() => {}));
    const runtime = await createRuntime();
    const loading = runtime.load(new AbortController().signal, vi.fn());
    await vi.waitFor(() => expect(llm.CreateWebWorkerMLCEngine).toHaveBeenCalled());
    FakeWorker.instances[0].dispatchEvent(Object.assign(new Event("error"), { message: "GPU process crashed" }));
    await expect(loading).rejects.toThrow(/GPU process crashed/);
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
  });
});
