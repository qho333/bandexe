# Scale the free checker, keep it accurate, and launch extras (brief)

Owner decisions (2026-10-30): many users are minors → the default Free checker uses open models only (no Gemini on the
default path; Gemini stays an optional own-key mode for adults). No money, no downloads, no age question. Grow capacity
as far as free, minor-safe providers allow, keep marking accurate per model, then add visit/usage stats, contributors and
search-engine readiness.

## 1. Providers (shared/free.js, functions/api/[[path]].ts)
- Pool order (each skipped when its secret/binding is missing): **Groq** (secret GROQ_API_KEY, set; models rotate on 429) → **Cloudflare Workers AI** (binding AI; current models
  + cheap fallback) → **OpenRouter free** (optional) → Mistral (kept, last; owner says it's not free for them) → pool_empty.
- Structured output: use the strictest JSON mode each provider supports (json_schema where available, else json_object)
  with the same report schema; on an unreadable reply, retry ONCE on the next model/provider (within the 3-call budget).
  Cap per-provider wait so one slow model can't hold a check for 2+ minutes (measured: a 145 s unreadable reply).
- Per-model calibration hook (shared/score.js OPEN_CALIBRATIONS) stays; labels "open model, uncalibrated" until a fit exists.

## 2. Academic Task 1 on the free path
Open text models can't see images. If the student uploaded a chart: first send the image to a free vision model
(Workers AI vision model, or Groq vision if available) with a strict prompt "describe the chart's title, axes/labels, units,
key figures and trends factually, no opinions" → use that description as the chart reference for marking; label the report
"Chart read automatically — check it matches your chart". If no image and no typed description: ask for one (typed
description field) instead of failing. Tests with mocked providers.

## 3. Storage that scales: D1 instead of KV for counters
Workers KV free allows only 1,000 writes/day; each check writes ~2 → ceiling ~500 checks/day. Move the per-person daily
allowance and the new counters to **Cloudflare D1** (free: 100k writes/day, 5M reads/day): binding `DB`, a migrations
folder with a schema (daily_allowance(key TEXT, day TEXT, n INT, PRIMARY KEY(key, day)), counters(name TEXT, day TEXT,
n INT, PRIMARY KEY(name, day))), atomic UPSERT increments (no read-modify-write races). Keep KV for the 24 h result cache
(reads are cheap; write cache only on success). Fall back gracefully if DB is missing (skip counting, never block).
wrangler.toml: add [[d1_databases]] binding = "DB" with database_name "bandexe" and a placeholder id the owner's deploy
step fills (document `npx wrangler d1 create bandexe` + `npx wrangler d1 migrations apply bandexe --remote`).

## 4. Public stats + contributors
- Count anonymously (no cookies, no IP, no personal data): page visits (one per browser session, via a tiny POST
  /api/hit with sessionStorage de-dupe), essays marked, unique visitors per day approximated by session count.
- Footer: "12,345 visits · 6,789 essays marked" (rounded nicely, cached 5 min). A small #stats page with daily
  totals for the last 30 days (sparkline) — public, aggregate only.
- #about page: what BAND.EXE is, how marking works (honest accuracy numbers), and **Contributors** from a simple config
  file `src/content/contributors.ts` (name, role, link optional) with a placeholder entry the owner edits
  ("Your name — creator"), plus credits for open-source libraries and the free AI providers used.

## 5. Search engines (Google etc.)
- `public/robots.txt` (allow all, sitemap URL), `public/sitemap.xml` (home + #privacy/#about as real paths if routing
  allows; otherwise the root), proper <title>, meta description, canonical URL, Open Graph + Twitter card tags with a
  generated 1200×630 PNG preview image in the Mono style, favicon set, JSON-LD (WebApplication, free, educational).
- Document the owner steps in DEPLOY_CLOUDFLARE.md: Google Search Console → add property → verify (HTML tag or DNS) →
  submit sitemap. Leave a slot for the verification meta tag (env/config value, not hard-coded).

## Rules
Mono theme tokens, 390 px, reduced motion, no new packages, owner rules unchanged. Tests for every new pure helper and
handler path (provider order, JSON-mode request shapes, vision-description path, D1 UPSERT logic with a fake D1, stats
endpoints never storing personal data, SEO files present). npm test, npm run build, wrangler pages functions build pass.

(Cerebras dropped 2026-10-30: requires payment for the owner.)
