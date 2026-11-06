import type { MarkInput } from "./index.js";
export function buildSystem(input: Pick<MarkInput, "task" | "feedbackLanguage"> & Partial<Pick<MarkInput, "image" | "chartDescription">>): string;
export const FREE_PROMPT_VERSION: string;
export function buildOpenSystem(input: Pick<MarkInput, "task" | "feedbackLanguage" | "reportMode"> & Partial<Pick<MarkInput, "image" | "chartDescription">>): string;
export function buildUser(input: Pick<MarkInput, "question" | "essay" | "words" | "chartDescription">): string;
export function buildMarkUser(input: Pick<MarkInput, "question" | "essay" | "words" | "chartDescription" | "feedbackLanguage">): string;
export function repairPrompt(criteria: string[]): string;

export const COMPACT_REPORT_RULES: string;
