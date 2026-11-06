# Audit fixes implementation

Implemented the seven items in `AUDIT_FIXES.md` after reading both `audit/NEEDS-VALIDATION.md` and `audit/REPORT.md`. All references below are relative to `app/`.

## 1. Universal CSRF and JSON boundary

- `functions/api/[[path]].ts:209`: every POST/DELETE (also PUT/PATCH) requires `X-Requested-With: bandexe`. An Origin header, if present, must exactly equal the request URL's origin; otherwise the response is 403 `csrf`. These checks precede body reads, database work and replay lookup. Mutations with a non-JSON/missing Content-Type return 415 `content_type`; JSON charset parameters are accepted.
- `src/lib/cloud-request.ts:3`: consistently supplies the CSRF and JSON headers for marking, helpers, model answers and report detail. Their existing callers in `api.ts`, `helper.ts`, `study.ts` and `report-detail.ts` use this wrapper.
- `src/lib/auth.ts:12`: account/history mutations include both headers, including bodyless logout and account deletion.
- `src/lib/reviews.ts:27`, `src/lib/stats.ts:26`, `src/lib/stats.ts:44`: ratings, moderation and both hit event callers include both headers. Visits without a first-browser event now send `{}`.
- Rechecked all `fetch(`, injected `fetchFn(`, `cloudRequest(` and `accountRequest(` calls under `src/`. Gemini's `/api/health` and statistics reads are GET requests. External provider, Datamuse and LanguageTool requests are separate. No `sendBeacon` callers exist.
- Added regressions: `tests/audit-fixes.test.ts:31` covers all mutation routes anonymously, missing/wrong headers, different scheme/host/null Origin, JSON media types, same-origin acceptance, enforcement before replay, and the actual mutating client request headers.

## 2. IPv6 rotation

- `shared/client-address.ts:4`: one shared address helper validates/canonicalizes IPv6 and reduces it to its /64. Compressed and expanded representations share one identity; IPv4-mapped IPv6 resolves to the same IPv4 identity. Ordinary IPv4 addresses remain unchanged.
- `functions/api/[[path]].ts:47`, `functions/api/[[path]].ts:58`, `functions/api/[[path]].ts:209`: allowance, reviews, hit/impact, optional limiter and replay client keys all use normalized addresses before hashing/keying. Signed-in daily allowances continue to use account IDs.
- Added regressions: `tests/audit-fixes.test.ts:70` covers compressed/expanded/case variants, mapped IPv4, invalid addresses, actual /64 rotation against mark/review limits, distinct prefixes, and shared replay/limiter identities.

## 3. Fail-closed reservations

- `functions/api/[[path]].ts:189`: a missing, failed or timed-out reservation returns 503 `allowance_unavailable` with “Please try again shortly.” No provider runs. This applies to guests and signed-in accounts across all four provider routes. Validated testers retain their bypass. Existing successful report-cache hits still require no provider or reservation.
- `shared/storage.js:6`: corrected the allowance comment; a storage failure returns null, which provider admission now refuses. The existing three-second I/O timeout remains.
- `functions/api/[[path]].ts:118`: hit writes require successful admission. Review submissions also refuse unavailable reservation storage rather than bypassing their limit.
- Added regressions: `tests/audit-fixes.test.ts:100` covers missing/broken storage on each provider route, a never-resolving reservation, signed-in reservation failure and no provider calls. Existing tester bypass tests remain passing, including provider work without D1 configuration in `tests/tester.test.js`.

## 4. Replay cache exhaustion

- `shared/traffic.ts:66`: keeps at most eight retained entries per daily client address key across routes/credentials/IDs, evicting that client's oldest entry. The global 512-entry bound now evicts its oldest entry instead of returning a global 503.
- Only 2xx outcomes are retained for two minutes; non-2xx results and thrown/rejected operations are removed. Cleanup checks entry identity so completion of an evicted request cannot remove its replacement. Concurrent duplicates still share their pending response while retained.
- `functions/api/[[path]].ts:249`: supplies a separate salted daily normalized client digest for the per-client bound; adding accounts, tester credentials or routes does not create extra client slots.
- Added regressions: `tests/audit-fixes.test.ts:148` exercises 520 requests from one client, oldest-slot eviction, another client's admission, non-2xx removal, successful replay expiry and admission beyond global capacity. Existing load tests retain simultaneous duplicate coalescing and input-conflict coverage.

## 5. One body parse and smaller caps

- `functions/api/[[path]].ts:21`: the default streaming byte cap is 64 KB; existing tighter limits remain 32 KB for Google credentials and 4 KB for history. Declared lengths and actual streamed bytes are bounded, and overflowing streams are cancelled.
- `functions/api/[[path]].ts:228`: only `/api/mark` gets the existing 7 MB image envelope while streaming. A body above 64 KB must contain an Academic Task 1 chart image; other mark bodies are refused. All other routes, including model answers and report detail, use the smaller cap.
- `functions/api/[[path]].ts:66`, `functions/api/[[path]].ts:253`: passes the parsed object directly into `handle`; replay fingerprints the original bytes. Removed request cloning and JSON stringify/parse round-trips. Provider eligibility still runs before consuming the body. Getter-only Workers `Request.cf` remains supported.
- Added regressions: `tests/audit-fixes.test.ts:176` checks a single parse with/without replay, raw-byte fingerprint conflicts, streamed overflow/cancellation without Content-Length, oversized text-only marks and accepted chart-bearing marks. Existing declared-length and getter-only `cf` tests pass.

## 6. Bounded visits and D1 writes

