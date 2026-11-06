import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prebuiltAppConfig } from "@mlc-ai/web-llm";
import { WEBLLM_MODEL } from "../src/lib/engines";
import { generateHeaders, inlineScripts } from "../scripts/security-headers.js";
import { onRequest } from "../functions/api/[[path]]";
import { sqliteD1 } from "./sqlite-d1";

const read = (path) => readFileSync(path, "utf8");
const hash = (body) => `'sha256-${createHash("sha256").update(body).digest("base64")}'`;
const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]);
const parseHeaders = (text) => new Map(text.split("\n").filter((line) => /^\s+[^#\s][^:]+:/.test(line)).map((line) => {
  const at = line.indexOf(":"); return [line.slice(0, at).trim().toLowerCase(), line.slice(at + 1).trim()];
}));
const parseCsp = (headers) => new Map(headers.get("content-security-policy").split(";").map((part) => {
  const [directive, ...sources] = part.trim().split(/\s+/); return [directive, sources];
}));
function covers(sources, url) {
  return sources?.some((source) => {
    if (!source.startsWith("https://")) return false;
    const actual = new URL(url), allowed = new URL(source.replace("*.", "wildcard."));
    const host = source.includes("*.") ? actual.hostname.endsWith(allowed.hostname.replace("wildcard", "")) : actual.host === allowed.host;
    return actual.protocol === allowed.protocol && host && (allowed.pathname.endsWith("/") ? actual.pathname.startsWith(allowed.pathname) : actual.pathname === allowed.pathname);
  }) ?? false;
}
let outDir, headers, csp;
beforeAll(() => {
  outDir = mkdtempSync(join(tmpdir(), "bandexe-csp-"));
  // Build the real application: assertions never depend on an old or nonexistent dist/.
  execFileSync(process.execPath, ["node_modules/vite/bin/vite.js", "build", "--outDir", outDir, "--emptyOutDir"], { stdio: "pipe", timeout: 60000 });
  headers = parseHeaders(read(join(outDir, "_headers")));
  csp = parseCsp(headers);
}, 60000);
afterAll(() => { if (outDir) rmSync(outDir, { recursive: true, force: true }); });

