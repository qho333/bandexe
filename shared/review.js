// Reviewer step (code checks). Nothing reaches the student unless it passes these checks:
// - corrections/upgrades: "original" must be an exact substring of the essay, the fix must
//   differ from the original, and any criterion label must be valid;
// - criterion bands must be whole numbers 1-9; invalid ones are reported for one repair
//   retry and otherwise withheld (null), never shown as 0.
import { CRITERIA, isBand } from "./score.js";

const CRIT_ALIASES = Object.assign(Object.create(null), { tr: "tr", ta: "tr", cc: "cc", lr: "lr", gra: "gra" });
const MAX_ITEMS = 25;

const str = (v, max = 1500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
// Model text can name raw (uncalibrated) bands that contradict the shown bands, e.g. "raise Grammar to band 6" beside GRA 6.
export const noBands = (s) => s
  .replace(/,?\s+(?:in order\s+)?to\s+(?:raise|improve|move|reach|push|lift|get|boost|achieve|secure|hit|bring)\b[^.;!?]*?\bband\s*\d[^.;!?]*/gi, "")
  .replace(/\s*\([^()]*\bband\s*\d[^()]*\)/gi, "")
  .replace(/\s+(?:for|at|above|below|towards?|past|beyond)\s+(?:a\s+)?band\s*\d(?:\.\d)?\+?/gi, "")
  .replace(/\s+([.,;!?])/g, "$1").trim();
const text = (v, max) => noBands(str(v, max));
const strList = (v, n) => (Array.isArray(v) ? v.map((s) => text(s, 400)).filter(Boolean).slice(0, n) : []);

/** Returns the canonical criterion, null when absent, or false when present but invalid. */
export function normCriterion(v) {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") return false;
  const k = v.trim().toLowerCase();
  return Object.hasOwn(CRIT_ALIASES, k) ? CRIT_ALIASES[k] : false;
}

/** Strict whole-band check: accepts 7 or "7", rejects 6.5, "6.5", 0, 10, "seven". */
export function parseBand(v) {
  const n = typeof v === "string" && /^\s*\d+\s*$/.test(v) ? Number(v) : v;
  return isBand(n) ? n : null;
}

export function invalidCriteria(raw) {
  const c = raw && typeof raw === "object" ? raw.criteria : null;
  return CRITERIA.filter((k) => parseBand(c?.[k]?.band) === null);
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Fixes apply to the first occurrence, and "rich" inside "richer" would give "wealthierer": that occurrence must not cut a word.
const W = /[\p{L}\p{N}]/u;
const wholeWords = (essay, original) => {
  const i = essay.indexOf(original);
  return i >= 0 && !(W.test(original[0]) && /[\p{L}\p{N}']/u.test(essay[i - 1] ?? ""))
    && !(W.test(original.at(-1)) && W.test(essay[i + original.length] ?? ""));
};

function reviewFixes(list, essay, fixKey, defaultCrit) {
  const kept = [];
  const seen = new Set();
  let dropped = 0;
  for (const item of Array.isArray(list) ? list : []) {
    const original = typeof item?.original === "string" ? item.original : "";
    const fix = str(item?.[fixKey], 500);
    const crit = normCriterion(item?.criterion);
    const ok =
      original.trim().length > 0 &&
      wholeWords(essay, original) &&
      fix.length > 0 &&
      fix !== original.trim() &&
      crit !== false &&
      !seen.has(original);
    if (!ok || kept.length >= MAX_ITEMS) { dropped++; continue; }
    seen.add(original);
    kept.push({ original, [fixKey]: fix, reason: str(item?.reason, 600), criterion: crit || defaultCrit });
  }
  return { kept, dropped };
}

function reviewCriteria(raw) {
  const out = {};
  for (const k of CRITERIA) {
    const c = raw?.criteria?.[k] ?? {};
    const subs = c.subskills && typeof c.subskills === "object" ? c.subskills : {};
    out[k] = {
      band: parseBand(c.band),
      summary: text(c.summary, 1200),
      subskills: Object.entries(subs)
        .map(([key, v]) => ({ key, score: parseBand(v) }))
        .filter((s) => s.score !== null && /^[a-z_]{2,40}$/.test(s.key))
        .slice(0, 8),
    };
  }
  return out;
}

function splitParagraphs(essay) {
  return essay.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean);
}

function reviewParagraphs(list, essay) {
  const real = splitParagraphs(essay);
  return (Array.isArray(list) ? list : []).slice(0, 8).map((p, i) => {
    const start = typeof p?.original_start === "string" ? p.original_start.trim() : "";
    // Only quote text that really is in the essay; otherwise fall back to the real paragraph start.
    const quote = start && essay.includes(start) ? start : (real[i] || "").split(/\s+/).slice(0, 10).join(" ");
    const comments = {};
    for (const k of CRITERIA) comments[k] = text(p?.comments?.[k], 800);
    return { label: str(p?.label, 40) || `Paragraph ${i + 1}`, quote, comments, rewrite: str(p?.how_to_rewrite, 2500) };
  }).filter((p) => CRITERIA.some((k) => p.comments[k]) || p.rewrite);
}

/** Turn the model's raw JSON into the reviewed report the student sees. */
export function reviewReport(raw, essay) {
  const grammar = reviewFixes(raw?.grammar_corrections, essay, "corrected", "gra");
  const upgrades = reviewFixes(raw?.word_choice_upgrades, essay, "better", "lr");
  // An upgrade on words a correction already fixes shows the student two different edits for one phrase.
  const within = (a, b) => new RegExp(`(?:^|\\W)${escape(b)}(?:\\W|$)`).test(a);
  const overlaps = (a, b) => within(a, b) || within(b, a);
  upgrades.kept = upgrades.kept.filter((u) => !grammar.kept.some((g) => overlaps(g.original, u.original)));
  return {
    criteria: reviewCriteria(raw),
    grammar: grammar.kept,
    upgrades: upgrades.kept,
    paragraphs: reviewParagraphs(raw?.paragraphs, essay),
    structureAdvice: text(raw?.structure_advice, 1500),
    strengths: strList(raw?.strengths, 6),
    priorities: strList(raw?.top_3_priorities, 3),
    dropped: { grammar: grammar.dropped, upgrades: upgrades.dropped },
  };
}
