export interface Turn { role: "user" | "assistant"; content: string }
export interface Answer { part: 1 | 2 | 3; q: string; a: string; sec: number }
export const PROMPTS: Record<"chat" | "kids", string>;
export function setKeys(env: { GROQ_API_KEY?: string; GEMINI_API_KEY?: string }): void;
export function cleanHistory(history: unknown): Turn[] | null;
export function talk(mode: string, history: Turn[]): Promise<{ reply: string; better: string; model: string }>;
export function questions(): Promise<Record<string, unknown> | null>;
export function hear(audio: Uint8Array, type: string, full?: boolean): Promise<{ text: string; unclear: string[] }>;
export function cleanAnswers(answers: unknown): Answer[] | null;
export function mark(answers: Answer[], unsure: string[], only?: number | null, options?: { gemini?: boolean }): Promise<{ error?: string; bands?: Record<string, number>; overall?: number; notes?: unknown; raw?: unknown; model?: string }>;
