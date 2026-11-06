import { browserLanguage, languageDirection } from "./ui-language";
import { setUILanguage } from "./i18n";
import { LANGUAGES } from "../../shared/language.js";
import { BACKGROUNDS } from "../content/backgrounds";
import { CHARACTERS } from "../content/characters";
import { MASCOT_SVG, type MascotId } from "../mascot-art";
// Theme and effects, saved in localStorage (wrapped: storage can be blocked).
export type Theme = "mono" | "matrix" | "amber" | "cyan" | "paper";
export type OnOff = "on" | "off";
export type PanelLook = "blur" | "clear" | "solid";
export interface Prefs { panelLook?: PanelLook; background?: string; skins?: Partial<Record<MascotId, string>>; keepAIEnglish?: boolean; uiLanguage?: import("./ui-language").UILanguage; feedbackLanguage?: import("../../shared/language.js").FeedbackLanguage; theme: Theme; scanlines: OnOff; glow: OnOff; mascots: OnOff; boot: OnOff; sound: OnOff; typingSounds: OnOff; reduced: OnOff; edSize: "16" | "17" | "18" }

export const PANEL_LOOKS: [PanelLook, string][] = [["blur", "Blur"], ["clear", "See-through"], ["solid", "Solid"]];
export const THEMES: [Theme, string][] = [
  ["mono", "Mono (default)"], ["matrix", "Matrix Green"], ["amber", "Amber CRT"], ["cyan", "Cyan HUD"], ["paper", "Paper (light)"],
];
const KEY = "bandexe-prefs";
export const DEFAULT_PREFS: Prefs = { panelLook: "blur", uiLanguage: browserLanguage(), feedbackLanguage: browserLanguage(), theme: "mono", scanlines: "off", glow: "off", mascots: "on", boot: "on", sound: "on", typingSounds: "off", reduced: "off", edSize: "17" };

export function loadPrefs(): Prefs {
  const language = browserLanguage();
  const prefs = { ...DEFAULT_PREFS, uiLanguage: language, feedbackLanguage: language };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (!saved || typeof saved !== "object") return prefs;
    if (THEMES.some(([theme]) => theme === saved.theme)) prefs.theme = saved.theme;
    for (const key of ["scanlines", "glow", "mascots", "boot", "sound", "typingSounds", "reduced"] as const) {
      if (saved[key] === "on" || saved[key] === "off") prefs[key] = saved[key];
    }
    if (["16", "17", "18"].includes(saved.edSize)) prefs.edSize = saved.edSize;
    // One Language setting drives the whole app and the AI feedback. Older saves that only chose a
    // feedback language carry it over as the app language.
    if (LANGUAGES.some(([code]) => code === saved.uiLanguage)) prefs.uiLanguage = saved.uiLanguage;
    else if (LANGUAGES.some(([code]) => code === saved.feedbackLanguage)) prefs.uiLanguage = saved.feedbackLanguage;
    prefs.feedbackLanguage = prefs.uiLanguage;
    if (PANEL_LOOKS.some(([look]) => look === saved.panelLook)) prefs.panelLook = saved.panelLook;
    else if (saved.panelBlur === "off") prefs.panelLook = "solid"; // saved by the earlier on/off setting
    if (BACKGROUNDS.some((b) => b.id === saved.background)) prefs.background = saved.background;
    const skins = CHARACTERS.filter((c) => saved.skins?.[c.helper] === c.id);
    if (skins.length) prefs.skins = Object.fromEntries(skins.map((c) => [c.helper, c.id]));
  } catch { /* blocked or corrupt storage uses safe defaults */ }
  return prefs;
}
export function savePrefs(p: Prefs) {
  // appliedTheme is read by the inline script in index.html, so the page never flashes the wrong colours.
  try { localStorage.setItem(KEY, JSON.stringify({ ...p, appliedTheme: appliedTheme(p) })); } catch { /* ignore */ }
}

/** Text between panels must stay readable, so a light background needs the Paper colours and a dark one a dark theme. */
export function appliedTheme(p: Prefs): Theme {
  const tone = BACKGROUNDS.find((b) => b.id === p.background)?.tone;
  return tone === "light" ? "paper" : tone === "dark" && p.theme === "paper" ? "mono" : p.theme;
}

/** The drawing for a helper: the student's chosen skin, or the classic one. */
export function helperArt(id: MascotId, p: Pick<Prefs, "skins">) {
  return CHARACTERS.find((c) => c.id === p.skins?.[id])?.svg ?? MASCOT_SVG[id];
}

const mq = typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
export const systemReduced = () => Boolean(mq?.matches);
export const motionOK = (p: Prefs) => !systemReduced() && p.reduced !== "on";
export function onSystemMotionChange(fn: () => void) {
  mq?.addEventListener("change", fn);
  return () => mq?.removeEventListener("change", fn);
}

export function applyPrefs(p: Prefs) {
  setUILanguage(p.uiLanguage || browserLanguage());
  const d = document.documentElement;
  d.lang = p.uiLanguage || browserLanguage();
  d.dir = languageDirection(d.lang as import("./ui-language").UILanguage);
  d.setAttribute("data-theme", appliedTheme(p));
  d.setAttribute("data-bg", p.background ? "on" : "off");
  d.setAttribute("data-panels", p.panelLook ?? "blur");
  d.setAttribute("data-scanlines", p.scanlines);
  d.setAttribute("data-glow", p.glow);
  d.setAttribute("data-mascots", p.mascots);
  d.classList.toggle("motion-ok", motionOK(p));
}

/** Sound follows the default on every load; an explicit off choice still wins. */
export function bootSoundEnabled(_returning: boolean) {
  const prefs = loadPrefs();
  if (prefs.boot !== "on" || !motionOK(prefs) || prefs.sound !== "on") return false;
  return true;
}

/** Scan audio follows Sound and both motion settings, independently of the boot preference. */
export const scanSoundEnabled = (prefs: Prefs = loadPrefs()) => prefs.sound === "on" && motionOK(prefs);
