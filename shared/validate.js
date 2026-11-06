// Input validation for POST /api/mark. Returns { ok: true, value } or { ok: false, error }.

import { feedbackLanguage } from "./language.js";

export const TASKS = {
  t2: { name: "Task 2 essay", minWords: 250 },
  gt1: { name: "General Training Task 1 letter", minWords: 150 },
  ac1: { name: "Academic Task 1 report", minWords: 150 },
};
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_BODY_BYTES = 7 * 1024 * 1024; // 4 MB image as base64 (~5.6 MB) plus text
const MIMES = new Set(["image/png", "image/jpeg"]);
const MIN_WORDS = 50; // below this there is too little to mark; save the shared quota
const MAX_WORDS = 1200;
const MAX_QUESTION_CHARS = 3000;

export function countWords(text) {
  const m = String(text).trim().match(/[A-Za-z0-9À-ɏ'’-]+/g);
  return m ? m.length : 0;
}

export function validateMarkRequest(body) {
  if (!body || typeof body !== "object") return fail("Send a JSON object.");
  const { task, question, essay, chartImageBase64, mime } = body;
  if (!Object.hasOwn(TASKS, task)) return fail("Unknown task type.");
  if (typeof question !== "string" || question.trim().length < 10) return fail("Add the question you answered.");
  if (question.length > MAX_QUESTION_CHARS) return fail("The question is too long.");
  if (typeof essay !== "string") return fail("Add your essay.");
  const words = countWords(essay);
  if (words < MIN_WORDS) return fail(`Write at least ${MIN_WORDS} words before asking for an estimate.`);
  if (words > MAX_WORDS || essay.length > 12000) return fail(`Essays over ${MAX_WORDS} words are not accepted.`);

  let image = null;
  const chartDescription = typeof body.chartDescription === "string" ? body.chartDescription.trim() : "";
  if (chartDescription.length > 6000) return fail("Keep the chart description to 6,000 characters or fewer.");
  if (task === "ac1") {
    if (!chartImageBase64 && !chartDescription) return fail("Academic Task 1 needs a chart image or a typed chart description.");
    if (chartImageBase64) {
    if (typeof chartImageBase64 !== "string") return fail("The chart image could not be read.");
    if (!MIMES.has(mime)) return fail("The chart must be a PNG or JPG image.");
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(chartImageBase64)) return fail("The chart image could not be read.");
    const bytes = Math.floor((chartImageBase64.length * 3) / 4);
    if (bytes > MAX_IMAGE_BYTES) return fail("The chart image must be 4 MB or smaller.");
    image = { data: chartImageBase64, mime };
    }
  }
  return { ok: true, value: { task, question: question.trim(), essay: essay.trim(), words, image, ...(task === "ac1" ? { chartDescription } : {}), ...(body.reportMode === "full" ? { reportMode: "full" } : {}), feedbackLanguage: feedbackLanguage(body.feedbackLanguage) } };
}

function fail(error) {
  return { ok: false, error };
}

/** A student's picture of a question: same type and size limits as a chart image. */
export function validateQuestionImage(body) {
  const fail = (error) => ({ ok: false, error });
  if (!body || typeof body !== "object") return fail("Send a picture of the question.");
  const { imageBase64, mime } = body;
  if (typeof imageBase64 !== "string" || !imageBase64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) return fail("That picture could not be read.");
  if (!MIMES.has(mime)) return fail("The picture must be a PNG or JPG image.");
  if (Math.floor((imageBase64.length * 3) / 4) > MAX_IMAGE_BYTES) return fail("The picture must be 4 MB or smaller.");
  return { ok: true, value: { data: imageBase64, mime } };
}
