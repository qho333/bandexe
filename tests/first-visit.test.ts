import { fakeD1 } from "./fake-d1";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
// @ts-expect-error Node built-in available to Vitest; the app does not install Node typings.
import { readFileSync } from "node:fs";
import { onRequest } from "../functions/api/[[path]]";
import { buildOpenSystem } from "../shared/prompt.js";
import { markFree } from "../shared/free.js";
import { validateMarkRequest } from "../shared/index.js";
import { evaluationReason, evaluateDraft } from "../src/lib/evaluation";
import { expandReport, createDetailCache, getReportDetail } from "../src/lib/report-detail";
import { setChecker } from "../src/lib/checker";
import { markEssay } from "../src/lib/api";
import { geminiAccess, createGeminiAccess } from "../src/lib/gemini";
import { AgeConfirmation } from "../src/components/GeminiGate";
import Login from "../src/components/Login";
import Privacy from "../src/components/Privacy";
import { CheckerSetup } from "../src/components/Checker";
import { Report } from "../src/components/Results";
import { ReportActions } from "../src/components/ReportExport";
import { DEFAULT_PREFS, loadPrefs, savePrefs } from "../src/lib/prefs";
import { loadDraft, persistDraft } from "../src/lib/draft";
import { SAMPLE_QUESTIONS } from "../src/content";
import type { Draft, MarkResult } from "../src/lib/types";

