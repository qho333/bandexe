import { loadPrefs, motionOK, type Prefs } from "./prefs";
import { createCueGate, createSynth, silenceSounds } from "./sound";

export const INTERACTION_GAP_MS = { click: 45, hover: 80, switch: 80, toggle: 70, power: 300, engage: 350, accept: 90, reject: 90, bulk: 250, mascot: 100, hop: 140, error: 250, confirm: 100, typing: 45 };
export type InteractionCue = keyof typeof INTERACTION_GAP_MS;
export const createInteractionGate = () => createCueGate(INTERACTION_GAP_MS);
export function interactionCue(event: "press" | "hover" | "focus" | "change", control: { cue?: string; disabled?: boolean; primary?: boolean; nav?: boolean; toggle?: boolean; touch?: boolean }): InteractionCue | null {
  if (control.disabled || control.cue === "handled") return null;
  if (event === "hover" || event === "focus") return control.primary && !control.touch ? "hover" : null;
  if (event === "change") return control.cue === "power" ? "power" : "toggle";
  if (control.cue && Object.hasOwn(INTERACTION_GAP_MS, control.cue)) return control.cue as InteractionCue;
  return control.nav ? "switch" : control.toggle ? "toggle" : "click";
}

let prefs: Prefs | undefined;
let synth: ReturnType<typeof createSynth>;
const gate = createInteractionGate();
export function configureInteractionSound(next: Prefs) {
  prefs = next;
  if (next.sound !== "on" || !motionOK(next)) silenceSounds();
}
export function playInteraction(cue: InteractionCue) {
  const p = prefs ?? loadPrefs();
  if (p.sound !== "on" || !motionOK(p) || (cue === "typing" && p.typingSounds !== "on") || !gate(cue, performance.now())) return;
  synth ??= createSynth({ enabled: true });
  const voice = synth;
  if (!voice) return;
  // Resume in the gesture; never replay a delayed cue after a blocked device eventually unlocks.
  const pending = voice.resume();
  const at = performance.now();
  const play = () => {
    const current = prefs ?? loadPrefs();
    if (!voice.ready() || current.sound !== "on" || !motionOK(current)) return;
    const note = (pitch: number, delay = 0, duration = 0.09, volume = 0.10) => voice.tone(pitch, pitch, duration, volume, "sine", undefined, delay);
    if (cue === "click") { voice.hiss(0.025, 0.045, 1600, 300); voice.tone(280, 150, 0.035, 0.07, "triangle"); }
    if (cue === "hover" || cue === "typing") voice.tone(1050, 700, 0.012, cue === "typing" ? 0.018 : 0.025, "triangle");
    if (cue === "switch") voice.tone(460, 740, 0.065, 0.09, "triangle");
    if (cue === "toggle") voice.tone(800, 560, 0.03, 0.07, "triangle");
    if (cue === "engage") { voice.hiss(0.035, 0.08, 2400, 600); voice.tone(180, 920, 0.19, 0.16, "triangle"); }
    if (cue === "power") { voice.tone(440, 100, 0.09, 0.09); note(660, 0.10, 0.14); }
    if (cue === "accept" || cue === "confirm") { note(660); note(cue === "accept" ? 990 : 880, 0.07); }
    if (cue === "reject") voice.tone(140, 65, 0.12, 0.12, "triangle");
    if (cue === "bulk") [440, 550, 660, 880].forEach((pitch, i) => note(pitch, i * 0.045, 0.11, 0.08));
    if (cue === "mascot") voice.tone(620, 1050, 0.075, 0.08);
    if (cue === "hop") { voice.hiss(0.15, 0.04, 300, 1500); voice.tone(220, 580, 0.12, 0.055); }
    if (cue === "error") voice.tone(125, 95, 0.14, 0.09, "triangle");
  };
  if (voice.ready()) play();
  else void pending.then(() => { if (performance.now() - at < 120) play(); });
}

