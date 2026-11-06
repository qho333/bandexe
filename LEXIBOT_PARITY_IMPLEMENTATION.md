# Lexibot parity implementation

The later owner decisions take precedence: free-only service, Free checker as the zero-setup default,
and feedback only for **every** device engine. No dependency was added.

## 0. Sound

Sound stays on for both new and returning visitors unless explicitly disabled. Pointer interaction
anywhere on the intro resumes audio without skipping; the existing key/Skip behavior and full intro
remain. Active audio contexts also resume from page-wide pointer/key gestures and remove listeners
when stopped. Reduced-motion and sound preferences are retained.

Files: `src/components/Boot.tsx`, `src/lib/prefs.ts`, `src/lib/sound.ts`.

## 1. Model answer

On-demand, clearly labelled study examples keep the submitted task, position and main ideas. The
copied research prompt is generated alongside existing prompts, with English/plain-paragraph output
and task-specific word ranges. Eligible, confirmed Gemini comes first, then ready Qwen3-4B; no model
is downloaded. Qwen is skipped when only a chart image is available. Desktop comparison columns
stack on phones. An essay/question/task/chart hash caches successful and in-flight requests in memory;
failed requests can retry. Reports and scores are never replaced. The local Node server has a labelled
fixture study route as well as its existing marking/helper behavior.

Files: `server/prompts/band9_rewrite.md`, `scripts/generate-prompts.js`,
`shared/prompts.generated.js`, `shared/prompts.generated.d.ts`, `shared/study.js`, `shared/study.d.ts`,
`src/lib/study.ts`, `src/components/StudyTools.tsx`, `src/components/Results.tsx`, `src/App.tsx`,
`server/index.js`.

## 2. Feedback chat

Essay/report-scoped questions send only the reviewed summary, submitted essay/question, recent chat
and practice-theme summary. Prompts require explanations and nudges and point full-essay requests to
the model-answer button. Already-ready Nano precedes Qwen3-4B; cloud uses the selected helper route.
The owner's free default also applies here: free/device selections use the free cloud helper after
local engines; explicit Gemini retains its gates. The answering engine is shown. Ten messages are
kept in page memory, Clear chat invalidates late replies, and feedback-only replies have numeric band
claims removed. Cloud requests use the helper allowance.

Files: `shared/helper.js`, `shared/helper.d.ts`, `src/lib/helper.ts`, `src/lib/study.ts`,
`src/lib/device.ts`, `src/lib/device.runtime.ts`, `src/lib/nano.ts`, `src/components/StudyTools.tsx`.

## 3. Word export

A real browser-built .docx uses a UTF-8 store-only ZIP writer with CRC-32 and Office Open XML document,
relationship and style parts. It exports the same reviewed report content and correction notation as
Markdown/text, including review states and honest labels, and omits assessed bands for feedback-only
results. Independent Python ZIP/XML readers verify the archive and XML in tests.

Files: `src/lib/zip.ts`, `src/lib/docx.ts`, `src/lib/report-export.ts`, `src/components/ReportExport.tsx`.

## 4. Feedback language

All eleven languages appear in Check and Display. Allowlisted instructions reach free providers,
Gemini, device marking and tutors. Quotes, corrections and model answers remain English. Arabic
explanations, comments, priorities and chat use RTL direction. The selected language persists with
preferences and is recorded on each report.

Files: `shared/language.js`, `shared/language.d.ts`, `shared/prompt.js`, `shared/prompt.d.ts`,
`shared/validate.js`, `shared/mark.js`, `shared/helper.js`, `shared/index.d.ts`, `src/lib/types.ts`,
`src/lib/prefs.ts`, `src/lib/device-report.ts`, `src/lib/helper.ts`, `src/components/Write.tsx`,
`src/components/Header.tsx`, `src/components/Mascots.tsx`, `src/components/Results.tsx`.

## 5. Since last time

A conservative comparison uses up to four earlier checks of the same task, correction themes and
recurring priorities. It shows themes no longer flagged and those still recurring, with counts.
Existing history remains readable; new entries retain theme labels, never essays. Coach and feedback
chat receive a short recurring-theme summary. History never enters the marking request or band math.

Files: `src/lib/progress.ts`, `src/lib/history.ts`, `src/components/Mascots.tsx`,
`src/components/Results.tsx`, `src/App.tsx`.

## 6. Zero-setup free checker

New visits open Write with Free checker selected. Free API requests bypass Gemini's age/region gates
and ignore saved own keys. The optional OpenRouter free pool precedes the Workers AI binding; model
IDs and limits are centralized. A brief per-minute retry, provider fallback and JSON repair share at
most three upstream calls. The reviewer and code-computed overall are reused without Gemini's shift;
versions record the actual model and labels say open model/uncalibrated. Optional salted daily KV
counts return the remaining allowance, with separate helper counts. Capacity errors offer the reset
message/Unlimited mode, and ready device fallback never gives a band. Existing explicit checker
choices persist; blocked Gemini choices return to Free checker. Local Node/fixture marking remains
the local development fallback.

Files: `functions/api/[[path]].ts`, `wrangler.toml`, `shared/free.js`, `shared/free.d.ts`,
`src/lib/allowance.ts`, `src/lib/api.ts`, `src/lib/checker.ts`, `src/lib/gemini.ts`,
`src/lib/routes.ts`, `src/lib/report.ts`, `src/components/Checker.tsx`, `src/components/GeminiGate.tsx`,
`src/components/Write.tsx`, `src/components/Privacy.tsx`, `src/App.tsx`.

## Shared styling, documentation and verification

New UI uses existing theme tokens and Mono defaults, with stacking and wrapping rules for narrow
screens. No new animation is required; existing reduced-motion behavior remains. Report anchors are
recognized by the hash router. Device band-validation constants remain false; even the runtime's
default prompt is feedback-only.

Additional changed files: `src/styles.css`, `DEPLOY_CLOUDFLARE.md`, `README.md`, `OWN_CHECKER.md`.

New tests: `tests/free-pool.test.ts`, `tests/free-client.test.ts`, `tests/parity-logic.test.ts`,
`tests/docx.test.js`.

Updated tests: `tests/boot-prefs.test.ts`, `tests/boot-sound.test.ts`, `tests/checker.test.ts`,
`tests/checker-ui.test.js`, `tests/cloudflare.test.ts`, `tests/gemini-gate.test.js`,
`tests/helper.test.js`, `tests/tiers.test.ts`, `tests/launch-pieces.test.ts`, `tests/report.test.ts`.

Offline checks: `npm test` (384 tests), `npm run build`, and
`npx wrangler pages functions build --outdir /tmp/cf-fn-check2`. Upstream calls are mocked in tests.
The production build emits the existing large-library/chunk-size advisory; it succeeds.

## Not performed / practical limits

- No deployment, provider calls, account changes, model download or open-model calibration was performed.
  Provider availability and actual chart-image support need a live smoke test after deployment.
- A 390px browser smoke test could not run: the sandbox denies localhost listening (`EPERM`) and
  Playwright's browser-cache creation. Responsive CSS and render tests are present; actual browser
  layout, audio autoplay behavior and device inference are not newly verified in this environment.
- The owner must provision optional secrets/KV and deploy with the free Cloudflare account. Without
  optional KV/salt, counts are unknown as specified. KV personal limits are approximate under concurrent
  requests because KV is eventually consistent; no durable-object dependency was introduced.
- Local history themes are deliberately conservative. Absence of a flag does not prove mastery;
  unrecognized or differently translated themes may not be grouped.
