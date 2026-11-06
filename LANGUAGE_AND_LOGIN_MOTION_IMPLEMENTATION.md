# Language and login motion implementation

Implemented the interface language setting, Google button integration changes, login interactions, and additional terminal details. No deployment was performed.

The interface has 670 source messages in each of the 11 supported catalogues: en, vi, zh, ko, ja, th, id, ar, es, pt, and hi. English defines the typed message keys. The translation layer provides interpolation, English fallback, a React external-store subscription, and translation of known runtime chrome. Unknown upstream errors receive a translated retry message. Catalogue tests require every English key, nonempty translations, and matching interpolation variables.

The login card starts with a native language selector using the existing native language names. Its selected-language marker slides on changes. Choosing a language updates both the interface and feedback preferences; the accessible “Keep AI feedback in English” switch overrides feedback independently. The existing feedback controls remain synchronized, and Display exposes the interface selector later. Browser language priority and regional language tags provide the default; saved values are validated and blocked storage is handled. Arabic sets `html.lang` and RTL direction. Logical alignment, wrapping navigation, and explicit English writing direction support the header, login, editor, and report.

Translations cover navigation, account actions, writing controls and validation, results headings and criterion names, report navigation and notes, overview, statistics, feedback forms, helpers, Gemini gates, footer, and toast announcements. Essay text, task prompts, correction pairs, and AI replies retain their content and feedback language. About and Privacy retain their English explanatory prose with a translated notice. The language list and `languageInstruction` are unchanged.

The Google button container uses a light color scheme and transparent background inside a terminal frame. GSI receives the current UI locale, rectangular shape, measured width (up to 400 px), and `filled_black` for the four dark themes or `outline` for Paper. A ResizeObserver and 120 ms debounce update the iframe; cleanup cancels queued work. Loading has reserved space, a skeleton, a failure message, and a ten-second stalled-script timeout. Guest access remains enabled. Duplicate credentials are ignored; successful authentication displays a 260 ms access confirmation, or continues immediately with reduced motion. Obsolete requests cannot navigate a later login visit.

Login reveals finish in approximately 550 ms and start after the boot overlay leaves. Existing frame traces are reused. Added details include the language marker and tick, a short language-change flicker, button sweep, an optional scanlines-dependent cursor, a mascot hand reaction using existing artwork, footer underlines, and dialog entrance motion. New effects use transform, opacity, clip-path, or dash offset and are gated by application and system motion preferences. Existing report count-ups are reused and extended to numeric overview/stat labels, with final widths reserved. Heading reveals animate the heading rather than replacing React-owned text nodes, avoiding conflicts during language changes. Visibility and cleanup handling stop owned effects appropriately.

Validation on 30 October 2026:

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed |
| `npx vitest run` | Passed: 761 tests, 57 files |
| `npm run build` | Passed |

The 20 added tests cover catalogue completeness, interpolation and fallback, subscription behavior, browser defaults, preference persistence and blocked storage, RTL application, feedback synchronization, translated rendering with preserved essay/correction text, all five GSI theme configurations, measured/debounced resizing, teardown, script failures and timeout, credential deduplication, access confirmation, reduced-motion continuation, and stale request cancellation. All existing tests pass without changes to their assertions.

Visual verification remains incomplete: the sandbox rejected the local development server with `listen EPERM`, and browser policy then rejected the offline preview's `file:` URL. No bypass was attempted. Consequently, actual GSI iframe appearance across the five themes, interactive viewport screenshots, and Lighthouse CLS were not visually measured. The GSI theme and resize behavior is covered by automated tests; live Google authentication was not performed. The build reports a nonfatal large-chunk warning, and Node emits its existing experimental localStorage warning during tests.

Changed files:

- New catalogues: `src/i18n/en.ts`, `src/i18n/vi.ts`, `src/i18n/zh.ts`, `src/i18n/ko.ts`, `src/i18n/ja.ts`, `src/i18n/th.ts`, `src/i18n/id.ts`, `src/i18n/ar.ts`, `src/i18n/es.ts`, `src/i18n/pt.ts`, `src/i18n/hi.ts`.
- New translation and login helpers: `src/lib/i18n.ts`, `src/lib/ui-language.ts`, `src/lib/google-button.ts`, `src/components/LanguagePicker.tsx`.
- Application and styles: `src/App.tsx`, `src/app.css`, `src/motion.css`.
- Preferences, authentication, announcements, motion, mascots, and country labels: `src/lib/prefs.ts`, `src/lib/auth.ts`, `src/lib/announce.ts`, `src/lib/motion.ts`, `src/lib/mascot-stage.ts`, `src/lib/stats.ts`.
- Components: `src/components/AccountChip.tsx`, `src/components/Celebrate.tsx`, `src/components/Checker.tsx`, `src/components/Footer.tsx`, `src/components/GeminiGate.tsx`, `src/components/GrammarCheck.tsx`, `src/components/Header.tsx`, `src/components/Impact.tsx`, `src/components/Login.tsx`, `src/components/Marks.tsx`, `src/components/Mascots.tsx`, `src/components/ModerateReviews.tsx`, `src/components/Overview.tsx`, `src/components/Privacy.tsx`, `src/components/PublicPage.tsx`, `src/components/ReportExport.tsx`, `src/components/Results.tsx`, `src/components/ReviewForm.tsx`, `src/components/StudyTools.tsx`, `src/components/Toast.tsx`, `src/components/Write.tsx`.
- New tests: `tests/language-login.test.ts`, `tests/google-button.test.ts`, `tests/login-lifecycle.test.ts`.
- This implementation record: `LANGUAGE_AND_LOGIN_MOTION_IMPLEMENTATION.md`.

Build outputs were regenerated locally. No dependencies, third-party scripts, fonts, tracking, payments, age questions, or model download flows were added. `wrangler.toml`, migrations, secrets, calibration, scoring code, and public SEO source pages were not changed.