const raw = JSON.parse(readFileSync(new URL("../server/fixtures/sample-report.fixture.json", import.meta.url), "utf8"));
const draft: Draft = { task: "t2", question: "Discuss working from home.", essay: "Working from home has became normal. " + "More people can work from home today. ".repeat(8) };
const validated = validateMarkRequest(draft);
if (!validated.ok) throw new Error(validated.error);
const input = validated.value;
const store = () => {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
};
const render = (component: ComponentType<any>, props: object) => renderToStaticMarkup(createElement(component, props));
const context = (path: string, body: object = draft, env = {}) => ({ request: new Request(`https://bandexe.test/api/${path}`, {
  method: "POST", headers: { "Content-Type": "application/json", "X-Requested-With": "bandexe", "CF-Connecting-IP": "192.0.2.211" }, body: JSON.stringify(body),
}), env });
const run = () => vi.fn(async () => ({ response: JSON.stringify(raw) }));
let local: ReturnType<typeof store>;
beforeEach(() => { local = store(); vi.stubGlobal("localStorage", local); setChecker({ mode: "free", key: "" }); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("zero-prompt first visit", () => {
  it("prefills a sample, checks with no age/header/key/download, and renders a compact report", async () => {
    expect(loadDraft().question).toBe(SAMPLE_QUESTIONS.t2[0]);
    expect(render(CheckerSetup, {})).not.toMatch(/18|age confirmation|password|download/i);
    const age = vi.spyOn(geminiAccess, "require").mockRejectedValue(new Error("No default gate"));
    const upstream = run();
    const network = vi.fn(async (_url: string, init?: RequestInit) => onRequest({ request: new Request("https://bandexe.test/api/mark", { ...init, headers: { ...Object.fromEntries(new Headers(init?.headers)), "CF-Connecting-IP": "192.0.2.211" } }), env: { DB: fakeD1(), QUOTA_SALT: "fixture-salt", AI: { run: upstream } } }));
    vi.stubGlobal("fetch", network);
    let result!: MarkResult;
    await evaluateDraft({ current: false }, false, draft, null, async (selection) => { result = await markEssay(draft, null, undefined, selection); });
    expect(result.reportMode).toBe("compact"); expect(result.overall).toBeGreaterThan(0); expect(age).not.toHaveBeenCalled();
    const html = render(Report, { active: true, job: { id: 1, status: "done", result, essay: draft.essay, question: draft.question, minutes: null },
      result, essay: draft.essay, setEssay() {}, prefs: { ...DEFAULT_PREFS, reduced: "on" }, onWrite() {} });
    for (const text of ["Full detail", "helper call", "Export .md", "Export .txt", "Export .docx", "Print / Save as PDF"]) expect(html).toContain(text);
    expect(html).not.toMatch(/Gemini age confirmation|type="password"/);
    const headers = new Headers(network.mock.calls[0][1]?.headers);
    expect(headers.has("X-Age-Confirmed")).toBe(false); expect(headers.has("X-Provider")).toBe(false);
    expect(upstream).toHaveBeenCalledOnce();
  });
  it("an adult choice persists and starts an authorized own-key evaluation in the same click", async () => {
    const access = createGeminiAccess(() => local);
    await access.load(async () => new Response(JSON.stringify({ ok: true, gemini: { allowed: true } })));
    setChecker({ mode: "own", key: "test-only-key" });
    const submit = vi.fn(async () => { access.assert(); });
    const card = AgeConfirmation({ onConfirm: () => { access.confirmAge(); void evaluateDraft({ current: false }, false, draft, null, submit); }, onDevice() {} });
    (card.props.children[1].props.onClick as () => void)();
    expect(submit).toHaveBeenCalledOnce();
    const next = createGeminiAccess(() => local);
    expect(next.getSnapshot().confirmed).toBe(true);
  });
  it("shows useful preflight reasons for every invalid input and pending work", () => {
    expect(evaluationReason({ ...draft, essay: "twelve words" }, null)).toContain("2 so far");
    expect(evaluationReason({ ...draft, question: "" }, null)).toContain("question");
    expect(evaluationReason({ ...draft, question: "a".repeat(3001) }, null)).toContain("3,000");
    expect(evaluationReason({ ...draft, essay: "word ".repeat(1201) }, null)).toContain("1,200");
    expect(evaluationReason({ ...draft, task: "ac1" }, null)).toContain("chart image");
    expect(evaluationReason(draft, null, true)).toContain("Results");
    setChecker({ mode: "own", key: "" }); expect(evaluationReason(draft, null)).toContain("Save");
    setChecker({ mode: "free" }); expect(evaluationReason(draft, null)).toBe("");
  });
  it("rejects overlong input before sending a request", async () => {
    const submit = vi.fn();
    await expect(evaluateDraft({ current: false }, false, { ...draft, essay: "word ".repeat(1201) }, null, submit)).rejects.toThrow(/1,200/);
    expect(submit).not.toHaveBeenCalled();
  });
});

describe("compact and full detail", () => {
  it("changes the output format without losing descriptors, task/image instructions or safety rules", () => {
    const compact = buildOpenSystem({ task: "ac1", feedbackLanguage: "vi" });
    const full = buildOpenSystem({ task: "ac1", reportMode: "full", feedbackLanguage: "vi" });
    for (const text of ["chart image attached", "Task Response", "Untrusted student text", "Tiếng Việt", "Whole bands"]) {
      expect(compact).toContain(text); expect(full).toContain(text);
    }
    expect(compact).toContain("At most 8 grammar corrections, 4 optional upgrades, 3 priorities");
    expect(compact).not.toContain('"how_to_rewrite"'); expect(full).toContain('"how_to_rewrite"');
  });
  it("enforces compact correction bounds and halves the provider output cap including repairs", async () => {
    const many = { ...raw, grammar_corrections: Array.from({ length: 12 }, (_, i) => ({ original: `word${i}`, corrected: `fix${i}`, reason: "Accuracy." })),
      word_choice_upgrades: Array.from({ length: 7 }, (_, i) => ({ original: `word${i + 12}`, better: `fix${i}`, reason: "Precision." })) };
    const network = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(many) } }] })));
    const compact = await markFree({ ...input, essay: Array.from({ length: 30 }, (_, i) => `word${i}`).join(" ") }, { GROQ_API_KEY: "test" }, { fetchFn: network });
    expect(compact.report.grammar).toHaveLength(8); expect(compact.report.upgrades).toHaveLength(4);
    expect(compact.report.paragraphs.every((p) => !p.rewrite)).toBe(true);
    expect(Object.values(compact.report.criteria).every((c) => !c.subskills.length)).toBe(true);
    expect(JSON.parse(String(network.mock.calls[0][1]?.body)).max_tokens).toBe(3000);
    await markFree({ ...input, reportMode: "full" }, { GROQ_API_KEY: "test" }, { fetchFn: network });
    expect(JSON.parse(String(network.mock.calls[1][1]?.body)).max_tokens).toBe(6000);
  });
  it("full detail consumes helper quota, has its own cache, and a cache hit consumes nothing", async () => {
    const values = new Map<string, string>();
    const kv = { get: vi.fn(async (key: string) => values.get(key) ?? null), put: vi.fn(async (key: string, value: string) => { values.set(key, value); }) };
    const upstream = run(), markLimit = vi.fn(async () => ({ success: true })), helperLimit = vi.fn(async () => ({ success: true }));
    const env = { DB: fakeD1(), QUOTA: kv, QUOTA_SALT: "test-salt", AI: { run: upstream }, MARK_LIMITER: { limit: markLimit }, HELPER_LIMITER: { limit: helperLimit } };
    const compact = await (await onRequest(context("mark", { ...draft, reportMode: "full" }, env))).json();
    expect(compact.reportMode).toBe("compact"); expect(compact.remainingToday).toBe(9);
    const full = await (await onRequest(context("report-detail", draft, env))).json();
    expect(full.reportMode).toBe("full"); expect(full.dailyLimit).toBe(40); expect(full.remainingToday).toBe(39);
    expect(markLimit).toHaveBeenCalledOnce(); expect(helperLimit).toHaveBeenCalledOnce();
    const again = await (await onRequest(context("report-detail", draft, env))).json();
    expect(again.cached).toBe(true); expect(upstream).toHaveBeenCalledTimes(2); expect(helperLimit).toHaveBeenCalledOnce();
    expect([...values.keys()].filter((key) => key.startsWith("cache:"))).toHaveLength(2);
  });
  it("preserves original bands, correction IDs and review decisions when expanding", async () => {
    const original = await markFree(input, { AI: { run: run() } });
    const detail = await markFree({ ...input, reportMode: "full" }, { AI: { run: run() } });
    detail.overall = 9; detail.report.criteria.tr.band = 9;
    detail.report.grammar.unshift({ original: "different", corrected: "new", reason: "Reason", criterion: "gra" });
    const expanded = expandReport(original, detail);
    expect(expanded.overall).toBe(original.overall); expect(expanded.report.criteria.tr.band).toBe(original.report.criteria.tr.band);
    expect(expanded.report.grammar.slice(0, original.report.grammar.length)).toEqual(original.report.grammar);
    expect(expanded.reportMode).toBe("full");
  });
  it("caches simultaneous detail calls and evicts a failure so retry works", async () => {
    const cache = createDetailCache(), result = await markFree(input, { AI: { run: run() } });
    const generate = vi.fn(async () => result);
    await Promise.all([cache("essay", generate), cache("essay", generate)]); expect(generate).toHaveBeenCalledOnce();
    await expect(cache("retry", async () => { throw new Error("offline"); })).rejects.toThrow("offline");
    await expect(cache("retry", generate)).resolves.toBe(result); expect(generate).toHaveBeenCalledTimes(2);
  });
  it("detail reports expose friendly network errors and send tester headers without an age gate", async () => {
    const network = vi.fn<typeof fetch>(async () => new Response("unreadable", { status: 503 })); vi.stubGlobal("fetch", network);
    await expect(getReportDetail(input)).rejects.toThrow(/Full detail is unavailable/);
    const init = network.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).has("X-Age-Confirmed")).toBe(false);
    expect(JSON.parse(String(init.body)).reportMode).toBe("full");
  });
});

