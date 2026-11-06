// Reproducible, offline sizing check. Estimates use characters/4, not a model tokenizer.
// Provider caps are exact; live billed-token comparisons require a provider response.
import { readFileSync } from "node:fs";
import { buildOpenSystem } from "../shared/prompt.js";
const full = JSON.parse(readFileSync(new URL("../server/fixtures/sample-report.fixture.json", import.meta.url), "utf8"));
const compact = {
  criteria: Object.fromEntries(Object.entries(full.criteria).map(([key, value]) => [key, { band: value.band, summary: value.summary.split(/(?<=[.!?])\s+/)[0] }])),
  grammar_corrections: full.grammar_corrections.slice(0, 8), word_choice_upgrades: full.word_choice_upgrades.slice(0, 4),
  paragraphs: full.paragraphs.map((p) => ({ label: p.label, original_start: p.original_start, comments: { cc: p.comments.cc.split(/(?<=[.!?])\s+/)[0] } })),
  structure_advice: full.structure_advice.split(/(?<=[.!?])\s+/)[0], strengths: full.strengths.slice(0, 2), top_3_priorities: full.top_3_priorities.slice(0, 3),
};
const estimate = (text) => Math.ceil(text.length / 4);
const before = estimate(JSON.stringify(full)), after = estimate(JSON.stringify(compact));
console.log(JSON.stringify({ method: "Offline fixture estimate: ceil(characters / 4); not billed provider tokens", outputTokenCap: { full: 6000, compact: 3000, reductionPercent: 50 },
  fixtureOutputEstimate: { full: before, compact: after, reductionPercent: Math.round((1 - after / before) * 100) },
  systemPromptEstimate: { full: estimate(buildOpenSystem({ task: "t2", reportMode: "full" })), compact: estimate(buildOpenSystem({ task: "t2" })) },
}, null, 2));
