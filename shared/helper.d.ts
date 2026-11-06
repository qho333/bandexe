import type { HelperInput } from "./index.js";
export { askHelper, validateHelperRequest } from "./index.js";
export function buildHelperRequest(input: HelperInput): {
  systemInstruction: { parts: { text: string }[] };
  contents: { role: string; parts: { text: string }[] }[];
  generationConfig: { temperature: number; maxOutputTokens: number };
};
