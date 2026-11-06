# BAND.EXE (bandexe) security audit: run-1

## 1. Run facts
| Item | Value |
|---|---|
| Mode | Full audit |
| Profile | `standard` |
| Budget | None set; 17 agent invocations used |
| Source | `app/`, an uncommitted working tree as of 2026-10-30. It is not a git repository, so there is no commit to pin. |
| Prior runs | None. No earlier ledger or findings existed, so this is the first coverage record. |

**Agents used (17):**
- 7 hunters over 3 waves
- 4 coverage critics: one after each wave, plus a separate final-clean critic
- 3 candidate verifiers (Phase 3)
- 3 final-record verifiers (Phase 5)

**Scope.** In scope:
- `functions/`
- `shared/`
- `migrations/`
- `wrangler.toml`
- `src/`
- `public/`
- build and config files

Out of scope:
- `server/` (local Node dev server)
- `scripts/`
- `research-data/`
- `node_modules/`, `dist/`, `.wrangler/`

`tests/` was read only as evidence.

**How the audit ran.** Every check was a source read, and no target code was executed. The skill only lets target code run inside an OS-enforced sandbox, and none was available here. Nothing was sent to bandexe.pages.dev or any provider, and no secret values were read. Only the variable names in `.dev.vars` and `.env.production` were listed.

**Deviations from the skill:**
- Phase 1 reconnaissance was done by the parent itself rather than by separate agents.
- Phase 3 and Phase 5 verifiers each handled two or three records. Each verifier was still independent: it had not hunted or verified those records before.

**What this coverage means.** This is one pass. The final critic found no unmapped trust-relevant code, but that does not mean the code is free of vulnerabilities.

## 2. Security posture
The core controls hold up under source review:
- **Google ID-token check:** pinned RS256, fixed Google key set (JWKS), and audience, issuer and timing checks.
- **Session cookie:** HMAC-signed, HttpOnly, Secure, SameSite=Lax, path `/api`, and the account must still exist on every request.
- **Account data:** history reads and writes are tied to the signed-in account (uid).
- **Tester token:** compared in constant time and enforced on the server.
- **Review publishing:** a review is only published with the writer's consent.
- **AI output:** shown as plain React text, never as HTML.
- **Report cache:** keyed on the full content of the request.
- **Providers:** endpoints are fixed, and no secrets are in the client bundle.

The weak spots are all about availability and quota. The guest daily allowance is the only thing protecting the operator's free provider allowance, and it can be bypassed or worn down in several ways:
- other websites can trigger checks from visitors' browsers;
- it is keyed on the full IP address;
- it lets everything through when D1 fails;
- an in-memory request map shared across the isolate can be filled up.

None of these was confirmed by running code.

## 3. Confirmed findings
None. With no sandbox, no result could be observed, which the skill requires for a confirmed finding (see `FINDINGS-DETAIL.md`).

## 4. Confirmed finding details
Not applicable.

## 5. Needs validation
These are leads, not confirmed vulnerabilities, and they have no severity. Full traces and plans are in `NEEDS-VALIDATION.md`. Line numbers refer to `functions/api/[[path]].ts` unless another file is named.

**1. Cross-site pages can use up visitors' guest allowance and provider quota**
`bandexe:csrf:anonymous-spend-routes-accept-cross-site-simple-posts`
- **Trace:** `:220` → `:73` → `:79` → `:178` → `:197` → `:204`.
- **Blocker:** nothing was run; WAF/Bot rules are unknown; the browser cookie and preflight behaviour is inferred.
- **Local next step:** in the sandbox, call `onRequest` with a cross-site-shaped text/plain POST 11 times and expect a 429 at the 11th.
- **Owner check:** on staging, from another origin, send one no-cors POST, then check `remainingToday`.

**2. Guest allowance keyed on the full IP, so IPv6 rotation multiplies it**
`bandexe:quota:guest-allowance-keyed-on-full-client-ip`
- **Trace:** `:169` → `:195` → `:50` → `shared/storage.js:14` → `:205`.
- **Blocker:** nothing was run; the Pseudo IPv4 setting and prefix-based WAF rules are unknown.
- **Local next step:** send 11 IPv6 addresses from one /64 and expect all 11 to be admitted.
- **Owner check:** in the Cloudflare dashboard, check Network > Pseudo IPv4 and the WAF rate-limit rules.

**3. Allowance lets requests through on D1 errors, which `/api/hit` writes may be able to cause**
`bandexe:quota:allowance-fails-open-on-attacker-induced-d1-errors`
- **Trace:** `:120`/`:127` → `shared/storage.js:17` → `:52` → `:199`.
- **Blocker:** nothing was run; the D1 plan cap and its behaviour once the cap is reached are unknown.
- **Local next step:** stub D1 to throw and expect unlimited admission.
- **Owner check:** compare the D1 rows-written limit with the Functions request limit.

**4. The 512-entry replay map, shared across the isolate, can be filled with cheap 400 requests, causing 503s for others**
`bandexe:replay:isolate-replay-map-filled-by-cheap-requests`
- **Trace:** `:219` → `:238` → `:181` → `shared/traffic.ts:75` → `shared/traffic.ts:71`.
- **Blocker:** nothing was run; how Cloudflare distributes requests across isolates is unknown.
- **Local next step:** fill `replay()` with 512 entries, then expect a 503 for the next new key.
- **Owner check:** review the WAF rules; run a burst test on a preview deployment only.

