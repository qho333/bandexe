import { OWNER } from "../contributors";
import { translateMessage } from "../../lib/i18n";
import type { UILanguage } from "../../lib/ui-language";

/** Curated text and links only. Strings are always rendered as React text nodes. */
export type Run = string | { text: string; href?: string; external?: boolean; term?: boolean };
export type Block = readonly Run[];
export interface Section { id: string; heading: string; paragraphs: readonly Block[] }
export type SectionCopy = readonly [heading: string, ...paragraphs: Block[]];
export interface PrivacyChrome {
  title: string;
  updated: string;
  signInNotice: string;
  translationNotice: string;
  showEnglish: string;
  showTranslation: string;
}
export interface PageContent {
  privacy: readonly Section[];
  about: readonly Section[];
  privacyPage: PrivacyChrome;
  contributorRole: string;
}

export const p = (...runs: Run[]): Block => runs;
export const a = (text: string, href: string, external = false): Run => ({ text, href, external });
export const d = (term: string, text: string): Block => [{ text: term, term: true }, text];

/** Navigation destinations live here so translations cannot accidentally change them. */
export const links = {
  googlePrivacy: "https://policies.google.com/privacy",
  accuracy: "#privacy-accuracy",
  react: "https://react.dev/",
  vite: "https://vite.dev/",
  typescript: "https://www.typescriptlang.org/",
  gsap: "https://gsap.com/",
  lenis: "https://lenis.darkroom.engineering/",
  webllm: "https://webllm.mlc.ai/",
  groq: "https://groq.com/",
  cloudflare: "https://developers.cloudflare.com/workers-ai/",
  openrouter: "https://openrouter.ai/",
  mistral: "https://mistral.ai/",
} as const;

export const privacyIds = ["privacy-storage", "privacy-signing-in", "privacy-essay", "privacy-reports", "privacy-gemini", "privacy-server", "privacy-impact", "privacy-helpers", "privacy-terms", "privacy-accuracy"] as const;
export const aboutIds = ["about-purpose", "about-marking", "about-accuracy", "about-contributors", "about-owner", "about-credits"] as const;
type CopyInput = {
  privacy: Partial<Record<typeof privacyIds[number], SectionCopy>>;
  about: Partial<Record<Exclude<typeof aboutIds[number], "about-owner">, SectionCopy>>;
  privacyPage: PrivacyChrome;
  contributorRole: string;
};

export function makePages(language: UILanguage, input: CopyInput): PageContent {
  const sections = (ids: readonly string[], copy: Record<string, SectionCopy>): Section[] => ids.flatMap((id) => {
    const entry = copy[id];
    return entry ? [{ id, heading: entry[0], paragraphs: entry.slice(1) as Block[] }] : [];
  });
  const owner: SectionCopy = [
    translateMessage("Meet the owner", undefined, language),
    p(translateMessage("{name} is the owner of BAND.EXE: a first-year college student at SUA, from Vietnam. He'd love your support on his journey.", { name: OWNER.name }, language)),
    p(a(translateMessage("Support him on LinkedIn", undefined, language), OWNER.linkedin, true)),
  ];
  return {
    privacy: sections(privacyIds, input.privacy),
    about: sections(aboutIds, { ...input.about, "about-owner": owner }),
    privacyPage: input.privacyPage,
    contributorRole: input.contributorRole,
  };
}
