# BAND.EXE student-flow fixes — 30 October 2026

Implemented the scrolling changes first, followed by the first-visit brief and the code/test flow review. No packages were added. The Free path has no age question, login requirement, paid option, or model download. The phone bottom action bar remains fixed and uses its existing measured clearance. Sound still defaults on; Mono and reduced-motion behavior remain intact.

## Fix list (file:line and original problem)

| Location | What was wrong and what changed |
| --- | --- |
| `src/styles.css:386` | Write's desktop sidebar followed the viewport. It is now static and scrolls with the document. |
| `src/styles.css:482` | Results mini-nav also followed the viewport on a Lenis reading page. It is now static, without a scroll-follow transform. |
| `src/lib/boot.ts:30` | Suspended audio left visitors at the gate for 30 seconds. The gate now starts the intro silently after 2 seconds, retaining the independent animation safety deadline. Returning loads follow the same behavior. |
| `src/lib/boot.ts:63` | A wall-clock timeout previously ended the gate rather than starting the intro. Timer expiry, pageshow, and visibility restoration now auto-start it correctly. |
| `src/lib/boot.ts:73` and `src/components/Boot.tsx:243` | The first gesture after silent auto-start did not have an explicit sound-unlock path. The first click/key unlocks audio without ending the intro; subsequent keys still skip. Held-key repeats remain consumed and handlers are disposed. |
| `src/components/Write.tsx:138`, `src/components/Checker.tsx:24`, `src/components/GeminiGate.tsx:23` | An own-key check could reach an age error instead of the inline confirmation flow. The inline adult confirmation can now continue a ready evaluation in the same click; it persists in browser storage. No default Free age prompt was introduced. |
| `src/lib/evaluation.ts:39` and `src/components/Write.tsx:88` | Students had no up-front explanation of missing question, too-short answer, missing academic chart or missing own key. Visible reasons now appear beside the sidebar Evaluate button and in the phone action bar. Pending work points to Results. |
| `src/lib/evaluation.ts:31` | Overlong questions/essays were sent to the server before rejection. Client preflight now catches the server's existing question, word, and character limits. |
| `src/App.tsx:106`, `src/lib/draft.ts:16`, `src/components/Write.tsx:116` | Autosave said the draft was saved even when storage was blocked/full. Persistence now returns success and the editor shows a keep-this-page-open message on failure. A synchronous draft ref preserves consecutive patches. |
| `shared/prompt.js:34` | Default open-model reports requested the entire verbose schema. Compact output now asks for bands, short evidence summaries, up to 8 corrections, 4 upgrades, 3 priorities, and one-line paragraph notes, without subskills or paragraph rewrites. The prompt version changed so older cached reports cannot masquerade as compact ones. |
| `shared/free.js:141` | Free JSON requests always used the 6,000-token output cap. Compact requests, including repair requests, now use 3,000; full requests retain 6,000. The reviewed compact arrays are capped at 8/4 and verbose rewrites/subskills are removed. Provider ordering, queues, retries, calibration, and fallback budgets were left as they were. |
| `shared/free.js:111` | There was no output-usage metadata for checking capacity savings. Numeric provider-reported output token usage is now retained when available, including report repairs. Missing usage is not fabricated. |
| `functions/api/[[path]].ts:60` and `shared/validate.js:42` | There was no Full detail operation. `/api/report-detail` now requests the long report with the helper limiter and helper daily allowance. It uses the existing content-addressed result cache; its full prompt separates it from compact results. `/api/mark` forces compact mode, so a caller cannot bypass helper accounting by sending `reportMode: full` there. |
| `src/lib/report-detail.ts:10` | There was no safe way to expand a reviewed report. New memory caching deduplicates in-flight/successful expansions and evicts failures. Expansion preserves original bands, original correction IDs, and existing accept/reject decisions; additional exact-quote-reviewed suggestions append after the originals. |
| `src/components/Results.tsx:387` | There was no Full detail control or loading/failure explanation. It now offers Full detail on compact reports, explains the helper call/cache, and keeps the compact report readable during loading/failure. Full-detail exports use the expanded report. |
| `server/index.js:67` | Local Free requests silently used server Gemini credentials. Local marking, helpers and model answers now use the existing open-model functions unless Gemini is explicitly selected; fixture responses remain labeled. Local Full detail uses helper quota. |
| `scripts/dev.js:1` | Local dev automatically read a personal Gemini credential from Keychain even for Free mode. That implicit credential lookup was removed, and configured server-provider credentials are stripped from Vite's child environment. |
| `src/lib/api.ts:36` | A student's daily ten-check limit was described as shared pool exhaustion. The messages now distinguish those failures and give the UTC reset action. |
| `src/components/Results.tsx:243` | Exhausted allowances still offered a pointless immediate retry. Daily-limit/pool-empty errors now offer the editor action without that retry; transient failures retain Try again. |
| `src/components/Results.tsx:246` | “Show report now” appeared while the marker was still running, although it only skipped animation. The pending label is now “Skip scan animation”; “Show report now” appears when the report exists. |
| `src/components/Results.tsx:209` | No reviewed marks was described as proof that no corrections were needed. Copy now says no corrections/upgrades passed review. |
| `src/components/ReportExport.tsx:8` | MD/TXT/DOCX generation existed without accessible UI controls. Buttons now invoke the existing exporters, with a friendly fallback if exporting fails. Copy and Print remain available. |
| `src/lib/study.ts:40` | Study-model caching could reuse a response after the own key changed. The cache now includes key identity in page memory. |
| `src/lib/study.ts:46` | Network/malformed study-model replies exposed raw fetch/JSON exceptions. These now produce a clear retry message without changing the report. |
| `src/lib/prefs.ts:13` | Valid JSON with corrupt theme, sound, reduced-motion or editor-size values could disable expected defaults or break controls. Saved values are now validated; explicit valid choices, including Sound off, are preserved. |
| `src/components/Login.tsx:17` | Optional Sign in presented a form full of controls that could never work, plus obsolete on-device checker instructions. It now gives a concise coming-soon explanation and a working Continue as guest action. |
| `src/components/Privacy.tsx:17` | Privacy did not explain Full detail's additional submission, helper allowance, or caching. That flow is now described. |

