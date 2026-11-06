# SCALE_AND_LAUNCH implementation — 30 October 2026

Implemented all five sections of [SCALE_AND_LAUNCH.md](SCALE_AND_LAUNCH.md), plus the closed-dialog fix. No package/dependency changes, purchases, provider-key changes, model downloads, deployments or remote database operations were made. Default Free remains open models only, with no Gemini age question. Existing first-visit boot/sound behavior, Mono tokens, reduced motion, request locks/replay, compact/full detail, allowance limits, tester pass and reviewed-result cache are retained.

## 1. Provider pool and accuracy

- Groq → Workers AI → OpenRouter free → optional Mistral, skipping absent secrets/bindings. Mistral stays last and can remain unset; Cerebras is absent.
- Groq rotates its two open models on 429. Same compact/full report schema uses the strictest declared supported JSON envelope for each adapter/model; unknown model capabilities fall back to JSON object mode. Workers structured object responses are accepted too.
- A logical operation shares **three upstream calls**, including vision/retries/one repair. Repair moves to the next model/provider. Each model call/body is bounded to 45 seconds, preserving the existing 40-second successful-response load tests. Total budget remains 145 seconds; legacy Mistral FIFO pacing and jitter/backoff remain.
- Exact-quote review, whole-band validation, code-calculated overall, model-specific calibration hooks and **open model, uncalibrated** labels remain. No fit or real open-model accuracy percentage was invented. Gemini marking/calibration code was read and left unchanged.
- Local Node continues calling these same shared functions with `process.env`; fixture and TESTER_UNLIMITED behavior remain.

## 2. Academic Task 1

- Uploaded images first go to Workers vision or optional Groq vision for a factual description; image bytes never enter a text-only marking request. The description asks for title, axes/labels, units, key figures/trends and explicitly rejects instructions/opinions/invented illegible figures.
- Automatic reports show **Chart read automatically — check it matches your chart**, with an expandable reference. Copy/print/report exports retain that notice and reference.
- The editor now has a typed description field. Both client preflight and server validation accept image **or** typed reference and ask for one before spending allowance. Failed vision gives a clear typed-reference recovery action.
- Reference text reaches marking, Full detail and study examples and is part of cache identity. Vision and marking share the three-call budget. Model availability/license acceptance and actual chart-reading quality remain deployment smoke checks.

## 3. D1 and existing guarantees

- Added `migrations/0001_counters.sql` with daily allowance and aggregate counter tables, primary keys and day indexes.
- `wrangler.toml` declares binding **DB**, database **bandexe**, ID **REPLACE_WITH_D1_ID**. The lead fills it after creation.
- Daily marks/helpers reserve via a conditional atomic UPSERT/RETURNING before provider work. The tenth/fortieth request is admitted with zero left; subsequent requests are refused. D1 coordinates independent isolates. UTC rollover and existing salted daily identity remain; old identities are pruned on later visits.
- Absent/broken/timed-out DB skips counting with unknown remaining numbers and does not block checks. KV now writes only complete reviewed successful cache entries (24h); hits precede reservation/limiters and use no provider/allowance. Cache hashes include the chart reference and new prompt version.
- Tester requests still bypass personal limits/cache while retaining provider budgets. Existing idempotent retry/replay remains bounded, private and best effort across isolates. D1 does not make replay durable.

## 4. Stats and contributors

- Bodyless/cookieless `POST /api/hit` uses browser tab-session dedupe; the server ignores identifying headers/body and stores only aggregate name/day/count. Fresh successful normal marks increment essays; cache hits, helper/detail calls, failures and tester marks do not.
- `GET /api/stats`, footer totals and `#stats` expose aggregate totals plus 30 zero-filled daily rows, static sparklines and an accessible table. Daily visitors are explicitly approximated by sessions. Client/server totals cache for five minutes; absent D1 is explained clearly.
- `#about` describes the product, marking/review and honest accuracy, includes library/provider credits, and loads editable contributors from `src/content/contributors.ts` (**Your name — creator**).
- Privacy now explains actual provider order, vision, D1 allowance identity/cleanup, aggregate stats and retained KV reports. Node exposes the stats endpoints gracefully without a D1 binding.

## 5. Search engines

- Added robots, root-only sitemap (existing hash routes remain), title/description/canonical, Open Graph/Twitter tags and free educational WebApplication JSON-LD.
- Generated and visually inspected the Mono **1200×630** PNG, plus SVG/ICO/PNG/apple-touch icons. Assets are reproducible with `scripts/generate-social.mjs` using existing installed tooling.
- `VITE_SITE_URL` updates canonical/OG/JSON-LD and generated sitemap/robots together. `VITE_GOOGLE_SITE_VERIFICATION` injects the owner-supplied verification tag only when configured. A separate temporary custom-origin build confirmed all output values and verification injection.
- [DEPLOY_CLOUDFLARE.md](DEPLOY_CLOUDFLARE.md) documents Search Console property setup, DNS/HTML-tag verification and sitemap submission, plus D1 commands.