it("exports all requested formats from real controls", () => {
  const html = render(ReportActions, { input: {} });
  for (const text of ["Export .md", "Export .txt", "Export .docx", "Print / Save as PDF", "Copy report"]) expect(html).toContain(text);
});
it("normalizes corrupt display settings while preserving explicit sound off", () => {
  local.setItem("bandexe-prefs", JSON.stringify({ theme: "unknown", sound: null, boot: false, edSize: "400", reduced: "maybe", feedbackLanguage: "xx" }));
  expect(loadPrefs()).toEqual(DEFAULT_PREFS);
  savePrefs({ ...DEFAULT_PREFS, sound: "off", theme: "paper", edSize: "18" });
  expect(loadPrefs()).toMatchObject({ sound: "off", theme: "paper", edSize: "18" });
});
it("keeps scrolling columns static and the phone action bar fixed with measured clearance", () => {
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  expect(css.match(/\.ws__side \{[^}]+\}/)?.[0]).toContain("position: static");
  expect(css.match(/\.res-nav \{[^}]+\}/)?.[0]).toContain("position: static");
  expect(css).not.toContain("position: sticky");
  expect(css).toMatch(/\.screen \.write-actions \{\s*position: fixed/);
  expect(css).toContain("--action-h");
});

it("reports blocked draft storage and keeps the submitted text unchanged", () => {
  expect(persistDraft(draft)).toBe(true); expect(loadDraft()).toMatchObject(draft);
  vi.stubGlobal("localStorage", { setItem() { throw new Error("full"); } });
  expect(persistDraft(draft)).toBe(false);
});

