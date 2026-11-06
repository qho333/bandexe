# Sounds + button interaction (brief)

Owner (2026-10-26): "add more sounds and interactiveness when I press a button and also make it default at the start
for the sound of the terminal to play when typing a bunch of words. It always has a click to play sound."

## 1. Boot sound without the "[ CLICK FOR SOUND ]" hint
Browsers block audio until a user gesture; no site can bypass that. So:
- At boot, create the AudioContext and check `state`. If it is already `running` (browser allows audio), start the
  intro immediately with sound, as now.
- If it is `suspended`: show a full-screen **boot gate** in the intro's terminal style before the typing starts:
  blinking block cursor + `BAND.EXE v<version>` + `[ PRESS ANY KEY TO BOOT ]` (and "or tap / click anywhere" on touch),
  a faint scanline. The first key/click/tap resumes audio AND starts the intro, so the typing sound plays from the first
  character. That first gesture must NOT skip the intro (stop it reaching the skip handler); after the intro starts,
  keys/Skip behave as now (skip). Remove the "[ CLICK FOR SOUND ]" hint entirely.
- Sound pref off, reduced motion, or Boot off: no gate, behave as now (no intro / silent).
- Safety: the gate never traps the app. Show a small "Skip intro" button on the gate too; and if the gate is left for
  30 s with no input, skip straight to the app silently. Works at 390 px.

## 2. More sounds and press interactions across the app
Synthesized Web Audio only (reuse src/lib/sound.ts), modest volume, throttled, theme-agnostic, all respecting the Sound
preference and both reduced-motion settings (no sound and no motion effects when reduced). One shared, lazy
AudioContext; first user gesture unlocks it (that is fine everywhere after the boot gate).
- **EVALUATE**: a satisfying "engage" sound (short rising sweep + click) and a press animation: press-in (scale 0.97),
  a quick glitch/RGB-split flash of the label, and a thin scan line across the button. Disabled state stays calm.
- **Buttons / links styled as buttons**: soft mechanical click on press; very quiet tick on hover/focus for primary
  buttons only (throttled ~80 ms, none on touch).
- **Tabs / nav (Write, Results, Overview)**: a short switch blip; active tab underline slides.
- **Toggles / selects / theme change**: a toggle tick; theme change gets a brief "power cycle" sound and flicker.
- **Corrections**: Accept = pleasant two-note chime + the mark turns solid; Reject = soft low thunk + mark fades;
  Accept all / Reject all = short arpeggio.
- **Mascots**: small squeak/boop on click, a "hop" whoosh when dragged and dropped (keep it subtle; mascot files may be
  edited only for calling the sound helper).
- **Errors** (form error, pool empty): short soft buzz. **Copy/download/export**: confirm blip.
- **Typing in the editor**: optional very soft key tick — OFF by default, add a "Typing sounds" toggle in Display.
- Visual press feedback everywhere: :active press-in for all buttons, focus-visible rings kept.

## Rules
Theme tokens only; Mono black & white; no new packages; no audio files; never play sounds the student didn't cause
except the boot sequence and the existing scan sounds. Tests for pure helpers (throttling, which events map to which
sound, gate state machine: running→start, suspended→gate→first gesture starts & doesn't skip, 30 s timeout).
