# Zero-trouble first visit (brief)

Owner (2026-10-30): "I want users to use it without any trouble."

1. Boot gate: when audio is blocked, show "[ PRESS ANY KEY TO BOOT ]" for at most ~2 s; with no input, start the intro
   automatically (silent). The first click/key anywhere during the intro unlocks sound (without skipping); keys still
   skip as now. Remove the 30 s wait. Returning reloads behave the same. Never trap the user.
2. NO age question on the default path (owner 2026-10-30: many users are minors; default = open models, no Gemini).
   Gemini appears only under "More options → Your own Gemini key (18+)" for adults.
3. Remove any other first-visit friction you find: no login wall (guest by default, Sign in optional and secondary),
   no modal popups on load, no tooltips that block the editor, sample question pre-filled so the student can just write,
   EVALUATE never disabled without a visible reason next to it (e.g. "Write at least 50 words — 12 so far").
4. Clear, friendly messages for every failure (busy, daily limit, offline) with one obvious next action.
5. Tests: gate auto-continues after ~2 s and never blocks; 18+ choice starts evaluation in one click and persists;
   first-visit path reaches a report with no other prompt. npm test, npm run build, wrangler functions build pass.

6. Compact report mode for capacity: the default report asks the model for a compact JSON (bands + up to 8 corrections +
   4 upgrades + 3 priorities + one-line paragraph notes) to roughly halve output tokens on token-capped free tiers;
   a "Full detail" button requests the long version on demand (counts as a helper call, cached). Measure tokens before/after.
