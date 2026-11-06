# BAND.EXE: free IELTS Writing checker

**Live site: https://bandexe.pages.dev**

BAND.EXE is a free practice site for IELTS Writing. Students write a Task 1 or Task 2 answer under exam timing and get an AI band estimate with criterion scores, reviewed corrections and next steps. There are no payments, upgrades or downloads, and no account is needed.

The site is built and run by Quan Ho, a first-year college student, with AI coding help. It is a practice tool, not an official IELTS score.

## What it does

- **All three Writing tasks:** Academic Task 1 (charts), General Training Task 1 (letters) and Task 2 (essays), with 40 and 20 minute exam timers and word targets.
- **Exam-style workspace:** the question and your answer side by side, with a timer, word count and checker panel. On Task 2 the question stays in view as you scroll.
- **Band estimate:** four criterion bands (Task Response/Achievement, Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy), an overall band and a likely range.
- **Reviewed corrections:** every grammar fix and word-choice upgrade quotes your own text, and you can accept or reject each one. A code reviewer drops any fix that doesn't match your essay.
- **Task 1 charts:** upload a chart image or use a built-in practice chart. The marker checks your figures against the chart.
- **Practice questions:** 86 original questions (66 for Task 2, 20 General Training letters), checked so they don't copy existing published prompts.
- **Helpers:** Coach, Synonyms and Ideas mascots for help while writing. Ideas never writes the essay for you.
- **Progress:** per-task history and charts stored in your own browser, plus daily missions and collectibles.
- **11 languages** for the interface and feedback: English, Vietnamese, Chinese, Japanese, Korean, Thai, Indonesian, Hindi, Spanish, Portuguese and Arabic.

## How marking works

Essays go to free AI models in this order, falling back when one is busy or out of free quota:

1. Gemma 4 26B (Google AI Studio free tier)
2. Groq free tier (Qwen 27B, gpt-oss-120b, gpt-oss-20b)
3. OVH AI Endpoints (Llama 70B, Mistral)
4. Cloudflare Workers AI
5. OpenRouter free models (last resort, uncalibrated)

Each model's raw bands are adjusted with a calibration fitted on **27 official IELTS sample scripts** that carry real examiner bands (IELTS.org 2023 Academic and General Training samples and computer-delivered samples). On those scripts, Gemma's calibrated overall band is within 0.5 of the examiner's on 87% and within 1 band on 95% (mean error 0.44 bands). 27 scripts is a small set, so treat these as rough figures. The overall band is computed in code, not by the AI, using the official half-band rounding.

## Free limits

To keep the site free for everyone, each browser gets 10 essay checks and 40 helper uses per day (UTC). An optional Google sign-in raises this to 15 checks and 60 helper uses. Limits are stored only as salted daily hashes, never as your IP address or browser ID.

## Privacy

- Essays are sent to the AI providers above for marking and are not stored by this site. Reviewed reports are cached for 24 hours so a repeat check costs nothing.
- History, drafts and settings stay in your browser's local storage.
- Each AI provider's own terms apply to the text it receives; the site's Privacy page explains this in all 11 languages.

## Tech

- **Frontend:** Vite, React 19, TypeScript, GSAP for number and chart animations.
- **Backend:** Cloudflare Pages Functions (`functions/api/[[path]].ts`), D1 for daily allowances, KV for the report cache.
- **Shared code** (`shared/`): marking prompts, model routing, validation, review and scoring, used by both the API and the browser.
- **Tests:** Vitest, about 940 tests covering marking, review, scoring, limits, routing, history and UI helpers.

```
src/          React app: screens, components, i18n catalogues, practice charts
functions/    Cloudflare Pages API (mark, helper, chart reading, accounts, allowances)
shared/       Isomorphic marking, routing, prompts, scoring and limits
server/       Local Node API for development, with fixture replies
migrations/   D1 schema
tests/        Vitest tests
research-data/tools/  Calibration runner for the official scripts (the scripts themselves are not included)
```

The `*.md` files next to this README are development briefs and implementation notes.

## Run locally

Node 22 or newer.

```sh
npm install
npm run dev:fixture  # full UI with canned marking replies, no API keys needed
npm test
npm run build
```

`npm run dev` uses real models and needs your own free API keys (it reads `GEMINI_API_KEY` from the environment or the macOS Keychain). Never commit keys: `.dev.vars` and `.env*` are git-ignored.

## Not included

Official IELTS sample scripts, the research database and AI-marked datasets are not in this repository. They belong to their publishers.

IELTS is a registered trademark of the University of Cambridge, the British Council and IDP Education. This project is not affiliated with or endorsed by them.
