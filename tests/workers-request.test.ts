import { fakeD1 } from "./fake-d1";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { onRequest } from "../functions/api/[[path]]";

// Cloudflare Workers expose Request.cf as a getter-only prototype property; Node does not.
// Every browser mark sends Idempotency-Key, so the replay path must not assign to cf.
const essay = "People learn through practice and clear examples in their everyday lives. ".repeat(8);
const report = JSON.stringify({ criteria: Object.fromEntries(["tr", "cc", "lr", "gra"].map((k) => [k, { band: 6, summary: "ok" }])),
  grammar_corrections: [], paragraphs: [], strengths: [] });
describe("Workers request semantics", () => {
  beforeEach(() => { Object.defineProperty(Request.prototype, "cf", { get: () => undefined, configurable: true }); });
  afterEach(() => { delete (Request.prototype as { cf?: unknown }).cf; });
  it("marks a browser request with Idempotency-Key when Request.cf is getter-only", async () => {
    const request = new Request("https://bandexe.pages.dev/api/mark", { method: "POST", headers: {
      "Content-Type": "application/json", "X-Requested-With": "bandexe", "CF-Connecting-IP": "198.51.100.7", "Idempotency-Key": "abcdefghijklmnop1234",
      "Content-Length": "99999" }, body: JSON.stringify({ task: "t2", question: "Discuss learning through practice.", essay, feedbackLanguage: "en" }) });
    const env = { DB: fakeD1(), QUOTA_SALT: "fixture-salt", AI: { run: async () => ({ response: report }) } };
    const res = await onRequest({ request, env } as unknown as Parameters<typeof onRequest>[0]);
    expect(res.status).toBe(200);
    expect((await res.json()).report.criteria.tr.band).toBeGreaterThan(0);
  });
});
