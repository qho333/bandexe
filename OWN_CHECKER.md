# Every student gets their own checker (brief for GPT-6.1 Sol)

Owner requirement (2026-10-26): "Everyone who goes to this website gets their own checker AI with 0 limits."

## The honest constraint
The site's shared free Gemini key has a small daily quota (about 20 marking calls per day on 3.6 Flash), so the
server limits in `server/lib/limits.js` must stay: without them one visitor could use up everyone's checks.
The only ways to give each student their own checker at $0 are:

| Mode | Limits | Quality | Data |
|---|---|---|---|
| **A. My own free Gemini key** | Only Google's free limits on *that student's* key; no site limit | Full Lexibot-style report (same marker as the site) | Browser → Google directly; never touches our server |
| **B. On this device** (WebLLM, `Qwen3-4B-q4f16_1-MLC`) | **None.** Unlimited, works offline after the download | Weaker: measured 78% within ±1 band, r 0.77 on 27 official scripts; shorter feedback | Never leaves the device |
| C. Site checker (existing) | Shared fair-use limits | Full report | Via our server to Google |

Copy rule: never say "unlimited" for A or C. Say "your own quota" for A and "unlimited, on your device" for B.

## Part 1: shared marking core + own-key mode (A)
1. Move the pure marking pipeline into an isomorphic `shared/` module used by both the server and the browser:
   prompt building, the Gemini request/response handling, JSON repair, `reviewReport`, scoring and validation.
   `server/lib/*` re-exports or imports from it, so there is one source of truth. The prompt text must not need
   `node:fs` in the browser: generate a `shared/prompts.generated.js` (string constants) from `server/prompts/*.md`
   with a small script run by `npm run build`/`dev`/`test`, plus a test that the generated text equals the .md files.
2. **Checker picker** on the Write page next to Evaluate (and in Display settings): "Site checker", "My own key",
   "On this device". Remember the choice in localStorage (try/catch). Default: own key if one is saved, otherwise site.
3. **Own key setup panel**: password-type input (`autocomplete="off"`, `spellcheck=false`), Save / Remove buttons,
   a "Test key" button that makes one cheap request (Flash-Lite) and reports OK or the Google error text.
   Steps to get a free key: open aistudio.google.com/apikey, sign in, Create API key, paste here.
   Warnings, plain language: the key is stored only in this browser; anyone using this browser profile can use it;
   use only the free allowance; remove it on shared computers.
4. Own-key requests go **directly** from the browser to `https://generativelanguage.googleapis.com` with the
   `x-goog-api-key` header (never in the URL, never logged, never sent to `/api`). Same models, prompt, review and
   report shape as the server. The Coach and Ideas helpers also use the student's key when one is saved.
5. When the site checker returns its limit message, the result screen offers: "Use my own free key" and
   "Check on this device" instead of a dead end.
6. Results show which checker produced them (small label: "Checked with your own Gemini key", etc.), stored with
   the history entry.

## Part 2: on-device checker (B)
7. Load `@mlc-ai/web-llm` (installed, pinned 0.2.85, Apache-2.0) **only on demand** (dynamic import) inside a
   **Web Worker** so the editor never freezes. Model `Qwen3-4B-q4f16_1-MLC`.
8. Before any download: check WebGPU support (`navigator.gpu`, adapter request). If unsupported, say so and suggest
   mode A. Otherwise show a consent card: about 2.3 GB one-time download from Hugging Face, needs about 3.5 GB of
   graphics memory, cached by the browser for next time, works offline afterwards, nothing is sent anywhere.
   Download starts only after the student clicks "Download and enable". Show real progress from WebLLM's
   progress callback; allow cancel. Never auto-download.
9. Use the same prompt v2 method with a shorter JSON report suited to a 4B model (bands per criterion, a few
   corrections with exact quotes, priorities). Run the same `reviewReport` so corrections must match the essay
   exactly. Missing sections are hidden, never invented. Academic Task 1 with only an image: ask for a typed chart
   description (the 4B model cannot read images).
10. Label: "On-device estimate (lower accuracy: about 4 in 5 essays within 1 band in our tests)".
11. The spider scan and report UI work unchanged for all three modes.

## Rules
- Keep everything free. Keep the Mono black-and-white look; colours via theme tokens only.
- Do not touch the boot intro files. Do not weaken server limits.
- Tests for: prompt generation equality, own-key request building (header, no key in URL), picker persistence,
  limit-message fallback offer, WebGPU-unsupported path. `npm test` and `npm run build` must pass.
- Update `.env.example`/README notes if they mention the checker.
