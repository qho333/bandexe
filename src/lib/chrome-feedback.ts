import type { Draft, MarkResult } from "./types";
import type { LanguageModelStatic } from "./nano";

const OPTIONS = { expectedInputs: [{ type: "text" as const, languages: ["en"] }], expectedOutputs: [{ type: "text" as const, languages: ["en"] }] };

/** No engine preferences, caches or WebLLM imports. Probe before importing the Nano adapter. */
export async function chromeFeedback(draft: Draft, assertCurrent: () => void): Promise<MarkResult | null> {
  const lm = (globalThis as { LanguageModel?: LanguageModelStatic }).LanguageModel;
  if (!lm || typeof lm.availability !== "function" || typeof lm.create !== "function") return null;
  if (await lm.availability(OPTIONS) !== "available") return null;
  assertCurrent();
  const [{ createNanoRuntime }, { deviceInput, deviceResult }] = await Promise.all([import("./nano"), import("./device-report")]);
  const input = deviceInput(draft);
  const runtime = createNanoRuntime(lm, false);
  const signal = new AbortController().signal;
  try {
    assertCurrent();
    await runtime.load(signal, () => {}, { allowDownload: false });
    assertCurrent();
    const raw = await runtime.generate(input, signal);
    assertCurrent();
    return deviceResult(raw, input, "nano", false);
  } finally { runtime.dispose?.(); }
}