it("records real provider output usage for compact/full measurement, without inventing missing usage", async () => {
  const network = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ usage: { completion_tokens: 321 }, choices: [{ message: { content: JSON.stringify(raw) } }] })));
  const result = await markFree(input, { GROQ_API_KEY: "test" }, { fetchFn: network });
  expect(result.outputTokens).toBe(321);
  expect((await markFree(input, { AI: { run: run() } })).outputTokens).toBeUndefined();
});

it("keeps sign-in secondary, without nonfunctional authentication controls or obsolete device offers", () => {
  const html = render(Login, { active: true, onGuest() {} });
  expect(html).toContain("Continue as guest"); expect(html).toContain("Sign-in is coming soon");
  expect(html).not.toMatch(/<input|disabled=|on-device checker/);
});
it("explains compact and expanded report privacy and allowance", () => {
  const html = render(Privacy, { active: true, prefs: DEFAULT_PREFS, setPrefs() {}, onReplayBoot() {} });
  expect(html).toContain("Full detail sends the submitted question, essay and any chart");
  expect(html).toContain("separate helper allowance");
});

it("wires the adult setup confirmation to the pending evaluation action", () => {
  setChecker({ mode: "own", key: "test-only-key" });
  const ready = vi.fn();
  function InspectSetup() {
    const setup = CheckerSetup({ onAdultReady: ready });
    expect(setup.props.onConfirm).toBe(ready);
    return setup;
  }
  render(InspectSetup, {});
});
it("export buttons download real MD/TXT/DOCX blobs and Print invokes the print flow", async () => {
  const result = await markFree(input, { AI: { run: run() } });
  const downloads: { href: string; download: string; click: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> }[] = [];
  const blobs: Blob[] = [];
  const create = vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => { blobs.push(blob as Blob); return `blob:test-${blobs.length}`; });
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.stubGlobal("document", { createElement: () => { const anchor = { href: "", download: "", click: vi.fn(), remove: vi.fn() }; downloads.push(anchor); return anchor; }, body: { append: vi.fn() } });
  const print = vi.fn(); vi.stubGlobal("window", { print, setTimeout: (cb: () => void) => { cb(); return 0; } });
  const tree = ReportActions({ input: { result, essay: draft.essay, date: "2026-10-30", states: {} } });
  for (const button of tree.props.children[0]) button.props.onClick();
  expect(downloads.map((link) => link.download)).toEqual(["bandexe-t2-2026-10-30.md", "bandexe-t2-2026-10-30.txt", "bandexe-t2-2026-10-30.docx"]);
  for (const link of downloads) { expect(link.click).toHaveBeenCalledOnce(); expect(link.remove).toHaveBeenCalledOnce(); }
  expect(await blobs[0].text()).toContain("# BAND.EXE"); expect(await blobs[1].text()).toContain("Grammar corrections");
  expect(new Uint8Array(await blobs[2].arrayBuffer()).slice(0, 2)).toEqual(new Uint8Array([80, 75]));
  expect(create).toHaveBeenCalledTimes(3); expect(revoke).toHaveBeenCalledTimes(3);
  tree.props.children[2].props.onClick(); expect(print).toHaveBeenCalledOnce();
});
it("distinguishes a student's ten-check limit from shared pool exhaustion", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "daily_limit" }), { status: 429 })));
  await expect(markEssay(draft, null)).rejects.toThrow("Your 10 free checks for today");
});