## Verification

- `npm test`: **574 tests passed in 47 files**.
- `npm run build`: **passed**, including TypeScript. Vite still reports the existing non-fatal large-bundle advisory.
- `WRANGLER_LOG_PATH=/tmp/bandexe-wrangler.log npx wrangler pages functions build --outdir /tmp/cf-fn-check10`: **passed**. The log-path environment variable keeps Wrangler from trying to write outside the sandbox; it does not change the Functions build.
- New tests execute the Free client through the Pages handler and real reviewer/scorer, without any age confirmation, and render a compact report.
- New tests cover the 2-second gate, first-gesture unlock, wall-clock restore, adult confirmation continuation and persistence, compact prompt/caps, helper accounting/cache separation, stable correction IDs/bands during expansion, output-usage metadata, local open-model routing, draft persistence failure, corrupt preferences, study-model cache invalidation and readable failures, real export Blob handlers, and Print invocation.
- Existing tests cover spider geometry/deadlines, hidden tabs and reduced motion, correction accept/reject and overlaps, feedback chat/context, overview/history, privacy/report routes, theme and sound behavior, mascots, own-key gating, tester headers/bypass, export contents, DOCX ZIP/XML integrity, request replay, and daily limits.

## Token sizing

Run `node scripts/compact-token-audit.js` for the reproducible offline sizing audit:

| Metric | Full | Compact |
| --- | ---: | ---: |
| Exact provider output-token cap | 6,000 | 3,000 |
| Fixture JSON output estimate, ceil(characters / 4) | 1,104 | 657 |
| System prompt estimate, same method | 2,244 | 2,062 |

The fixture estimate is about **40% smaller**, and the output cap is **50% smaller**. These are not live tokenizer or billed-token measurements. Successful provider replies now expose `outputTokens` when the provider supplies usage, allowing a real compact/full comparison without logging essays. No real provider call or live token comparison was performed in this session.

## Review coverage and remaining verification

Read the boot and gating code, Write/timer/grammar/chart controls, scan/report/correction handling, study model and feedback chat, export/print implementation, Overview/history, Privacy, display settings, themes/sound, mascot controls/helpers, own-key and tester paths, and the phone/desktop responsive CSS. Layout contracts and server-rendered markup are covered by tests.

**The requested live 390px and 1280px visual/interaction pass remains unverified.** Starting a local dev server failed with sandbox `listen EPERM`. Playwright could not create its browser-cache directory. An attempt to open the already-existing localhost preview through the browser tool was then rejected by browser approval review, which stated that permission had been declined. No workaround was attempted after that rejection. Consequently this report does not claim live browser checks of scrolling, sound playback, physical print output, or remote provider operation.

## Files touched

Application:

- `src/App.tsx`
- `src/styles.css`
- `src/components/Boot.tsx`
- `src/components/Checker.tsx`
- `src/components/GeminiGate.tsx`
- `src/components/Login.tsx`
- `src/components/Privacy.tsx`
- `src/components/ReportExport.tsx`
- `src/components/Results.tsx`
- `src/components/Write.tsx`
- `src/lib/api.ts`
- `src/lib/boot.ts`
- `src/lib/draft.ts`
- `src/lib/evaluation.ts`
- `src/lib/prefs.ts`
- `src/lib/report-detail.ts` (new)
- `src/lib/study.ts`
- `src/lib/types.ts`

Shared/server/build helpers:

- `functions/api/[[path]].ts`
- `server/index.js`
- `shared/free.js`
- `shared/free.d.ts`
- `shared/index.d.ts`
- `shared/prompt.js`
- `shared/prompt.d.ts`
- `shared/validate.js`
- `scripts/dev.js`
- `scripts/compact-token-audit.js` (new)

Regression tests:

- `tests/boot.test.ts`
- `tests/boot-prefs.test.ts`
- `tests/first-visit.test.ts` (new)
- `tests/free-capacity.test.ts`
- `tests/parity-logic.test.ts`
- `tests/server-fixture.test.js`

Delivery notes and generated output:

- `SMOOTH_FIRST_VISIT_IMPLEMENTATION.md` (this file, new)
- `dist/index.html` and fingerprinted `dist/assets/*` regenerated by the required production build.

`package.json`, `package-lock.json`, provider selection order, provider queues, quota constants, calibration rules, and model-download behavior were not changed. There was no Git metadata in this workspace, so the file inventory is based on the edits made in this session rather than a Git diff.

## Scale-and-launch follow-up (30 October 2026)

The earlier implementation/verification inventory above is historical. The scale-and-launch work preserves this first-visit behavior and adds a typed Academic Task 1 chart reference, automatic vision-to-text reading, an explicitly hidden closed toolbox dialog, D1 allowances, aggregate stats/About pages and search metadata. The pool is now Groq → Workers AI → OpenRouter free → optional Mistral with a three-call budget; Gemini remains own-key/explicit-only. Current checks and file inventory are recorded in [SCALE_AND_LAUNCH_IMPLEMENTATION.md](SCALE_AND_LAUNCH_IMPLEMENTATION.md), and current deployment instructions replace the old Gemini/KV setup in [DEPLOY_CLOUDFLARE.md](DEPLOY_CLOUDFLARE.md).
