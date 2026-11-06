# Brief: security headers + review retention (owner approved 2026-10-30)

Follow-up to `audit/REPORT.md` hardening notes. Do not deploy, do not apply remote migrations, no secrets, no scoring/calibration changes. Run `npx tsc --noEmit`, `npx vitest run`, `npm run build` until all pass. Write `HEADERS_AND_REVIEW_RETENTION_IMPLEMENTATION.md` with the final policy and any origin you were unsure about.

## 1. Security headers (Cloudflare Pages `public/_headers`)
Apply to all HTML pages (`/*`), and make sure `/api/*` responses also get `X-Content-Type-Options: nosniff`, `Referrer-Policy` and `X-Frame-Options: DENY` (set them in the Functions `send` helper if `_headers` does not cover Functions responses).
- `Content-Security-Policy` (enforced, not report-only). Build it from what the app actually loads — grep `src/`, `shared/`, `index.html`, `public/**/*.html`, `vite.config.ts` for every external origin and every inline script/style. Must keep working:
  - Google Identity Services: `https://accounts.google.com/gsi/client` script, its iframe/frame (`frame-src https://accounts.google.com`), style `https://accounts.google.com/gsi/style`, connect `https://accounts.google.com/gsi/`.
  - Cloudflare Web Analytics beacon injected by Pages: script `https://static.cloudflareinsights.com`, connect `https://cloudflareinsights.com`.
  - Optional own-key Gemini in the browser (`generativelanguage.googleapis.com`), WebLLM/on-device model fetches if present (find their real hosts, e.g. huggingface.co / *.hf.co / raw.githubusercontent.com — only what the code uses, including wasm: add `'wasm-unsafe-eval'` only if WebLLM needs it), Datamuse, LanguageTool, any font or image hosts actually used.
  - Inline scripts in `index.html` (the boot/theme script) and the SEO pages: allow by `sha256-` hash computed at build time (add a small Vite plugin or build step that writes the hashes into `dist/_headers`, so editing the script cannot silently break the page), not `'unsafe-inline'`. `application/ld+json` blocks are not executed and need nothing.
  - Styles: React `style={{}}` attributes need `style-src 'self' 'unsafe-inline'` (acceptable) plus the GSI stylesheet.
  - `img-src 'self' data: blob:` (+ Google avatars only if rendered), `worker-src 'self' blob:` if workers are used, `connect-src 'self'` + the origins above.
  - `default-src 'self'; base-uri 'none'; object-src 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`.
- Also: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` disabling camera, microphone, geolocation, payment, usb (keep anything the app uses, e.g. clipboard-write), `Cross-Origin-Opener-Policy: same-origin-allow-popups` (GSI needs popups). Do NOT add COEP (would break GSI/analytics). HSTS: `max-age=31536000` without preload.
- Keep `/google875ebd96080a1cb9.html`, `robots.txt`, `sitemap.xml`, IndexNow key file working.
- Tests: a test that parses the built/generated `_headers`, checks the directives above, and checks every inline `<script>` without a `type` (or with JS type) in `index.html` and `public/**/*.html` has a matching hash; a test that every external origin referenced from `src/` is covered by the CSP (allowlist with comments for ones intentionally not covered, e.g. links).

## 2. Auto-delete old pending/hidden reviews
- Pending and hidden reviews are deleted after 30 days; approved reviews stay. Implement as an opportunistic prune in storage (same pattern as allowance pruning: run at most once per UTC day, e.g. on the first review submission or moderation list request of the day, bounded `DELETE ... WHERE status IN ('pending','hidden') AND created < ?`). Use the existing timestamp column (check `migrations/0002_impact.sql`); add a migration `0005` only if a needed column/index is missing.
- Update Privacy text (and the 11 catalogues if that sentence is translated) to state the 30-day retention for unapproved reviews.
- Tests with the SQLite D1 harness: old pending/hidden removed, fresh ones and approved ones kept, prune runs once per day, failure of prune does not break review submission.