- `functions/api/[[path]].ts:118`: `hitvisit` admits at most 20 hit events per IPv4 address or IPv6 /64 per UTC day. Visits only increment inside this gate. Browser/student impact retains its separate combined allowance of three and also requires successful admission.
- `functions/api/[[path]].ts:129`: allowance pruning runs only on the first admitted hit per daily client key. Exhausted or unavailable reservations cannot trigger counters, impact or pruning writes. Exhausted conditional UPSERTs do not change rows.
- Added regressions: `tests/audit-fixes.test.ts:123` sends 50 hits through rotating addresses in one /64, verifies visits stop at 20 and impact at three, checks a single cleanup, and uses SQLite `total_changes()` to prove a later exhausted hit makes no database changes. It also verifies another /64 and UTC rollover. `tests/audit-fixes.test.ts:141` covers storage failure without downstream writes.

## 7. Logout and deletion session revocation

- `migrations/0004_session_epoch.sql:1`: adds `users.session_epoch` with default zero and a minimal `session_revocations(uid, session_epoch, revoked_at)` table/index that survives account deletion.
- `shared/accounts.ts:28`: signed cookies carry an epoch. `readSession` rejects missing/invalid epochs, including genuine legacy signatures. `shared/accounts.ts:85` reuses the account-existence query to verify the current epoch.
- `functions/api/[[path]].ts:238`: resolves and verifies sessions before account access or replay lookup. Successful replies from a previous signed-in epoch cannot bypass logout/deletion through replay.
- `shared/accounts.ts:116`, `functions/api/[[path]].ts:91`: logout increments the stored epoch before clearing the cookie, invalidating all copied/current-device cookies while keeping account history.
- `shared/accounts.ts:122`: deletion transactionally records the next epoch and removes history/user rows. Re-signup reads that saved epoch (`shared/accounts.ts:88`), preventing revival even with immediate or repeated deletion/re-signup. Today's allowance records remain until normal pruning.
- `shared/accounts.ts:119`: deletion records become eligible for pruning after 31 days, longer than the 30-day cookie lifetime. Pruning is traffic-driven on later sign-ins; no scheduled retention job was added.
- `tests/sqlite-d1.ts:7`: the real SQLite harness applies migration 0004 along with the previous three migrations.
- Added regressions: `tests/audit-fixes.test.ts:202` covers copied cookies after logout, signed-in replay after revocation, account isolation, fresh sessions at the incremented epoch, immediate/repeated deletion/re-signup, 31-day retention/pruning and genuinely signed cookies lacking an epoch. Existing account/history tests continue to verify history retention on logout and deletion isolation.

## Privacy and documentation

- `src/components/Privacy.tsx:17`: deletion now accurately describes account/history removal, retained allowance records and the small deletion-revocation record. Describes logout ending current sessions and the epoch in cookies.
- `src/components/Privacy.tsx:26`: describes normalized IP identities, fail-closed cloud checks and bounded visits.
- `src/components/AccountChip.tsx:52`: corrected the deletion confirmation. Updated its matching key/value in all 11 catalogues: `src/i18n/en.ts:8`; `ar.ts:10`, `es.ts:10`, `hi.ts:10`, `id.ts:10`, `ja.ts:10`, `ko.ts:10`, `pt.ts:10`, `th.ts:10`, `vi.ts:10`, `zh.ts:10`.
- Updated the relevant operational descriptions in `README.md`, `DEPLOY_CLOUDFLARE.md` and `LOAD_TESTING.md` so they no longer promise fail-open quotas, unbounded visits, error replay or deletion of today's allowance rows.

## Existing test adjustments

No existing tests were removed. Handler fixtures now supply the required CSRF header and healthy allowance storage where provider success is the subject of the test. Assertion changes are limited to the changed security contract and resulting fixtures:

- `tests/accounts.test.ts`: anonymous marking without the CSRF header now expects 403; session payload and database schema assertions include the epoch.
- `tests/scale-launch.test.ts`, `tests/free-pool.test.ts`: absent/broken storage now refuses marking instead of admitting it. The provider spy confirms no upstream work on outages.
- `tests/cloudflare-load.test.ts`: a completed failed operation is no longer replayed; retrying reserves again and reports the new remaining allowance. Its timer driver now also advances the retried cache lookup.
- `tests/impact.test.js`, `tests/scale-launch.test.ts`: bodyless hit expectations become `{}` JSON; allowance assertions include the new `hitvisit` row, including for testers' visit events. Testers still skip browser/student impact.
- `tests/cloudflare.test.ts`: helper success fixtures now have D1 and report 39 remaining instead of an unknown count. Its timer driver accommodates the new real address digest before mocked provider retries.
- Other handler fixture updates are in `tests/first-visit.test.ts`, `tests/fix-and-animate.test.ts`, `tests/free-capacity.test.ts`, `tests/tester.test.js` and `tests/workers-request.test.ts`.

## Verification and remaining work

- `npx tsc --noEmit` — passed.
- `npx vitest run` — passed: **820 tests in 58 files**, including 59 new audit regression cases.
- `npm run build` — passed. Vite reports the existing non-fatal large-chunk advisory.
- Tests use mock providers and local in-memory SQLite. No real provider calls, secret changes, calibration/scoring changes, deployment or remote migrations were performed.
- No requested implementation item remains incomplete. Migration 0004 is prepared and verified locally, but intentionally **not applied remotely**. Apply it through the owner's normal migration process before deploying this code; existing legacy cookies will require signing in again.
- Replay remains isolate-local and best effort; eviction can discard a pending request's replay slot, and existing provider work is not cancelled. The smaller body limits do not introduce a global concurrency bound. Distributed addresses can still affect approximate public totals. These limits do not change the completed fixes above.
