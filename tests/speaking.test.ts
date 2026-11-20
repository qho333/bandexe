import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequest, SPEAK_LIMITS } from "../functions/api/speak/[[path]]";
import { fakeD1 } from "./fake-d1";

const groq = (content: string) => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
const call = (route: string, body: unknown, env: Record<string, unknown> = { GROQ_API_KEY: "test" }, headers: Record<string, string> = {}) =>
  onRequest({ request: new Request(`https://x.test/api/speak/${route}`, { method: "POST", headers: { "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.7", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) }), env } as never);
const answers = [{ part: 2, q: "Describe a trip you enjoyed.", a: "I went to Hoi An with my family last summer and we visited the old town and ate noodles and it was really beautiful at night with lanterns everywhere around the river. I enjoyed it because my parents are usually busy, so we rarely have time together, and the weather was lovely too.", sec: 70 }];

afterEach(() => vi.unstubAllGlobals());

describe("speaking API", () => {
  it("refuses unknown routes, GET and a missing key", async () => {
    expect((await call("nope", {})).status).toBe(404);
    expect((await onRequest({ request: new Request("https://x.test/api/speak/talk"), env: { GROQ_API_KEY: "k" } } as never)).status).toBe(404);
    expect((await call("talk", { mode: "chat", history: [] }, {})).status).toBe(503);
  });

  it("validates talk input and splits the correction from the spoken reply", async () => {
    expect((await call("talk", { mode: "admin", history: [] })).status).toBe(400);
    expect((await call("talk", { mode: "chat", history: [{ role: "system", content: "x" }] })).status).toBe(400);
    vi.stubGlobal("fetch", vi.fn(async () => groq("Nice! What did you eat there?\nBETTER: Yesterday I went to the beach.")));
    const r = await call("talk", { mode: "chat", history: [{ role: "user", content: "Yesterday I go to the beach, call me on 0901 234 567" }] });
    expect(await r.json()).toMatchObject({ reply: "Nice! What did you eat there?", better: "Yesterday I went to the beach." });
    const sent = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    expect(JSON.stringify(sent)).not.toContain("234 567"); // phone numbers are removed before the model sees them
  });

  it("kids mode fails closed when the safety check says UNSAFE", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => groq("UNSAFE")));
    const r = await (await call("talk", { mode: "kids", history: [{ role: "user", content: "something scary" }] })).json();
    expect(r.model).toBe("safety"); expect(r.reply).toMatch(/grown-up/);
  });

  it("calibrates marks, rounds the IELTS way and never calls Gemma without a key", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => groq(JSON.stringify({ fc: 5, lr: 5, gra: 5, pron: 6, notes: { fc: { why: "ok" } } }))));
    const j = await (await call("mark", { answers, unsure: [] })).json();
    // gpt-oss-120b: -3.438 + 2.111 * raw, to the nearest half band
    expect(j.bands).toEqual({ fc: 7, lr: 7, gra: 7, pron: 8 });   // pron 9 capped at 1 band above the others
    expect(j.overall).toBe(7.5);
    expect(j.model).toBe("openai/gpt-oss-120b");
    expect(vi.mocked(fetch).mock.calls.every(([url]) => String(url).includes("groq.com"))).toBe(true);
    expect((await call("mark", { answers: [{ part: 2, q: "Q?", a: "too short", sec: 5 }] })).status).toBe(400);
  });

  it("returns empty text for tiny recordings and rejects non-audio", async () => {
    const tiny = await onRequest({ request: new Request("https://x.test/api/speak/hear", { method: "POST", headers: { "Content-Type": "audio/webm" }, body: new Uint8Array(100) }), env: { GROQ_API_KEY: "k" } } as never);
    expect(await tiny.json()).toEqual({ text: "", unclear: [] });
    expect((await call("hear", "x", { GROQ_API_KEY: "k" }, { "Content-Type": "text/plain" })).status).toBe(400);
  });

  it("enforces the daily mark allowance per connection", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => groq(JSON.stringify({ fc: 5, lr: 5, gra: 5, pron: 5 }))));
    const env = { GROQ_API_KEY: "k", QUOTA_SALT: "salt", DB: fakeD1() };
    for (let i = 0; i < SPEAK_LIMITS.mark; i++) expect((await call("mark", { answers }, env)).status).toBe(200);
    expect((await call("mark", { answers }, env)).status).toBe(429);
    expect((await call("mark", { answers }, env, { "CF-Connecting-IP": "198.51.100.9" })).status).toBe(200);
  });
});
