// Chrome built-in AI through the Prompt API. The UI imports this only after an available probe.
// The create boundary checks again and refuses every state except available.
import type { DeviceRuntime } from "./device";
import { deviceMessages } from "./device-report";
import { NANO_BANDS_VALIDATED, type NanoState } from "./engines";

interface LMMonitor { addEventListener(type: "downloadprogress", fn: (e: { loaded?: number }) => void): void }
interface LMPromptOptions { responseConstraint?: object; signal?: AbortSignal }
export interface LMSession {
  prompt(input: string, options?: LMPromptOptions): Promise<string>;
  clone?(options?: { signal?: AbortSignal }): Promise<LMSession>;
  destroy(): void;
}
interface LMIO { type: "text"; languages: string[] }
interface LMCreateOptions { expectedInputs?: LMIO[]; expectedOutputs?: LMIO[]; signal?: AbortSignal; monitor?: (m: LMMonitor) => void }
export interface LanguageModelStatic {
  availability(options?: LMCreateOptions): Promise<string>;
  create(options?: LMCreateOptions): Promise<LMSession>;
}

export const NANO_OPTIONS: LMCreateOptions = { expectedInputs: [{ type: "text", languages: ["en"] }], expectedOutputs: [{ type: "text", languages: ["en"] }] };
const LEGACY: Record<string, NanoState> = { readily: "available", "after-download": "downloadable", no: "unavailable" };
export const globalLanguageModel = (): LanguageModelStatic | undefined => (globalThis as { LanguageModel?: LanguageModelStatic }).LanguageModel;

/** availability() only reports a state; it never starts Chrome's model download. */
export async function nanoAvailability(lm = globalLanguageModel()): Promise<NanoState> {
  if (typeof lm?.availability !== "function" || typeof lm.create !== "function") return "unavailable";
  try {
    const state = await lm.availability(NANO_OPTIONS);
    return state === "available" || state === "downloadable" || state === "downloading" || state === "unavailable" ? state : LEGACY[state] ?? "unavailable";
  } catch { return "unavailable"; }
}

// Hard size bounds: in the blind test (27 official scripts) 7 unbounded replies ran on until Chrome cut them off.
const text = (max: number) => ({ type: "string", maxLength: max });
const fix = { type: "object", properties: { original: text(160), reason: text(200), criterion: text(4) }, required: ["original", "reason"] };
const criterion = { type: "object", properties: { band: { type: "integer", minimum: 1, maximum: 9 }, summary: text(300) }, required: ["band", "summary"] };
const strings = { type: "array", items: text(200), maxItems: 3 };
const feedbackSchema = {
  type: "object",
  properties: {
    grammar_corrections: { type: "array", maxItems: 5, items: { ...fix, properties: { ...fix.properties, corrected: text(160) }, required: ["original", "corrected", "reason"] } },
    word_choice_upgrades: { type: "array", maxItems: 3, items: { ...fix, properties: { ...fix.properties, better: text(160) }, required: ["original", "better", "reason"] } },
    paragraphs: { type: "array", maxItems: 6, items: { type: "object", properties: { label: text(40), original_start: text(120), comments: { type: "object", properties: { tr: text(240), cc: text(240), lr: text(240), gra: text(240) } } } } },
    top_3_priorities: { ...strings, minItems: 1 },
  },
  // Constrained decoding drops optional sections entirely (seen with Qwen3-4B in a real browser), so ask for them.
  required: ["grammar_corrections", "word_choice_upgrades", "paragraphs", "top_3_priorities"],
};
export const nanoSchema = (bands: boolean) => bands
  ? { ...feedbackSchema, required: ["criteria", ...feedbackSchema.required], properties: { ...feedbackSchema.properties, criteria: { type: "object", properties: { tr: criterion, cc: criterion, lr: criterion, gra: criterion }, required: ["tr", "cc", "lr", "gra"] } } }
  : feedbackSchema;

export function createNanoRuntime(lm = globalLanguageModel(), bands = NANO_BANDS_VALIDATED): DeviceRuntime {
  let session: LMSession | undefined;
  const dispose = () => { try { session?.destroy(); } catch { /* already gone */ } session = undefined; };
  return {
    cached: async () => (await nanoAvailability(lm)) === "available",
    load: async (signal) => {
      if (!lm) throw new Error("Chrome's built-in AI is not available in this browser.");
      signal.throwIfAborted();
      // Recheck at the actual create boundary. A resume is never download consent.
      const availability = await lm.availability(NANO_OPTIONS);
      signal.throwIfAborted();
      if (availability !== "available") {
        const error = new Error("Chrome's built-in AI is not ready.");
        error.name = "DownloadConsentError";
        throw error;
      }
      session = await lm.create({ ...NANO_OPTIONS, signal });
      if (signal.aborted) { dispose(); throw signal.reason; }
    },
    generate: async (input, signal) => {
      const base = session;
      if (!base) throw new Error("Enable Chrome's built-in AI again. No feedback was produced.");
      // A fresh clone per essay so earlier essays never fill the context window.
      const one = base.clone ? await base.clone({ signal }) : base;
      const [system, user] = deviceMessages(input, bands);
      const text = `${system.content}\n\n${user.content.replace(/^\/no_think\n/, "")}`;
      try {
        try {
          try { return await one.prompt(text, { responseConstraint: nanoSchema(bands), signal }); }
          catch (e) {
            // A reply cut off at Chrome's output limit: one retry asking for brevity.
            if (signal.aborted || !/output limit/i.test((e as Error).message)) throw e;
            return await one.prompt(`${text}\n\nKeep every field very short: at most 3 corrections and one sentence per comment.`, { responseConstraint: nanoSchema(bands), signal });
          }
        } catch (e) {
          // Older Prompt API builds reject responseConstraint; retry once without it.
          if (signal.aborted || !(e instanceof TypeError || (e as Error).name === "NotSupportedError")) throw e;
          return await one.prompt(text, { signal });
        }
      } catch (e) {
        if (signal.aborted) throw signal.reason;
        if (/output limit/i.test((e as Error).message)) throw new Error("Chrome's built-in model rambled past its limit. Try again, or use another engine.");
        if ((e as Error).name === "QuotaExceededError") throw new Error("This answer is too long for Chrome's built-in model. Try a shorter answer or another engine.");
        throw e;
      } finally { if (one !== base) one.destroy(); }
    },
    generateText: async (system, user, signal) => {
      const base = session;
      if (!base) throw new Error("Chrome's built-in helper is unavailable.");
      const one = base.clone ? await base.clone({ signal }) : base;
      try { return await one.prompt(system + "\n\n" + user, { signal }); }
      finally { if (one !== base) one.destroy(); }
    },
    remove: async () => { dispose(); throw new Error("Chrome manages its built-in model; remove it from Chrome's own settings"); },
    dispose,
  };
}
