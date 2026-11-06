import type { MarkResult } from "../src/lib/types";
export interface MarkInput {
  chartDescription?: string;
  reportMode?: "compact" | "full";
  feedbackLanguage?: import("./language.js").FeedbackLanguage;
  task: string; question: string; essay: string; words: number;
  image: null | { data: string; mime: string };
}
export interface HelperInput {
  feedbackLanguage?: import("./language.js").FeedbackLanguage; memory?: string; essay?: string; reportSummary?: string;
  role: string; message: string; task: string; taskQuestion: string; paragraph: string;
  history: { role: string; text: string }[];
}
type Validation<T> = { ok: true; value: T } | { ok: false; error: string };
export function validateMarkRequest(body: unknown): Validation<MarkInput>;
export function validateQuestionImage(body: unknown): Validation<{ data: string; mime: string }>;
export function validateHelperRequest(body: unknown): Validation<HelperInput>;
export function mark(input: MarkInput, options: { key: string; fetchFn?: typeof fetch }): Promise<MarkResult>;
export function askHelper(input: HelperInput, options: { key: string; fetchFn?: typeof fetch }): Promise<string>;
export function testKey(key: string, fetchFn?: typeof fetch): Promise<string>;
export class MarkError extends Error { constructor(status: number, code: string, message: string); status: number; code: string }
export const MODEL: string;
export const MARKING_VERSION: string;
export const MAX_BODY_BYTES: number;
export class HelperError extends Error { status: number; code: string }
export const HELPER_MODEL: string;
