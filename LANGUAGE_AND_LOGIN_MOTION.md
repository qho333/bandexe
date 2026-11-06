# Brief: language picker, login polish, small motion details (owner request 2026-10-30)

Owner words: "make a language setting at the start in the log in and the google sign in looks kinda wierd from the background. make it more interactive with animations in the log in place. ALso add little detail animation on the site".

Keep every existing rule: Mono black-and-white default look, all 5 themes still work, no money, no downloads, no age question, no new third-party scripts or fonts, no tracking. Respect `motionOK(prefs)` / `html.motion-ok` and `prefers-reduced-motion` for every new animation (reduced = no movement, instant states). Animate only transform/opacity/clip-path/dash offsets. Keyboard and screen-reader access must stay intact. All existing tests must pass (`npx vitest run`, `npx tsc --noEmit`, `npm run build`); add tests for new logic.

## 1. Interface language (chosen at the start, on the login screen)
- Languages: exactly `LANGUAGES` from `shared/language.js` (en, vi, zh, ko, ja, th, id, ar, es, pt, hi). Do not change that list or `languageInstruction`.
- Add a small i18n layer in `src/lib/i18n.ts` (no library): typed message catalogue with English as the source, one object per language (put catalogues in `src/i18n/<code>.ts` or similar), `t(key, vars?)`, a React hook/subscription so changing language re-renders immediately without reload, English fallback for any missing key (and a test that every catalogue has every English key).
- New pref `uiLanguage` in `prefs.ts` (validated like feedbackLanguage). Default: first match of `navigator.languages` against the list, else `en`. Set `<html lang>` and `dir="rtl"` for Arabic (check the layout does not break badly in RTL: header, login, write screen, results; use logical CSS properties where you touch CSS).
- Login screen: a clearly visible language selector at the TOP of the sign-in card (first thing in it), styled to match the terminal UI (e.g. a row/grid of language chips or a styled select showing native names). Picking a language: switches the UI language, and also sets `feedbackLanguage` to the same language. Under it, one checkbox/toggle "Keep AI feedback in English" (unchecked by default) for students who want English explanations. Make sure the existing feedback-language control elsewhere (find it) stays in sync with this.
- Also expose the UI language in the existing settings/preferences area so it can be changed later.
- Translate: login, header/nav/menus, account chip, write screen (labels, buttons, timer, word count, task picker, prompts UI chrome — not the IELTS task prompt texts themselves), results screen chrome (headings, criterion names with official English abbreviation kept, buttons, notes, status/error messages), overview, toasts, footer, review form, stats labels, study tools/helpers chrome, Gemini gate. Long legal/explainer prose on Privacy & terms and About may stay English: show a one-line translated note at the top saying the page is in English. SEO static pages in `public/` stay English.
- Translation quality: natural, short, student-friendly; keep "BAND.EXE", "IELTS", band numbers and criterion abbreviations (TR/TA, CC, LR, GRA) untranslated. Do not translate essay content or corrections.

## 2. Google sign-in button looks wrong on the dark background
- Currently `renderButton` uses `theme: "filled_black"` and the GSI iframe shows a light/white box around it because the page has `color-scheme: dark`. Fix it so the button sits cleanly on the card: give the button container `color-scheme: light` (or normal) and a transparent background so the iframe has no white halo, pick the GSI theme per site theme (`filled_black` for dark themes, `outline` for Paper), `shape: "rectangular"`, `width` matching the card's button width (measure the container; re-render on resize/theme change, debounced), and pass `locale` = the UI language so Google's button text matches. Extend the `GoogleIdentity` type for the new options.
- Wrap it in a terminal-styled frame so it looks native (thin border like `.btn`, same height as "Continue as guest"), with a loading skeleton while the script loads and a calm fallback message if it fails.
- Verify visually in all themes.

## 3. More interactive login (animations)
Make the login screen feel alive but still calm and fast (total intro under ~1 s, never blocks clicking):
- Staggered terminal-style reveal of the headline lines and fact list (typing/caret or line-by-line clip reveal).
- Sign-in card: border trace on first show, language chips with press/hover/selected states (selected chip slides an underline/marker to it), small "switching language" glitch/flicker on the card text when language changes.
- Buttons: hover sweep and press depress consistent with existing `.btn` press styles (see SOUND_AND_PRESS.md); successful sign-in shows a brief "ACCESS GRANTED"-style confirmation line before continuing to writing.
- A subtle idle detail: blinking cursor after the headline, or a slow scanning line across the card (respect reduced motion and the scanlines pref).
- Mascots: if mascots are on, one may react (wave/glance) when the user hovers the sign-in or picks a language — reuse existing mascot interaction code; don't add new art.

## 4. Little detail animations across the site
Small, tasteful, consistent with the eDEX/terminal direction (see motion.css, app.css, FIX_AND_ANIMATE.md). Ideas — pick ones that fit and don't duplicate existing motion:
- Number count-up for band scores/stats when they enter view (Stats page, Overview, results overall band) — skip if already present.
- Hover underline sweep on links/nav; focus ring "lock-on" corners on inputs.
- Checkbox/toggle/radio ticks that draw in; chips that pop slightly on select.
- Section headings that reveal with a short caret when first scrolled into view (IntersectionObserver, once per element).
- Toast and dialog enter/exit polish; copy-to-clipboard "COPIED" flash.
- Footer link hover glitch micro-effect.
Keep each effect ≤ 300 ms (count-ups ≤ 900 ms), no layout shift, no effect on Lighthouse CLS, no continuous animations except existing ones and one idle detail on login.

## Deliverables
- Code + tests; list of changed files and a short summary in `LANGUAGE_AND_LOGIN_MOTION_IMPLEMENTATION.md`.
- Do not deploy, do not touch `wrangler.toml`, migrations, secrets, calibration or scoring code.
