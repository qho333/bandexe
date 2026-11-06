# Results page + spider scan polish (brief for GPT-6.1 Sol)

Observed in the running app (fixture mode, ~800px wide pane and 390px phone). Fix these; keep everything else working.

## Owner rules (do not break)
- **Keep it black and white.** Default Mono theme must read as pure black/white/greys. In Mono, issue marks must not use magenta/olive: use monochrome treatments (grammar = solid 1px outline; word-choice = inverted/grey fill or dashed underline; criterion tag as white-on-black chip). Other themes may tint via existing CSS tokens. Never hard-code colours outside theme tokens.
- **Exception:** the spider keeps its owner-chosen look (thin crimson legs, yellow knee/foot dots, feet plant on words). Do not recolour it.
- Flat 2D, hacker/eDEX feel, honest labels ("AI practice estimate (uncalibrated)", fixture label). No fake metrics.
- Whole essay shown with issues highlighted in place (keep). Grammar corrections separate from word-choice upgrades (keep).

## Report page
1. **Score summary at the top.** Under the big overall + range bar, add a compact 4-cell strip (TR/CC/LR/GRA band each, plus the label/short name), linking to each criterion card. Today the criterion bands only appear below the whole essay.
2. **Wrapped marks.** A mark spanning a line break ("has / became") renders as two boxes and gets two tags. Use `box-decoration-break: clone` (with -webkit-) and render the criterion tag once per mark (first line only).
3. **Gutter tags** must align with the first line of their mark and never overlap each other; if two marks share a line, stack or show one chip with a count, keeping hover/focus access to each.
4. **Popover**: must not cover the selected mark; flip above/below and stay inside the viewport at 390px. Esc closes it and returns focus to the mark.
5. **Reveal**: when the spider finishes, the report should arrive with a short GSAP reveal (overall number counts up from 0, range bar draws, sections stagger in ~40ms each, total <900ms). Respect reduced-motion (no animation). Keep the existing personal-best celebration hook.
6. **Sticky mini-nav** on wide screens (≥1000px): Score · Essay · Criteria · Corrections · Upgrades · Paragraphs · Priorities, highlighting the current section. Hidden on phones.
7. **Top 3 priorities and Strengths** should appear right under the score summary as well as (or instead of) at the very bottom, so the student sees what to do first.

## Spider scan
8. The spider starts with tangled, overlong legs in the first frames (top-left of the essay). Initialise feet at planted rest positions around the body so frame 1 already looks right.
9. Scale the spider a little relative to the essay text (body ≈ 1.3–1.6× line height) so it reads at 800px; keep legs ~1.5–2× body.
10. When it reaches an issue, box the whole mark (respecting wraps) and point a foot at it; never leave a stale box drawn on the wrong line after reflow/scroll.
11. Add a thin progress line in the "Checking your answer" header ("Scanning paragraph 2 of 4") from real progress, not invented numbers.
12. Skip button ("Show report now") and Esc during the scan.

## Global layout bugs seen
13. Header: "Guest, saved in this browser" wraps to 3 lines at ~800px. Shorten to "Guest" with a title/tooltip, or move under 900px.
14. "Draft mascots, not final art" label collides with the Ideas mascot on the dock. Move it so it never overlaps a mascot.
15. Mascot dock covers the bottom of the report content; add bottom padding equal to the dock height.

## Done means
- `npm test` and `npm run build` pass; add tests for any new pure logic (tag placement/grouping, progress text).
- Works in all 5 themes and at 390px, with reduced motion respected.
- Do not touch the boot intro (Boot.tsx, lib/boot.ts) or the server marking code.
