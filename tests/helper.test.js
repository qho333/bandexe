import { describe, it, expect } from "vitest";
import { validateHelperRequest, buildHelperRequest, makeLimiter, askHelper } from "../server/lib/helper.js";

describe("helper request validation", () => {
  it("accepts a minimal ideas request and trims fields", () => {
    const v = validateHelperRequest({ role: "ideas", message: "  linking words  ", task: "t2", taskQuestion: " Q? " });
    expect(v).toEqual({ ok: true, value: { role: "ideas", message: "linking words", task: "t2", taskQuestion: "Q?", paragraph: "", history: [], essay: "", reportSummary: "", memory: "", feedbackLanguage: "en" } });
  });
  it("rejects unknown roles, empty or long messages, bad task", () => {
    expect(validateHelperRequest({ role: "writer", message: "hi there" }).ok).toBe(false);
    expect(validateHelperRequest({ role: "coach", message: " " }).ok).toBe(false);
    expect(validateHelperRequest({ role: "coach", message: "x".repeat(501) }).ok).toBe(false);
    expect(validateHelperRequest({ role: "coach", message: "hello", task: "t9" }).ok).toBe(false);
    expect(validateHelperRequest(null).ok).toBe(false);
  });
  it("limits paragraph size and keeps essay text away from Coach", () => {
    expect(validateHelperRequest({ role: "ideas", message: "examples", paragraph: "p".repeat(1501) }).ok).toBe(false);
    expect(validateHelperRequest({ role: "coach", message: "help", paragraph: "my paragraph" }).ok).toBe(false);
    expect(validateHelperRequest({ role: "ideas", message: "examples", paragraph: "my paragraph" }).ok).toBe(true);
  });
  it("validates chat history shape and length", () => {
    const h = { role: "user", text: "what is CC?" };
    expect(validateHelperRequest({ role: "coach", message: "and LR?", history: [h, { role: "model", text: "Coherence..." }] }).ok).toBe(true);
    expect(validateHelperRequest({ role: "coach", message: "and LR?", history: Array(7).fill(h) }).ok).toBe(false);
    expect(validateHelperRequest({ role: "coach", message: "and LR?", history: [{ role: "system", text: "x" }] }).ok).toBe(false);
  });
  it("puts the never-write-the-essay rule in the system instruction", () => {
    const v = validateHelperRequest({ role: "ideas", message: "write my intro" }).value;
    expect(buildHelperRequest(v).systemInstruction.parts[0].text).toMatch(/NEVER write the student's essay/);
  });
});

describe("helper limiter and errors", () => {
  it("allows a few requests per window per session", () => {
    const ok = makeLimiter({ perWindow: 2, windowMs: 1000, perDay: 3 });
    expect([ok("a", 0), ok("a", 1), ok("a", 2), ok("b", 2)]).toEqual([true, true, false, true]);
    expect(ok("a", 1500)).toBe(true);
    expect(ok("a", 3000)).toBe(false); // daily cap
  });
  it("maps upstream 429 to an honest quota error", async () => {
    const v = validateHelperRequest({ role: "coach", message: "timing?" }).value;
    await expect(askHelper(v, { key: "k", fetchFn: async () => new Response("{}", { status: 429 }) })).rejects.toMatchObject({ status: 429, code: "quota" });
  });
});
