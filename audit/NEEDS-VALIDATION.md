# BAND.EXE (bandexe) run-1: needs-validation leads

These six leads are prioritized. None of them has a severity, and none is a confirmed vulnerability. Each one rests on a real source path. Each is blocked because no OS-enforced sandbox was available, so no target code was run. Some also depend on Cloudflare deployment facts that the repository does not show. The canonical records are in `findings.json`. All paths below are relative to `app/`.

Priority order: the cross-site spend lead first, then the guest IPv6 allowance, fail-open, replay-map, body-buffering and visits-counter leads.

---

## 1. Any website can make its visitors' browsers use up their own per-IP guest allowance and the operator's provider quota
`bandexe:csrf:anonymous-spend-routes-accept-cross-site-simple-posts`

**Boundary:** a third-party web origin acting through a visitor's browser, against that visitor's per-IP guest allowance and the operator's free provider allowance.

**Trace:**
1. `functions/api/[[path]].ts:220`: a request with no Idempotency-Key goes straight to `handle()`.
2. `:73`: the SameSite=Lax `bx_session` cookie is not sent cross-site (`shared/accounts.ts:44`), so `uid` is null.
3. `:79`: the CSRF header gate runs only when the route is an account route or `uid` is set, so it is skipped here.
4. `:178` (`readJson`, `:20-39`): the body is parsed as JSON whatever its Content-Type.
5. `:197`: the guest allowance is reserved against the visitor's CF-Connecting-IP digest (`:47-51`).
6. `:204`: the request spends provider calls.

`/api/review` (`:152`) and `/api/hit` (`:120`) accept the same unbound requests.

**Verified evidence:**
- `tests/accounts.test.ts:236` expects an anonymous `/api/mark` sent without X-Requested-With to return 200.
- `src/lib/cloud-request.ts:5` shows the SPA always sends `X-Requested-With: bandexe`, so requiring the header would not break the app.

**Blockers:**
- No sandbox, so nothing was executed.
- Unknown whether Cloudflare WAF or Bot rules block cross-site no-cors POSTs.
- Browser behaviour (a no-cors text/plain POST without preflight, and the Lax cookie being omitted) is inferred from the standards, not observed.

**Local plan:** use an approved sandbox with the `tests/accounts.test.ts` harness. Call `onRequest` with:
- `POST /api/mark`
- headers `Content-Type: text/plain;charset=UTF-8`, `CF-Connecting-IP: 192.0.2.77`, `Origin: https://attacker.example` and `Sec-Fetch-Site: cross-site`
- no Cookie, X-Requested-With or Idempotency-Key
- a different essay on each call
- stubbed providers

If the lead holds, `X-Remaining-Today` drops from 9 to 0 and the 11th call returns 429. Repeat for `/api/helper` and `/api/review`.

**Owner check:** use staging only, with your own browser and IP. From a page on another origin, send one no-cors text/plain POST. Confirm in the Cloudflare logs that it reached the Function, then check `/api/health` `remainingToday` from the same IP.

**Smallest source fix if it holds:** require `X-Requested-With: bandexe` (or reject `Sec-Fetch-Site: cross-site` and any non-`application/json` Content-Type) on every POST/DELETE under `/api/`. That means removing the `(accountRoute || uid)` condition at `functions/api/[[path]].ts:79`. Then add the header to the `/api/review` and `/api/hit` callers (`src/lib/reviews.ts`, `src/lib/stats.ts`).

---

## 2. Guest daily allowances and rating limit are keyed on the full client IP, so IPv6 address rotation multiplies them
`bandexe:quota:guest-allowance-keyed-on-full-client-ip`

**Boundary:** an anonymous client against the per-guest daily allowance that protects the operator's shared free provider allowance. The same key also governs public ratings and impact metrics.

**Trace:**
1. `functions/api/[[path]].ts:169`: an anonymous marking request arrives.
2. `:195`: the limiter is unbound (`wrangler.toml:5`).
3. `:50`: the allowance key is `digest(QUOTA_SALT|ip|day)`, using the raw IP read at `:47`.
4. `shared/storage.js:14`: an unseen key starts at n=1 and is admitted.
5. `:205`: the request spends provider calls, up to 4 per mark (`shared/free.js:19`).

The review limit (`:155`) and the hitfirst counter (`:131`) use the same digest (`:60`).

**Blockers:**
- No sandbox.
- Unknown whether CF-Connecting-IP carries the full IPv6 address (Pseudo IPv4 setting).
- Unknown whether any WAF rule aggregates requests by prefix.

**Local plan:** in a sandbox with a D1 fixture and stubbed providers, send 11 `/api/mark` requests from `2001:db8::1` through `2001:db8::b`. If the lead holds, all 11 are admitted. Send 11 from a single address and confirm the 11th is refused.

**Owner check:** in the Cloudflare dashboard, check Network > Pseudo IPv4 and the WAF rate-limit rules for `/api/*`.

**Smallest source fix if it holds:** before hashing, normalize IPv6 addresses to their /64 prefix in `allowance()` and `optionalAllowance()` (`functions/api/[[path]].ts:47-60`). Optionally add a global daily ceiling row as well.

---

