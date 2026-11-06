import en from "./en";
import type { UILanguage } from "../../lib/ui-language";
import type { PageContent } from "./schema";

const loaders: Record<Exclude<UILanguage, "en">, () => Promise<{ default: PageContent }>> = {
  vi: () => import("./vi"),
  zh: () => import("./zh"),
  ko: () => import("./ko"),
  ja: () => import("./ja"),
  th: () => import("./th"),
  id: () => import("./id"),
  ar: () => import("./ar"),
  es: () => import("./es"),
  pt: () => import("./pt"),
  hi: () => import("./hi"),
};
// Holds only the languages loaded so far; every read falls back to English.
export const pageContent = { en } as Record<UILanguage, PageContent>;
export async function loadPageContent(language: Exclude<UILanguage, "en">) {
  pageContent[language] ??= (await loaders[language]()).default;
}

/** Resolve by stable ID, in English order, and mark each fallback with its actual language. */
export function resolveSections(kind: "privacy" | "about", language: UILanguage, content: Partial<PageContent> = pageContent[language] ?? {}) {
  return en[kind].map((source) => {
    const translated = content[kind]?.find((section) => section.id === source.id);
    return {
      section: translated ?? source,
      language: translated ? language : "en" as UILanguage,
      contributorRole: translated ? content.contributorRole ?? en.contributorRole : en.contributorRole,
    };
  });
}
