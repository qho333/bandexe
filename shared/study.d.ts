import type { MarkInput } from "./index.js";
export function modelAnswerPrompt(input: MarkInput): { system: string; user: string };
export function modelAnswer(input: MarkInput, options: { key: string; fetchFn?: typeof fetch }): Promise<string>;
