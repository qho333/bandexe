# Fix and animate implementation

Part A was completed and passed tests, the production build and the Pages Functions build before Part B began.
The baseline was 476 tests. Regression tests were added for each logic fix; existing provider, quota, no-download,
feedback-only, sound, boot, spider, mascot, calibration and export tests remain in the suite.

## Issues fixed

| Location | What was wrong and resulting behavior | Regression coverage |
| --- | --- | --- |
| `src/lib/allowance.ts:2` | The client defaulted to five checks despite the owner's ten-check limit. Defaults now come from `FREE_CONFIG.checksPerDay`. | `tests/fix-and-animate.test.ts`: owner daily limit |
| `src/lib/study.ts:36`, `shared/free.js:120`, `functions/api/[[path]].ts:61`, `server/index.js:82` | Model answers were a dead end on the default checker: they required confirmed Gemini and a server Gemini key. Free models now use the existing free pool without a Gemini gate. Explicit own-key models stay direct and gated; caches distinguish checker modes, report the real provider, and carry the tester pass on site calls. The local fixture works without age confirmation. | Free model client, Pages GB route, own-key routing/gating/cache tests; `tests/server-fixture.test.js` |
| `functions/api/[[path]].ts:72`, `src/lib/study.ts:39` | Study examples consumed marking quota, and study response counts could overwrite the check counter with helper counts. Models now use the helper limiter and allowance, and do not overwrite the mark allowance. | Pages helper-key/count and unchanged mark-counter assertions |
| `src/App.tsx:140`, `src/App.tsx:176`, `src/lib/submission.ts:4` | Retry marked the current edited draft and chart under the earlier request authorization. It now retains the submitted task, essay, question, chart and language. | Snapshot regression |
| `src/lib/corrections.ts:5`, `src/components/Results.tsx:294` | Rejecting an accepted fix searched for its replacement anywhere in the draft, potentially changing an earlier correct phrase. Bulk review could also apply overlapping suggestions to unrelated occurrences. Review now reconstructs accepted changes at the submitted spans, is idempotent, and refuses unsafe changes after manual edits. | Repeated replacement, accept/reject round trip, bulk overlap, repeated accept and manual-edit regressions |
| `src/components/Write.tsx:47`, `src/lib/exam-clock.ts:2` | The exam timer counted interval callbacks, losing elapsed time in throttled tabs. It now measures wall time and excludes pauses, including fractional seconds. | Clock catch-up and pause regression |
| `src/lib/exam-clock.ts:12`, `src/components/Write.tsx:84` | Count-up stopped at the countdown preset and could disable Start or lock the editor. Expiry now applies only to countdown. | Count-up versus countdown expiry regression |
| `src/lib/draft.ts:4` | A stored draft could have a valid essay/task but no string question, crashing rendering or validation. Draft loading repairs the question and discards malformed optional values. | Missing/null/non-string question regressions |
| `src/lib/history.ts:33` | Parsed but malformed history rows could crash Overview; legacy feedback-only rows could retain score fields. Rows are validated independently, good rows survive, and feedback-only scores/ranges are removed. | Mixed damaged/valid history and legacy score regression |
| `src/components/Results.tsx:616` | The ruler dereferenced a missing range when an overall existed. It now renders safely and says the range is unavailable. | Report rendering with overall and null range |
| `src/lib/dialog-focus.ts:2`, `src/components/Write.tsx:87` | Toolbox did not move or contain focus and could remain logically open after navigation. It now focuses Close, wraps Tab/Shift+Tab, closes on Escape/navigation, restores focus and makes the closed drawer inert. | Keyboard containment, Escape, restoration and listener cleanup regression |
| `src/components/Write.tsx:79`, `src/lib/debounce.ts:2` | The delayed save-status callback survived unmount. New edits replace pending work; unmount cancels it. | Replaced and cancelled save-status regression |
| `README.md:18`, `DEPLOY_CLOUDFLARE.md:35`, `src/lib/gemini.ts:7`, `src/components/Privacy.tsx:19` | Current documentation and optional Gemini messages advertised retired device setup, five-check/30-helper allowances, unavailable export choices or obsolete uncalibrated Gemini copy. Updated to the current student paths, ten-check/40-helper config and Free study models. Historical briefs are preserved. | Existing checker/eligibility/privacy tests, source review |

