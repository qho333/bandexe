import { LANGUAGES, type FeedbackLanguage } from "../../shared/language.js";

export type UILanguage = FeedbackLanguage;
export const isUILanguage = (value: unknown): value is UILanguage => LANGUAGES.some(([code]) => code === value);
/** Respect browser priority, including regional tags such as vi-VN and zh-Hant. */
export function browserLanguage(languages: readonly string[] = typeof navigator === "undefined" ? [] : navigator.languages || [navigator.language]): UILanguage {
  for (const tag of languages) {
    const code = tag.toLowerCase().split(/[-_]/)[0];
    if (isUILanguage(code)) return code;
  }
  return "en";
}
export const languageDirection = (language: UILanguage) => language === "ar" ? "rtl" : "ltr";

/** Choosing an interface language starts feedback in that language, unless explicitly kept in English. */
/** The one Language setting: the interface and the AI feedback always use the same language. */
export function languagePreferences<P extends { uiLanguage?: UILanguage; feedbackLanguage?: FeedbackLanguage; keepAIEnglish?: boolean }>(prefs: P, language: UILanguage): P {
  const { keepAIEnglish: _dropped, ...rest } = prefs;
  return { ...rest, uiLanguage: language, feedbackLanguage: language } as P;
}
