import { useSyncExternalStore } from "react";
import { en, type Catalogue, type MessageKey } from "../i18n/en";
import { isUILanguage, languageDirection, type UILanguage } from "./ui-language";

// Each language is about 65 KB, so a student only downloads the one they use.
const loaders: Record<Exclude<UILanguage, "en">, () => Promise<{ default: Catalogue }>> = {
  vi: () => import("../i18n/vi"),
  zh: () => import("../i18n/zh"),
  ko: () => import("../i18n/ko"),
  ja: () => import("../i18n/ja"),
  th: () => import("../i18n/th"),
  id: () => import("../i18n/id"),
  ar: () => import("../i18n/ar"),
  es: () => import("../i18n/es"),
  pt: () => import("../i18n/pt"),
  hi: () => import("../i18n/hi"),
};
// Holds only the languages loaded so far; every read below falls back to English.
export const catalogues = { en } as Record<UILanguage, Catalogue>;
let language: UILanguage = "en";
const listeners = new Set<() => void>();
export const getUILanguage = () => language;
export const subscribeLanguage = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function setUILanguage(value: unknown) {
  const next = isUILanguage(value) ? value : "en";
  if (typeof document !== "undefined") {
    document.documentElement.lang = next;
    document.documentElement.dir = languageDirection(next);
  }
  if (language === next) return;
  language = next;
  listeners.forEach((listener) => listener());
  if (!catalogues[next]) void loadLanguage(next).then(() => { if (language === next) listeners.forEach((listener) => listener()); });
}
/** Resolves once this language's text is ready. A failed download leaves English in place. */
export async function loadLanguage(value: unknown) {
  if (!isUILanguage(value) || value === "en" || catalogues[value]) return;
  try {
    catalogues[value] = (await loaders[value]()).default;
    // Page text is built from the catalogue above, and imports this file, so it has to come second.
    await (await import("../content/pages")).loadPageContent(value);
  } catch { /* English fallback */ }
}
export const useUILanguage = () => useSyncExternalStore(subscribeLanguage, getUILanguage, getUILanguage);
export const useTranslation = () => { useUILanguage(); return t; };
export type MessageVars = Record<string, unknown>;
/** Replacement callbacks preserve literal dollar signs and markup in user-provided names. */
export function formatMessage(source: string, vars: MessageVars = {}): string {
  return source.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] == null ? match : String(vars[key]));
}
export function translateMessage(key: MessageKey, vars?: MessageVars, locale: UILanguage = language, catalogue: Partial<Catalogue> = catalogues[locale] ?? en): string {
  return formatMessage(catalogue[key] || en[key], vars);
}
export function t(key: MessageKey, vars?: MessageVars) { return translateMessage(key, vars); }

const patterns = Object.keys(en).filter((key) => /\{\w+\}/.test(key)).map((key) => {
  const names: string[] = [];
  const fragments = key.split(/(\{\w+\})/).map((fragment) => {
    if (/^\{\w+\}$/.test(fragment)) { names.push(fragment.slice(1, -1)); return "(.+?)"; }
    return fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  });
  return { key: key as MessageKey, names, pattern: new RegExp("^" + fragments.join("") + "$") };
});
/** Only call at chrome boundaries: never use on essay text, prompts, corrections or AI replies. */
export function translateUI<T>(source: T): T {
  if (typeof source !== "string" || language === "en") return source;
  if (Object.hasOwn(en, source)) return t(source as MessageKey) as T;
  for (const { key, names, pattern } of patterns) {
    const match = pattern.exec(source);
    if (match) return t(key, Object.fromEntries(names.map((name, i) => [name, match[i + 1]]))) as T;
  }
  return source;
}
/** Unknown upstream failures get a calm localised message, rather than exposing technical response bodies. */
export function translateError(source: string) {
  const translated = translateUI(source);
  return language !== "en" && translated === source && !Object.hasOwn(en, source)
    ? t("Could not complete this action. Please try again.") : translated;
}
