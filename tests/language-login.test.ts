import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LANGUAGES, languageInstruction } from "../shared/language.js";
import { catalogues, formatMessage, getUILanguage, setUILanguage, subscribeLanguage, t, translateError, translateMessage, translateUI } from "../src/lib/i18n";
import { en, type MessageKey } from "../src/i18n/en";
import { browserLanguage, languageDirection, languagePreferences } from "../src/lib/ui-language";
import { applyPrefs, DEFAULT_PREFS, loadPrefs, savePrefs } from "../src/lib/prefs";
import LanguagePicker from "../src/components/LanguagePicker";
import Login from "../src/components/Login";
import Header from "../src/components/Header";
import Write from "../src/components/Write";
import { SAMPLE_QUESTIONS } from "../src/content";
import { LANGUAGES as ALL_LANGUAGES } from "../shared/language.js";
import { loadLanguage } from "../src/lib/i18n";

await Promise.all(ALL_LANGUAGES.map(([code]) => loadLanguage(code)));

afterEach(() => { vi.unstubAllGlobals(); setUILanguage("en"); });
const tokens = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe("interface catalogue contract", () => {
  it("has exactly the supported languages, every English key, and identical interpolation variables", () => {
    expect(Object.keys(catalogues).sort()).toEqual(LANGUAGES.map(([code]) => code).sort());
    for (const [code] of LANGUAGES) {
      const catalogue = catalogues[code];
      expect(Object.keys(catalogue).sort()).toEqual(Object.keys(en).sort());
      for (const key of Object.keys(en) as MessageKey[]) {
        expect(catalogue[key].trim(), `${code}: ${key}`).not.toBe("");
        expect(tokens(catalogue[key]), `${code}: ${key}`).toEqual(tokens(en[key]));
      }
      if (code !== "en") {
        expect(catalogue["Continue as guest"]).not.toBe(en["Continue as guest"]);
        expect(catalogue["Feedback language"]).not.toBe(en["Feedback language"]);
      }
    }
  });
  it("falls back to English for missing catalogue entries and keeps missing variables readable", () => {
    expect(translateMessage("Hi, {name}", { name: "Sam" }, "vi", {})).toBe("Hi, Sam");
    expect(formatMessage("Hi, {name}; {missing}", { name: "$& <student>" })).toBe("Hi, $& <student>; {missing}");
    expect(formatMessage("{n}", { n: 0 })).toBe("0");
  });
  it("notifies subscribers once per change, validates codes, and supports unsubscribe", () => {
    const listener = vi.fn(), stop = subscribeLanguage(listener);
    setUILanguage("vi"); expect(getUILanguage()).toBe("vi"); expect(t("Sign in")).toBe("Đăng nhập");
    setUILanguage("vi"); expect(listener).toHaveBeenCalledOnce();
    stop(); setUILanguage("ja"); expect(listener).toHaveBeenCalledOnce();
    setUILanguage("unknown"); expect(getUILanguage()).toBe("en");
  });
  it("translates known runtime chrome without touching unknown content; unknown failures are localised", () => {
    setUILanguage("vi");
    expect(translateUI("Write at least 50 words — 23 so far.")).toBe("Viết ít nhất 50 từ — hiện có 23 từ.");
    expect(translateUI("My personal essay, unchanged.")).toBe("My personal essay, unchanged.");
    expect(translateError("Unknown provider internals")).toBe(t("Could not complete this action. Please try again."));
    expect(languageInstruction("ar")).toContain("Keep all quoted essay text, corrections");
  });
});

describe("language preference behaviour", () => {
  it("matches browser priority and regional tags, with English fallback", () => {
    expect(browserLanguage(["fr-FR", "vi-VN", "en-US"])).toBe("vi");
    expect(browserLanguage(["zh-Hant-TW", "ja"])).toBe("zh");
    expect(browserLanguage(["AR_sa"])).toBe("ar");
    expect(browserLanguage(["fr", "de"])).toBe("en");
    expect(browserLanguage([])).toBe("en");
  });
  it("validates saved language, migrates old preferences, survives blocked storage and persists choices", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("navigator", { languages: ["ko-KR"] });
    vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
    expect(loadPrefs()).toMatchObject({ uiLanguage: "ko", feedbackLanguage: "ko" });
    // An old save that only chose a feedback language becomes the one app language.
    values.set("bandexe-prefs", JSON.stringify({ uiLanguage: "invalid", feedbackLanguage: "ar" }));
    expect(loadPrefs()).toMatchObject({ uiLanguage: "ar", feedbackLanguage: "ar" });
    values.set("bandexe-prefs", JSON.stringify({ uiLanguage: "ja", feedbackLanguage: "en", keepAIEnglish: true }));
    expect(loadPrefs()).toMatchObject({ uiLanguage: "ja", feedbackLanguage: "ja" });
    savePrefs(languagePreferences(loadPrefs(), "vi"));
    expect(loadPrefs()).toMatchObject({ uiLanguage: "vi", feedbackLanguage: "vi" });
    expect(loadPrefs().keepAIEnglish).toBeUndefined();
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); } });
    expect(loadPrefs()).toMatchObject({ uiLanguage: "ko", feedbackLanguage: "ko" });
  });
  it("applies Arabic direction and resets it on leaving Arabic", () => {
    const html = { lang: "", dir: "", setAttribute: vi.fn(), classList: { toggle: vi.fn() } };
    vi.stubGlobal("document", { documentElement: html });
    applyPrefs({ ...DEFAULT_PREFS, uiLanguage: "ar" });
    expect(html).toMatchObject({ lang: "ar", dir: "rtl" });
    applyPrefs({ ...DEFAULT_PREFS, uiLanguage: "vi" });
    expect(html).toMatchObject({ lang: "vi", dir: "ltr" });
    expect(languageDirection("en")).toBe("ltr");
  });
  it("one Language setting switches the interface and the AI feedback together", () => {
    const setPrefs = vi.fn();
    const initial = { ...DEFAULT_PREFS, uiLanguage: "vi" as const, feedbackLanguage: "vi" as const };
    const tree = LanguagePicker({ prefs: initial, setPrefs });
    const label = tree.props.children;
    const select = label.props.children[1];
    expect(select.props.options.map((o: { label: string }) => o.label)).toEqual(LANGUAGES.map(([, name]) => name));
    select.props.onChange("ar");
    expect(setPrefs).toHaveBeenLastCalledWith(expect.objectContaining({ uiLanguage: "ar", feedbackLanguage: "ar" }));
  });
});

