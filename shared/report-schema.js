// One report contract for every open marking provider. Compact omits verbose fields.
const string = { type: "string" };
const object = (properties) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const array = (items) => ({ type: "array", items });
const band = { type: "integer", minimum: 1, maximum: 9 };
const subskills = {
  tr: ["relevance_to_prompt", "clarity_of_position", "depth_of_ideas", "examples_and_support", "format_and_length"],
  cc: ["logical_organisation", "introduction_and_conclusion", "paragraphing", "cohesive_devices", "referencing"],
  lr: ["range", "precision_and_collocation", "spelling_and_word_formation"],
  gra: ["range_of_structures", "accuracy", "punctuation"],
};
export function reportSchema(full = false) {
  return object({
    criteria: object(Object.fromEntries(Object.entries(subskills).map(([key, names]) => [key, object({ band, summary: string,
      ...(full ? { subskills: object(Object.fromEntries(names.map((name) => [name, band]))) } : {}) })]))),
    grammar_corrections: array(object({ original: string, corrected: string, reason: string })),
    word_choice_upgrades: array(object({ original: string, better: string, reason: string })),
    paragraphs: array(object({ label: string, original_start: string,
      comments: object({ tr: string, cc: string, lr: string, gra: string }), ...(full ? { how_to_rewrite: string } : {}) })),
    structure_advice: string, strengths: array(string), top_3_priorities: array(string),
  });
}
export function reportFormat(provider, model, full = false) {
  const schema = reportSchema(full);
  if (provider === "mistral" || (["groq", "router"].includes(provider) && /^openai\/gpt-oss-(?:120|20)b(?::free)?$/.test(model)))
    return { type: "json_schema", json_schema: { name: "writing_report", strict: true, schema } };
  // Workers binding uses schema directly, rather than the OpenAI json_schema wrapper.
  if (provider === "cf") return { type: "json_schema", json_schema: schema };
  return { type: "json_object" };
}
