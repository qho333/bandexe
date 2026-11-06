import { exportDocx } from "./docx";
import { CRITS, TASKS, type Crit, type Fix, type MarkResult } from "./types";
import { checkerLabel, type Checker } from "./checker";
import { ENGINE_NAME } from "./engines";
import { matchIssues, segments } from "./scan";
import { feedbackText } from "./feedback";

export interface ExportInput {
  result: MarkResult;
  essay: string;
  date: string;
  checker?: Checker;
  states: Record<string, string>;
}
export interface ExportSection { title: string; lines: string[] }
export interface EssayPart { text: string; fix?: string }
const criterionName = (c: Crit, t2: boolean) => ({ tr: t2 ? "Task response" : "Task achievement", cc: "Coherence and cohesion", lr: "Lexical resource", gra: "Grammatical range and accuracy" })[c];
const number = (n: number) => n.toFixed(1);
const stateName = (state?: string) => ({ accepted: "Accepted", rejected: "Rejected", missing: "Text changed", open: "Open" })[state || "open"] || "Open";

export function reportContent({ result, essay, date, checker, states }: ExportInput) {
  const r = result.report, fb = result.feedbackOnly === true;
  const clean = (text: string) => fb ? feedbackText(text) : text;
  const fixes = (list: Fix[], prefix: string) => list.map((f, i) => `${stateName(states[prefix + i])}: [${f.original} → ${f.corrected ?? f.better ?? ""}] (${f.criterion.toUpperCase()})${clean(f.reason) ? ` — ${clean(f.reason)}` : ""}`);
  const issues = matchIssues([essay], r.grammar, r.upgrades);
  const essayParts: EssayPart[] = segments(essay, 0, issues).map((seg) => {
    if (!seg.issue) return { text: seg.text };
    const { kind, index } = seg.issue, prefix = kind === "grammar" ? "g" : "u";
    const f = (kind === "grammar" ? r.grammar : r.upgrades)[index];
    return { text: seg.text, ...(states[prefix + index] === "rejected" ? {} : { fix: f.corrected ?? f.better ?? "" }) };
  });
  const inlineEssay = essayParts.map((p) => p.fix === undefined ? p.text : `[${p.text} → ${p.fix}]`).join("");
  const checkerName = (result.checker === "device" ? "Checked on this device" : checkerLabel(result.checker ?? checker)) + (result.engine ? ` · ${ENGINE_NAME[result.engine]}` : "");
  const summary = [TASKS[result.task].label, `Date: ${date}`, checkerName,
    fb ? clean(result.label) || "Feedback only: no band estimate." : result.label,
    ...(result.fixture ? ["Fixture data, not a real marking."] : []),
    fb ? "Practice feedback only, not an official IELTS score." : "AI practice estimate, not an official IELTS result. Accuracy is not guaranteed.",
    ...(!fb ? [result.overall === null ? "Overall estimate withheld." : `Band: ${number(result.overall)}`,
      ...(result.range ? [`Likely range: ${number(result.range.lo)} to ${number(result.range.hi)}`] : []),
      ...(result.checker === "device" ? ["Uncalibrated on-device estimate; Gemini calibration does not apply."] : [])] : []),
    ...(result.chartNotice ? [result.chartNotice, ...(result.chartDescription ? [`Chart reference: ${result.chartDescription}`] : [])] : []),
    ...(result.notice ? [clean(result.notice)] : []), ...(result.note ? [clean(result.note)] : []),
    `Words: ${result.words}`, `Marking version: ${result.markingVersion}`,
    "The essay below is the submitted text with reviewed suggestions inline. Rejected suggestions remain listed as Rejected and are not inserted in the essay. Accepted/Open/Text changed describe the review state; overlapping or unmatched suggestions appear only in the lists.",
  ].filter(Boolean);
  const sections: ExportSection[] = [
    { title: "Summary", lines: summary },
    { title: "Criteria", lines: CRITS.map((c) => `${c.toUpperCase()} — ${criterionName(c, result.task === "t2")}${fb ? "" : `: ${r.criteria[c].band === null ? "Withheld" : number(r.criteria[c].band!)}`}\n${clean(r.criteria[c].summary)}`.trim()) },
    { title: "Essay with corrections", lines: [inlineEssay] },
    { title: "Grammar corrections", lines: fixes(r.grammar, "g") },
    { title: "Word-choice upgrades", lines: fixes(r.upgrades, "u") },
    { title: "Paragraph comments", lines: r.paragraphs.map((p, i) => [
      `Paragraph ${i + 1}${clean(p.label) ? ` — ${clean(p.label)}` : ""}`, p.quote,
      ...CRITS.filter((c) => clean(p.comments[c])).map((c) => `${c.toUpperCase()}: ${clean(p.comments[c])}`),
      ...(clean(p.rewrite) ? [`How to rewrite: ${clean(p.rewrite)}`] : []),
    ].filter(Boolean).join("\n")) },
    ...(clean(r.structureAdvice) ? [{ title: "Overall structure", lines: [clean(r.structureAdvice)] }] : []),
    { title: "Priorities", lines: r.priorities.map(clean).filter(Boolean) },
    { title: "Strengths", lines: r.strengths.map(clean).filter(Boolean) },
  ];
  return { sections, essayParts };
}

export function exportReport(input: ExportInput, format: "md" | "txt") {
  return (format === "md" ? "# BAND.EXE writing report\n\n" : "BAND.EXE writing report\n\n") + reportContent(input).sections.map((s) =>
    `${format === "md" ? "## " : ""}${s.title}\n\n${s.lines.length ? s.lines.join("\n\n") : "None reported."}`
  ).join("\n\n") + "\n";
}

export function downloadReport(input: ExportInput, format: "md" | "txt" | "docx") {
  const blob = format === "docx" ? new Blob([exportDocx(input)], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })
    : new Blob([exportReport(input, format)], { type: `${format === "md" ? "text/markdown" : "text/plain"};charset=utf-8` });
  const url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = `bandexe-${input.result.task}-${input.date.slice(0, 10)}.${format}`;
  document.body.append(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
