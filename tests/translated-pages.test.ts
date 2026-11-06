import { afterEach, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
// @ts-expect-error Node built-ins are available to Vitest; this app does not install Node typings.
import { readFileSync, readdirSync } from "node:fs";
import { LANGUAGES } from "../shared/language.js";
import { pageContent, resolveSections } from "../src/content/pages";
import { aboutIds, privacyIds, type Block, type Section } from "../src/content/pages/schema";
import { contributors, OWNER } from "../src/content/contributors";
import { catalogues, setUILanguage, translateMessage } from "../src/lib/i18n";
import { languageDirection } from "../src/lib/ui-language";
import { DEFAULT_PREFS } from "../src/lib/prefs";
import Privacy from "../src/components/Privacy";
import PublicPage from "../src/components/PublicPage";
import PageSections, { PageRuns } from "../src/components/PageSections";
import { FREE_CONFIG } from "../shared/free.js";
import { LANGUAGES as ALL_LANGUAGES } from "../shared/language.js";
import { loadLanguage } from "../src/lib/i18n";

await Promise.all(ALL_LANGUAGES.map(([code]) => loadLanguage(code)));

const read = (path: string): string => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const blockText = (block: Block) => block.map((run) => typeof run === "string" ? run : run.text).join("");
const sectionText = (section: Section) => [section.heading, ...section.paragraphs.map(blockText)].join(" ");
const numbers = (text: string) => [...new Set(text.match(/\d+(?:[.,]\d+)*/g) ?? [])].sort();
const hrefs = (section: Section) => [...new Set(section.paragraphs.flatMap((block) => block.flatMap((run) => typeof run !== "string" && run.href ? [run.href] : [])))].sort();
const escape = (text: string) => renderToStaticMarkup(createElement("span", null, text)).slice(6, -7);
const render = renderToStaticMarkup;
const kinds = ["privacy", "about"] as const;

afterEach(() => setUILanguage("en"));

describe("translated public page content", () => {
  it("covers exactly all supported languages and the canonical section IDs", () => {
    expect(Object.keys(pageContent).sort()).toEqual(LANGUAGES.map(([code]) => code).sort());
    expect(pageContent.en.privacy.map(({ id }) => id)).toEqual(privacyIds);
    expect(pageContent.en.about.map(({ id }) => id)).toEqual(aboutIds);
  });

  for (const [code] of LANGUAGES) {
    it(`${code}: preserves IDs, paragraphs, links, numeric values, and proper names`, () => {
      for (const kind of kinds) {
        const translated = pageContent[code][kind];
        expect(translated.map(({ id }) => id)).toEqual(pageContent.en[kind].map(({ id }) => id));
        for (const [i, source] of pageContent.en[kind].entries()) {
          const section = translated[i], context = `${code} ${source.id}`;
          expect(section.heading.trim(), context).not.toBe("");
          expect(section.paragraphs.length, context).toBe(source.paragraphs.length);
          expect(hrefs(section), context).toEqual(hrefs(source));
          for (const [j, block] of section.paragraphs.entries()) {
            expect(blockText(block).trim(), `${context} paragraph ${j}`).not.toBe("");
            expect(block.filter((run) => typeof run !== "string" && run.term).length, context)
              .toBe(source.paragraphs[j].filter((run) => typeof run !== "string" && run.term).length);
            for (const run of block) if (typeof run !== "string" && run.href) {
              expect(run.href, context).toMatch(/^(https:\/\/|#)/);
              expect(source.paragraphs.flat().some((item) => typeof item !== "string" && item.href === run.href && !!item.external === !!run.external), context).toBe(true);
            }
            expect(blockText(block), context).not.toMatch(/<\/?[a-z][^>]*>/i);
          }
          const text = sectionText(section), original = sectionText(source);
          for (const number of numbers(original)) expect(numbers(text), `${context}: missing ${number}`).toContain(number);
          expect(text, context).not.toMatch(/[٠-٩۰-۹०-९]/);
          for (const name of ["BAND.EXE", "IELTS", "Google", "Groq", "Cloudflare", "Workers AI", "OpenRouter", "Mistral", "Gemini", "LanguageTool", "Datamuse", "WebLLM", "React", "Vite", "TypeScript", "GSAP", "Lenis", "Azeret Mono", "Atkinson Hyperlegible", "gpt-oss-120b", "qwen3.8-27b", "gpt-oss-20b", "qwen3-30b", "Flash-Lite", "bx_session", "QUOTA_SALT", "SHA-256", "/api", "HttpOnly", "Secure", "SameSite=Lax"]) {
            if (original.includes(name)) expect(text, `${context}: ${name}`).toContain(name);
          }
          if (code !== "en" && source.id !== "about-owner") {
            expect(section.heading, context).not.toBe(source.heading);
            for (const [j, block] of section.paragraphs.entries()) expect(blockText(block), `${context} paragraph ${j}`).not.toBe(blockText(source.paragraphs[j]));
          }
        }
      }
      if (code !== "en") for (const value of Object.values(pageContent[code].privacyPage)) expect(value.trim()).not.toBe("");
    });

    it(`${code}: renders both pages in the chosen language, with the translated notice and dynamic contributors`, () => {
      setUILanguage(code);
      const display = { prefs: { ...DEFAULT_PREFS, uiLanguage: code }, setPrefs() {}, onReplayBoot() {} };
      const privacy = render(createElement(Privacy, { ...display, active: true }));
      const about = render(createElement(PublicPage, { ...display, kind: "about" }));
      for (const [kind, html] of [["privacy", privacy], ["about", about]] as const) {
        expect(html).not.toContain("This page is in English.");
        for (const section of pageContent[code][kind]) {
          expect(html).toContain(`id="${section.id}" lang="${code}" dir="${languageDirection(code)}"`);
          expect(html).toContain(escape(section.heading));
          for (const paragraph of section.paragraphs) {
            // Compare each escaped text run, independent of React's link markup.
            for (const run of paragraph) expect(html).toContain(escape(typeof run === "string" ? run : run.text));
          }
        }
        expect(html).toContain('href="#write"');
      }
      expect(privacy).toContain('id="privacyTitle"');
      expect(about).toContain('id="publicTitle"');
      if (code === "en") {
        expect(privacy).not.toContain(pageContent.en.privacyPage.translationNotice);
        expect(privacy).not.toContain('aria-controls="privacy-content"');
      } else {
        expect(privacy).toContain(escape(pageContent[code].privacyPage.translationNotice));
        expect(privacy).toContain(escape(pageContent[code].privacyPage.showEnglish));
        expect(privacy).toContain('aria-pressed="false" aria-controls="privacy-content"');
      }
      expect(about).toContain(escape(pageContent[code].contributorRole));
      for (const person of contributors) {
        expect(about).toContain(escape(person.name));
        if (person.link) expect(about).toContain(`href="${person.link}"`);
      }
      const bio = translateMessage("{name} is the owner of BAND.EXE: a first-year college student at SUA, from Vietnam. He'd love your support on his journey.", { name: OWNER.name }, code);
      expect(about).toContain(escape(bio));
      expect(about).toContain(escape(catalogues[code]["Meet the owner"]));
    });
  }

  it("falls back by section ID to English without losing order or mislabelling its language", () => {
    for (const kind of kinds) {
      const remaining = [...pageContent.ar[kind]].reverse().filter((_, i) => i !== 1);
      const resolved = resolveSections(kind, "ar", { ...pageContent.ar, [kind]: remaining });
      expect(resolved.map(({ section }) => section.id)).toEqual(pageContent.en[kind].map(({ id }) => id));
      for (const entry of resolved) {
        if (remaining.some(({ id }) => id === entry.section.id)) {
          expect(entry.language).toBe("ar");
        } else {
          expect(entry.language).toBe("en");
          expect(entry.section).toBe(pageContent.en[kind].find(({ id }) => id === entry.section.id));
        }
      }
      expect(resolveSections(kind, "vi", {}).every(({ language }) => language === "en")).toBe(true);
    }
    // Exercise the real renderer with a temporarily missing section.
    const saved = pageContent.ar;
    try {
      pageContent.ar = { ...saved, privacy: saved.privacy.filter(({ id }) => id !== "privacy-accuracy") };
      const html = render(createElement(PageSections, { kind: "privacy", language: "ar" }));
      expect(html).toContain('id="privacy-accuracy" lang="en" dir="ltr"');
      expect(html).toContain("Measured accuracy");
      expect(html).toContain('id="privacy-storage" lang="ar" dir="rtl"');
    } finally { pageContent.ar = saved; }
  });

  it("keeps the documented daily allowances aligned with the existing configuration", () => {
    expect(FREE_CONFIG).toMatchObject({ checksPerDay: 10, helpersPerDay: 40, accountChecksPerDay: 15, accountHelpersPerDay: 60 });
    for (const content of Object.values(pageContent)) {
      const section = content.privacy.find(({ id }) => id === "privacy-signing-in")!;
      for (const value of [FREE_CONFIG.checksPerDay, FREE_CONFIG.helpersPerDay, FREE_CONFIG.accountChecksPerDay, FREE_CONFIG.accountHelpersPerDay]) {
        expect(numbers(sectionText(section))).toContain(String(value));
      }
    }
  });

  it("uses escaped React text and links, with no HTML injection rendering", () => {
    const html = render(createElement(PageRuns, { runs: ['<script>alert("text")</script>', { text: "<img src=x onerror=alert(1)>", href: "#privacy-accuracy" }] }));
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img");
    const paths = ["src/components/PageSections.tsx", "src/components/Privacy.tsx", "src/components/PublicPage.tsx", ...(readdirSync(new URL("../src/content/pages/", import.meta.url)) as string[]).map((name) => `src/content/pages/${name}`)];
    for (const path of paths) expect(read(path), path).not.toContain("dangerouslySetInnerHTML");
  });
});