## 3. The daily allowance fails open on D1 errors that anonymous /api/hit traffic can plausibly cause
`bandexe:quota:allowance-fails-open-on-attacker-induced-d1-errors`

**Boundary:** an anonymous client against the daily allowance on every marking route.

**Trace:**
1. `functions/api/[[path]].ts:120`: every `/api/hit` writes to D1 with no limit: a visits UPSERT at `:127` and a prune DELETE at `:135`.
2. `shared/storage.js:17`: any D1 error, or a timeout over 3 s, returns null.
3. `:52`: `allowance()` returns null.
4. `:199`: with a null allowance, no 429 is raised, so the request goes on to the providers.

The fail-open is intended (`shared/storage.js:6`, `LOAD_TESTING.md:15`). The open question is whether an attacker can trigger it.

**Blockers:**
- No sandbox.
- The D1 plan's rows-written cap, how D1 behaves once it is reached, and whether the Pages Functions request quota runs out first.

**Local plan:** stub D1 to throw and send more than 10 `/api/mark` requests from one IP. If the source path holds, all are admitted with `remainingToday` null.

**Owner check:** compare the D1 daily write limit with the Functions request limit, and the number of rows each `/api/hit` writes. Do not load-test production.

**Smallest source fix if it holds:** fail closed for anonymous guests when the reservation errors (return 503 instead of admitting). Also put the visits write behind a per-IP allowance; see lead 6.

---

## 4. The global 512-entry idempotency map can be filled by cheap invalid requests, returning 503 to all other users in the isolate
`bandexe:replay:isolate-replay-map-filled-by-cheap-requests`

**Boundary:** one anonymous client against the availability of the marking routes for other users sharing a Workers isolate.

**Trace:**
1. `functions/api/[[path]].ts:219-221`: any well-formed Idempotency-Key is accepted.
2. `:238`: the request goes through `replay()`.
3. `:181`: an invalid body gets a 400 before any allowance is spent.
4. `shared/traffic.ts:75`: the 400 entry is kept for 120 s.
5. `shared/traffic.ts:71`: once the map holds 512 entries, every new key gets 503 "busy". The map is module-global (`:34`).

The SPA sends a fresh key on every request (`src/lib/cloud-request.ts:6`), so real users hit the full map.

**Blockers:**
- No sandbox.
- How Cloudflare reuses and distributes isolates between clients.
- Any WAF rules on these paths.

**Local plan:** call `replay()` 512 times with 400 runs, then once more with a new key. Expect 503 until fake timers pass 120 s.

**Owner check:** on a preview deployment only, send about 600 `{}` posts with unique keys from one client, then one valid request from a second client in the same location, and look for a 503.

**Smallest source fix if it holds:** cap entries per scope prefix (per IP digest) instead of globally, and stop retaining non-2xx replies, or retain them only briefly (`shared/traffic.ts:71-75`).

---

## 5. Bodies up to 7 MB are buffered and copied several times before any allowance gate, with no per-isolate concurrency bound
`bandexe:replay:unbounded-concurrent-body-buffering-per-isolate`

**Boundary:** an anonymous client against isolate memory shared with other users' in-flight checks.

**Trace:**
1. `functions/api/[[path]].ts:224`: `readJson` reads up to 7 MB.
2. `:34`: the chunks are copied into one buffer, then decoded and parsed.
3. `:229` and `:234`: the body is stringified twice.
4. `:178`: the body is read and parsed a second time, all before validation and allowance.

The per-request cap is in `shared/validate.js:11`.

**Blockers:**
- No sandbox.
- The isolate memory limit and how memory is accounted.
- Per-isolate concurrency, and whether killing an isolate fails other requests.

**Local plan:** run under workerd/miniflare with the production memory limit. Send N concurrent ~6.9 MB invalid bodies plus one small valid request, and record the N at which the isolate is terminated.

**Owner check:** check Functions metrics for exceeded-memory errors, and the WAF body-size rules.

**Smallest source fix if it holds:** in `onRequest`, parse the body once and pass the parsed body to `handle()` instead of re-serializing it. Compute the fingerprint from the raw bytes. Lower the byte cap unless the task is `ac1` with an image.

---

## 6. Public visits/visitors statistics can be inflated without limit by anonymous /api/hit requests
`bandexe:stats:unbounded-anonymous-visits-counter`

**Boundary:** an anonymous client against the integrity of the public `/api/stats` figures, which are labelled approximate.

**Trace:**
1. `functions/api/[[path]].ts:120`: anonymous `/api/hit`.
2. `:127`: `count('visits')` runs on every request, outside the `hitfirst` gate at `:131`.
3. `shared/storage.js:21`: UPSERT.
4. `shared/storage.js:102`: `visitors = visits`.
5. `:160`: the counts are published at `/api/stats`.

**Blockers:**
- No sandbox.
- Any WAF or Bot rule on `/api/hit`.

**Local plan:** send 50 empty `/api/hit` requests from one IP, then call `publicStats`. Expect `visits == 50`.

**Owner check:** check the WAF and Bot rules. Optionally, on staging only, send 20 hits and compare `/api/stats` after 300 s.

**Smallest source fix if it holds:** put the visits increment behind `optionalAllowance(request, env, "hitvisit", N)` with a small N, as `browsers`/`students` already are.