it("renders login language first with its native name, guest access and no age question in every locale", () => {
  for (const [code] of LANGUAGES) {
    setUILanguage(code);
    const html = renderToStaticMarkup(createElement(Login, { active: true, prefs: { ...DEFAULT_PREFS, uiLanguage: code, feedbackLanguage: code }, onGuest() {} }));
    const card = html.slice(html.indexOf('class="frame login__card"'));
    expect(card.indexOf('class="login__language"')).toBeLessThan(card.indexOf('class="frame-head"'));
    expect(card).toContain(catalogues[code]["Continue as guest"]);
    expect(card).not.toContain('role="switch"'); // no separate feedback-language switch
    expect(card).not.toContain('data-gemini-confirmation');
    expect(card).toContain(LANGUAGES.find(([c]) => c === code)![1]); // the list itself opens on demand (see the Language setting test)
  }
});
it("localises navigation and writing chrome while preserving English IELTS prompts and essay content", () => {
  setUILanguage("vi");
  const props = { prefs: { ...DEFAULT_PREFS, uiLanguage: "vi" as const }, setPrefs() {}, onReplayBoot() {} };
  expect(renderToStaticMarkup(createElement(Header, { ...props, current: "write" }))).toContain("Tổng quan");
  const html = renderToStaticMarkup(createElement(Write, { ...props, active: true, draft: { task: "t2", essay: "Your essay", question: SAMPLE_QUESTIONS.t2[0] }, setDraft() {}, chart: null, setChart() {}, async onEvaluate() {}, pending: false }));
  expect(html).toContain("Đề bài"); expect(html).toContain("Đồng hồ thi");
  expect(html).toContain(SAMPLE_QUESTIONS.t2[0]); expect(html).toContain(">Your essay</textarea>");
});

it("translates Arabic results chrome and criterion names while preserving essay text and correction pairs", async () => {
  const { Report } = await import("../src/components/Results");
  setUILanguage("ar");
  const result: import("../src/lib/types").MarkResult = {
    task: "t2", overall: 6.5, range: { lo: 6, hi: 7 }, label: "AI practice estimate (provisional calibration)", words: 250,
    withheld: [], markingVersion: "test-only", checker: "free", feedbackLanguage: "en",
    report: {
      criteria: {
        tr: { band: 6, summary: "Your essay", subskills: [] }, cc: { band: 6, summary: "", subskills: [] },
        lr: { band: 7, summary: "", subskills: [] }, gra: { band: 7, summary: "", subskills: [] },
      },
      grammar: [{ original: "Your essay", corrected: "Your answer", reason: "Keep this correction in English.", criterion: "gra" }],
      upgrades: [], paragraphs: [], structureAdvice: "", strengths: ["Your essay"], priorities: ["Your essay"], dropped: { grammar: 0, upgrades: 0 },
    },
  };
  const job: import("../src/App").Job = { id: 1, status: "done", result, essay: "Your essay", minutes: 20, date: "2026-10-30T00:00:00Z" };
  const html = renderToStaticMarkup(createElement(Report, {
    active: true, job, result, essay: job.essay, setEssay() {}, prefs: { ...DEFAULT_PREFS, uiLanguage: "ar" }, setPrefs() {}, onWrite() {}, onRetry() {}, onReplayBoot() {},
  }));
  expect(html).toContain(catalogues.ar["Task response"]);
  expect(html).toContain(catalogues.ar["Grammar corrections"]);
  expect(html).toContain(catalogues.ar["Likely range {value0} to {value1}"].replace("{value0}", "6.0").replace("{value1}", "7.0"));
  expect(html).toContain("<del>Your essay</del>"); expect(html).toContain("<ins>Your answer</ins>");
  expect(html).toContain("Keep this correction in English.");
  expect(html).toContain("TR"); expect(html).toContain("CC"); expect(html).toContain("LR"); expect(html).toContain("GRA");
});
