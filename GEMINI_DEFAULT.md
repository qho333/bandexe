# Gemini as the main free checker, behind one 18+ tick (brief)

Owner decision (2026-10-30): Mistral is not free for the owner, so drop it from the default path. Use the site's
Gemini key (the marking the owner liked: Flash with cal-v2 stretch, then Flash-Lite with its own stretch) as the main
Free checker, behind a single remembered "I'm 18 or older" confirmation (Google's Gemini API terms: no under-18s; free
tier not allowed for EU/EEA/CH/UK users). Everyone else falls back to the open pool. No money, no downloads.

## Behaviour
- Free checker, first EVALUATE: an inline card above the button (not a modal wall): "Gemini marking is for people
  aged 18 or over (Google's rule)." [I'm 18 or older] [Continue without Gemini]. Remembered in localStorage; changeable
  in Display ("Gemini marking: on/off"). Never asked again once answered.
- Ticked and region allowed (health `gemini.allowed`, server re-checks `cf.country`): the request carries
  `X-Age-Confirmed: 1` and the server marks with Gemini via `GEMINI_API_KEY` using shared/mark.js (Flash -> Flash-Lite
  fallback, per-model calibration, 3-call budget). If Gemini returns quota/unavailable, fall through to the open pool.
- Not ticked, EU/UK, or no GEMINI_API_KEY: the open pool: Groq -> OpenRouter -> Workers AI -> pool_empty
  (Mistral stays in code but last/skipped when its secret is absent; do not mention Mistral in UI copy).
- Per-person 10/day allowance unchanged; cache unchanged; tester pass unchanged.
- Labels: Gemini results keep their calibrated labels; open-pool results "open model, uncalibrated".
- Privacy page: explain both paths and the 18+ / EU-UK rule plainly; remove Mistral as the primary provider wording.
- DEPLOY_CLOUDFLARE.md: GEMINI_API_KEY is now the main secret (owner sets it: the command that pipes it from macOS
  Keychain without showing it); GROQ_API_KEY optional; Mistral optional/unused.

## Tests
Age card shows once and persists; ticked + allowed -> Gemini path (mocked fetch hits generativelanguage, header-only
key); not ticked / EU / missing key -> open pool; Gemini quota -> falls through to open pool; no age header without the
tick; copy contains no "Mistral" on the default path. npm test, npm run build and the wrangler functions build pass.
