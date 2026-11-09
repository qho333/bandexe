import { foreignScript } from "../../shared/language.js";
import type { Crit, Fix, Report } from "./types";

// Feedback-only engines have not earned a band estimate. Reject the whole authored
// string if it contains one, rather than leaving a misleading sentence fragment.
const NUMBER = "(?:[0-9]+(?:[.,][0-9]+)?|one|two|three|four|five|six|seven|eight|nine)";
const BAND_ESTIMATE = new RegExp(`\\b(?:bands?|overall|ielts)(?:\\s*(?:writing|task|band|score|estimate[ds]?|rating|level|is|of|around|about|approximately|roughly|between|from|likely|at|an?|would|be|:|=|~|≈|–|-))*\\s*${NUMBER}\\b|\\b${NUMBER}\\s*(?:bands?|(?:on|in)\\s+(?:the\\s+)?ielts)\\b`, "i");
export const feedbackText = (text: string): string => {
  // Model prose may put the number in Markdown emphasis or use compatibility digits.
  const plain = text.normalize("NFKC").replace(/[*_`\[\](){}"“”'’\u200b-\u200d\ufeff]/g, "");
  return BAND_ESTIMATE.test(plain) ? "" : text;
};

/** Apply to every string, including nested comments, labels, rewrites and fix reasons. */
export function feedbackStrings<T>(value: T): T {
  if (typeof value === "string") return feedbackText(value) as T;
  if (Array.isArray(value)) return value.map((item) => feedbackStrings(item)) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, feedbackStrings(v)])) as T;
  return value;
}

/** Last guard for every checker: drop explanations written in an alphabet the feedback language does not use. Quotes and corrections stay. */
export function dropForeignScript(report: Report, language?: string): Report {
  const keep = (text: string) => foreignScript(text, language) ? "" : text;
  const fix = (f: Fix) => ({ ...f, reason: keep(f.reason) });
  return { ...report,
    criteria: Object.fromEntries(Object.entries(report.criteria).map(([k, c]) => [k, { ...c, summary: keep(c.summary) }])) as Report["criteria"],
    grammar: report.grammar.map(fix), upgrades: report.upgrades.map(fix),
    paragraphs: report.paragraphs.map((p) => ({ ...p, comments: Object.fromEntries(Object.entries(p.comments).map(([k, v]) => [k, keep(v)])) as Record<Crit, string> })),
    structureAdvice: keep(report.structureAdvice),
    strengths: report.strengths.filter(keep), priorities: report.priorities.filter(keep) };
}
