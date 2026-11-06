# BAND.EXE app (Phase 1)

Free IELTS Writing practice: write under exam timing, get an AI practice estimate with reviewed corrections, keep per-task results in the browser. Visual design is the approved `../mockups/` (tokens, five themes, components and copy reused).

## Run

```sh
cd app
npm install
npm run dev          # reads the Gemini key from Keychain, starts API (127.0.0.1:8787) + Vite (http://localhost:5180)
npm run dev:fixture  # same UI, site API replays a labelled fixture (no site quota used)
npm test             # vitest: marking, review, own-key routing, persistence, fallback, history and UI helpers
npm run build        # tsc + vite build into dist/
```

Key: `security add-generic-password -U -a "$USER" -s gemini-api-key -w`. `scripts/dev.js` reads it once with `security find-generic-password -s gemini-api-key -w`, passes it only to the API process (as `GEMINI_API_KEY`), never to Vite, never logs it. A key in the environment also works. Launch configs `app` and `app-fixture` are in `../.claude/launch.json`. Node 22+.

## Choose a checker

New visitors open the writing workspace with **Free checker** selected. The default cloud pool
tries Mistral's free Experiment plan, optional OpenRouter free models, then Cloudflare Workers AI.
No age prompt, key or model download is needed. Pages checks require D1 and QUOTA_SALT and have a 10/IPv4-address-or-IPv6-/64/UTC-day allowance; helpers and study examples share a separate 40/day allowance. Optional Google sign-in raises these account limits to 15 checks and 60 helpers per UTC day and syncs summary-only progress. See DEPLOY_CLOUDFLARE.md for setup.
New cloud operations pause with a retry message if allowance storage is unavailable; tester requests may continue. Cached reports use no provider calls or allowance. Everything stays free: no billing, purchases or paid upgrades.
See [DEPLOY_CLOUDFLARE.md](DEPLOY_CLOUDFLARE.md) for configuration and limits.

The only optional checker is **Your own Gemini key (18+)**, under More options. It keeps its
age confirmation and EU/EEA/CH/UK restrictions. Free checking and helpers are open to everyone.
After pool exhaustion or a network failure, an already-available Chrome built-in model may give
feedback only. It never requests a model installation. There are no student model-download controls.
Legacy WebLLM adapters remain unreachable from the student UI and outside the production bundle.
All device engines are feedback-only: no bands, range, criterion bands, celebration or chart points.

