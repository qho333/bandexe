# BAND.EXE boot intro

A decorative typing sequence and a flickering BAND.EXE logo. No desktop, panels, globe, world clock, filesystem view, terminal window, or on-screen keyboard. No eDEX-UI assets, audio files, new dependencies, artificial device metrics, or intro-triggered downloads.

## Timeline

All times are seconds from mount; constants live in `src/lib/boot.ts`.

| Every load / Replay intro | Time |
| --- | --- |
| Opening blinking cursor; skip is already active | 0–0.25 |
| Three real source lines typed character by character | 0.25–1.4 |
| Accelerating wall of BAND.EXE source | 1.4–2.25 |
| Accelerating dense kernel-style log, real elapsed stamps and `[ OK ]` headings | 2.25–3.8 |
| Logo scramble locks in, split slices, scanline sweep, typed `IELTS WRITING TERMINAL`, flicker and extra late flicker burst | 3.8–6.9 |
| Logo/backdrop/controls fade out as the app fades in | 6.9–7.5 |

The full **7.5 s** intro plays on every load and explicit replay. The short returning timeline remains available internally (1.4 s logo plus 0.6 s handoff, **2 s total**) but is never selected automatically. Independent safety limits are **10 s full / 4 s returning**, each at least 2 s beyond its timeline end; visibility changes and page restore check the wall-clock deadline. Resize keeps the intro playing. The logo card's 3.1 s choreography and 0.6 s handoff are unchanged.

The cursor, source wall and log form one 3.8 s typing sequence (about 4 s) with no intermediate scene or pause. Source text is bundled through Vite `?raw` imports of BAND.EXE's real score, review, validation, scan, history and boot modules. Exported symbol names are extracted from those sources. Log headings and writing notes are original, decorative stage directions. Environment lines report actual browser/OS (best-effort user-agent parse, `UNKNOWN` fallback), locale, time zone, viewport, pixel ratio, browser online status, active theme, and actual bundled-source counts. Stamps are generated from `performance.now() - started` at insertion time; no invented performance, memory, download, network speed, CPU or model-readiness claims.

## Sound

`src/lib/boot-sound.ts` uses the shared voices in `src/lib/sound.ts` to synthesize every sound locally with Web Audio oscillators, generated noise and short gain/filter envelopes:

- Soft, randomized triangle key clicks during visible character typing (at most once per 35 ms).
- Quieter noise/tone data texture during the accelerating source and log flood (55 ms gate).
- Short heading beep for `[ OK ]` rows (160 ms gate).
- Electric noise/sawtooth zap synchronized with logo glitch frames (75 ms gate).
- Low rising tone and filtered-noise power-up whoosh during the 0.6 s handoff.

Master gain is **0.15**; each voice has a quiet envelope. Gates are independent per cue, catch-up batches cannot amplify the mix, and at most 12 sources can be active. Nothing is scheduled while the context is suspended. There are no audio fetches or media assets.

**Display → Sound** is an on/off preference beside Boot intro. Its default is on, including migration of older preferences. The full timeline on every load and explicit replay respects that preference. The dormant short returning timeline requires preferences to explicitly contain `sound: "on"`; its unsaved default is silent. Saved Sound off mutes every visit and replay. Boot off, the app's Reduced motion preference, and `prefers-reduced-motion` bypass the intro entirely and create no audio context.

An enabled intro creates its context and attempts `resume()` at mount. If it remains suspended/interrupted, **`[ CLICK FOR SOUND ]`** appears near Skip intro immediately, even if the browser leaves the resume promise pending. Clicking it stops propagation, prevents the click default, and retries resume directly within that user gesture, without finishing/skipping the intro. The hint disappears when audio runs. Unsupported audio silently leaves the visual intro usable. Keyboard keys continue to skip, including when the sound hint has focus.

On finish, skip, animation failure or unmount, all GSAP work is reverted and audio is stopped. The master ramps to zero in 35 ms, then a bounded 50 ms wall timer stops/disconnects all remaining sources, disconnects the master and closes the context; suspended contexts close immediately. State listeners are removed and late resume promises cannot restore the hint. Completed voices disconnect as they end.

## Essay scan sound and mascot events

`src/lib/scan-sound.ts` shares the same synth, 0.15 master gain, voice cap and cleanup with boot. Every voice is original synthesis; no packages or media assets are added.

