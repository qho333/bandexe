# Brief: translate Privacy & terms and About into all 11 languages (owner approved 2026-10-31)

Goal: the whole app follows the one Language setting (`prefs.uiLanguage`, see `src/lib/i18n.ts`, `src/i18n/*.ts`). Today `src/components/Privacy.tsx` (10 `lang="en"` sections) and the About part of `src/components/PublicPage.tsx` (6 sections) are English-only with a "This page is in English." note. Translate them fully into vi, zh, ko, ja, th, id, ar, es, pt, hi (English stays the source).

## How
- Move the long prose out of the components into structured content per language, e.g. `src/content/pages/<code>.ts` exporting `{ privacy: Section[], about: Section[] }`, where a Section is `{ id, heading, paragraphs: Block[] }` and a Block is an array of text runs and link runs `{ text, href, external? }` (or a tiny `{text}`/`{link}` structure). No `dangerouslySetInnerHTML`, no Markdown, no HTML strings: render React elements only (XSS-safe).
- Components render the current language's content (`useUILanguage()`), falling back to English per section if a language lacks one. Set `lang={code}` on the translated sections (and `dir` for Arabic via the existing app-level handling). Remove the "This page is in English." note when the page is translated; keep the key in catalogues only if still used elsewhere.
- Keep every existing `id` / anchor (e.g. `#privacy-accuracy`) and every link target exactly; the dynamic parts (e.g. contributors list from `src/content/contributors.ts`, accuracy figures, model names, limits like 15/10 checks, 60/40 helpers, 30 days, 31 days, 24 hours, 500/200 results) must stay identical numbers in every language. Prefer pulling numbers from existing constants (`FREE_CONFIG` etc.) where the English already does.
- Add one sentence at the top of Privacy & terms in each non-English version: "This is a translation for convenience; if it differs from the English version, the English version applies." (translated), with a link/button to show the English version (a simple toggle that renders the English sections in place).
- Translation quality: accurate, plain, student-friendly; must not soften or change any privacy/data/limits meaning. Keep product and proper names untranslated: BAND.EXE, IELTS, Google, Groq, Cloudflare, Workers AI, OpenRouter, Mistral, Gemini, LanguageTool, Datamuse, WebLLM, Hugging Face, React, Vite, TypeScript, GSAP, Lenis, Azeret Mono, Atkinson Hyperlegible, model ids, cookie name `bx_session`, TR/TA/CC/LR/GRA. Owner bio wording must match the login "Meet the owner" translations already in `src/i18n/*.ts`.
- Read the current English text carefully first — it was recently updated (sign-out clears this browser's draft/results; 30-day deletion of unapproved reviews; security headers; one Language setting; account deletion details). Translate what is there now, do not resurrect older wording.

## Tests (add; all existing must pass)
- Every language has the same section ids, same number of paragraphs per section, and the same set of link hrefs per section as English.
- Every number that appears in the English text of a section appears in each translation of that section (digits check), except where a language uses native numerals deliberately (do not: keep Western digits).
- Rendering Privacy and About for each language contains no "This page is in English." note and contains the convenience-translation sentence for non-English Privacy.
- No `dangerouslySetInnerHTML` in the new rendering.

Run `npx tsc --noEmit`, `npx vitest run`, `npm run build` until all pass. Do not deploy. Write `TRANSLATE_PAGES_IMPLEMENTATION.md` (files changed, how to edit page text later, anything uncertain in translation).
