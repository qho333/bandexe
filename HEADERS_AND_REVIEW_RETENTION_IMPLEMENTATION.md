# Security headers and review retention implementation

Completed locally on 30 October 2026. No deployment or remote migration was run. No secrets, scoring rules or calibration were changed.

## Final security policy

`public/_headers` applies the enforced CSP and security headers to `/*`, including HTML, static assets and worker responses. `scripts/security-headers.js`, registered in `vite.config.ts`, writes the final `dist/_headers` after Vite finishes transforming HTML, emitting SEO pages and copying public assets. Deployable output is `dist/`; the public source file is the policy template.

The final generated CSP from the successful production build is:

```text
default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://accounts.google.com/gsi/client https://static.cloudflareinsights.com 'sha256-f0AMNKeyisyFXv3MC7TnZNZPCNHOSyCSyYU4ar7EsFg='; style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://accounts.google.com/gsi/ https://cloudflareinsights.com https://generativelanguage.googleapis.com https://api.datamuse.com https://api.languagetool.org https://huggingface.co https://*.hf.co https://raw.githubusercontent.com; frame-src https://accounts.google.com; worker-src 'self' blob:; base-uri 'none'; object-src 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
```

The hash is generated from the exact executable inline script contents, including whitespace and HTML line-ending normalization, on every build. Editing the boot/theme script automatically changes its hash. The generator recursively scans all final HTML, so executable scripts added to SEO pages also receive hashes. Current SEO scripts are JSON-LD, which is excluded. No script `unsafe-inline` or JavaScript `unsafe-eval` is allowed. The build fails if a generated header line exceeds Cloudflare Pages' 2,000-character limit.

Other headers on `/*`:

| Header | Value |
| --- | --- |
| X-Frame-Options | DENY |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | camera=(), microphone=(), geolocation=(), payment=(), usb=() |
| Cross-Origin-Opener-Policy | same-origin-allow-popups |
| Strict-Transport-Security | max-age=31536000 |

Clipboard writing remains available under the browser's default policy. No COEP or HSTS preload is added.

Pages Functions do not inherit static `_headers` rules. The Functions `send` helper now sets `nosniff`, `strict-origin-when-cross-origin` and `DENY`. Public stats uses that helper while retaining its existing `public, max-age=300` cache header. Responses constructed by the replay helper, including its independent 409 conflict response, receive the same three headers before returning. Existing cookies, JSON content types and quota headers are preserved.

