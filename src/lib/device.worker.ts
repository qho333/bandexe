// Attach the listener synchronously: WebLLM's initial RPCs can arrive while its lazy chunk loads.
let handler: import("@mlc-ai/web-llm").WebWorkerMLCEngineHandler | undefined;
self.onmessage = async (event: MessageEvent) => {
  try {
    const { WebWorkerMLCEngineHandler } = await import("@mlc-ai/web-llm");
    handler ??= new WebWorkerMLCEngineHandler();
    handler.onmessage(event);
  } catch (error) {
    // Surface failed chunk imports as a worker ErrorEvent so the caller can leave loading state.
    setTimeout(() => { throw error; }, 0);
  }
};
export {};