/** One delegated listener set also covers dialogs rendered into portals and future buttons. */
export function installPressFeedback() {
  const selector = "button, a.btn, label.btn, [role=button], .app-nav a, [role=tab], .seg button";
  let touch = false, keyboard = false;
  const control = (event: Event) => (event.target as Element | null)?.closest<HTMLElement>(selector);
  const cueFor = (event: "press" | "hover" | "focus" | "change", el: HTMLElement) => interactionCue(event, {
    cue: el.matches(".mascot-runner, .mascot-floor") ? "handled" : el.dataset.sound, disabled: el.matches(":disabled, [aria-disabled=true]") || !!el.closest("[inert]"),
    primary: el.classList.contains("btn--primary"), nav: !!el.closest(".app-nav, .seg") || el.matches("[role=tab]"),
    toggle: el.hasAttribute("aria-pressed"), touch,
  });
  const flash = (el: HTMLElement, className: string) => {
    if (!motionOK(prefs ?? loadPrefs())) return;
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
  };
  const press = (event: Event) => {
    if (!event.isTrusted || document.querySelector(".boot")) return;
    const el = control(event);
    if (!el) return;
    const cue = cueFor("press", el);
    if (cue) playInteraction(cue);
    if (cue === "engage") flash(el, "is-engaged");
    if (cue === "switch" && el.closest(".app-nav")) {
      const screens = ["write", "results", "overview"];
      const nav = el.closest<HTMLElement>(".app-nav")!;
      const root = document.documentElement;
      root.style.setProperty("--nav-from", String(Math.max(0, screens.indexOf(nav.dataset.current ?? "write"))));
      root.style.setProperty("--nav-to", String(Math.max(0, screens.indexOf(el.getAttribute("href")?.slice(1) ?? "write"))));
      flash(root, "is-nav-switching");
    }
  };
  const pointer = (event: PointerEvent) => { touch = event.pointerType === "touch"; keyboard = false; if (event.button === 0) press(event); };
  const click = (event: MouseEvent) => { if (event.detail === 0) press(event); };
  const hover = (event: PointerEvent) => {
    touch = event.pointerType === "touch";
    const el = control(event);
    if (!el || el.contains(event.relatedTarget as Node | null) || document.querySelector(".boot")) return;
    const cue = cueFor("hover", el); if (cue) playInteraction(cue);
  };
  const focus = (event: FocusEvent) => {
    if (!keyboard || document.querySelector(".boot")) return;
    const el = control(event); if (!el) return;
    const cue = cueFor("focus", el); if (cue) playInteraction(cue);
  };
  const key = (event: KeyboardEvent) => { if (event.key === "Tab") { keyboard = true; touch = false; } };
  const change = (event: Event) => {
    const el = event.target as HTMLElement;
    if (!event.isTrusted || !el.matches("select, input[type=checkbox], input[type=radio]")) return;
    const cue = cueFor("change", el); if (cue) playInteraction(cue);
    if (cue === "power") flash(document.documentElement, "is-power-cycling");
  };
  const typing = (event: Event) => {
    if (!event.isTrusted || (event.target as HTMLElement).id !== "editor" || !(event instanceof InputEvent) || event.isComposing || !event.inputType.startsWith("insertText")) return;
    playInteraction("typing");
  };
  const ended = (event: AnimationEvent) => {
    if (event.animationName === "engage-label") (event.target as HTMLElement).closest(".is-engaged")?.classList.remove("is-engaged");
    if (event.animationName === "nav-slide") document.documentElement.classList.remove("is-nav-switching");
    if (event.animationName === "power-cycle") document.documentElement.classList.remove("is-power-cycling");
  };
  document.addEventListener("pointerdown", pointer, true);
  document.addEventListener("click", click, true);
  document.addEventListener("pointerover", hover);
  document.addEventListener("focusin", focus);
  document.addEventListener("keydown", key, true);
  document.addEventListener("change", change);
  document.addEventListener("input", typing);
  document.addEventListener("animationend", ended);
  return () => {
    document.removeEventListener("pointerdown", pointer, true); document.removeEventListener("click", click, true);
    document.removeEventListener("pointerover", hover); document.removeEventListener("focusin", focus);
    document.removeEventListener("keydown", key, true); document.removeEventListener("change", change);
    document.removeEventListener("input", typing); document.removeEventListener("animationend", ended);
    synth?.stop(); synth = null;
  };
}
