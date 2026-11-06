import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

export function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = join(dir, entry.name);
    return entry.isDirectory() ? htmlFiles(file) : /\.html$/i.test(file) ? [file] : [];
  }).sort();
}

// HTML normalizes line endings before CSP hashing. Hash the content, including whitespace.
export function inlineScripts(html) {
  const scripts = [];
  for (const [, attrs, body] of html.replace(/\r\n?/g, "\n").matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attributes = new Map([...attrs.matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)]
      .map(([, name, double, single, bare]) => [name.toLowerCase(), double ?? single ?? bare ?? ""]));
    const type = (attributes.get("type") ?? "").trim().toLowerCase().split(";")[0];
    if (!attributes.has("src") && (!type || type === "module" || /^(?:text|application)\/(?:x-)?(?:java|ecma)script(?:1\.[0-5])?$/.test(type))) scripts.push(body);
  }
  return scripts;
}

export const scriptHash = (script) => `'sha256-${createHash("sha256").update(script).digest("base64")}'`;

export function generateHeaders(template, documents) {
  const hashes = [...new Set(documents.flatMap(inlineScripts).map(scriptHash))].sort();
  if (!/\bscript-src\s[^;\n]+;/.test(template)) throw new Error("Missing script-src in public/_headers");
  const headers = template.replace(/\bscript-src\s([^;\n]+);/, (_, sources) => `script-src ${sources} ${hashes.join(" ")};`);
  // Cloudflare Pages limits each header line to 2,000 characters. Fail rather than ship a rejected policy.
  if (headers.split("\n").some((line) => line.length > 2000)) throw new Error("Generated _headers exceeds Cloudflare's 2,000 character line limit");
  return headers;
}

export function securityHeadersPlugin() {
  let outDir;
  let template;
  return {
    name: "bandexe-security-headers",
    apply: "build",
    enforce: "post",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
      template = readFileSync(resolve(config.publicDir, "_headers"), "utf8");
    },
    closeBundle() {
      // After HTML transforms, metadata emission and public copying, including SEO pages.
      const documents = htmlFiles(outDir).map((file) => readFileSync(file, "utf8"));
      writeFileSync(join(outDir, "_headers"), generateHeaders(template, documents));
    },
  };
}