describe("built Cloudflare Pages security headers", () => {
  it("enforces the full policy on /* and preserves the required browser capabilities", () => {
    expect(read(join(outDir, "_headers"))).toMatch(/^\/\*$/m);
    expect(headers.has("content-security-policy-report-only")).toBe(false);
    for (const [directive, expected] of Object.entries({
      "default-src": ["'self'"], "base-uri": ["'none'"], "object-src": ["'none'"], "form-action": ["'self'"],
      "frame-ancestors": ["'none'"], "upgrade-insecure-requests": [], "worker-src": ["'self'", "blob:"],
      "img-src": ["'self'", "data:", "blob:"], "frame-src": ["https://accounts.google.com"],
    })) expect(csp.get(directive), directive).toEqual(expected);
    expect(csp.get("script-src")).toEqual(expect.arrayContaining(["'self'", "'wasm-unsafe-eval'", "https://accounts.google.com/gsi/client", "https://static.cloudflareinsights.com"]));
    expect(csp.get("script-src")).not.toEqual(expect.arrayContaining(["'unsafe-inline'"]));
    expect(csp.get("script-src")).not.toContain("'unsafe-eval'");
    expect(csp.get("style-src")).toEqual(["'self'", "'unsafe-inline'", "https://accounts.google.com/gsi/style", "https://fonts.googleapis.com"]);
    expect(csp.get("font-src")).toEqual(["'self'", "https://fonts.gstatic.com"]);
    expect(csp.get("connect-src")).toEqual(expect.arrayContaining(["'self'", "https://accounts.google.com/gsi/", "https://cloudflareinsights.com", "https://generativelanguage.googleapis.com", "https://api.datamuse.com", "https://api.languagetool.org", "https://huggingface.co", "https://*.hf.co", "https://raw.githubusercontent.com"]));
    expect(headers.get("x-frame-options")).toBe("DENY");
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("permissions-policy")).toBe("camera=(), microphone=(), geolocation=(), payment=(), usb=()");
    expect(headers.get("cross-origin-opener-policy")).toBe("same-origin-allow-popups");
    expect(headers.has("cross-origin-embedder-policy")).toBe(false);
    expect(headers.get("strict-transport-security")).toBe("max-age=31536000");
    for (const line of read(join(outDir, "_headers")).split("\n")) expect(line.length).toBeLessThanOrEqual(2000);
  });

  it("hashes every executable inline script in source and final HTML while excluding JSON-LD", () => {
    const sourceHtml = ["index.html", ...files("public").filter((file) => file.endsWith(".html"))];
    const builtHtml = files(outDir).filter((file) => file.endsWith(".html"));
    let count = 0;
    for (const file of [...sourceHtml, ...builtHtml]) {
      // Independent extraction checks the real pages, including module and JS MIME types.
      for (const [, attrs, body] of read(file).replace(/\r\n?/g, "\n").matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        if (/\bsrc\s*=/i.test(attrs) || /application\/ld\+json/i.test(attrs)) continue;
        expect(csp.get("script-src"), file).toContain(hash(body)); count++;
      }
    }
    expect(count).toBeGreaterThan(0);
    const builtHashes = [...new Set(builtHtml.flatMap((file) => inlineScripts(read(file))).map(hash))].sort();
    expect(csp.get("script-src").filter((source) => source.startsWith("'sha256-")).sort()).toEqual(builtHashes);
  });

  it("updates hashes when a script changes, includes SEO scripts and rejects oversized policies", () => {
    const template = read("public/_headers");
    const documents = ['<script>window.boot = 1;</script>', '<script type="text/javascript">window.seo = 2;</script>'];
    const generated = generateHeaders(template, documents);
    expect(generated).toContain(hash("window.boot = 1;"));
    expect(generated).toContain(hash("window.seo = 2;"));
    const edited = generateHeaders(template, [documents[0].replace("1", "3")]);
    expect(edited).toContain(hash("window.boot = 3;")); expect(edited).not.toContain(hash("window.boot = 1;"));
    expect(inlineScripts('<script type="application/ld+json">{}</script><script src="/app.js"></script><script type=module>run()</script><script TYPE=application/javascript>go()</script>')).toEqual(["run()", "go()"]);
    expect(() => generateHeaders(template, Array.from({ length: 50 }, (_, i) => `<script>run(${i})</script>`))).toThrow("2,000");
  });

  it("keeps Google verification, robots, sitemap and IndexNow files available", () => {
    for (const file of ["google875ebd96080a1cb9.html", "76343f1b0cdc7ee8a30c013a68ed2e70.txt"])
      expect(read(join(outDir, file))).toBe(read(join("public", file)));
    expect(read(join(outDir, "robots.txt"))).toContain("Sitemap:");
    expect(read(join(outDir, "sitemap.xml")).match(/<loc>/g)).toHaveLength(5);
  });

  it("covers the selected WebLLM model and WASM hosts, including Hugging Face CDN redirects", () => {
    for (const model of Object.values(WEBLLM_MODEL)) {
      const config = prebuiltAppConfig.model_list.find((entry) => entry.model_id === model);
      expect(config, model).toBeDefined();
      expect(covers(csp.get("connect-src"), config.model)).toBe(true);
      expect(covers(csp.get("connect-src"), config.model_lib)).toBe(true);
    }
    expect(covers(csp.get("connect-src"), "https://cas-bridge.xethub.hf.co/model-shard")).toBe(true);
  });

  it("covers every external origin in src, shared, HTML and Vite config, with explicit exceptions", () => {
    // Navigational links are not subresource loads and need no CSP source permission.
    const links = {
      "src/content/contributors.ts": ["https://www.linkedin.com"],
      "src/content/pages/schema.ts": ["https://policies.google.com", "https://react.dev", "https://vite.dev", "https://www.typescriptlang.org", "https://gsap.com", "https://lenis.darkroom.engineering", "https://webllm.mlc.ai", "https://groq.com", "https://developers.cloudflare.com", "https://openrouter.ai", "https://mistral.ai"],
      "src/components/Checker.tsx": ["https://aistudio.google.com"],
      // DOCX XML namespace identifiers, never fetched by the browser.
      "src/lib/docx.ts": ["http://schemas.openxmlformats.org"],
      // Provider calls and OAuth signature certificates are fetched only on the server.
      "shared/free.js": ["https://api.mistral.ai", "https://api.groq.com", "https://openrouter.ai", "https://oai.endpoints.kepler.ai.cloud.ovh.net"],
      "shared/accounts.ts": ["https://www.googleapis.com"],
      // Development proxy is local; production browser requests go to /api on self.
      "vite.config.ts": ["http://127.0.0.1:8787"],
    };
    const inputs = [...files("src"), ...files("shared"), "index.html", ...files("public").filter((file) => file.endsWith(".html")), "vite.config.ts"];
    const sources = [...csp.values()].flat();
    for (const file of inputs) {
      for (const [origin] of read(file).matchAll(/https?:\/\/(?:[a-z\d-]+\.)+[a-z\d-]+(?::\d+)?/gi)) {
        if (links[file]?.includes(origin)) continue;
        // Canonical/social metadata points at our own origin; schema.org is JSON-LD vocabulary.
        if ((file === "index.html" || file.startsWith("public/")) && ["https://bandexe.pages.dev", "https://schema.org", "https://ielts.org"].includes(origin)) continue;
        if (file === "vite.config.ts" && origin === "https://bandexe.pages.dev") continue;
        expect(sources.some((source) => source.startsWith("https://") && new URL(source.replace("*.", "wildcard.")).origin === origin), `${file}: ${origin}`).toBe(true);
      }
    }
    // The one shared browser-side provider must specifically be permitted as a connection.
    expect(covers(csp.get("connect-src"), "https://generativelanguage.googleapis.com/v1beta/models/test:generateContent")).toBe(true);
  });
});

