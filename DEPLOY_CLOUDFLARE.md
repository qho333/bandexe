# BAND.EXE on Cloudflare Pages — no purchase required

The default **Free checker** uses open models only. No age question, account, student key or model download is needed. Gemini is an optional own-key mode for adults, with its existing age and region rules. Cerebras is dropped. Leave `MISTRAL_API_KEY` unset for the owner's setup: it is not free for them. Mono, sound preferences, reduced motion, the silent first-visit boot fallback, compact reports and Full detail remain intact.

## 1. Provider pool and marking

`shared/free.js` is used by both Pages Functions and the local Node server:

1. **Groq** (`GROQ_API_KEY`, already set and working): `openai/gpt-oss-120b`, then `openai/gpt-oss-20b`. A 429 rotates immediately to the next model, without waiting/retrying the same exhausted model.
2. **Workers AI** (`AI` binding): GPT-OSS 120B, Mistral Small 3.1 24B, then the cheaper Llama 3.1 8B FP8 Fast model.
3. **OpenRouter free** (`OPENROUTER_API_KEY`, optional). Every candidate must end in `:free`; the adapter enforces this even for pinned research models.
4. **Mistral** (`MISTRAL_API_KEY`, optional legacy adapter, last).
5. `pool_empty` when capacity is exhausted; transport/timeout failures return `unavailable`; a full legacy Mistral queue returns `busy`.

Missing credentials/bindings are skipped. One logical operation has **at most three upstream attempts total**, including vision, retries and one report repair. Therefore a request can run out of attempts before reaching every configured model/provider. Each attempt, including response-body parsing, is raced/aborted after 45 seconds; the whole pool shares a 145-second deadline and 20-second queue/backoff budget. Workers bindings cannot cancel upstream computation; late replies are ignored. Mistral retains its FIFO queue, 1–1.1-second start spacing, four in-flight calls and 24 waiters. Short Retry-After retries receive 50–250ms jitter and consume the same three-call budget.

The shared compact/full schema is in `shared/report-schema.js`. Groq GPT-OSS uses strict `json_schema`. Workers uses its binding-specific schema envelope (and accepts structured object replies); Mistral and OpenRouter GPT-OSS use the named schema envelope. Other configured models use `json_object` where schema support is not declared. OpenRouter requests require support for the selected parameters. Helpers and study examples remain plain text.

On unreadable/invalid criteria, marking repairs **once on the next model/provider**, never revisiting an earlier failed one. Every reply still passes exact-quote review and whole-band validation; overall scores are calculated in code. Invalid criteria are withheld; completely unreadable feedback never produces a fabricated score. `OPEN_CALIBRATIONS` is unchanged: every provider/model defaults to identity and **open model, uncalibrated** until separately fitted on official scripts. Gemini calibration never applies to open models.

Compact output retains its 3,000-token cap, up to eight corrections/four upgrades, and no verbose subskills/rewrites. Full detail uses the separate helper allowance and 6,000-token cap. Expansion preserves original bands and correction decisions. No packages or paid modes were added. Upstream account allocations still limit capacity; the app never buys additional quota or enables billing.