## Animations added

- 250 ms outgoing-screen collapse, incoming draw and short monochrome flicker for navigation. The outgoing screen is inert; navigation and focus do not depend on animation completion.
- Viewport-triggered corner border traces, stable-layout typed headers and a single faint hover edge sweep. Late reports are discovered without scanning on every counter frame.
- Editor focus pulse, transform-based smooth word-count fill, minimum-reached chip, changing timer digits and a running-only warning pulse in the last five minutes.
- Criterion slides/staggers, overall and criterion counters, subskill bar growth, marked-text reveals, priority ticks and a study-model panel unroll.
- Overview chart and sparkline draws, range fades, a bounded wave through the practice squares and recurring-difficulty row entrances. Changing task replays the relevant reveals; direct visits wait for the intro to end.
- Polite terminal toasts above the actual dock/action-bar geometry for Copied, Correction accepted/rejected, Saved and actionable failure messages. Copy report is available beside print. No download controls or fake download confirmations were added.
- Animated processing ellipses for chat and model answers. Existing button press/audio effects are preserved.

New effects use theme tokens, transform/opacity (plus the requested SVG stroke draws and numeric text counters),
with individual sequences at or below 400 ms. They use no per-frame React state. Both reduced-motion preferences
bypass them, CSS and owned GSAP timelines pause with tab visibility, and contexts, observers, listeners, glyphs,
decorative nodes and toast timers are cleaned up. Mono remains monochrome. No packages were added.

## Verification

- `npm test`: 43 test files, 494 tests passed.
- `npm run build`: TypeScript and Vite pass. Vite retains the advisory about a main bundle over 500 kB.
- `WRANGLER_SEND_METRICS=false WRANGLER_LOG_PATH=/tmp/cf-fn-check6-wrangler.log npx wrangler pages functions build --outdir /tmp/cf-fn-check6`: passes.
- Production assets retain lazy Nano/feedback adapters and contain no WebLLM/worker/tier-loader chunk.
- No student download controls, age gate on the Free checker, payment path, new package or palette change was introduced.
- Static responsive review covered the existing 360/390/768/1280 breakpoints and bounded the added toast/chip controls to the viewport. Existing phone geometry tests pass. A live rendered viewport, browser console and animation review could not run: the shell sandbox blocks listening on local ports, and automatic browser approval rejected localhost access because permission was denied. This is not a claimed visual browser pass or live provider smoke test.

## Files touched

App entry/styles:

- `src/App.tsx`
- `src/main.tsx`
- `src/motion.css` (new)

Components:

- `src/components/Checker.tsx`
- `src/components/Overview.tsx`
- `src/components/Privacy.tsx`
- `src/components/ReportExport.tsx`
- `src/components/Results.tsx`
- `src/components/StudyTools.tsx`
- `src/components/Toast.tsx` (new)
- `src/components/Write.tsx`

Client logic:

- `src/lib/allowance.ts`
- `src/lib/corrections.ts` (new)
- `src/lib/debounce.ts` (new)
- `src/lib/dialog-focus.ts` (new)
- `src/lib/draft.ts` (new)
- `src/lib/exam-clock.ts` (new)
- `src/lib/gemini.ts`
- `src/lib/history.ts`
- `src/lib/motion.ts` (new)
- `src/lib/study.ts`
- `src/lib/submission.ts` (new)
- `src/lib/toast.ts` (new)

Backend/shared:

- `functions/api/[[path]].ts`
- `server/index.js`
- `shared/free.js`
- `shared/free.d.ts`

Tests:

- `tests/fix-and-animate.test.ts` (new)
- `tests/terminal-motion.test.ts` (new)
- `tests/free-pool.test.ts`
- `tests/parity-logic.test.ts`
- `tests/server-fixture.test.js`

Documentation:

- `README.md`
- `DEPLOY_CLOUDFLARE.md`
- `FIX_AND_ANIMATE_IMPLEMENTATION.md` (new; this report)

Generated: `dist/index.html`, `dist/assets/*`; compiled Pages output is at `/tmp/cf-fn-check6/index.js`.
