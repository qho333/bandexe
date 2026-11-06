export const LANGUAGES = [
  ["en", "English"], ["vi", "Tiếng Việt"], ["zh", "中文"], ["ko", "한국어"], ["ja", "日本語"],
  ["th", "ภาษาไทย"], ["id", "Bahasa Indonesia"], ["ar", "العربية"], ["es", "Español"], ["pt", "Português"], ["hi", "हिन्दी"],
];
export const feedbackLanguage = (value) => LANGUAGES.some(([id]) => id === value) ? value : "en";
/** Free models skip a language rule buried after long English rubric text: restate it first and after the essay. English adds nothing. */
export function languageReminder(value) {
  const id = feedbackLanguage(value);
  if (id === "en") return "";
  const name = LANGUAGES.find(([code]) => code === id)[1];
  return `REQUIRED OUTPUT LANGUAGE: ${name} (${id}). Write every "summary", "reason", "comments", "structure_advice", "strengths" and "top_3_priorities" value in ${name}, not English. Copy "original", "corrected" and "better" exactly in English. JSON keys stay in English.`;
}

export function languageInstruction(value) {
  const id = feedbackLanguage(value), name = LANGUAGES.find(([code]) => code === id)[1];
  return `Feedback language: ${name} (${id}). Write explanations, criterion summaries, paragraph comments, structure advice, priorities, strengths and chat replies in this language. Keep all quoted essay text, corrections, word-choice replacements, rewrite examples and model answers in English. Preserve exact English quotes; keep JSON field names unchanged.`;
}