**5. Bodies up to 7 MB are copied several times before any gate**
`bandexe:replay:unbounded-concurrent-body-buffering-per-isolate`
- **Trace:** `:224` → `:34` → `:229`/`:234` → `:178`.
- **Blocker:** nothing was run; the isolate memory limit and concurrency are unknown.
- **Local next step:** in miniflare with the production memory limit, find the concurrency N at which it breaks.
- **Owner check:** look for exceeded-memory errors in Functions metrics.

**6. Public visits counter can be inflated without limit**
`bandexe:stats:unbounded-anonymous-visits-counter`
- **Trace:** `:120` → `:127` → `shared/storage.js:21` → `shared/storage.js:102` → `:160`.
- **Blocker:** nothing was run; WAF/Bot rules are unknown.
- **Local next step:** send 50 hits and expect `visits` to be 50.
- **Owner check:** check the WAF rules for `/api/hit`.

**Rejected in Phase 3**
- `bandexe:quota:report-detail-full-marking-on-helper-allowance` was rejected. Charging Full detail to the 40/60 helper allowance is the documented design (`SMOOTH_FIRST_VISIT_IMPLEMENTATION.md:21`, `DEPLOY_CLOUDFLARE.md:43`), and every request is still reserved against a per-identity daily allowance first.

## 6. Hardening notes (not findings)
**Sessions and sign-in**
- Logout does not end the session on the server. A copied `bx_session` stays valid for up to 30 days. Account deletion followed by signing in again recreates the same uid, which revives older unexpired cookies. Fix: add a per-user session epoch.
- Google sign-in has no nonce.

**Headers and client storage**
- There is no `public/_headers`: no CSP, no `frame-ancestors`, no X-Frame-Options. No sensitive action was found to complete inside a framed page. A CSP would also reduce the damage any future XSS could do with the tester token and the user's own Gemini key, both kept in localStorage.
- A link to `/#tester=<value>` silently stores whatever value it carries. The server rejects a wrong token, so this grants nothing, but the app should ask for confirmation first.

**Configuration**
- `allowance()` applies no limit at all when `QUOTA_SALT` or `DB` is not configured. Startup should refuse free marking in that state.
- Signed-in requests are not also counted against the per-IP limit. Separate Google accounts stack their allowances.
- The region gate lets requests through when `cf.country` is missing or unknown (for example T1 or XX).
- `X-Age-Confirmed` is self-attested.
- Server-side Gemini replies are never cached.

**Retention and privacy**
- Pending and hidden reviews (from users who are often minors) are kept indefinitely.
- A hidden review can stay public for up to about 10 minutes, because the isolate cache and the `public, max-age=300` header stack.
- The privacy text says account deletion removes allowance records. In fact today's rows are kept on purpose until they are pruned. Fix the wording, not the code.

**Third-party code and providers**
- WebLLM model WASM and weights load from mutable `main` URLs with no SRI. Pin a custom appConfig with commit URLs and integrity hashes.
- A Mistral `Retry-After` header can defer the isolate queue for up to 24 h. Cap it.
- There is no per-isolate concurrency cap for Groq, Workers AI or OpenRouter calls.

**Low-impact disclosure and minor items**
- The `cached:true` flag tells a holder of the exact text whether someone else checked it in the last 24 h.
- `/api/health` reveals the model name and whether a Gemini key is configured.
- `.env.production` is not in `.gitignore` (it currently holds only a public value).
- Markdown export does not escape model text.
- Prompt delimiters are not escaped, and the client-supplied "model" history role is trusted. Both only affect the user's own session.
- Dependency CVE status could not be checked offline. Run `npm audit` yourself.

**Positive patterns seen**
- Atomic conditional UPSERT for quota reservation.
- History inserts guarded with `WHERE EXISTS`.
- The consent check is inside the moderation UPDATE itself.
- Exact-key history validation.
- Docx output is XML-escaped.
- Fixed provider endpoints, with keys sent only in headers.

## 7. Coverage summary
The ledger has 25 units:

| State | Units |
|---|---|
| Covered | 17 |
| Candidate | 4 (they carry the 6 needs_validation fingerprints and the 1 rejected one) |
| Blocked | 1 |
| Deferred | 0 |
| Out of scope | 3 (`server/`, `scripts/`, `research-data/`) |

- **Blocked unit:** "Obvious things", because dependency CVE status needs an advisory database or an owner-run `npm audit`.
- **Critic results:**
  - The wave-1 critic added 4 units: cross-site anonymous POSTs, the server Gemini branch, account-sybil quota, and the review lifecycle.
  - The wave-2 critic added 2 units: on-device and third-party client fetches, and the provider admission queue.
  - The wave-3 critic and the final-clean critic both returned `stop: true` with no gaps.
- **Validators:** `validate-findings.cjs` passes (7 records) and `validate-coverage-ledger.cjs` passes (25 units).
