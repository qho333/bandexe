# Launch pieces: privacy & terms, report export, grammar check (brief)

## 1. Privacy and terms page (`#privacy`)
Plain language, short headings, Mono black-and-white page in the same terminal style. Linked from the footer of every
screen, the login card and the checker setup ("What happens to my essay?"). Must be accurate to what the code does:
- **Stored in this browser only** (localStorage): draft, history, display settings, checker choice, and the student's
  own Gemini key if they save one. Clearing site data removes it. No account system is live yet ("Sign-in is coming
  soon"); when it ships this page will be updated.
- **Where an essay goes, by checker:**
  - On this device: nowhere. The model files download from Hugging Face (Qwen) or Google (Chrome's Gemini Nano)
    once; the essay is not sent.
  - My own Gemini key: from the browser straight to Google. On Google's free tier Google may use it to improve its
    models.
  - Site Gemini: to this site's server, then to Google with the site's key, same free-tier note. The server keeps no
    copy beyond short-lived rate-limit counters (check server code and state exactly what it keeps).
- **Helpers:** Synonyms sends only the looked-up word to Datamuse. Coach and Ideas send the question to Gemini
  (site or own key). Grammar check (below) sends the essay text to LanguageTool.
- **Fonts:** loaded from Google Fonts.
- **Terms:** practice estimates only, not official IELTS results; not affiliated with IELTS, the British Council,
  IDP or Cambridge; no guarantee of accuracy (link the measured numbers); free to use, fair use on the shared
  checker; don't paste personal or sensitive information into essays.
- "Last updated" date. No legal boilerplate walls.

## 2. Report export
On the results page: **Download report** (a `.md` file and a `.txt` file option) and **Print / Save as PDF**
(`window.print()` with a print stylesheet: white paper, black text, no HUD, no mascots, no spider, marks shown as
underline + bracketed fixes, page breaks between sections). The export contains: task, date, checker label and
estimate label, band and range (omit entirely for feedback-only results), criterion bands and summaries, the essay
with corrections inline as `[original → fix]`, grammar list, upgrades list, paragraph comments, priorities,
strengths. Honest labels stay ("AI practice estimate…", "Fixture data" when in fixture mode). Accept/reject state
is reflected (rejected items listed as such, or excluded; choose one and say so in the file).

## 3. Grammar and spelling check while writing (LanguageTool)
- Button in the editor toolbar: **Check spelling & grammar**. On click only (never on every keystroke): POST the
  essay to `https://api.languagetool.org/v2/check` (form fields `text`, `language=en-GB`) straight from the browser.
  The free public API allows about 20 requests per minute and 20 KB per request per IP, so each student has their
  own allowance; handle 429 with a friendly "try again in a minute".
- Show results as a list under the editor: the sentence context with the problem underlined, the message, and up to
  3 suggestions as buttons; clicking a suggestion replaces exactly that span in the draft (verify the text at that
  offset still matches; if the essay changed, ask to re-check). "Ignore" per item. Clicking an item selects the span
  in the textarea.
- **Exam mode:** while the exam timer is running, the button is disabled with the note "Not available during a
  timed attempt — the real test has no spellchecker." Keep the textarea's native spellcheck off as now.
- Mention LanguageTool in the privacy page. First use shows a one-line notice that the text is sent to LanguageTool.

## Rules
- Free only; no new npm packages. Mono black-and-white via theme tokens; works in all 5 themes and at 390px.
- Don't touch: Boot.tsx, src/lib/boot.ts, src/lib/spider.ts, src/lib/scan.ts, shared/*, src/lib/device-report.ts,
  src/lib/checker.ts, src/lib/fixes.ts, src/lib/types.ts (a test page depends on these right now; if a type must
  change, add a new type in a new file instead), app/__nano_test.html, app/__nano_blind.json.
- Tests: export content (band omitted for feedback-only; corrections inline; honest labels), LanguageTool request
  building and response mapping (offsets, replacement safety when text changed, 429 handling), exam-mode disable.
  `npm test` and `npm run build` pass.
