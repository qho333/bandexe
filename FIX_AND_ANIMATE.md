# Fix pass + more animations (brief)

Owner (2026-10-26): "use my codex to code and fix any issues and make it have more animations".

## Part A — find and fix real issues (do this first)
Review the whole app as it stands (many features landed today: free provider pool, Mistral, tester pass, Lexibot
features, device feedback-only, mascots play, boot gate + sounds, spider sounds, calibration). Run the app's logic in
your head and through tests; look for: crashes, dead/unreachable UI, stale copy that contradicts current behaviour (e.g.
any remaining "download", "unlimited mode", "band-estimating", "uncalibrated" where a calibration now exists, "5 checks"),
broken flows (write → evaluate → scan → report → accept/reject → export → overview), race conditions, listeners/timers/
GSAP tweens/AudioContexts not cleaned up, a11y regressions (focus, labels, Esc), layout overflow at 360/390/768/1280,
theme-token violations, console errors. Fix what you find, with a regression test for each logic bug. List them.

## Part B — more animation (tasteful, eDEX/terminal feel, flat 2D)
GSAP + CSS, transform/opacity only, ≤ 400 ms each unless noted, no per-frame React renders, paused when tab hidden,
all disabled under prefers-reduced-motion and the app's reduced-motion pref:
- **Screen transitions** (Write ↔ Results ↔ Overview ↔ Privacy): quick terminal-style transition — old screen collapses
  to a scanline, new one draws in with a short glitch flicker (~250 ms).
- **Panels/frames**: on first appearance their 1 px borders trace in from the corners (like the intro HUD), headers
  type in; on hover a faint light runs once along the frame edge.
- **Editor**: on focus the frame corners pulse once; word-count bar fills smoothly; when the minimum is reached a
  small "✓ minimum reached" chip pops; the exam timer digits flip; last 5 minutes the timer gently pulses.
- **Report**: criterion cards slide/stagger in, band numbers count up, sub-skill bars grow from 0, correction marks
  pop in with a stagger, "Top 3 priorities" items tick in one by one, the model-answer panel unrolls.
- **Overview**: chart line draws itself (stroke-dashoffset), range band fades in, sparklines draw, streak squares pop
  in a wave, recurring-difficulty rows slide in.
- **Feedback**: small terminal-style toasts for "Downloaded", "Copied", "Correction accepted", "Saved" (aria-live
  polite), sliding up from above the mascot dock.
- **Loading**: a terminal "processing" shimmer/ellipsis where the app waits (chat replies, model answer).
- Buttons keep the press effects from SOUND_AND_PRESS.md.

## Rules
Theme tokens only; Mono black & white; works at 390 px; no new packages; keep every existing behaviour; tests for any
pure helpers; `npm test`, `npm run build`, `npx wrangler pages functions build --outdir /tmp/cf-fn-check6` pass.
