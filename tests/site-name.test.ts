import { describe, expect, it } from "vitest";
// @ts-expect-error Node built-in, used only by tests; no added packages.
import { readFileSync } from "node:fs";

// Google shows the host company ("Cloudflare") unless the home page names the site and offers a 48px+ icon.
describe("Google site name and logo", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  it("declares the site name for search results", () => {
    const site = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1])).find((d) => d["@type"] === "WebSite");
    expect(site).toMatchObject({ name: "BAND.EXE", url: "https://bandexe.pages.dev/" });
    expect(html).toContain('<meta property="og:site_name" content="BAND.EXE">');
  });
  it("links a square icon at a multiple of 48 px", () => {
    expect(html).toContain('<link rel="icon" sizes="192x192" type="image/png" href="/favicon-192.png">');
    const png = readFileSync(new URL("../public/favicon-192.png", import.meta.url));
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([192, 192]);
  });
});
