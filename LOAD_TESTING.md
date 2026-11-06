# BAND.EXE concurrency verification

Run `npm test`. `tests/cloudflare-load.test.ts` invokes the production Pages handler, real validators, open marking pipeline, repair, reviewer and scorer with mocked provider HTTP/Workers AI. `tests/fake-d1.ts` models D1's single-statement conditional UPSERT and is shared between independently imported handler instances. No network, secrets, new packages or paid service is needed.

## Current workloads and guarantees

- 50, 100 and 200 students each mark and chat concurrently (100/200/400 operations), with provider latency from 500ms to 40 seconds. Coach, Ideas and feedback chat are exercised; study models appear in failure and allowance workloads.
- Fifty concurrent students face 429/Retry-After, 503, never-resolving HTTP, stalled response bodies, malformed envelopes/reports, or pool exhaustion partway through the batch. Every operation settles exactly once within the existing 165-second browser envelope. Errors have a code/message and no fabricated report.
- Unique student/operation markers prove report summaries, paragraph quotes, corrections and helper replies remain attached to their own operation. The real reviewer rejects a deliberately fabricated foreign correction.
- At most **three** upstream attempts per logical request, shared by capacity rotation, vision, retries and one report repair. Groq rotates models on 429, then Workers AI is reached when budget permits. Groq → Workers AI → OpenRouter free → optional Mistral order, missing-binding skips, provider-specific JSON schema envelopes and the cheap Workers fallback are covered by focused provider tests. One repair moves to the next model/provider rather than returning to a failed one. A three-call budget can end before every configured fallback is reached.
- Individual HTTP/body and Workers calls are bounded at **45 seconds**, preserving successful 40-second replies. The pool retains its **145-second** total deadline and 20-second shared queue/backoff budget. Late results are ignored; Workers computation may continue upstream because bindings offer no cancellation API.
- Legacy Mistral-only overload tests retain start spacing of at least one second, four in-flight calls, 24 waiters, bounded FIFO admission, queue expiry and clear `busy` results. Short numeric/HTTP-date Retry-After retries have 50–250ms jitter and spend the same three-call budget.
- Fifty students each issue 12 marks and 51 shared helper/model requests simultaneously (**3,150 requests per workload**). Exactly **10 marks and 40 helper/model calls** per person are admitted through D1. Both normal and permanently stale **cache KV** reads are exercised. KV receives only successful reviewed report cache entries; it is never used for daily reservations.
- The former cross-isolate allowance race is now a regression check: two independently imported handlers sharing D1 admit only ten total marks for one daily identity. `tests/scale-launch.test.ts` also runs 100 concurrent direct reservations against the same conditional UPSERT fake. The migration and conditional UPSERT were additionally executed with SQLite: exactly ten of twelve reservations returned rows.
- Reservations precede provider calls; provider failures still spend their reservation. The tenth/fortieth admitted request reports zero remaining and succeeds; later requests fail without upstream work. UTC rollover, helper/mark separation, exhausted-cache-hit behavior and tester bypass are covered. Missing/broken/timed-out D1 refuses new provider work with a calm 503 response, including signed-in reservations; validated testers may continue.
- Fifty duplicate retries of two students' operations coalesce to two provider calls/two reservations. Completed success replay, non-2xx eviction, changed-input conflicts, separate identity scopes and tester bypass are retained.
- Existing browser transport tests preserve the one transient network retry with the same ID/body, no automatic retry for HTTP/abort/malformed JSON, synchronous locks, 20-second still-working notice and reduced-motion behavior.

## Launch additions

`tests/scale-launch.test.ts` covers:

- Strict compact/full report schemas, provider request envelopes, object-shaped Workers responses, next-model repair and no fabricated scores.
- Workers/Groq vision requests, factual image-to-text references, no image bytes reaching text-only marking, shared vision/mark budget, unavailable/slow vision, report notice and typed chart descriptions. Typed references affect cache identity and study examples.
- Atomic D1 reservations, daily reset, cleanup of old allowance identities, absent/broken/stalled storage and parameterized aggregate UPSERTs.
- `/api/hit` ignores arbitrary input/headers/cookies; public stats store only name/day/count and expose zero-filled daily aggregates. Fresh successful marks count once; cache hits/helpers/Full detail/failures do not. Stats cache expires after five minutes. Session dedupe sends JSON boolean events and the CSRF header, with no ID or cookies and handles storage/network failures.
- About/Stats hash routes, contributor placeholder, accuracy wording, typed-chart UI, and the closed toolbox's explicit `hidden` state with the existing `[hidden]` CSS rule.
- Crawlable root-only sitemap, robots, canonical/Open Graph/Twitter metadata, free WebApplication JSON-LD, configurable verification/origin, favicon assets and the exact 1200×630 PNG dimensions.

The previous first-visit, compact/full-detail, calibrated Gemini, own-key gates, tester pass, exports, history, spider, correction and motion suites remain part of the full run. Legacy KV quota helper tests remain as historical helper coverage; production allowance calls now use D1.

## Production limits

D1 removes the stale-KV reservation race while storage is healthy. Missing salt/trusted IP/DB or a storage outage refuses new non-tester provider calls with 503. A timed-out write can still commit. Shared-IP users retain a shared allowance identity. Cleanup is traffic-driven, not a scheduled retention guarantee.

Idempotency remains isolate-local and best effort across restarts, other isolates or the two-minute replay TTL. It is bounded to eight entries per daily client address key and 512 entries globally; oldest-entry eviction permits admission without a global `busy` response. Only 2xx results are retained. Reviewed excerpts may remain in this short-lived memory cache until pruning/isolate retirement. D1 coordinates allowance only; it does not make replay durable. Separate optional KV caching retains reviewed complete reports for 24 hours under content hashes. Cross-isolate cache misses can still spend multiple calls.

Public visits are browser tab sessions, not verified people. Daily visitors are approximated by those sessions; no tracking ID is stored server-side. The public hit endpoint caps visits/impact work at 20 events per IPv4 address or IPv6 /64 per UTC day, with a separate three-event first/student cap. Missing/failed reservations skip metrics writes. Distributed addresses can still inflate approximate totals. They are not billing or audit records. Public aggregate history contains no personal data and is retained.

Provider availability, quotas, model permissions, vision license setup and marking accuracy need an owner smoke check after deploy. Mistral pacing is isolate-local; its upstream limit remains shared across isolates. No purchase, account upgrade, model download, Free age question or new package is introduced. No validated accuracy percentage is claimed for uncalibrated open models.

## Verification

- `npm test`: **603 tests passed in 48 files**.
- `npm run build`: TypeScript + Vite passed; existing non-blocking >500kB bundle advisory remains.
- `WRANGLER_SEND_METRICS=false WRANGLER_LOG_PATH=/tmp/cf-fn-check11-wrangler.log npx wrangler pages functions build --outdir /tmp/cf-fn-check11`: compiled successfully. The log-path override keeps Wrangler logs in the writable sandbox.
- No remote deployment, database creation/migration or real-provider marking request was made.
- Live 390px/reduced-motion browser validation remains blocked by the environment: `npm run dev:fixture` fails with `listen EPERM` on 127.0.0.1:8787; Playwright cannot create its browser-cache directory (`EPERM`). Markup/layout contracts and the closed-dialog state are verified by tests, but these are not a live visual pass.

Provider/API references and exact owner deployment commands are in [DEPLOY_CLOUDFLARE.md](DEPLOY_CLOUDFLARE.md).
