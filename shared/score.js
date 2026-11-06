// Overall band and range. IELTS Writing: mean of the four whole criterion bands,
// rounded DOWN to the half band (7,6,7,6 = 6.5; 7,7,6,5 = 6.25 -> 6.0).

export const CRITERIA = ["tr", "cc", "lr", "gra"];
export const ESTIMATE_LABEL = "AI practice estimate (provisional calibration)";
export const RAW_LABEL = "AI practice estimate (uncalibrated)";
// Calibration v2 (research-data/marker/calibration_gemini_report_v2.json), fitted on all 27 official IELTS.org
// scripts: Gemini 3.6 Flash squeezes bands toward the middle (raw bias -0.83, -1.67 on 7.5+ essays). A per-criterion
// stretch round(1.313*band - 0.95), leave-one-out: within +/-0.5 52% -> 70%, within +/-1 70% -> 93%, MAE 0.91 -> 0.57,
// bias +0.02 (the old +1 rule: 63% / 89%, MAE 0.69). The range stays +/-1 band: 27 scripts is a small set.
export const CALIBRATION = { id: "cal-v2", slope: 1.313, intercept: -0.95, scripts: 27 };
// Calibrated open models land within ±0.5 band of the examiner on 53–65% of official scripts (leave-one-out), so ±0.5 is "likely"; ±1 covers 78–90%.
const RANGE = 0.5;

// Flash-Lite (the overflow model) squeezes scores toward the middle: on all 27 official IELTS.org scripts it
// gave 6–6.5 to essays examiners scored 8–8.5. A stretch fitted on those scripts
// (research-data/marker/gemini_lite_report_runs.jsonl, leave-one-out): within ±0.5 48% -> 67%, within ±1 74% -> 89%,
// bias -0.87 -> 0.00, bias on 7.5+ essays -2.0 -> -0.83. Applied per criterion, rounded to a whole band.
export const LITE_CALIBRATION = { id: "lite-cal-v1", slope: 1.606, intercept: -2.365, scripts: 27 };

