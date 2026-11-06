import { describe, expect, it } from "vitest";
import { buildMarkUser, buildOpenSystem, buildUser } from "../shared/prompt.js";

const input = { task: "t2", question: "Q?", essay: "Some essay text.", words: 3, chartDescription: "", reportMode: "compact" } as const;

describe("feedback language reaches the free markers", () => {
  it("leaves English prompts exactly as calibrated", () => {
    expect(buildOpenSystem({ ...input, feedbackLanguage: "en" })).not.toContain("REQUIRED OUTPUT LANGUAGE");
    expect(buildMarkUser({ ...input, feedbackLanguage: "en" })).toBe(buildUser(input));
  });
  it("states the language first in the system prompt and again after the essay", () => {
    const system = buildOpenSystem({ ...input, feedbackLanguage: "vi" });
    expect(system.startsWith("REQUIRED OUTPUT LANGUAGE: Tiếng Việt (vi).")).toBe(true);
    const user = buildMarkUser({ ...input, feedbackLanguage: "vi" });
    expect(user.indexOf("ESSAY>>>")).toBeLessThan(user.indexOf("REQUIRED OUTPUT LANGUAGE"));
    expect(user).toContain('Copy "original", "corrected" and "better" exactly in English');
  });
});
