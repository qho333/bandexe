import type { WebWorkerMLCEngine } from "@mlc-ai/web-llm";
import type { DeviceRuntime } from "./device";
import { DEVICE_MODEL, deviceMessages } from "./device-report";
import { nanoSchema } from "./nano";

// This module AND WebLLM are lazy. Importing the settings or visiting Write cannot fetch a model.
// One runtime per feedback-only WebLLM engine.
export async function createRuntime({ model = DEVICE_MODEL, bands = false }: { model?: string; bands?: boolean } = {}): Promise<DeviceRuntime> {
  const { CreateWebWorkerMLCEngine, prebuiltAppConfig, hasModelInCache, deleteModelAllInfoInCache } = await import("@mlc-ai/web-llm");
  let worker: Worker | undefined, engine: WebWorkerMLCEngine | undefined;
  const dispose = () => { worker?.terminate(); worker = undefined; engine = undefined; };
  // Terminating a worker alone leaves WebLLM's pending RPC promise unresolved. Race abort/errors
  // explicitly so cancelling a download/generation always releases the caller and UI.
  // A failed generation (bad reply, cut-off report) keeps the loaded model; aborts and worker crashes still release it.
  const run = <T>(signal: AbortSignal, task: () => Promise<T>, keepOnTaskError = false): Promise<T> => new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error: unknown) => { if (settled) return; settled = true; cleanup(); dispose(); reject(error); };
    const abort = () => fail(signal.reason || new DOMException("Cancelled", "AbortError"));
    const error = (event: ErrorEvent) => fail(new Error(event.message || "The on-device worker stopped. Try enabling it again."));
    const activeWorker = worker;
    const cleanup = () => { signal.removeEventListener("abort", abort); activeWorker?.removeEventListener("error", error); };
    if (signal.aborted) { abort(); return; }
    signal.addEventListener("abort", abort, { once: true }); activeWorker?.addEventListener("error", error, { once: true });
    Promise.resolve().then(() => { signal.throwIfAborted(); return task(); }).then((value) => {
      if (settled) return;
      settled = true; cleanup(); resolve(value);
    }, (e) => {
      if (!keepOnTaskError || signal.aborted) return fail(e);
      if (settled) return;
      settled = true; cleanup(); reject(e);
    });
  });
  return {
    cached: () => hasModelInCache(model, prebuiltAppConfig),
    load: async (signal, initProgressCallback) => {
      if (signal.aborted) throw signal.reason;
      worker = new Worker(new URL('./device.worker.ts', import.meta.url), {type:'module'});
      const activeWorker = worker;
      engine = await run(signal, () => CreateWebWorkerMLCEngine(activeWorker, model, {
        appConfig: prebuiltAppConfig, initProgressCallback,
      }, { context_window_size: 8192 }));
    },
    generate: async (input, signal) => {
      const activeEngine = engine;
      if (!activeEngine) throw new Error("Enable the on-device checker again. No score was produced.");
      return run(signal, async () => {
        // Each essay starts a new conversation: previous essays never consume the context window.
        await activeEngine.resetChat();
        signal.throwIfAborted();
        const reply = await activeEngine.chat.completions.create({
          messages: deviceMessages(input, bands), temperature: 0, max_tokens: bands ? 1536 : 2048,
          // WebLLM 0.2.85 fails to start its grammar matcher for json_object without a schema string
          // (found in a real browser run); the bounded schema also keeps replies short.
          response_format: { type: "json_object", schema: JSON.stringify(nanoSchema(bands)) },
          // 0.2.85 exposes this instead of chat_template_kwargs; /no_think is also in the prompt.
          extra_body: { enable_thinking: false },
        });
        if (reply.choices[0]?.finish_reason === "length") throw new Error("The on-device report was cut short. Try again with a shorter essay. No score was produced.");
        const text = reply.choices[0]?.message.content;
        if (!text) throw new Error("The on-device checker returned no text. No score was produced.");
        return text;
      }, true);
    },
    generateText: async (system, user, signal) => {
      const activeEngine = engine;
      if (!activeEngine) throw new Error("The on-device helper is unavailable.");
      return run(signal, async () => {
        await activeEngine.resetChat();
        signal.throwIfAborted();
        const reply = await activeEngine.chat.completions.create({
          messages: [{ role: "system", content: system }, { role: "user", content: "/no_think\n" + user }],
          temperature: 0.3, max_tokens: 2000, extra_body: { enable_thinking: false },
        });
        if (reply.choices[0]?.finish_reason === "length") throw new Error("The reply was cut short. Try asking a shorter question.");
        const text = reply.choices[0]?.message.content;
        if (!text) throw new Error("No reply was returned.");
        return text;
      }, true);
    },
    remove: async () => { dispose(); await deleteModelAllInfoInCache(model, prebuiltAppConfig); },
    dispose,
  };
}
