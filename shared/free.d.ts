import type { MarkInput, HelperInput } from "./index.js";
import type { MarkResult } from "../src/lib/types";
export interface FreeEnv { TESTER_TOKEN?: string; GEMINI_API_KEY?: string; FREE_GEMMA?: string; FREE_OVH?: string; MISTRAL_API_KEY?: string; GROQ_API_KEY?: string; OPENROUTER_API_KEY?: string; AI?: { run(model: string, input: unknown): Promise<unknown> } }
export function isTester(request: Request, env: FreeEnv): Promise<boolean>;
export const FREE_CONFIG: { mistralModels: string[]; groqModels: string[]; groqEssayModels: string[]; models: string[]; routerModels: string[]; checksPerDay: number; helpersPerDay: number; accountChecksPerDay: number; accountHelpersPerDay: number; maxCalls: number; queueMs: number; callTimeoutMs: number; requestTimeoutMs: number; visionModel: string; groqVisionModel: string };
export const POOL_MESSAGE: string;
interface Options { maxTokens?: number; fetchFn?: typeof fetch; wait?: (ms: number) => Promise<void>; budget?: { calls: number; queuedMs?: number; retried?: string[]; providerIndex?: number; modelIndex?: number; startedAt?: number }; json?: boolean; full?: boolean; raw?: boolean; provider?: "mistral" | "groq" | "google" | "ovh" | "router" | "cf"; model?: string; lean?: boolean; systemAddendum?: string; prefer?: string }
export function scrubContacts(text: string): string;
export function freeCompletion(messages: unknown[], env: FreeEnv, options?: Options): Promise<{ text: string; model: string; provider: string; budget: { calls: number } }>;
export function markFree(input: MarkInput, env: FreeEnv, options?: Options): Promise<MarkResult>;
export function helperFree(input: HelperInput, env: FreeEnv, options?: Options): Promise<{ reply: string; model: string }>;

export function modelAnswerFree(input: MarkInput, env: FreeEnv, options?: Options): Promise<{ reply: string; model: string }>;

export const CHART_NOTE: string;
export const CHART_PROMPT: string;
export function chartReference(input: MarkInput, env: FreeEnv, options?: Options, budget?: { calls: number }): Promise<{ input: MarkInput; automatic: boolean }>;
export function parse(text: string): any;
export function questionFromImage(image: { data: string; mime: string }, env: FreeEnv, options?: Options): Promise<{ question: string }>;
export const QUESTION_PROMPT: string;