describe("Functions response security headers", () => {
  it("sets the required headers on success, errors, moderation, auth and CSRF responses", async () => {
    const cases = [
      ["auth/config", "GET", {}, 200], ["stats", "GET", {}, 200], ["missing", "GET", {}, 404],
      ["reviews/pending", "GET", {}, 403], ["auth/me", "GET", {}, 404],
      ["review", "POST", {}, 403], ["review", "POST", { "X-Requested-With": "bandexe", "Content-Type": "application/json" }, 400],
    ];
    for (const [path, method, requestHeaders, status] of cases) {
      const response = await onRequest({ request: new Request(`https://bandexe.test/api/${path}`, { method, headers: requestHeaders, ...(method === "POST" ? { body: "{}" } : {}) }), env: {} });
      expect(response.status, path).toBe(status);
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    }
  });

  it("includes headers on successful replays and replay conflicts", async () => {
    const db = sqliteD1();
    try {
      const env = { DB: db, QUOTA_SALT: "headers-fixture", AI: { run: async () => ({ response: "Practise giving one concrete example." }) } };
      const request = (message) => new Request("https://bandexe.test/api/helper", { method: "POST", headers: {
        "Content-Type": "application/json", "X-Requested-With": "bandexe", "CF-Connecting-IP": "192.0.2.55", "Idempotency-Key": "headers_replay_fixture_123",
      }, body: JSON.stringify({ role: "coach", message }) });
      for (const [message, status] of [["Help with timing", 200], ["Help with timing", 200], ["Help with paragraphs", 409]]) {
        const response = await onRequest({ request: request(message), env });
        expect(response.status).toBe(status);
        expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
        expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
        expect(response.headers.get("X-Frame-Options")).toBe("DENY");
      }
    } finally { db.close(); }
  });
});