Provider contracts: [Groq structured outputs](https://console.groq.com/docs/structured-outputs), [Workers JSON mode](https://developers.cloudflare.com/workers-ai/features/json-mode/), [Mistral custom outputs](https://docs.mistral.ai/studio/conversations/structured-output/custom), [OpenRouter structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs).

## 2. Academic Task 1

Students can upload a PNG/JPG (up to 4MB) **or type a factual chart description**. Without either, client preflight and server validation ask for a reference before spending allowance.

Uploaded images first go to Workers `@cf/meta/llama-3.2-11b-vision-instruct`, or Groq `meta-llama/llama-4-scout-17b-16e-instruct` if available. The strict factual prompt asks for title, labels/axes, units, key figures and trends, with no opinions or invented illegible values. Only the resulting text goes to text-only marking models. The report displays **Chart read automatically — check it matches your chart** and an expandable reference. If vision is unavailable, the student is asked to type a description and remove the image. Study examples use the same reference pipeline and budget.

Workers vision may require the owner to accept Meta's license/AUP once before enabling it; see [Cloudflare's vision setup](https://developers.cloudflare.com/workers-ai/guides/tutorials/llama-vision-tutorial/). The app never accepts those terms automatically. Groq vision or typed descriptions work when that binding/model is unavailable. Real provider image accuracy remains an owner smoke check.

## 3. D1 allowances and counters; KV result cache

`wrangler.toml` declares `[[d1_databases]]` with binding `DB`, database name `bandexe`, and **`database_id = "REPLACE_WITH_D1_ID"`**. The lead creates the database and fills the ID before deployment. Migration: `migrations/0001_counters.sql`.

```sh
npx wrangler d1 create bandexe
# Copy the returned database_id into wrangler.toml, replacing REPLACE_WITH_D1_ID.
npx wrangler d1 migrations apply bandexe --remote
```

D1 stores `daily_allowance(key, day, n)` and `counters(name, day, n)`. Daily keys contain only a salted SHA-256 digest of the trusted connecting IPv4 address or normalized IPv6 /64 prefix + UTC date, prefixed by `mark:` or `helper:`. Set `QUOTA_SALT` as a server secret. **10 new checks/day**, plus **40 shared helper/model-answer/Full-detail calls/day**. Shared-IP students share the allowance identity, as before.

A conditional atomic UPSERT with `RETURNING n` reserves before provider work. The tenth/fortieth admitted request succeeds with zero left; the next is refused without calling a provider. Failed provider operations still consume their reservation. Independently running isolates share D1's counter, removing the former stale-KV race. Old allowance rows are deleted on subsequent visits after their UTC day is more than one day old. Without later traffic, old rows remain until cleanup runs. No raw IP/essay is stored in these rows.

**Absent/unavailable DB, missing salt, or missing trusted IP refuses new cloud provider work with 503 `allowance_unavailable` and a calm retry message.** Signed-in reservations also fail closed; validated testers may continue. D1 I/O is bounded at three seconds; a timed-out write may still complete. Already-cached reports need no provider call or reservation. Public stats also fail quietly without D1. The app does not migrate old approximate KV counters; D1 starts a fresh allowance history at rollout. Old KV allowance keys expire naturally.

`QUOTA` KV now stores **only complete successful reviewed Free reports for 24 hours**, including compact and Full detail under distinct hashes. Hashes include task, question, essay, feedback language, actual system prompt/version, calibration configuration, chart image and typed chart reference. Values are reviewed feedback (possibly essay excerpts/rewrites and automatic chart reference), never raw image submissions, API/tester keys or IPs. Privacy explains this retention. Cache I/O is bounded at two seconds and fails open.

Cache lookup comes before limiters and D1 reservation. A hit uses zero upstream calls, no allowance and no new essay counter; `remainingToday:null` avoids reusing another person's count. Partial/unreadable reports are not cached. Tester requests bypass reads/writes. KV's free write budget now applies to successful cache inserts only, rather than two allowance writes per check. Keep use within the account's free allocations.

Browser transport retries one transient failure with the same `Idempotency-Key` and body. The existing bounded isolate-local replay cache coalesces in-flight requests, retains only 2xx responses for two minutes, caps each daily client address key at eight entries and the isolate at 512 with oldest-entry eviction, rejects changed raw input bytes, and scopes IDs by trusted identity/day/route/provider/tester context. It is best effort across restarts/isolates, not durable exactly-once execution. D1 coordinates the allowance, not this replay cache. See [LOAD_TESTING.md](LOAD_TESTING.md).

Optional MARK_LIMITER/HELPER_LIMITER contracts remain supported. Installed Wrangler Pages config does not support Workers-only `[[ratelimits]]` entries.

## 4. Public statistics and contributors

- `POST /api/hit`: browser tab session dedupe plus a server cap of 20 hit events per IPv4 address or IPv6 /64 per UTC day. It sends JSON boolean events with the CSRF header and no session ID or cookies. Visits and impact writes require an admitted reservation; first/student impact shares a separate cap of three. Cleanup runs only on the first admitted hit per daily key. Raw addresses and arbitrary submitted fields are not stored.
- Fresh successful `/api/mark` reports increment `essays`; cache hits, helpers, Full detail, failures and tester runs do not.
- `GET /api/stats`: public totals and 30 days of daily rows. Approximate daily visitors equal session counts; they are not distinct people. Cached for five minutes in the client/server and advertised with `Cache-Control: public, max-age=300`. Counts have no cookie, IP or personal-data columns. Aggregate history is retained.
- Footer totals link to `#stats`, which includes static sparklines and an accessible daily table. Missing D1 produces a clear unavailable-count explanation; new non-tester Pages checks also pause until storage recovers.
- `#about` explains accuracy honestly, credits the libraries/providers and reads `src/content/contributors.ts`. Replace **Your name — creator** with the real contributor details.

Local Node dev implements the same stats endpoints with counting unavailable, since `process.env` cannot supply a D1 binding. Its open provider pool reads `GROQ_API_KEY`, optional `OPENROUTER_API_KEY` and optional `MISTRAL_API_KEY` directly from `process.env`. Existing fixture and `TESTER_UNLIMITED=1` modes remain. `scripts/dev.js` strips server keys from the Vite child environment and never reads personal credentials automatically.

## 5. Search engines

The app retains hash routing and now has four standalone static guides in `public/`: `/ielts-writing-checker/`, `/ielts-task-2-checker/`, `/ielts-task-1-checker/`, and `/ielts-writing-band-descriptors/`. The sitemap lists these pages and the root, each with a last-modified date. Update those dates when the content changes. `#privacy`, `#about`, and `#stats` remain app screens rather than separate indexable URLs. The root includes crawlable fallback content replaced by React on mount. All five pages have canonical and social metadata and JSON-LD; the three checker guides also have visible FAQs with matching FAQPage data. `public/robots.txt` allows crawling and points at the sitemap. The shared Mono preview is `public/og-preview.png` (1200×630), with SVG/ICO/PNG/apple-touch favicons. `node scripts/generate-social.mjs` reproduces assets using already-installed tooling.

The default origin is `https://bandexe.pages.dev`. For a custom domain, set public build variable `VITE_SITE_URL=https://your-domain.example`. Vite updates canonical/OG/JSON-LD on the root and static pages and generated robots/sitemap together. Keep one canonical HTTPS origin. These metadata variables are public; never place a provider secret in a `VITE_*` variable.

Google Search Console owner steps:

1. Add a **Domain** property (DNS verification) or **URL-prefix** property matching the canonical HTTPS origin.
2. For DNS, add Google's supplied TXT record and verify. For HTML-tag verification, copy only the tag's `content` value into the Pages build variable **`VITE_GOOGLE_SITE_VERIFICATION`**, then rebuild/deploy. Vite injects the meta tag only when configured; no verification token is hard-coded.
3. Verify ownership, then submit `https://your-canonical-origin/sitemap.xml` in **Sitemaps**. Inspect the root URL and request indexing if desired. Verification/indexing are owner operations, not automated by this app.

## Owner deploy sequence

Groq is already configured: do not replace its working secret. Skip login/project creation if already done.

```sh
npx wrangler login
# Only if the Pages project does not exist:
npx wrangler pages project create bandexe --production-branch main

npx wrangler d1 create bandexe
# Replace REPLACE_WITH_D1_ID in wrangler.toml with the returned ID.
npx wrangler d1 migrations apply bandexe --remote

# Only if not already configured (enter privately):
npx wrangler pages secret put QUOTA_SALT --project-name bandexe
# Optional free OpenRouter adapter:
# npx wrangler pages secret put OPENROUTER_API_KEY --project-name bandexe

npm test
npm run build
npx wrangler pages functions build --outdir /tmp/cf-fn-check11
npx wrangler pages deploy dist --project-name bandexe
```

For local D1 testing with Pages, use `npx wrangler d1 migrations apply bandexe --local` before `npm run cf:dev` (use a filled DB ID). Ordinary `npm run dev` uses Node/process.env without D1 and remains supported. `npm run dev:fixture` uses no provider key. No deployment or remote database creation/migration was performed during implementation.

## Optional own-key Gemini and tester pass

My own Gemini key goes browser → Google and retains the adult confirmation and existing region gates (EU/EEA, Switzerland and UK blocked for free-tier Gemini; unknown country follows existing policy). A saved own key is never sent to this server. Legacy explicit server Gemini routes retain their independent provider/age/region checks. The default Free path never chooses Gemini, even when a site Gemini secret is present.

The Pages owner pass remains `TESTER_TOKEN`, a private hex token of at least 32 characters. Existing configured tokens keep working. Client captures `#tester=...`, saves it locally and removes the fragment immediately; the header chip offers Leave. Server compares fixed-size SHA-256 digests with native constant-time equality. Valid testers bypass this site's personal allowance, result cache and optional limiters; they retain validation, provider budgets, upstream limits and explicit Gemini gates. Tester runs are excluded from essay aggregates.

To create/rotate a token without printing it (optional owner operation):

```sh
bandexe_token=$(openssl rand -hex 24)
security add-generic-password -U -a "$USER" -s bandexe-tester -w "$bandexe_token"
printf %s "$bandexe_token" | npx wrangler pages secret put TESTER_TOKEN --project-name bandexe
unset bandexe_token
open "https://bandexe.pages.dev/#tester=$(security find-generic-password -s bandexe-tester -w)"
```

Raw open-model calibration remains `research-data/tools/calibrate_open.mjs`, with `--provider groq --model openai/gpt-oss-120b` (or another explicitly pinned provider/model). Credentials come only from environment variables. Raw bands never receive another model's fit. No validated open-model accuracy percentage is claimed until real official-script runs and an independently fitted calibration exist.


## Optional Google sign-in and synced progress

Account support runs in the Pages API. Apply `migrations/0003_accounts.sql` and `migrations/0004_session_epoch.sql` through your normal migration process before enabling it. For local Pages testing, run `npx wrangler d1 migrations apply bandexe --local`, then `npm run cf:dev`. Ordinary Node dev/fixture mode advertises `googleClientId: null` and remains guest-only. No deployment or remote migration is part of this change.

Create a Google OAuth web client and register the exact HTTPS JavaScript origin used by the site. Set the public server environment variable `GOOGLE_CLIENT_ID` to that client ID (not a client secret, and not a Vite build variable). Keep the existing `QUOTA_SALT` stable: it derives both the pseudonymous account ID and the session signing key. No new secret, npm dependency or paid service is needed. Without the client ID, `/api/auth/config` returns null, the Coming soon card remains, and all other account/history endpoints return 404. Missing D1 or salt returns 503 for account operations.

`shared/accounts.ts` verifies RS256 Google ID tokens using WebCrypto and Google JWKS, cached in memory for the response's Cache-Control max-age. It checks the issuer, exact audience, expiry with 60 seconds of skew, sane issued-at time and subject. Only the HMAC-derived UID, UTC created/last-sign-in days and numeric session epoch reach the users table. Names and email are never persisted server-side. The first name is returned to the browser at sign-in for its localStorage greeting. Auth endpoints bypass the report replay cache so credentials and names cannot be retained there.

The HttpOnly, Secure, SameSite=Lax `bx_session` cookie is scoped to `/api` for 30 days. Every API mutation, including guest routes, requires `X-Requested-With: bandexe`, application/json Content-Type, and an exact same-origin Origin header when supplied. Account requests use same-origin credentials. Bodies are streamed with a default 64 KB cap, 32 KB for Google credentials and 4 KB for history; only chart-bearing `/api/mark` requests can use the existing 7 MB image envelope. Valid sessions use `mark:acct:<uid>` and `helper:acct:<uid>` D1 keys, with 15 checks and 60 helpers/model-answer/Full-detail requests per UTC day. The optional shared limiters use `acct:<uid>`. Guests retain 10/40 with a salted daily IPv4-address/IPv6-/64 digest. Tester behavior and provider selection are unchanged. Idempotency reads and parses the original body once, scopes replay by client and credential digests, and checks the current account epoch before replay. Cookies without an epoch are invalid.

History accepts only ID, UTC day, task, overall, four criterion bands and up to three priorities of 120 characters each. Null scores preserve withheld results. Extra fields, including essay/question/name/email, are rejected. Client sync converts priorities to fixed practice labels so quoted essay excerpts never enter account history. History retains at most 500 rows per account and serves the latest 200; Overview merges these in memory with local history by ID. Remote results do not get written into the guest history store. Sync errors never block a report.

Delete my account is available from the greeting menu, including inside the phone menu, with an in-app confirmation. A transactional batch saves the next session epoch in a small pseudonymous revocation table, deletes the user's history and user row, and clears this browser's cookie. Today's allowance records stay until routine pruning so rejoining cannot reset limits. Revocation rows survive deletion and are pruned on later sign-ins after 31 days, beyond the 30-day cookie lifetime. Rejoining starts at the saved epoch, so older cookies cannot revive. Logout increments the user's session epoch, ending all current sessions. Every authenticated request verifies both account existence and the cookie's epoch using one query. Local history and drafts have their existing separate Overview deletion controls. Existing optional report feedback caches are unchanged and are separate from account history.

Automated checks use generated RSA keys, mock JWKS and a built-in Node SQLite adapter that runs all four migrations. Before enabling sign-in for students, complete one real Google popup sign-in/sign-out and phone account-menu check on the registered HTTPS origin; the local workspace sandbox prevented a live browser check during implementation.
