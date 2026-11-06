import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { V2, ADDENDUM, REPORT } from "../shared/prompts.generated.js";
import { mark } from "../shared/mark.js";
import { mark as serverMark } from "../server/lib/mark.js";
import { buildSystem, buildUser } from "../shared/prompt.js";

it("generates prompt constants identical to every source markdown file", () => {
  for (const [file, text] of Object.entries({ "prompt_v2.md": V2, "task1_addendum_v2.md": ADDENDUM, "prompt_report_v1.md": REPORT })) {
    expect(text).toBe(readFileSync(new URL(`../server/prompts/${file}`, import.meta.url), "utf8"));
  }
});

describe("shared marking core", () => {
  it("exports the same pipeline to the server and browser", () => {
    expect(serverMark).toBe(mark);
    for (const file of ["prompt", "mark", "review", "score", "validate", "helper", "gemini"]) {
      expect(readFileSync(new URL(`../shared/${file}.js`, import.meta.url), "utf8")).not.toMatch(/node:|readFileSync|process\.|Buffer\./);
    }
  });
  it("keeps Task 1 rules and student text in their respective instructions", () => {
    expect(buildSystem({ task: "ac1" })).toContain("chart image attached");
    expect(buildSystem({ task: "gt1" })).toContain("General Training Task 1");
    expect(buildSystem({ task: "t2" })).not.toContain("chart image attached");
    expect(buildUser({ question: "question", essay: "essay", words: 50 })).toContain("<<<ESSAY (50 words)\nessay\nESSAY>>>");
  });
});
