# Lexibot parity, free (brief)

Owner (2026-10-26): "do it how LexiBot does it ... but make it free." Lexibot's public checker (see
`../Website Ideas/Knowledge/Lexibot Teardown.md`) offers: criterion estimates, grammar vs word-choice revisions,
paragraph advice, structure guidance, **model responses**, a **follow-up chat**, **Word export**, and feedback options.
We already have the report. Add the missing pieces, all at $0 (on-device first, then the student's own key or the
site's free Gemini quota; Gemini rules stay: 18+ confirmation, hidden for EU/EEA/CH/UK).

## 1. Model answer ("Show a band-9 version")
- Button on the report, on demand only (never part of normal marking, never changes the score).
- Engine order: Gemini (site or own key, if allowed and confirmed) → Qwen3-4B on device if ready → otherwise explain.
- Prompt: rewrite the student's own essay at band 9, same position and main ideas, same task type and word range;
  base it on `../research-data/marker/band9_rewrite.md` (copy what's needed into shared prompts, generated like the
  others). Output plain paragraphs only. Label clearly: "Model answer for study. It is not your score and not your
  writing." Side-by-side (desktop) / stacked (phone) with the original; diff highlighting optional.
- Cache per essay hash in memory so repeated clicks don't spend quota.

## 2. "Ask about this feedback" chat
- On the report page: a chat box scoped to this essay and report ("Why is 'has became' wrong?", "How do I fix
  paragraph 2?"). Context sent = question, essay, the reviewed report summary (criteria summaries, corrections,
  priorities). Nudges and explanations only: it must not write a full new essay (point to the model answer instead).
- Engine order: Chrome built-in AI (Nano) when available (free, unlimited, on device) → Qwen3-4B if ready →
  Gemini helper (Flash-Lite) if allowed → explain. Show which engine answered.
- Keep the last ~10 turns in memory only (not saved), with a clear "Clear chat". Rate-limit Gemini use as the helper does.

## 3. Word (.docx) export
- Add "Download .docx" next to .md/.txt/print. Build a real Office Open XML file in the browser with no new packages:
  a small store-only (no compression) ZIP writer with CRC-32, plus the minimal parts
  ([Content_Types].xml, _rels/.rels, word/document.xml, optionally word/styles.xml). Same content as the .md export:
  headings, bands (omitted for feedback-only), the essay with corrections as `[original → fix]` (strike/underline
  runs if simple), lists of corrections, upgrades, paragraph comments, priorities, strengths, honest labels.
- Unit-test the ZIP (CRC values, central directory offsets) and that the XML is well-formed and escaped.

## 4. Feedback language
- Display/Check option "Feedback language": English (default), Tiếng Việt, 中文, 한국어, 日本語, ภาษาไทย, Bahasa Indonesia,
  العربية, Español, Português, हिन्दी. Explanations, summaries, paragraph comments, priorities and chat replies in that
  language; quotes, corrections and model answers stay in English. Passed to Gemini and on-device prompts as an
  instruction; the reviewer still requires exact English quotes. RTL layout for Arabic in those text blocks.

## 5. "Since last time" (personal memory)
- Computed on the device from the student's own saved history (src/lib/progress.ts helpers), never sent to change
  the band: compare this report's correction/priority themes with recurring difficulties from previous checks of
  the same task type → "Fixed since last time: articles (came up 3 of your last 4 checks, not this time)" and
  "Still coming up: subject–verb agreement". Show it near the top of the report when there is history.
- Coach and the feedback chat get a one-paragraph summary of the student's recurring difficulties as context.

## Rules
Free only; no new packages; theme tokens; Mono black & white; works at 390 px; reduced motion respected; honest labels;
never present a band for feedback-only results; keep the Gemini gating; tests for pure logic (zip writer, docx parts,
language instruction building, since-last-time diff, engine order, model-answer caching). `npm test` and `npm run build` pass.

## 6. Zero-setup default checker (owner decisions 2026-10-26)
Owner: "They just should be able to write their essay, press the mark, and get their feedback" — no download, no
18+ question, no key. Payment decision (final, owner 2026-10-26): **no money ever** — not the owner, not students. Only free tiers and on-device AI. Nothing in the code or docs may suggest adding billing. Up to 10 checks per person per day.

- **Default engine for everyone = Cloudflare Workers AI with an open model** via a Pages Functions AI binding
  (`[ai] binding = "AI"` in wrangler.toml; `context.env.AI.run(model, {...})`). Primary model
  `@cf/openai/gpt-oss-120b`, fallback `@cf/mistralai/mistral-small-3.1-24b-instruct`; model ids in one config
  constant. No Google terms apply, so: **no 18+ confirmation and no EU/UK block on this path.** Same prompt, JSON report,
  `reviewReport`, code-computed overall and per-request budget (max 3 upstream calls). Label results
  "AI practice estimate (open model, uncalibrated)" with their own markingVersion; the Gemini +1 calibration is NOT
  applied. Calibration for this model comes later from a blind test on the official scripts.
- **Provider pool (tried in order, all behind the same Free checker):** (1) OpenRouter free models via
  `https://openrouter.ai/api/v1/chat/completions` with secret `OPENROUTER_API_KEY` (model list in one config constant,
  e.g. a strong `:free` open model first, then 1–2 alternates; **never buy credits**: the no-purchase free tier is
  50 requests/day account-wide, 20/min; handle 429/402 by moving on), (2) Cloudflare Workers AI binding as above, (3) `pool_empty`. Each provider's
  result records its model in markingVersion. If `OPENROUTER_API_KEY` is absent, skip it. Queue briefly (up to ~20 s,
  with the spider still scanning) when OpenRouter returns a per-minute 429 before moving on.
- **Per-person daily allowance: start at 5 checks/day (config constant, owner may raise to 10)**, keyed by a salted hash of `CF-Connecting-IP` + UTC date, counted in a
  Workers KV namespace binding `QUOTA` (optional; if missing, skip the per-person count). Response headers / JSON include
  `remainingToday`. The UI shows "3 of 5 free checks left today" near EVALUATE (no number shown when unknown).
- **Site-wide free pool** = Workers AI's free 10,000 neurons/day (~30 full reports). When Workers AI reports the free
  allocation is exhausted (or any capacity error) and no paid plan is set: return `{error:"pool_empty"}` → friendly card:
  "Today's free checks are used up for everyone. They reset at midnight UTC. Want to keep going now? Unlimited mode
  runs on your computer (one-time download)." Plus automatic use of an already-ready on-device engine (existing
  fallback). Do not document or suggest paid upgrades.
- **Default for new visitors = "Free checker" (this cloud path).** Picker labels: "Free checker — no setup"
  (default), "Best detail — Gemini (18+, your key or site)", "Unlimited mode — runs on your computer". The Gemini
  options keep their 18+ and region gating, but only appear when chosen. Coach/Ideas helpers also use the free
  cloud path by default (count 1 helper message as 0.2 of a check, or give helpers a separate 30/day allowance).
- **Local dev** (`npm run dev`, no AI binding): the Free checker falls back to the existing Node server (site Gemini
  or fixture) so development still works; `npm run cf:dev` uses the real binding (needs the owner's Cloudflare login).
- Never mention downloads or keys on the default path. Privacy page: say essays on the Free checker go to Cloudflare's
  AI service to be marked and are not stored by this site.

## 0. Sound on by default, effortless unlock (owner: "the sounds should be default applied")
- Sound stays ON by default. Browsers block audio until a user gesture, so during the intro a click/tap ANYWHERE on
  the intro (not just the hint) resumes audio without skipping; keys and the Skip button still skip. Remove the
  "returning visitors need a saved opt-in" rule (every load plays the full intro with sound when allowed). After the
  intro, the first click anywhere on the page also unlocks audio for the spider and other sounds.
