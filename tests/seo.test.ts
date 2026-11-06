// @ts-expect-error Node built-in, used only by tests; no added packages.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { screenFromHash } from "../src/lib/routes";

const origin = "https://bandexe.pages.dev";
const slugs = ["ielts-writing-checker", "ielts-task-2-checker", "ielts-task-1-checker", "ielts-writing-band-descriptors"];
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const decode = (value: string) => value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#(?:39|x27);/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const text = (html: string) => decode(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
const meta = (html: string, name: string) => decode([...html.matchAll(/<meta\s+([^>]+)>/g)]
  .find((match) => match[1].includes(`name="${name}"`) || match[1].includes(`property="${name}"`))?.[1].match(/content="([^"]*)"/)?.[1] ?? "");
const pages = ["", ...slugs].map((slug) => ({
  slug,
  url: `${origin}/${slug ? `${slug}/` : ""}`,
  html: read(slug ? `public/${slug}/index.html` : "index.html"),
}));
const title = (html: string) => decode(html.match(/<title>(.*?)<\/title>/s)?.[1] ?? "");
const jsonLd = (html: string) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map((match) => JSON.parse(match[1]));

describe("crawlable IELTS pages", () => {
  it("lists exactly the five real URLs, with dates and matching files", () => {
    const sitemap = read("public/sitemap.xml");
    const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)];
    const urls = entries.map((entry) => entry[1].match(/<loc>(.*?)<\/loc>/)![1]);
    expect(urls).toEqual(pages.map((page) => page.url));
    expect(new Set(urls).size).toBe(5);
    for (const [index, url] of urls.entries()) {
      const pathname = new URL(url).pathname;
      const file = pathname === "/" ? "index.html" : `public${pathname}index.html`;
      expect(existsSync(new URL(`../${file}`, import.meta.url)), file).toBe(true);
      expect(entries[index][1]).toContain("<lastmod>2026-10-30</lastmod>");
    }
    expect(read("public/robots.txt")).toContain(`Sitemap: ${origin}/sitemap.xml`);
  });

  it("has unique titles and descriptions", () => {
    expect(new Set(pages.map(({ html }) => title(html))).size).toBe(pages.length);
    expect(new Set(pages.map(({ html }) => meta(html, "description"))).size).toBe(pages.length);
  });

  it("keeps the short root fallback inside the React mount point", () => {
    const html = pages[0].html;
    const fallback = html.match(/<div id="root">([\s\S]*?)<\/div>/)![1];
    expect(fallback).toContain("<h1>Free IELTS Writing Checker</h1>");
    expect(fallback.match(/<p>/g)).toHaveLength(2);
    for (const slug of slugs) expect(fallback).toContain(`href="/${slug}/"`);
    expect(read("src/main.tsx")).toMatch(/createRoot\(document\.getElementById\("root"\)!\)\.render\(<App \/>\)/);
    expect(title(html)).toBe("Free IELTS Writing Checker — Band Score & Feedback | BAND.EXE");
  });

  for (const { slug, url, html } of pages) {
    describe(url, () => {
      it("has one H1, concise metadata and matching social cards", () => {
        expect(html.match(/<h1\b[^>]*>/gi)).toHaveLength(1);
        expect(html.match(/<title>/gi)).toHaveLength(1);
        expect(title(html).length).toBeGreaterThan(0);
        // The brief's exact homepage title is 61 characters; static page titles stay within 60.
        expect(title(html).length).toBeLessThanOrEqual(slug ? 60 : 61);
        expect(title(html)).toMatch(/\| BAND\.EXE$/);
        expect(meta(html, "description").length).toBeGreaterThan(0);
        expect(meta(html, "description").length).toBeLessThanOrEqual(155);
        expect(html).toContain(`<link rel="canonical" href="${url}">`);
        expect(meta(html, "og:url")).toBe(url);
        for (const network of ["og", "twitter"]) {
          expect(meta(html, `${network}:title`)).toBe(title(html));
          expect(meta(html, `${network}:description`)).toBe(meta(html, "description"));
          expect(meta(html, `${network}:image`)).toBe(`${origin}/og-preview.png`);
        }
      });

      it("has valid structured data and breadcrumb URLs", () => {
        const data = jsonLd(html); // JSON.parse throws if any block is invalid.
        const breadcrumb = data.find((item) => item["@type"] === "BreadcrumbList");
        expect(breadcrumb).toBeDefined();
        expect(breadcrumb.itemListElement[0].item).toBe(`${origin}/`);
        expect(breadcrumb.itemListElement.at(-1).item).toBe(url);
        expect(breadcrumb.itemListElement.map((item: { position: number }) => item.position))
          .toEqual(slug ? [1, 2] : [1]);
        if (!slug || slug === "ielts-writing-checker") {
          expect(data.find((item) => item["@type"] === "WebApplication"))
            .toMatchObject({ url, isAccessibleForFree: true, offers: { price: "0" } });
        }
      });

      it("links to the working writing route and disclaims affiliation and score status", () => {
        expect(html).toContain('href="/#write"');
        expect(screenFromHash(new URL("/#write", origin).hash)).toBe("write");
        expect(text(html)).toContain("not affiliated with IELTS, British Council, IDP or Cambridge");
        expect(text(html)).toContain("AI practice estimate, not an official IELTS score");
        // Catch both 'official score' and 'official IELTS score', including claims in metadata or JSON-LD.
        const copy = decode(html);
        for (const claim of copy.matchAll(/\bofficial(?: IELTS)? score\b/gi)) {
          expect(copy.slice(0, claim.index).slice(-7).toLowerCase()).toBe("not an ");
        }
        expect(copy).not.toMatch(/\b(?:accurate|best|guaranteed)\b|#1/i);
      });

      if (slug) {
        it("ships substantial static content, navigation and inline styling without executable scripts", () => {
          const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)![1];
          const words = text(main).split(/\s+/).length;
          expect(words).toBeGreaterThanOrEqual(600);
          expect(words).toBeLessThanOrEqual(1100);
          expect(html).toContain("<style>");
          expect(html).toContain('name="viewport"');
          expect(html).toContain('href="/"');
          expect(html).toContain('href="/#privacy"');
          expect(html).toContain('href="/#about"');
          for (const other of slugs) expect(html).toContain(`href="/${other}/"`);
          for (const script of html.matchAll(/<script\b([^>]*)>/gi)) {
            expect(script[1]).toBe(' type="application/ld+json"');
          }
        });

        if (slug !== "ielts-writing-band-descriptors") {
          it("matches each FAQ schema question and answer to visible text", () => {
            const faq = jsonLd(html).find((item) => item["@type"] === "FAQPage");
            expect(faq.mainEntity.length).toBeGreaterThanOrEqual(4);
            expect(faq.mainEntity.length).toBeLessThanOrEqual(6);
            const visible = [...html.matchAll(/<div class="faq-item"><h3>(.*?)<\/h3><p>(.*?)<\/p><\/div>/gs)]
              .map((match) => ({ question: text(match[1]), answer: text(match[2]) }));
            expect(faq.mainEntity.map((item: { name: string; acceptedAnswer: { text: string } }) => ({
              question: item.name, answer: item.acceptedAnswer.text,
            }))).toEqual(visible);
          });
        }
      }
    });
  }
});
