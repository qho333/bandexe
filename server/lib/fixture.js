// Fixture mode only (MARK_FIXTURE=1): choose which hand-written reply stands in for Gemini, and how slowly it
// arrives, so every scan scenario can be tried without a key. Never used for real marking.
//   Essay markers (anywhere in the text):  [fixture:many]  [delay:30]   (seconds, 0-120)
//   Env defaults:                          MARK_FIXTURE_NAME=many  MARK_FIXTURE_DELAY=30
// Names: sample (default, matches the sample essay), clean (no issues), one (a single issue),
// many (36 issues quoted from the essay itself, incl. first/last word, a long wrapping phrase, adjacent,
// overlapping and repeated quotes), quota (Gemini 429), offline (network failure), unreadable (garbage reply),
// limit (this server's own hourly limit, answered at once; fixture mode otherwise skips that limit).
import { readFileSync } from "node:fs";

export const FIXTURE_NAMES = ["sample", "clean", "one", "many", "quota", "offline", "unreadable", "limit"];
const DEFAULT_DELAY_MS = 3500;
const FILES = { sample: "sample-report.fixture.json", clean: "clean.fixture.json" };

/** Fixture name and reply delay for one request: essay markers win over env defaults; unknown names fall back. */
export function fixtureOptions(essay = "", env = {}) {
  const pick = (re, fallback) => (String(essay).match(re)?.[1] ?? fallback ?? "").trim().toLowerCase();
  const name = pick(/\[fixture:\s*([a-z]+)\s*\]/i, env.MARK_FIXTURE_NAME);
  const raw = pick(/\[delay:\s*(\d+(?:\.\d+)?)\s*\]/i, env.MARK_FIXTURE_DELAY);
  const delay = raw === "" ? NaN : Number(raw);
  return {
    name: FIXTURE_NAMES.includes(name) ? name : "sample",
    delayMs: Number.isFinite(delay) ? Math.min(120, Math.max(0, delay)) * 1000 : DEFAULT_DELAY_MS,
  };
}

/** Distinct quotes from the essay for the generated fixtures (exact substrings; the reviewer keeps them). */
export function fixtureQuotes(essay, count) {
  const words = [...String(essay).matchAll(/\S+/g)]
    .map((m) => ({ text: m[0], at: m.index }))
    .filter((w) => !/^\[(fixture|delay):/i.test(w.text) && /[A-Za-z]/.test(w.text));
  if (!words.length) return [];
  const span = (i, n) => {
    const a = words[Math.max(0, i)], b = words[Math.min(words.length - 1, i + n - 1)];
    return essay.slice(a.at, b.at + b.text.length);
  };
  const out = [];
  const add = (q) => { if (q && !q.includes("\n") && !out.includes(q) && out.length < count) out.push(q); };
  add(words[0].text); // first word
  add(words[words.length - 1].text); // last word
  const mid = Math.floor(words.length / 2);
  add(span(mid, 12)); // long phrase: wraps on phones and usually on desktop
  add(span(mid + 14, 2)); add(span(mid + 16, 2)); // adjacent pair
  add(span(mid + 20, 3)); add(span(mid + 21, 3)); // overlapping pair: the second gets no box but stays in the report
  const seen = new Map(); // a two-word quote that appears more than once
  for (let i = 0; i + 1 < words.length; i++) {
    const q = span(i, 2);
    if (seen.has(q) && !q.includes("\n")) { add(q); break; }
    seen.set(q, i);
  }
  const step = Math.max(2, Math.floor(words.length / Math.max(1, count)));
  for (let i = 1; out.length < count && i < words.length - 1; i += step) add(span(i, i % 3 === 0 ? 2 : 1));
  return out;
}

const CRITS = ["gra", "lr", "cc", "tr"];
function withIssues(base, quotes) {
  const raw = JSON.parse(base);
  const half = Math.min(25, Math.ceil(quotes.length * 0.55));
  raw.grammar_corrections = quotes.slice(0, half).map((q, i) => ({ original: q, corrected: `${q} (fixture fix)`, reason: "Fixture reason: generated from your essay to test the scan.", criterion: CRITS[i % 4] }));
  raw.word_choice_upgrades = quotes.slice(half, half + 25).map((q) => ({ original: q, better: `${q} (fixture upgrade)`, reason: "Fixture reason: generated from your essay to test the scan.", criterion: "lr" }));
  return JSON.stringify(raw);
}

/** The JSON text the fake Gemini sends back for a named fixture. */
export function fixtureText(name, essay, read = (f) => readFileSync(new URL(`../fixtures/${f}`, import.meta.url), "utf8")) {
  if (name === "unreadable") return "This is not JSON.";
  if (name === "clean") return read(FILES.clean);
  if (name === "one") return withIssues(read(FILES.clean), fixtureQuotes(essay, 40).slice(2, 3));
  if (name === "many") return withIssues(read(FILES.clean), fixtureQuotes(essay, 36));
  return read(FILES.sample);
}

/** A fetch stand-in for one marking request. */
export function fixtureFetch(input, env = process.env, read) {
  const { name, delayMs } = fixtureOptions(input?.essay, env);
  return async () => {
    await new Promise((r) => setTimeout(r, delayMs));
    if (name === "offline") throw new TypeError("fetch failed (fixture)");
    if (name === "quota") return new Response(JSON.stringify({ error: { status: "RESOURCE_EXHAUSTED" } }), { status: 429 });
    const text = fixtureText(name, input?.essay || "", read);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });
  };
}
