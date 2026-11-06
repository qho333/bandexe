// No tokenizer dependency or network access. These are explicitly estimates,
// alongside exact character counts; they are not provider-reported token counts.
import { buildSystem, buildOpenSystem } from "../shared/prompt.js";

console.log("English system prompt only; estimated tokens = ceil(characters / 4).");
console.table(["t2", "ac1", "gt1"].map((task) => {
  const input = { task, feedbackLanguage: "en" };
  const before = buildSystem(input), after = buildOpenSystem(input);
  return { task, beforeCharacters: before.length, afterCharacters: after.length,
    beforeEstimatedTokens: Math.ceil(before.length / 4), afterEstimatedTokens: Math.ceil(after.length / 4) };
}));
