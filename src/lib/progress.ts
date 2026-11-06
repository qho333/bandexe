// Pure progress logic for the Overview page. Everything here is derived only from the
// student's own saved results; nothing is invented, smoothed or extrapolated.
import type { Crit } from "./types";
import { CRITS } from "./types";
import type { HistoryEntry } from "./history";

/** A result that carries a usable overall estimate (not feedback-only, not withheld). */
export const hasOverall = (h: HistoryEntry): boolean => !h.feedbackOnly && typeof h.overall === "number";

const byDate = (list: HistoryEntry[]) => list.slice().sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

// ---------- Summary strip ----------

export interface Summary {
  checks: number; // every saved result of this task type
  banded: number; // results with an overall estimate
  feedbackOnly: number;
  withheld: number; // band results whose overall was withheld
  latest: { value: number; date: string } | null;
  best: { value: number; date: string } | null;
  first: { value: number; date: string } | null;
  change: number | null; // latest minus first; null with fewer than two estimates
}

export function summarize(list: HistoryEntry[]): Summary {
  const sorted = byDate(list);
  const est = sorted.filter(hasOverall);
  const pick = (h: HistoryEntry | undefined) => (h ? { value: h.overall as number, date: h.date } : null);
  let best: HistoryEntry | undefined;
  for (const h of est) if (!best || (h.overall as number) > (best.overall as number)) best = h; // earliest best wins ties
  const first = est[0], latest = est.at(-1);
  return {
    checks: sorted.length,
    banded: est.length,
    feedbackOnly: sorted.filter((h) => h.feedbackOnly).length,
    withheld: sorted.filter((h) => !h.feedbackOnly && typeof h.overall !== "number").length,
    latest: pick(latest),
    best: pick(best),
    first: pick(first),
    change: est.length >= 2 ? round1((latest!.overall as number) - (first!.overall as number)) : null,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** "+1.0", "-0.5", "0.0" */
export const signed = (n: number) => (n > 0 ? "+" : n < 0 ? "-" : "") + Math.abs(n).toFixed(1);

// ---------- Criterion trends ----------

export type Direction = "up" | "down" | "flat" | null;
export interface CritTrend {
  crit: Crit;
  points: { date: string; value: number }[];
  latest: number | null;
  delta: number | null; // latest minus the previous saved band for this criterion
  direction: Direction;
}

export function criterionTrends(list: HistoryEntry[]): CritTrend[] {
  const sorted = byDate(list).filter((h) => !h.feedbackOnly);
  return CRITS.map((crit) => {
    const points = sorted.filter((h) => typeof h.bands?.[crit] === "number").map((h) => ({ date: h.date, value: h.bands[crit] as number }));
    const latest = points.at(-1)?.value ?? null;
    const prev = points.at(-2)?.value;
    const delta = latest !== null && prev !== undefined ? round1(latest - prev) : null;
    return { crit, points, latest, delta, direction: delta === null ? null : delta > 0 ? "up" : delta < 0 ? "down" : "flat" };
  });
}

/** Lowest latest criterion band; ties go to the one that fell most recently, then CRITS order. */
export function weakestCriterion(trends: CritTrend[]): CritTrend | null {
  const live = trends.filter((t) => t.latest !== null);
  if (!live.length) return null;
  return live.reduce((w, t) => {
    if ((t.latest as number) < (w.latest as number)) return t;
    if (t.latest === w.latest && (t.delta ?? 0) < (w.delta ?? 0)) return t;
    return w;
  });
}

// ---------- Recurring difficulties ----------

const STOP = new Set(["a", "an", "the", "your", "you", "my", "of", "to", "in", "on", "for", "with", "that", "is", "are", "be", "it", "its"]);

/** Lowercase, strip quotes and punctuation, collapse spaces. */
export function normalisePriority(text: string): string {
  return text.toLowerCase().replace(/[‘’“”"'`]/g, "").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

// Explicit equivalent wording only; never infer equivalence from a shared subset of words.
const PRIORITY_ALIASES = new Map<string, string[]>([["check use article", ["check", "article"]]]);

/** Keep word order, actions, negation and quantity; remove only grammatical filler. */
export function keyTokens(text: string): string[] {
  const words = normalisePriority(text).split(" ").filter((w) => w && !STOP.has(w));
  const tokens = words.map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
  return PRIORITY_ALIASES.get(tokens.join(" ")) ?? tokens;
}

/** Only equivalent normalized phrases (including the explicit aliases above) match. */
export function samePriority(a: string[], b: string[]): boolean {
  return a.length > 0 && a.length === b.length && a.every((w, i) => w === b[i]);
}

export interface Difficulty {
  label: string; // wording from the most recent check that raised it
  count: number; // distinct checks in the window that raised it
  window: number; // checks considered
  lastDate: string;
  hits: boolean[]; // one per check in the window, oldest first: true when it was raised
}

/**
 * Group repeated priorities across the most recent `windowSize` results (feedback-only included).
 * Only difficulties raised in at least two checks are returned, most frequent first; ties go to the
 * one raised in more recent checks.
 */
export function recurringDifficulties(list: HistoryEntry[], windowSize = 6, max = 5): Difficulty[] {
  const recent = byDate(list).slice(-windowSize);
  const groups: { tokens: string[]; label: string; checks: Set<string>; lastDate: string; lastIdx: number; recency: number }[] = [];
  recent.forEach((h, idx) => {
    for (const p of h.priorities ?? []) {
      const tokens = keyTokens(p);
      if (!tokens.length) continue;
      const g = groups.find((x) => samePriority(x.tokens, tokens));
      if (g) {
        if (!g.checks.has(h.id)) g.recency += idx;
        g.checks.add(h.id);
        if (idx >= g.lastIdx) { g.label = p.trim(); g.lastDate = h.date; g.lastIdx = idx; }
      } else groups.push({ tokens, label: p.trim(), checks: new Set([h.id]), lastDate: h.date, lastIdx: idx, recency: idx });
    }
  });
  return groups
    .filter((g) => g.checks.size >= 2)
    .sort((a, b) => b.checks.size - a.checks.size || b.recency - a.recency || b.lastIdx - a.lastIdx)
    .slice(0, max)
    .map((g) => ({ label: g.label, count: g.checks.size, window: recent.length, lastDate: g.lastDate, hits: recent.map((h) => g.checks.has(h.id)) }));
}

// ---------- Practice rhythm ----------

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export interface RhythmDay { key: string; date: Date; count: number; future: boolean; today: boolean }
export interface Rhythm { weeks: RhythmDay[][]; streak: number; activeDays: number; checks: number }

/**
 * A Monday-first grid of `weeks` weeks ending with the current week, counting checks per local day.
 * Streak = consecutive days with a check ending today, or ending yesterday if today has none yet.
 */
export function practiceRhythm(history: HistoryEntry[], now = new Date(), weeks = 5): Rhythm {
  const counts = new Map<string, number>();
  for (const h of history) {
    const t = Date.parse(h.date);
    if (Number.isNaN(t)) continue;
    const k = dayKey(new Date(t));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mondayOffset = (today.getDay() + 6) % 7;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset - (weeks - 1) * 7);
  const grid: RhythmDay[][] = [];
  let activeDays = 0, checks = 0;
  for (let w = 0; w < weeks; w++) {
    const row: RhythmDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
      const key = dayKey(date);
      const future = date > today;
      const count = future ? 0 : counts.get(key) ?? 0;
      if (count) { activeDays++; checks += count; }
      row.push({ key, date, count, future, today: key === dayKey(today) });
    }
    grid.push(row);
  }
  let streak = 0;
  const cursor = new Date(today);
  if (!counts.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (counts.has(dayKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
  return { weeks: grid, streak, activeDays, checks };
}

// ---------- Next step ----------

export interface NextStep {
  focus: string; // what to practise
  reasons: string[]; // evidence behind it, in plain sentences
  crit: Crit | null; // weakest criterion, when known
}

export const CRIT_SHORT: Record<Crit, string> = { tr: "TR", cc: "CC", lr: "LR", gra: "GRA" };

/** One concrete suggestion from the top recurring difficulty and the weakest criterion. */
export function chooseNextStep(list: HistoryEntry[], difficulties: Difficulty[], trends: CritTrend[]): NextStep | null {
  const weak = weakestCriterion(trends);
  const top = difficulties[0];
  const latest = byDate(list).at(-1);
  const focus = top?.label ?? latest?.priorities?.[0]?.trim();
  if (!focus) {
    if (!weak) return null;
    return { focus: `Work on ${CRIT_SHORT[weak.crit]}`, reasons: [`${CRIT_SHORT[weak.crit]} is your lowest criterion estimate right now (${weak.latest}).`], crit: weak.crit };
  }
  const reasons: string[] = [];
  if (top) reasons.push(`It came up in ${top.count} of your last ${top.window} checks.`);
  else reasons.push("It was the first priority in your latest check.");
  if (weak) reasons.push(`${CRIT_SHORT[weak.crit]} is your lowest criterion estimate right now (${weak.latest}).`);
  return { focus, reasons, crit: weak?.crit ?? null };
}

// Conservative theme matches: only named difficulties count; absence means not flagged this time.
const THEMES: [string, RegExp][] = [
  ["articles", /\barticles?\b|冠词|冠詞|mạo từ|أدوات التعريف/i],
  ["subject–verb agreement", /subject[–\-\s]+verb|verb agreement|主谓一致|主謂一致|hòa hợp chủ.*động từ/i],
  ["verb tense", /\btenses?\b|时态|時制|thì động từ|زمن الفعل/i],
  ["sentence boundaries", /run[ -]on|sentence fragments?|comma splice/i],
  ["paragraph development", /develop.*(?:idea|paragraph)|(?:idea|paragraph).*develop|support.*example/i],
  ["word choice", /word choice|collocation|用词|搭配|từ vựng/i],
];
export function difficultyThemes(texts: string[]): string[] {
  return THEMES.filter(([, pattern]) => texts.some((text) => pattern.test(text))).map(([name]) => name);
}
export function reportThemes(report: import("./types").Report): string[] {
  return difficultyThemes([...report.priorities, ...report.grammar.map((f) => f.reason), ...report.upgrades.map((f) => f.reason)]);
}
const withThemes = (entry: HistoryEntry): HistoryEntry => ({ ...entry,
  priorities: [...(entry.themes ?? difficultyThemes(entry.priorities)), ...entry.priorities.filter((p) => !difficultyThemes([p]).length)] });
export function sinceLastTime(history: HistoryEntry[], result: import("./types").MarkResult) {
  const previous = byDate(history.filter((h) => h.task === result.task)).slice(-4);
  const recurring = recurringDifficulties(previous.map(withThemes), 4);
  const current = [...reportThemes(result.report), ...result.report.priorities];
  const present = (label: string) => current.some((p) => samePriority(keyTokens(p), keyTokens(label)));
  return { checks: previous.length, fixed: recurring.filter((d) => !present(d.label)), still: recurring.filter((d) => present(d.label)) };
}
export function memorySummary(history: HistoryEntry[], task: import("./types").Task): string {
  const recurring = recurringDifficulties(history.filter((h) => h.task === task).map(withThemes), 4);
  return recurring.length ? "From your saved practice for this task: " + recurring.map((d) => `${d.label} came up in ${d.count} of your last ${d.window} checks`).join("; ") + ". These are practice themes, never evidence for a band." : "";
}
