// One EVALUATE: call Gemini, review the reply, compute the overall in code.
import { geminiRequest } from "./gemini.js";
import { buildMarkUser, buildSystem, repairPrompt } from "./prompt.js";
import { invalidCriteria, reviewReport } from "./review.js";
import { overallBand, bandRange, calibrate, calibrateLite, CALIBRATION, LITE_CALIBRATION, ESTIMATE_LABEL, RAW_LABEL } from "./score.js";

export const MODEL = "gemini-3.6-flash";
// Calibration runs record raw bands under RAW_VERSION; students see MARKING_VERSION.
export const RAW_VERSION = `report-v1/${MODEL}/uncalibrated`;
export const MARKING_VERSION = `report-v1/${MODEL}/${CALIBRATION.id}`;
// When MODEL's free daily quota is spent, the same request moves to Flash-Lite (its own free quota).
// Each model has its own calibration fitted on official scripts (see shared/score.js).
export const LITE_MODEL = "gemini-3.1-flash-lite";
export const LITE_VERSION = `report-v1/${LITE_MODEL}/${LITE_CALIBRATION.id}`;
export const LITE_LABEL = "AI practice estimate (lighter model, calibrated on 27 official scripts)";

export class MarkError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const QUOTA = new MarkError(429, "quota", "Free daily AI quota reached; try again later. No score was produced.");
const UNAVAILABLE = new MarkError(502, "unavailable", "The AI marker is not responding right now. Try again in a few minutes. No score was produced.");
const UNREADABLE = new MarkError(502, "unreadable", "The AI marker sent back a report we could not read. Try again. No score was produced.");

const withDetail = (err, detail) => Object.assign(new MarkError(err.status, err.code, err.message), { detail });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Every fetch spends one unit of a per-Evaluate budget, so retries and the repair call together
// never exceed MAX_REQUESTS Gemini requests. Google's 503 "high demand" is usually brief: back off.
const MAX_REQUESTS = 3;
async function generate(contents, system, key, fetchFn, budget, retryMs) {
  for (let attempt = 0; ; attempt++) {
    budget.calls++;
    try { return await generateOnce(contents, system, key, fetchFn, budget.model); }
    catch (e) {
      if (budget.calls >= MAX_REQUESTS) throw e;
      if (e.code === "quota" && budget.fallback && budget.model === MODEL) { budget.model = LITE_MODEL; continue; }
      if (e.code !== "unavailable") throw e;
      await sleep(retryMs * (attempt + 1));
    }
  }
}

async function generateOnce(contents, system, key, fetchFn, model = MODEL) {
  let res;
  try {
    const { url, init } = geminiRequest(model, key, {
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    }, 150_000);
    res = await fetchFn(url, init);
  } catch (e) {
    throw withDetail(UNAVAILABLE, e?.cause?.code || e?.name || "fetch_failed");
  }
  if (!res.ok) {
    // Server-side diagnostics only: upstream status and Google's error status, never request content.
    const body = await res.json().catch(() => null);
    const detail = `${res.status} ${body?.error?.status || ""}`.trim();
    if (res.status === 429) throw withDetail(QUOTA, detail);
    throw withDetail(res.status >= 500 ? UNAVAILABLE : new MarkError(502, "rejected", `The AI marker refused the request (${res.status}). No score was produced.`), detail);
  }
  const data = await res.json().catch(() => null);
  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts) ? parts.map((p) => p.text || "").join("") : "";
  if (!text) throw UNREADABLE;
  return text;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/); // tolerate stray text around the JSON
    try { return m ? JSON.parse(m[0]) : null; } catch { return null; }
  }
}

/** @param {{task:string,question:string,essay:string,words:number,image:null|{data:string,mime:string}}} input */
export async function mark(input, { key, fetchFn = fetch, raw: rawBands = false, retryMs = 4_000, fallback = !rawBands, model = MODEL }) {
  const system = buildSystem(input);
  const parts = [{ text: buildMarkUser(input) }];
  if (input.image) parts.push({ inlineData: { mimeType: input.image.mime, data: input.image.data } });
  const contents = [{ role: "user", parts }];

  // Calibration runs (raw) never fall back, so their bands always come from MODEL.
  const budget = { calls: 0, model, fallback };
  let text = await generate(contents, system, key, fetchFn, budget, retryMs);
  let raw = parseJson(text);
  let note = "";
  let bad = raw ? invalidCriteria(raw) : ["tr", "cc", "lr", "gra"];
  if (bad.length && budget.calls < MAX_REQUESTS) {
    // One repair retry, then withhold whatever is still invalid.
    contents.push({ role: "model", parts: [{ text }] }, { role: "user", parts: [{ text: repairPrompt(bad) }] });
    try {
      const fixedText = await generate(contents, system, key, fetchFn, budget, retryMs);
      const fixed = parseJson(fixedText);
      if (fixed && invalidCriteria(fixed).length < bad.length) { raw = fixed; text = fixedText; }
    } catch (e) {
      if (!raw) throw e;
    }
    if (!raw) throw UNREADABLE;
  }

  const report = reviewReport(raw, input.essay);
  const lite = budget.model === LITE_MODEL;
  if (!rawBands) {
    const cal = lite ? calibrateLite : calibrate;
    for (const c of Object.values(report.criteria)) {
      c.band = cal(c.band);
      for (const s of c.subskills) s.score = cal(s.score);
    }
  }
  const bands = Object.fromEntries(Object.entries(report.criteria).map(([k, c]) => [k, c.band]));
  if (Object.values(bands).every((b) => b === null)) throw UNREADABLE;
  const overall = overallBand(bands);
  const withheld = Object.keys(bands).filter((k) => bands[k] === null);
  if (withheld.length) note = "Some criteria could not be confirmed, so they are withheld.";
  return {
    task: input.task,
    feedbackLanguage: input.feedbackLanguage || "en",
    words: input.words,
    overall,
    range: bandRange(overall),
    label: rawBands ? RAW_LABEL : lite ? LITE_LABEL : ESTIMATE_LABEL,
    withheld,
    note,
    markingVersion: rawBands ? `report-v1/${budget.model}/uncalibrated` : lite ? LITE_VERSION : MARKING_VERSION,
    calls: budget.calls,
    report,
  };
}