Cloudflare references: [Pages header rules, Functions exclusion and line limit](https://developers.cloudflare.com/pages/configuration/headers/). The build plugin uses the final-output lifecycle after HTML processing; [Vite plugin documentation](https://vite.dev/guide/api-plugin.html) describes the relevant hooks.

## External origin inventory

Inspected `src/`, `shared/`, `index.html`, every public HTML file and `vite.config.ts`, including inline scripts/styles and dynamically loaded resources. The regression test repeats the origin inventory and requires explicit, commented exceptions.

| Allowed origin or source | Reason |
| --- | --- |
| accounts.google.com/gsi/client | Google Identity Services script |
| accounts.google.com/gsi/style | GSI stylesheet |
| accounts.google.com/gsi/ | GSI connections |
| accounts.google.com | GSI frames |
| static.cloudflareinsights.com | Pages-injected analytics script |
| cloudflareinsights.com | Analytics beacon connection |
| generativelanguage.googleapis.com | Optional own-key Gemini browser calls, including shared Gemini code |
| api.datamuse.com | Browser synonym requests |
| api.languagetool.org | Browser spelling and grammar requests |
| fonts.googleapis.com | Existing Google Fonts stylesheet, including SEO pages |
| fonts.gstatic.com | Font files |
| huggingface.co | WebLLM model files |
| *.hf.co | Hugging Face model-file CDN redirects |
| raw.githubusercontent.com | WebLLM WASM model libraries |

The installed WebLLM 0.2.85 configuration points both selected models (`Qwen3-4B-q4f16_1-MLC` and `Qwen3-1.7B-q4f16_1-MLC`) at `huggingface.co/mlc-ai/...`, and their WASM libraries at `raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/...`. The installed runtime calls `WebAssembly.instantiate`/`instantiateStreaming`, so `wasm-unsafe-eval` is needed. Same-origin worker modules and blob workers are allowed. Images use only self/data/blob; Google avatars are not rendered.

Origin uncertainty: the exact Hugging Face CDN redirect host for a live model shard could not be verified from this sandbox because outbound DNS resolution failed. `https://*.hf.co` is the one intentional wildcard, covering Hugging Face's varying CDN/Xet subdomains, including `cas-bridge.xethub.hf.co`. No blanket HTTPS source, arbitrary CDN, GitHub script source or additional model host was added. A real model download under deployed headers was not exercised.

Navigation-only links (credits, contributor LinkedIn, AI Studio, Google's privacy policy and IELTS resources), DOCX XML namespace identifiers, schema.org JSON-LD vocabulary and same-site canonical/social metadata do not require external fetch permissions. Server-only Groq, Mistral, OpenRouter and Google OAuth certificate calls are explicitly excluded from browser CSP permissions. The development proxy remains local.

Google verification HTML and the IndexNow key file are byte-identical in the generated output. Robots and sitemap generation remains intact, including the five existing sitemap URLs.

## Review retention

`migrations/0002_impact.sql` already records the creation UTC date as `reviews.day`; it has no separate `created` timestamp. Retention uses that existing date, with this parameterized, three-second-bounded delete:

```sql
DELETE FROM reviews
WHERE status IN ('pending', 'hidden') AND day < ?
```

The cutoff is the UTC date 30 days before cleanup. For example, on 30 October, pending/hidden reviews dated before 30 September are deleted; reviews dated 30 September remain until the following UTC day. This preserves the existing day-level timestamp precision. Approved reviews, fresh reviews and aggregate rating buckets remain.

`pruneReviews` lives in `shared/storage.js` and runs before review submission storage or a moderation list query. A WeakMap reserves one cleanup attempt per UTC day per live database binding in an isolate before yielding; concurrent requests share its completion. A failed attempt retains that daily guard and retries on the next UTC day. Errors and timeouts are swallowed so submission/listing can continue. With no subsequent review activity, cleanup waits for the next trigger. Cold starts or separate isolates can each perform their own daily attempt; the guard is not a global distributed scheduler, and the indexed delete is idempotent.

The previous `(status, id)` index did not support the date range. Added local migration `migrations/0005_review_retention.sql`, containing only `CREATE INDEX IF NOT EXISTS reviews_status_day ON reviews(status, day)`. No new column was needed. The real SQLite D1 harness loads this migration and verifies the deletion uses the index. No local persistent database or remote database was migrated; migration execution was limited to in-memory test databases.

Privacy now states the 30-UTC-day unapproved-review policy, opportunistic cleanup, approved-review retention and continued aggregate rating counts. That section is explicitly English-only and its sentence is absent from all 11 translation catalogues, so no catalogue entries needed changing.

## Validation

All required commands exited successfully after the final code changes:

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed |
| `npx vitest run` | 60 files, 835 tests passed |
| `npm run build` | Passed; final `dist/_headers` generated |

`tests/security-headers.test.js` builds the real app into a temporary directory, parses its generated headers, verifies all required directives and headers, checks every source and built executable inline script hash, validates hash updates and SEO-script generation, inventories origins, checks selected WebLLM model hosts, verifies discovery/verification files and tests API successes/errors/replays/conflicts. It does not rely on a pre-existing `dist/`.

`tests/review-retention.test.ts` uses real SQLite through the D1 harness to cover old pending/hidden deletion, private/empty reviews, cutoff boundaries, fresh/approved preservation, aggregate preservation, index use, concurrent once-per-day cleanup, UTC rollover, independent database bindings, moderation-list triggers, missing storage, failed cleanup with successful HTTP submission and cleanup timeouts.

The full suite emitted Node's existing experimental localStorage warnings. The successful production build retained the existing large-chunk advisory. Neither is a failing check. Browser behavior against live Google, analytics or model servers remains outside the local validation performed here.