## Closed dialog

`Write.tsx` always mounted the toolbox as `role="dialog"`; CSS visibility/inert alone left it present while closed. The drawer now has `hidden={!drawer || !active}` and retains the existing authoritative `[hidden] { display: none !important; }` rule. It only becomes visible/accessible while open on Write; existing focus containment and Escape behavior remain. The closed state is covered by rendered markup tests.

## Verification and limits

- **npm test: 603 passed in 48 files.** Includes preserved 50/100/200-student workloads, repeated-click quotas, stale cache KV, independent handler isolates, failures/timeouts, replay, tester, compact/full report and first-visit suites; new tests cover provider schemas/order, vision/typed references, fake D1 UPSERTs, anonymous stats/session dedupe, UI routes/dialog and SEO artifacts.
- **npm run build: passed**, including TypeScript. Existing non-fatal >500kB main-bundle advisory remains.
- **npx wrangler pages functions build --outdir /tmp/cf-fn-check11: passed**, with `WRANGLER_LOG_PATH=/tmp/cf-fn-check11-wrangler.log` and metrics off so logs remain within the writable sandbox.
- Executed the migration and real conditional UPSERT against SQLite: ten of twelve reservations admitted, last two returned no row. Also verified custom canonical origin, robots/sitemap/JSON-LD and configured verification tag in temporary Vite build output.
- **Live 390px/reduced-motion visual verification remains blocked**: local dev server startup received `listen EPERM` on 127.0.0.1:8787; Playwright browser-cache creation received `EPERM`. Existing responsive/reduced-motion tests and new rendered markup checks pass; no live visual/remote-provider result is claimed.
- No Cloudflare deployment, D1 creation/remote migration or real provider request was performed. Provider allocations still cap capacity. Public sessions are approximate, not verified people; no identity tracking or paid abuse service was added.

## Files touched

Shared/backend:

- `shared/free.js`, `shared/free.d.ts`
- `shared/report-schema.js`, `shared/report-schema.d.ts` (new)
- `shared/storage.js`, `shared/storage.d.ts` (new)
- `shared/validate.js`, `shared/index.d.ts`
- `shared/prompt.js`, `shared/prompt.d.ts`, `shared/free-cache.ts`
- `functions/api/[[path]].ts`, `server/index.js`, `wrangler.toml`
- `migrations/0001_counters.sql` (new)

Client/UI:

- `src/App.tsx`, `src/styles.css`
- `src/lib/api.ts`, `src/lib/evaluation.ts`, `src/lib/types.ts`, `src/lib/routes.ts`, `src/lib/report-export.ts`
- `src/lib/stats.ts` (new)
- `src/components/Write.tsx`, `src/components/Results.tsx`, `src/components/Privacy.tsx`, `src/components/StudyTools.tsx`, `src/components/Footer.tsx`
- `src/components/PublicPage.tsx`, `src/content/contributors.ts` (new)

Search/build assets:

- `index.html`, `vite.config.ts`
- `scripts/generate-social.mjs` (new)
- `public/robots.txt`, `public/sitemap.xml`, `public/og-preview.png`, `public/favicon.svg`, `public/favicon.ico`, `public/favicon-32.png`, `public/apple-touch-icon.png` (new)
- `dist/index.html`, `dist/assets/*` and copied public assets regenerated by the production build

Tests/documentation:

- `tests/fake-d1.ts`, `tests/scale-launch.test.ts` (new)
- `tests/free-pool.test.ts`, `tests/free-capacity.test.ts`, `tests/cloudflare-load.test.ts`, `tests/tester.test.js`, `tests/first-visit.test.ts`, `tests/fix-and-animate.test.ts`
- `DEPLOY_CLOUDFLARE.md`, `LOAD_TESTING.md`, `SMOOTH_FIRST_VISIT_IMPLEMENTATION.md`
- `SCALE_AND_LAUNCH_IMPLEMENTATION.md` (new, this file)

There is no Git metadata in this workspace; this inventory records this session's edits. `package.json` and the lockfile were not changed.

## Exact D1/deploy commands for the lead

```sh
npx wrangler d1 create bandexe
# Replace REPLACE_WITH_D1_ID in wrangler.toml with the database_id returned above.
npx wrangler d1 migrations apply bandexe --remote
npm run build
npx wrangler pages deploy dist --project-name bandexe
```

Keep the existing Groq secret. If QUOTA_SALT is not already set, set it privately with `npx wrangler pages secret put QUOTA_SALT --project-name bandexe` before deploying. Edit the contributor placeholder and optional public SEO variables when ready. Full owner setup and optional local migrations are in [DEPLOY_CLOUDFLARE.md](DEPLOY_CLOUDFLARE.md).