- Each actual foot planting requests a soft 27 ms triangle tick, with slight random pitch. A shared 65 ms gate limits simultaneous feet/catch-up frames. Foot x maps across the scan canvas to stereo pan −0.8…+0.8; invalid geometry centres it.
- Walking starts a quiet 108 Hz sine hum, faded up/down over 70 ms between movement and pauses. A suspended context allocates no voices and retries when the walking callback next runs after resume.
- Newly boxed issues request a two-tone lock-on chime (70 ms gate). Pitch rises by one semitone per issue from 660 Hz, capped at eight increments; throttled issues still count toward progression.
- Choosing the final bottom target requests a 300–340 ms rising tone/filtered-noise sweep (600 ms gate).
- When the report mounts, a 420 ms C-major chord plays once; a bounded timer then closes its context.

Evaluate creates and resumes the context synchronously inside its user gesture, before asynchronous device preflight. Failed preflight closes it; the evaluation owns transferred audio through the scan-to-report handoff. `prefs.sound`, the app's Reduced motion preference and `prefers-reduced-motion` all gate audio, independently of Boot on/off. Switching Sound off, reducing motion, error, replacing the evaluation or unmounting stops/closes the audio. Leaving the results screen or hiding the tab fades and stops every source; returning resumes audio on the same unlocked context. Finishing/skipping the crawl fades and stops/disconnects all scan sources within 50 ms, retaining only the idle context for the report chord. Completion, error and unmount also clear pending audio timers. Partial voice construction failures release their nodes; audio failure never interrupts the visual scan.

Per evaluation, `createScanEvents` in `src/lib/scan.ts` dispatches these payload-free `CustomEvent`s on `window`, once each, independent of audio and motion preferences:

- `bandexe:scan-start` when a validated evaluation is submitted.
- `bandexe:scan-end` when the crawl finishes, is skipped, errors, is replaced or the app unmounts. Navigating away pauses the visual crawl; returning continues the same evaluation without another start event.
- `bandexe:report-open` when the report mounts. End always precedes report-open, including instant/reduced-motion completion.

## Interaction, layout and cost

- Skip button and any key (including Esc) work from frame one. The initiating key is consumed; a held key cannot repeat into the editor until keyup/blur.
- Keep `Decorative intro. Nothing is downloaded.` visible near the controls throughout the intro until the handoff fades them.
- The app mounts and loads independently underneath; existing app logic restores focus to the editor or login card after finish.
- All colors use the existing theme tokens for Mono, Matrix, Amber, Cyan and Paper. Mono retains its monochrome split slices.
- At 390 px: one source column, fewer streamed/logged lines, at most 64 retained rows, smaller logo/subtitle, sound and skip targets at least 44 px tall, controls above the note. Desktop keeps at most 96 rows per source column/log and uses a second source column at 1100 px.
- Direct DOM writes via refs; no frame-by-frame React state updates, canvas, live clock, polling, keyboard animation, or perpetual audio loop in the intro. Line heights are measured once; scrolling uses transforms and known row counts. Animation uses transforms/opacity except discrete text/slice updates.
- Scene CSS lives in `src/boot.css`; existing shared cursor/app-content styles stay in `src/styles.css`.

## Verification

`tests/boot.test.ts` covers the timeline, safety deadlines, first-frame skip, returning/replay selection, storage failure, visibility/page restore, held-key guard, resize and cleanup. `tests/boot-prefs.test.ts` covers Sound defaults/migration, persistence, returning opt-in, both reduced-motion settings and Boot off. `tests/boot-sound.test.ts` covers independent throttles, non-bubbling hint activation, suspended/pending/rejected resume, unsupported/partial setup, randomized pitch, modest gain, all cue families, completed-voice disposal, idempotent fade/stop/close and late-promise cleanup. `tests/scan-sound.test.ts` covers scan throttles, stereo mapping, pitch progression/cap, quiet gain, walking hum, dash and completion, voice limits, partial failures and cleanup. `tests/scan.test.ts` covers once-only payload-free window events and their ordering; `tests/boot-prefs.test.ts` also covers scan sound preference gating. Run `npm test` and `npm run build`.

> Owner (2026-10-26): the full intro plays on **every** load (no automatic short version for returning visitors). Skip keys and the Skip button still end it at once.