For your own quota, open [Google AI Studio](https://aistudio.google.com/apikey), sign in, choose Create API key, and save it in the Write page's password field. Use only its free allowance. The key is stored only in this browser; anyone using this browser profile can use it. Remove it on shared computers. If storage is blocked, it is kept only for the current page session. Test key makes one small Flash-Lite request and displays Google's error if rejected.

Own-key marking and helpers in a chosen Gemini mode go directly to Google using the `x-goog-api-key` header. The student's key never goes to `/api`, URLs or logs. Own-key marking uses the same Gemini model, prompts, repair, review and scoring as Site checker. Google's free quota still applies. Reports and saved history record the checker used. The server key remains in its environment; it is separate from browser keys.

Scan scenarios in fixture mode: put `[fixture:NAME]` and/or `[delay:SECONDS]` anywhere in the essay (or set `MARK_FIXTURE_NAME` / `MARK_FIXTURE_DELAY`). Names: `sample` (default), `clean` (no issues), `one`, `many` (36 issues quoted from your own essay: first/last word, long wrapping phrase, adjacent, overlapping, repeated), `quota`, `offline`, `unreadable`, `limit`. See `server/lib/fixture.js`. Fixture mode applies to the site API only. A saved student key still makes real Google requests for own-key marking, helpers and Test key.

Reports include on-demand Free study models, essay-scoped feedback chat (ten messages in page memory),
print export, eleven feedback languages, and a local "Since last time" comparison of recurring themes.
There are no report download buttons. Quotes and replacements stay English; history never changes a band.
Study models are labelled as examples, never the student's own writing or a guaranteed score.

## Structure

```
server/index.js            Local HTTP server: mark, helper, model-answer, health; logs method, status, task/role and counts only
shared/                   isomorphic free pool / Gemini marking, study & helper prompts, languages, validation, review and scoring
shared/prompts.generated.js generated from server/prompts/*.md by dev, build and test
server/lib/helper.js       shared helper exports, server-only per-session limiter and fixture replies
server/lib/validate.js     input checks (task, question, 50-1200 words, PNG/JPG chart <= 4 MB for Academic T1)
server/lib/prompt.js       prompt_v2 method + Task 1 addendum (+ chart / GT notes) + prompt_report_v1
server/lib/mark.js         Gemini call (gemini-3.6-flash, temperature 0, JSON), one repair retry, honest errors
server/lib/review.js       reviewer: exact-substring originals, fix differs, valid criterion, whole bands 1-9
server/lib/score.js        overall = mean of 4 bands rounded DOWN to the half band; range +/-1
server/prompts/            copies of research-data/marker/{prompt_v2,task1_addendum_v2,prompt_report_v1}.md
server/fixtures/           sample-report.fixture.json, clean.fixture.json (hand-written, prompt_report_v1 shape, NOT a real marking)
server/lib/fixture.js      fixture-mode only: picks the fixture and reply delay per request
src/App.tsx                screens (hash routes), draft, job state, history, Lenis on Results/Overview only
src/components/            Boot, Login, Header (Display menu), Write (+Toolbox), Results, Celebrate, Overview, Mascots
src/lib/                   spider (scan creature), scan (issue matching + report gate), helper (Datamuse + /api/helper), history, prefs, fixes, api, types
src/lib/device*.ts         consent/state controller, pure report adapter, lazy WebLLM runtime and module worker
tests/                     vitest unit tests
```

## Real vs placeholder

Real:
- Task 2, GT Task 1 letter, Academic Task 1 with chart upload (preview, sent as base64, forwarded to Gemini as inlineData so data accuracy can be checked). Minimums 250/150/150, timer presets 40/20/20.
- Gemini marking + code reviewer + overall in code, labelled "AI practice estimate (provisional calibration)". A criterion that is still invalid after one repair retry is withheld (shown as "–"), and then no overall is shown. Never 0.
- 429 shows "Free daily AI quota reached; try again later. No score was produced."; 5xx/network shows an honest unavailable message. No invented scores.
- Results: overall decrypt (GSAP), ruler with range, criterion tiles with summaries and sub-skill bars, grammar corrections and word-choice upgrades with Accept/Reject (and Accept all/Reject all) that edit the draft, per-paragraph comments + How to rewrite, structure advice, strengths, top 3. Scanning spider (capsule body, 8 two-segment legs with amber knee/foot dots) scurries over the essay while the request is in flight, planting its feet on words; a foot or front-leg tap on a reviewed issue marks it (magenta box = grammar, yellow highlighter = word choice, criterion tag). The report opens only after every issue is marked, the spider reaches the bottom and the result is ready ("Skip animation" link; reduced motion shows marks in order with no spider). The report starts with the whole essay marked in place, with popovers (problem, fix, reason, Accept/Reject).
- Personal-best celebration only when a new valid overall beats the previous best for the same task type. Fixture results are never saved or celebrated.
- Overview: per-task-type tabs, chart + table, latest priorities, empty state, Delete history. Stored in localStorage: results only (bands, overall, range, words, priorities), never essay text.
- Themes Mono (default) / Matrix / Amber / Cyan / Paper, effects (scanlines, glow, boot intro, running mascots, reduced motion) saved in localStorage.
- Mascots Coach, Synonyms, Ideas run on a bottom track (walk, run, turn, hop up the left gutter on wide screens, hover hop, click opens a panel); they pause while typing, slide away if the editor reaches under the track or a mobile keyboard opens, stop when the tab is hidden, and sit in a static dock with reduced motion or "Running mascots" off. Synonyms looks up Datamuse (free; "band 7+" tag for less common words; click replaces the selected word). Ideas and Coach use the saved student key directly with Google when available; otherwise they call POST /api/helper (gemini-3.1-flash-lite, own per-session limit; Ideas never writes the essay). Fixture mode shows labelled canned helper replies; real helper calls not verified yet. Fixture mode also adds "Load sample answer (fixture test)" on Write.

Placeholder / not yet:
- Optional Google sign-in uses the official Google button, WebCrypto verification and a 30-day signed session. Without GOOGLE_CLIENT_ID the Coming soon card and guest mode remain. Account menus include sign-out and confirmed account deletion.
- Range is +/-1 band because there is no Gemini calibration yet (measured within-1 agreement 88%, within-0.5 65% on the development set).
- Mascot art is draft (owner has not chosen a family).
- Chrome fallback is tested with mocked availability and generation; real-provider and hardware checks remain separate.
- Privacy & terms is implemented; real-provider checks and open-model calibration remain deployment follow-up work.

## Verification status (2026-10-25)

- `npm test` (23 tests) and `npm run build` pass. UI checked in the browser with the fixture: login, write, scan + drone + highlights, report, accept/reject editing the draft, overview chart and empty state, Paper theme, phone width.
- Real Gemini calls NOT verified: call 1 (Task 2) returned an upstream error (502 to the client, logged before upstream status logging was added); call 2 (GT letter) returned `429 RESOURCE_EXHAUSTED`. Both showed honest no-score messages. Run one real Task 2 and one GT check after the quota resets.
- Celebration overlay logic is unit-tested; the overlay itself was not seen with a real result.

## Next phase

1. Helper bots: Synonyms via Datamuse, Grammar via LanguageTool, Spell via Hunspell (typo-js); Ideas via Gemini Flash-Lite with its own limit.
2. Live Google OAuth smoke test after the owner configures GOOGLE_CLIENT_ID and applies migration 0003 (no Supabase or paid service).
3. Verify the already-available Chrome feedback fallback on supported hardware.
4. Extend official-script calibration with independent validation before narrowing the uncertainty range.
5. Reviewer meaning checks with Flash-Lite, per-student daily limits and a queue, privacy and terms pages.
