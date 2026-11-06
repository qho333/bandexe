# Privacy and About translation implementation

Implemented the brief in `TRANSLATE_PAGES.md`. Privacy & terms and About now follow the existing Language setting in all 11 languages: en, vi, zh, ko, ja, th, id, ar, es, pt, hi. No deployment was performed.

## Behavior

- All 10 Privacy sections and all About prose use structured, typed content rendered as React text nodes and links. No HTML strings, Markdown parsing, or `dangerouslySetInnerHTML` are used.
- Sections resolve by stable ID in English source order. A missing translated section falls back individually to English and is marked `lang="en"` and `dir="ltr"`. Arabic sections use `lang="ar"` and `dir="rtl"`, alongside the existing app-level direction handling.
- Every non-English Privacy page starts with a translated convenience notice stating that the English version applies if the translation differs. An accessible button displays the complete English Privacy content in place and returns to the translation. This temporary view does not change saved preferences. Changing Language resets it.
- The conditional sign-in notice, Privacy title, update date, and navigation are localized. Existing IDs, including `privacyTitle`, `publicTitle`, and `privacy-accuracy`, and existing link destinations remain available.
- The checked-in About component contained five sections although the brief specified six. A sixth, “Meet the owner,” now reuses the exact login catalogue messages and `OWNER` name/LinkedIn URL. There is no separate translation of the owner biography to maintain.
- Contributors still come from `src/content/contributors.ts`. Their names and links remain dynamic; the current creator role is translated in each page file.
- The obsolete “This page is in English.” notice and its unused key were removed from all 11 UI catalogues.
- Current English wording was retained, including sign-out clearing local drafts/results, account deletion and revocation, quotas, optional caches, review retention, and provisional model accuracy figures. No older privacy wording was restored.

## Files added

- `src/content/pages/en.ts`: canonical English section content and Privacy page labels.
- `src/content/pages/{vi,zh,ko,ja,th,id,ar,es,pt,hi}.ts`: complete translated content and Privacy labels.
- `src/content/pages/schema.ts`: section/run types, authoring helpers, stable section IDs, shared link destinations, and reuse of owner translations.
- `src/content/pages/index.ts`: language registry and section-level English fallback.
- `src/components/PageSections.tsx`: shared React renderer for paragraphs, links, definitions, and dynamic contributors.
- `tests/translated-pages.test.ts`: language coverage, section IDs, paragraph counts, link targets/behavior, Western numeric values, proper names, rendering, owner wording, contributor data, fallback, allowance configuration, and safe text rendering.
- `tests/translated-pages-toggle.test.ts`: English/Arabic switching, button state, unchanged Language setting, reset key, and conditional sign-in notice.
- This implementation report.

## Files updated

- `src/components/Privacy.tsx`: subscribes to Language, renders structured content, and provides the temporary English toggle.
- `src/components/PublicPage.tsx`: renders translated About sections; its translated statistics section also uses the selected language attribute.
- `src/app.css`: preserves section spacing inside the Privacy content wrapper, allows long toggle labels with a 44px minimum target, and uses logical definition-list indentation for Arabic.
- `src/i18n/{en,vi,zh,ko,ja,th,id,ar,es,pt,hi}.ts`: removes the unused English-only notice key.
- `tests/security-headers.test.js`: moves the existing navigational-link exemptions to the new shared link file. The CSP itself is unchanged.

## Editing page text later

1. Edit the English source in `src/content/pages/en.ts`, then update the corresponding section in every other language file.
2. A section entry is `[heading, ...paragraphs]`, keyed by its stable ID. Use `p("text", a("link label", L.accuracy), "more text")` for a paragraph with a link. Keep intentional spaces around inline links. Use `d("term", "definition")` for the essay-routing definition list.
3. Keep section IDs, paragraph counts, link targets, technical identifiers, model IDs, and numeric values aligned across languages. Add genuinely new section IDs to `schema.ts` and every language file. Keep existing IDs to preserve incoming anchors.
4. Shared destinations are in `schema.ts` under `links`. New external destinations also need review in the existing CSP origin test's navigational-link exemptions; navigation links do not require adding network permissions to CSP.
5. Edit Privacy labels and the convenience notice under `privacyPage` in each language file. Ordinary navigation labels remain in `src/i18n/*.ts`.
6. Edit the owner biography in the existing login message in each UI catalogue; both login and About use it. Edit owner identity and contributor entries in `src/content/contributors.ts`. The current creator role is localized through `contributorRole`; if introducing another role, add its translations and renderer mapping too.
7. Allowance numbers in the source prose were already literal. They remain literal in the translations, with tests checking the documented 10/40 guest and 15/60 account allowances against `FREE_CONFIG`. When changing policy or accuracy figures, update every language and run the checks below.

## Verification

Final checks all exited successfully:

- `npx tsc --noEmit`
- `npx vitest run`: **67 test files, 875 tests passed**, including 29 new tests.
- `npm run build`

The build reports a nonblocking warning about chunks larger than 500 kB. The main JavaScript bundle is approximately 1,467 kB minified / 467 kB gzip, including the eagerly imported page translations. Vitest also emits Node's experimental localStorage warning; tests pass.

## Translation review notes

Translations were written against the current checked-in English content and checked for coverage, numerical consistency, links, proper names, and owner-copy parity. Western digits are retained, including decimal accuracy figures. Technical identifiers such as `bx_session`, `HttpOnly`, `SameSite=Lax`, `QUOTA_SALT`, and model IDs are unchanged. No known missing sections or unresolved numerical/link differences remain.

The translations have not received an independent native-speaker review. Automated checks verify structural and factual invariants; they cannot certify every wording choice, especially specialist privacy and infrastructure terminology.
