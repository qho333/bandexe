// On-device engine tiers (DEVICE_TIERS.md). Pure data and decisions only: no WebLLM or Prompt API code here.
export type Engine = "nano" | "qwen4b" | "small";
export type EngineChoice = "auto" | Engine;
export type NanoState = "unavailable" | "downloadable" | "downloading" | "available";
export const ENGINES: Engine[] = ["nano", "qwen4b", "small"];

// Bands only for engines that clearly beat the "guess the average" baseline on the 27 official scripts
// (37% within ±0.5, 63% within ±1). Measured 2026-10-26 in a real browser:
// - Gemini Nano: 80% within ±1 after calibration but every score squeezed into 5.25–7.0 → feedback only.
// - Qwen3-4B (WebLLM q4f16, this prompt): 63% within ±1, r 0.59, scores 5.5–7.0 → no better than guessing.
//   (research-data/marker/qwen_browser_runs.json). Its feedback is useful: ~86% of suggestions pass review.
export const NANO_BANDS_VALIDATED = false;
export const QWEN4B_BANDS_VALIDATED = false;

export const QWEN4B_MODEL = "Qwen3-4B-q4f16_1-MLC";
export const SMALL_MODEL = "Qwen3-1.7B-q4f16_1-MLC";
export const WEBLLM_MODEL: Record<Exclude<Engine, "nano">, string> = { qwen4b: QWEN4B_MODEL, small: SMALL_MODEL };

export const ENGINE_NAME: Record<Engine, string> = {
  nano: "Chrome built-in AI (Gemini Nano)", qwen4b: "Qwen3-4B", small: "Smaller model (Qwen3-1.7B)",
};

/** No on-device engine has passed the band test yet; all give feedback only until one does. */
export const engineGivesBands = (engine: Engine, nanoValidated = NANO_BANDS_VALIDATED, qwenValidated = QWEN4B_BANDS_VALIDATED) =>
  (engine === "qwen4b" && qwenValidated) || (engine === "nano" && nanoValidated);

export const FEEDBACK_ONLY_LABEL = "Feedback only: this smaller model is not accurate enough to estimate a band on this device.";
export const NANO_FEEDBACK_LABEL = "Feedback only: Chrome's built-in model has not passed our accuracy test yet, so it does not estimate a band.";
export const QWEN_FEEDBACK_LABEL = "Feedback only: in our accuracy test this model's band estimates were no better than guessing, so it gives feedback without a band.";
export const feedbackLabel = (engine: Engine) => (engine === "nano" ? NANO_FEEDBACK_LABEL : engine === "qwen4b" ? QWEN_FEEDBACK_LABEL : FEEDBACK_ONLY_LABEL);

export interface DeviceProbe {
  nano: NanoState;
  webgpu: boolean;
  maxBufferSize?: number; // WebGPU adapter limit, bytes
  deviceMemory?: number; // navigator.deviceMemory (GB, rounded down and capped by the browser) when exposed
}
export interface EnginePick { engine: Engine | null; reason: string }

const GB = 1024 ** 3;
/** Conservative: a low reported RAM vetoes the 4B model even when the GPU buffer limit is generous. */
export function isStrongDevice({ maxBufferSize, deviceMemory }: Pick<DeviceProbe, "maxBufferSize" | "deviceMemory">): boolean {
  if (typeof deviceMemory === "number" && deviceMemory < 8) return false;
  return (maxBufferSize ?? 0) >= 2 * GB || (deviceMemory ?? 0) >= 8;
}

/** The auto-pick decision table. The student can override it in the Advanced list. */
export function pickEngine(probe: DeviceProbe): EnginePick {
  if (probe.nano === "available") return { engine: "nano", reason: "Chrome's built-in AI is already on this device, so nothing needs downloading." };
  if (probe.webgpu && isStrongDevice(probe)) return { engine: "qwen4b", reason: "your graphics hardware can run the larger feedback model." };
  if (probe.webgpu) return { engine: "small", reason: "your device looks lighter, so the smaller model gives feedback only, no band." };
  if (probe.nano === "downloadable" || probe.nano === "downloading") return { engine: "nano", reason: "this browser has no WebGPU, but Chrome can download its own built-in model." };
  return { engine: null, reason: "this browser has neither WebGPU nor Chrome's built-in AI." };
}
