import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { securityHeadersPlugin } from "./scripts/security-headers.js";

const chunkFileNames = (chunk: { moduleIds: readonly string[] }) => chunk.moduleIds.some((id) => id.includes("/@mlc-ai/web-llm/"))
  ? "assets/webllm-[hash].js" : "assets/[name]-[hash].js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "VITE_");
  const site = new URL(env.VITE_SITE_URL || "https://bandexe.pages.dev").origin;
  if (!site.startsWith("https://")) throw new Error("VITE_SITE_URL must use HTTPS");
  const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  return {
  plugins: [react(), {
    name: "bandexe-search-metadata",
    transformIndexHtml(html) {
      return { html: html.replaceAll("https://bandexe.pages.dev", site), tags: env.VITE_GOOGLE_SITE_VERIFICATION
        ? [{ tag: "meta", attrs: { name: "google-site-verification", content: env.VITE_GOOGLE_SITE_VERIFICATION }, injectTo: "head" as const }] : [] };
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "robots.txt", source: `User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n` });
      const sitemap = readFileSync(new URL("./public/sitemap.xml", import.meta.url), "utf8");
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemap.replaceAll("https://bandexe.pages.dev", escape(site)) });
      // Public HTML bypasses transformIndexHtml; keep its metadata on the configured canonical origin too.
      for (const match of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)) {
        const path = new URL(match[1]).pathname;
        if (path === "/") continue;
        const fileName = `${path.slice(1)}index.html`;
        const html = readFileSync(new URL(`./public/${fileName}`, import.meta.url), "utf8");
        this.emitFile({ type: "asset", fileName, source: html.replaceAll("https://bandexe.pages.dev", escape(site)) });
      }
    },
  }, securityHeadersPlugin()],
  build: { rolldownOptions: { output: { chunkFileNames } } },
  worker: { format: "es", rolldownOptions: { output: { chunkFileNames } } },
  server: { port: 5180, strictPort: true, proxy: { "/api": "http://127.0.0.1:8787" } },
  test: { include: ["tests/**/*.test.{js,ts}"] },
  };
});
