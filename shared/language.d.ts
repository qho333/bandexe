export type FeedbackLanguage = "en" | "vi" | "zh" | "ko" | "ja" | "th" | "id" | "ar" | "es" | "pt" | "hi";
export const LANGUAGES: [FeedbackLanguage, string][];
export function feedbackLanguage(value?: unknown): FeedbackLanguage;
export function languageInstruction(value?: unknown): string;
export function languageReminder(value?: unknown): string;
