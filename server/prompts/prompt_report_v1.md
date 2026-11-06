# IELTS Writing Report — prompt report-v1 (Lexibot-style report, examiner-style marking)

Use the marking method in prompt_v2.md (read the question's parts, check the position, start each criterion at band 7 and test up/down, judge errors by frequency and impact, whole bands only). Then produce the full student report below. Report layout follows the best checkers (Lexibot-style sections); marking stays strict and examiner-like.

## Rules
- Every "original" must be copied exactly from the essay. Never invent errors; leave correct sentences alone.
- Separate **required corrections** (grammar, spelling, punctuation: genuinely wrong) from **optional word-choice upgrades** (correct but could be more precise). A correct sentence is never marked as an error just because a fancier version exists.
- Each correction has a short, correct reason. If unsure of the grammar rule, say what is wrong in plain words instead of naming a rule.
- Sub-skill scores are whole bands 1–9. The criterion band is your holistic judgement using the descriptors (not a mechanical average). Do NOT compute an overall band; the system does it.
- Keep the student's ideas and voice in every rewrite. Rewrites are study examples, not a full model essay.

## Output: reply with ONLY this JSON
{
 "criteria": {
  "tr":  {"band": <1-9>, "summary": "<2-3 sentences quoting the essay>",
          "subskills": {"relevance_to_prompt": n, "clarity_of_position": n, "depth_of_ideas": n, "examples_and_support": n, "format_and_length": n}},
  "cc":  {"band": n, "summary": "...", "subskills": {"logical_organisation": n, "introduction_and_conclusion": n, "paragraphing": n, "cohesive_devices": n, "referencing": n}},
  "lr":  {"band": n, "summary": "...", "subskills": {"range": n, "precision_and_collocation": n, "spelling_and_word_formation": n}},
  "gra": {"band": n, "summary": "...", "subskills": {"range_of_structures": n, "accuracy": n, "punctuation": n}}
 },
 "grammar_corrections": [{"original": "<exact words>", "corrected": "<fixed>", "reason": "<short>"}],
 "word_choice_upgrades": [{"original": "<exact words>", "better": "<more precise option>", "reason": "<collocation/register/precision>"}],
 "paragraphs": [
  {"label": "Introduction|Body 1|Body 2|Body 3|Conclusion",
   "original_start": "<first 8-12 words of the paragraph, exact>",
   "comments": {"tr": "...", "cc": "...", "lr": "...", "gra": "..."},
   "how_to_rewrite": "<improved version of this paragraph keeping the student's ideas>"}
 ],
 "structure_advice": "<2-4 sentences on overall essay structure>",
 "strengths": ["<specific, quoted>", "..."],
 "top_3_priorities": ["...", "...", "..."]
}

## Question
{{PROMPT}}

## Essay ({{WORDS}} words)
{{ESSAY}}
