# BAND.EXE cleanup

1. Removed all model setup, consent, progress and download controls, fallback offers, and related copy from the student UI, including shared error messages. Removed report file-download buttons; printing remains. WebLLM code is retained but has no path from the UI and produces no production runtime chunk. Chrome feedback is attempted only after the free cloud pool is empty, the daily limit is reached, or the connection fails. Both the initial probe and the actual session-creation boundary require `available`. Chrome output is feedback only, with band values stripped; sessions are disposed after success or failure.
2. Migrated saved `device`, `site`, missing and unknown checker choices to `free`. Saved `own` survives loading only with a nonblank key. The picker has Free checker and Your own Gemini key (18+) under More options. Regression tests seed old modes, completed-model flags and engine overrides, execute evaluation, verify the free endpoint, and render the report. Saved keys never enter free requests. Checker/key changes still invalidate stale evaluations.
3. Restored a 64px desktop / 54px phone dock, plus the platform safe-area inset. The transparent play layer is absolutely positioned with pointer events disabled except on mascot buttons; the floor control stays inside the dock. Replaced persistent hints with a one-time, dismissible tooltip and shortened the label to Draft art. Panels open immediately. Dragging preserves a climber's current position; settling preserves spatial order after leapfrog. Tests cover mouse/touch clicks and drags, gutter capture, narrow lanes, frame continuity, resize, sleep, cheer and lifecycle cleanup.
4. Centered the word-count target label and gave it intrinsic width and `white-space: nowrap`, preventing vertical 2/5/0 wrapping. New styling uses existing theme tokens; the Mono palette is unchanged. No packages were added.

## Verification

- `npm test`: 38 test files, 409 tests passed.
- `npm run build`: passed, including TypeScript. Vite still reports its advisory about a main chunk larger than 500 kB.
- `npx wrangler pages functions build --outdir /tmp/cf-fn-check3`: passed. A repeat with Wrangler's log path directed to `/tmp` also passed without the sandbox log-write warning.
- Production assets contain no WebLLM, worker, device-runtime or tier-loader chunks.
- No component contains download or unlimited copy.
- Live visual QA, including a rendered 390px viewport, could not run: the shell sandbox blocks listening on local ports, and browser policy blocks local-file previews. Geometry and interaction regressions cover the 390px dock's lane and smaller widths; this is not a claimed visual browser pass.

## Files touched

Application and styles:

- `src/App.tsx`
- `src/app.css`
- `src/mascots.css`
- `src/styles.css`

Components:

- `src/components/Boot.tsx`
- `src/components/Checker.tsx`
- `src/components/GeminiGate.tsx`
- `src/components/Header.tsx`
- `src/components/Mascots.tsx`
- `src/components/Privacy.tsx`
- `src/components/ReportExport.tsx`
- `src/components/Results.tsx`
- `src/components/Write.tsx`

Client logic:

- `src/lib/api.ts`
- `src/lib/checker.ts`
- `src/lib/chrome-feedback.ts` (new)
- `src/lib/evaluation.ts`
- `src/lib/gemini.ts`
- `src/lib/mascot-play.ts`
- `src/lib/mascot-stage.ts`
- `src/lib/nano.ts`
- `src/lib/study.ts`

Shared messages:

- `shared/eligibility.js`
- `shared/free.js`

Tests:

- `tests/checker-ui.test.js`
- `tests/checker.test.ts`
- `tests/device.test.ts`
- `tests/evaluation.test.ts`
- `tests/free-client.test.ts`
- `tests/gemini-gate.test.js`
- `tests/launch-pieces.test.ts`
- `tests/mascot-play.test.ts`
- `tests/mascot-stage.test.ts`
- `tests/own-key.test.js`
- `tests/parity-logic.test.ts`
- `tests/tiers.test.ts`

Review notes: `CLEANUP_NOTES.md` (this file).

The builds regenerated `dist/` and wrote the compiled Pages function to `/tmp/cf-fn-check3/index.js`.
