// Reviewer step (code checks). Nothing reaches the student unless it passes these checks:
// - corrections/upgrades: "original" must be an exact substring of the essay, the fix must
//   differ from the original, and any criterion label must be valid;
// - criterion bands must be whole numbers 1-9; invalid ones are reported for one repair
//   retry and otherwise withheld (null), never shown as 0.
import { CRITERIA, isBand } from "./score.js";

const CRIT_ALIASES = Object.assign(Object.create(null), { tr: "tr", ta: "tr", cc: "cc", lr: "lr", gra: "gra" });
const MAX_ITEMS = 25;

const str = (v, max = 1500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const strList = (v, n) => (Array.isArray(v) ? v.map((s) => str(s, 400)).filter(Boolean).slice(0, n) : []);

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
      essay.includes(original) &&
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
      summary: str(c.summary, 1200),
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
    for (const k of CRITERIA) comments[k] = str(p?.comments?.[k], 800);
    return { label: str(p?.label, 40) || `Paragraph ${i + 1}`, quote, comments, rewrite: str(p?.how_to_rewrite, 2500) };
  }).filter((p) => CRITERIA.some((k) => p.comments[k]) || p.rewrite);
}

/** Turn the model's raw JSON into the reviewed report the student sees. */
export function reviewReport(raw, essay) {
  const grammar = reviewFixes(raw?.grammar_corrections, essay, "corrected", "gra");
  const upgrades = reviewFixes(raw?.word_choice_upgrades, essay, "better", "lr");
  return {
    criteria: reviewCriteria(raw),
    grammar: grammar.kept,
    upgrades: upgrades.kept,
    paragraphs: reviewParagraphs(raw?.paragraphs, essay),
    structureAdvice: str(raw?.structure_advice, 1500),
    strengths: strList(raw?.strengths, 6),
    priorities: strList(raw?.top_3_priorities, 3),
    dropped: { grammar: grammar.dropped, upgrades: upgrades.dropped },
  };
}
