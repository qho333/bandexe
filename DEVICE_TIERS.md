# On-device by default: tiers + automatic fallback (brief)

Owner decision (2026-10-26): "make on-device the default unlimited checker. Add Chrome's built-in Gemini Nano
(blind-test its accuracy first), Qwen3-4B for strong devices, a smaller model for weaker ones, and automatic
fallback when Gemini hits its limit."

## Measured accuracy on the 27 official IELTS.org scripts (leave-one-out calibrated)
| Engine | within ±0.5 | within ±1 | r | Use |
|---|---|---|---|---|
| Gemini 3.6 Flash (provisional cal.) | 67% | 100% (12 scripts) | – | best quality, limited |
| Qwen3-4B | 52% | 78% | 0.77 | **bands OK** |
| Qwen3-1.7B | 37% | 59% | 0.58 | **no better than guessing** |
| Guess the average band every time | 37% | 63% | – | baseline |
| Gemini Nano (Chrome built-in, measured 2026-10-26) | 60% | 80% (20 marked) | 0.71 | **feedback only**: scores only 5.25–7.0 vs official 3.0–8.5, so weak and strong writers both get ~6–7; 7/27 replies ran past the output limit (fixed with schema bounds + brief retry: 7/7 then succeeded) |

Consequence: the smaller model must NOT show a band. It gives feedback only (grammar corrections and word-choice
upgrades that pass the exact-quote review, paragraph notes, top priorities) with the line
"Feedback only: this smaller model is not accurate enough to estimate a band on this device."

## Engines (the "On this device" mode picks one automatically; student can override in an Advanced list)
1. **Chrome built-in AI (Gemini Nano)** via the Prompt API (`LanguageModel.availability()`, `LanguageModel.create()`
   with `monitor` for download progress, `session.prompt()`; use `responseConstraint` JSON schema if available).
   States: unavailable / downloadable / downloading / available. Chrome downloads the model itself; still ask consent
   before calling `create()` when the state is "downloadable" (say: Chrome downloads Google's on-device model once,
   several GB, needs free disk space; nothing you write leaves the device).
   Gate bands behind a constant `NANO_BANDS_VALIDATED = false` in code. Until the blind test passes, Nano runs in
   **feedback-only** mode like the small model. A later change flips it after measurement.
2. **Qwen3-4B (WebLLM)**: existing worker. Bands + short report, uncalibrated, existing label.
3. **Small model (WebLLM, `Qwen3-1.7B-q4f16_1-MLC`, about 1 GB)**: feedback only, no band.

Auto-pick order on "On this device":
- If Nano state is `available` → Nano.
- Else if WebGPU adapter exists and the device looks strong (adapter `limits.maxBufferSize` ≥ 2 GB, or
  `navigator.deviceMemory` ≥ 8 when exposed; be conservative and allow override) → Qwen3-4B.
- Else if WebGPU exists → small model.
- Else if Nano is `downloadable` → offer Nano.
- Else: no on-device engine; explain and offer Gemini (own key or site).
Show which engine was picked and why in one line, with a "Change" link.

## Default mode
- New visitors default to **On this device** (unlimited). Nothing downloads until they consent; until an engine is
  ready, EVALUATE shows the consent/setup card instead of failing. Returning visitors keep their saved choice.
- Copy on the picker: "On this device — free, unlimited, private" / "My own Gemini key — best report, your own daily
  allowance" / "Site Gemini — best report, shared daily allowance".

## Automatic fallback when Gemini hits its limit
- When the site checker or own key returns quota/limit (`code` quota, limit, busy, or Google 429):
  - If an on-device engine is ready: re-run the same essay on it automatically, keep the spider scan going, and show
    a notice on the report: "Gemini's free daily allowance is used up, so this was checked on your device instead."
  - If none is ready: show the existing fallback offer (set up on-device, or add own key), never a dead end.
- Never fall back silently from device to Gemini (that would send the essay off the device): ask first.

## Report differences
- Feedback-only results: hide the band number, range bar and criterion bands; show the label above; keep corrections,
  upgrades, paragraph notes and priorities. History stores them without a band and excludes them from progress charts.
- Personal-best celebration only for results with a band.

## Rules
- Free only. Mono black and white via theme tokens. Do not touch Boot.tsx/boot.ts, shared/score.js calibration or
  shared/mark.js retry/budget logic, server limits.
- Keep web-llm and Nano code lazy (not in the main chunk). Workers and sessions destroyed on unmount/mode switch.
- Tests: auto-pick decision table, feedback-only rendering (no band anywhere), fallback trigger codes, no download
  before consent, Nano gate, default mode for new vs returning visitors. `npm test` and `npm run build` pass.