// Add independently fitted stretches under "provider/model" after official-script validation.
// Never apply a Gemini fit (or another open model's fit) to a free-pool model.
// Fitted 2026-10-30 (research-data/marker/calibration_*_v1.json, leave-one-out on official IELTS.org scripts):
// Groq gpt-oss-120b (low reasoning, 17 scripts): within ±1 65% -> 88%, MAE 0.97 -> 0.71, bias -0.85 -> +0.09.
// Workers AI mistral-small-3.1 (23 scripts): within ±1 65% -> 78%, MAE 1.02 -> 0.74, bias -0.67 -> 0.00.
// Workers AI qwen3-30b-a3b-fp8 (25 scripts, 2026-11-01): within ±1 56% -> 84%, MAE 1.12 -> 0.82, bias -0.76 -> -0.14.
//   About a third of mistral-small's neurons per report, so it goes first in the Workers chain.
// Same model WITH band-boundary guide v2 (shared/guide.js), 25 scripts, 2026-11-01: within ±0.5 36% -> 76%, ±1 56% -> 88%,
//   MAE 1.14 -> 0.48, weak (<=5.5) bias +0.20, strong (>=7) bias -0.40. The guide partly draws on these scripts' examiner comments.
// Groq qwen3.8-27b (25 scripts, 2026-11-02, LOO, mean): within ±1 60% -> 92%, MAE 1.18 -> 0.52.
// Groq gpt-oss-20b (low reasoning, 25 scripts, 2026-11-02): within ±1 60% -> 76%, MAE 1.14 -> 0.82. Fit on 14 kept: a refit on 25
// (1.684, -2.811) scored identically, and mean calibration traded ±1 72% for MAE 0.76, so neither is clearly better.
// Figures include the band-8 ceiling in calibrateOpen. All squeeze strong essays toward 5-6; refit when more scripts are marked.
export const OPEN_CALIBRATIONS = {
  // With guide v2 (2026-11-01, 25 scripts, LOO): ±0.5 60%, ±1 84%, MAE 0.62. Same 17 scripts as v1: ±0.5 53->65%, MAE 0.71->0.59,
  //   weak bias +0.69->+0.38, strong -0.67->-0.42, ±1 unchanged 88%.
  "groq/openai/gpt-oss-120b": { id: "groq-120b-guide2-cal-v1", slope: 1.924, intercept: -3.691, scripts: 25, guide: "v2" },
  // mean (LOO, 20 scripts): ±0.5 65 -> 70%, MAE 0.60 -> 0.50.
  "groq/qwen/qwen3.8-27b": { id: "groq-qwen27b-mean-cal-v1", slope: 1.618, intercept: -2.226, scripts: 20, mean: true },
  "groq/openai/gpt-oss-20b": { id: "groq-20b-cal-v1", slope: 1.491, intercept: -1.605, scripts: 14 },
  "cf/@cf/mistralai/mistral-small-3.1-24b-instruct": { id: "cf-mistral-small-cal-v1", slope: 2.422, intercept: -7.36, scripts: 23 },
  "cf/@cf/qwen/qwen3-30b-a3b-fp8": { id: "cf-qwen3-30b-guide2-cal-v1", slope: 2.856, intercept: -9.106, scripts: 25, guide: "v2" },
  // Gemma 4 26B on Google AI Studio free tier (2026-11-01, 25 scripts, LOO): with guide v2 ±0.5 76%, ±1 96%, MAE 0.50
  //   (no guide: 72%, 92%, 0.56). Median 23 s per Task, so it sits after Groq as the high-volume overflow.
  //   mean: the overall stretches the criterion mean and rounds once (nearest half band). Per-criterion rounding at this
  //   slope can never give a 5 (raw 4 -> 4.2, raw 5 -> 5.7). LOO: ±0.5 76 -> 84%, MAE 0.50 -> 0.44, weak-essay bias +0.40 -> +0.20.
  //   prompt: "lean" (40% fewer input tokens, so ~7 checks a minute instead of ~5). Same 24 scripts, mean calibration: full ±0.5 83%, ±1 91%, MAE 0.46;
  //   lean ±0.5 87%, ±1 95%, MAE 0.44 (weak bias +0.30 vs +0.15). Averaging several passes gave no gain.
  // OVH keyless, no guide (2026-11-01, 24 scripts, LOO): ±0.5 67%, ±1 92%, MAE 0.60. Guide v2 was worse (79%, MAE 0.69).
  "ovh/Meta-Llama-3_3-70B-Instruct": { id: "ovh-llama70b-cal-v1", slope: 1.555, intercept: -2.596, scripts: 24 },
  // OVH keyless busy-time fallback, guide v2 (2026-11-01, 25 scripts, LOO): ±0.5 64%, ±1 88%, MAE 0.66 (before: 40%, 68%, 0.96).
  "ovh/Mistral-Small-3.2-24B-Instruct-2506": { id: "ovh-mistral32-guide2-cal-v1", slope: 1.684, intercept: -3.165, scripts: 25, guide: "v2" },
  "google/gemma-4-26b-a4b-it": { id: "google-gemma26b-lean-guide2-mean-cal-v1", slope: 1.394, intercept: -1.312, scripts: 24, guide: "v2", mean: true, prompt: "lean" },
};
const OPEN_IDENTITY = { id: "uncalibrated", slope: 1, intercept: 0, scripts: 0 };
export function openCalibration(provider, model) {
  return OPEN_CALIBRATIONS[`${provider}/${model}`] || OPEN_IDENTITY;
}
/** Calibrated overall for "mean" calibrations: stretch the raw criterion mean, round once to the nearest half band. */
export function calibrateOpenMean(bands, provider, model) {
  const { slope, intercept, scripts } = openCalibration(provider, model);
  const vals = CRITERIA.map((c) => bands[c]);
  if (!vals.every(isBand)) return null;
  return Math.round(2 * Math.max(1, Math.min(scripts ? 8 : 9, slope * vals.reduce((a, b) => a + b, 0) / 4 + intercept))) / 2;
}
/** A mean calibration can put the overall above the mean of very uneven bands (TR 4 with 8, 8, 8 gave 7.5). No official script has a spread this wide, so ordinary marks never change. */
export function capUneven(overall, bands) {
  const vals = CRITERIA.map((c) => bands[c]);
  if (overall === null || !vals.every(isBand) || Math.max(...vals) - Math.min(...vals) < 3) return overall;
  return Math.min(overall, overallBand(bands));
}
export function calibrateOpen(band, provider, model) {
  if (!isBand(band)) return band;
  const { slope, intercept, scripts } = openCalibration(provider, model);
  // No fit set contains an official script above 8.5, so a stretch must not extrapolate to 9
  // (gpt-oss-120b's stretch would turn every raw 7 into a 9).
  return Math.max(1, Math.min(scripts ? 8 : 9, Math.round(slope * band + intercept)));
}

/** Stretch calibration for Flash-Lite bands; null stays null. */
export function calibrateLite(band) {
  if (!isBand(band)) return band;
  return Math.max(1, Math.min(9, Math.round(LITE_CALIBRATION.slope * band + LITE_CALIBRATION.intercept)));
}

/** Applies the calibration to a whole band (criterion or sub-skill); null stays null. */
export function calibrate(band) {
  return isBand(band) ? Math.max(1, Math.min(9, Math.round(CALIBRATION.slope * band + CALIBRATION.intercept))) : band;
}

export function isBand(n) {
  return Number.isInteger(n) && n >= 1 && n <= 9;
}

/** @param {Record<string, number|null>} bands */
export function overallBand(bands) {
  const vals = CRITERIA.map((c) => bands[c]);
  if (!vals.every(isBand)) return null; // a withheld criterion means no overall, never 0
  const mean = vals.reduce((a, b) => a + b, 0) / 4;
  return Math.floor(mean * 2 + 1e-9) / 2;
}

// Models over-reward short answers (a 75-word Task 1 report got 7.5). Official scripts at 72-88% of the minimum scored 4-5.5, one at 93% scored 7.
// shortcut: no official script is below 72%, so the lower cap is a cautious judgement; refine it if shorter scored scripts turn up.
export const lengthCap = (words, task) => { const share = words / (task === "t2" ? 250 : 150); return share < 0.75 ? 5.5 : share < 0.9 ? 6.5 : null; };

// Uncalibrated markers keep the wide ±1 band range.
export function bandRange(overall, calibrated = true) {
  if (overall == null) return null;
  const width = calibrated ? RANGE : 1;
  return { lo: Math.max(1, overall - width), hi: Math.min(9, overall + width) };
}
