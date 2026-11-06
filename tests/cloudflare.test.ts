import { fakeD1 } from "./fake-d1";
import raw from "../server/fixtures/sample-report.fixture.json?raw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onRequest } from "../functions/api/[[path]]";
import { GEMINI_BLOCKED_COUNTRIES, geminiEligibility, REGION_MESSAGE } from "../shared/eligibility.js";
import { MAX_BODY_BYTES, MODEL } from "../shared/index.js";

const essay = "Working from home has became normal. " + "More people can work from home today. ".repeat(8);
const input = { task: "t2", question: "Discuss working from home.", essay };
const google = (text: string) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }));
type Env = Parameters<typeof onRequest>[0]["env"];
function context(path: string, body: unknown = input, env: Env = { GEMINI_API_KEY: "site-secret" }, country?: string, age: string | null = "1") {
  const headers: Record<string, string> = { "X-Provider": "gemini", "Content-Type": "application/json", "X-Requested-With": "bandexe", "CF-Connecting-IP": "192.0.2.1", "X-Forwarded-For": "spoofed" };
  if (age !== null) headers["X-Age-Confirmed"] = age;
  const request = new Request(`https://bandexe.pages.dev/api/${path}`, path === "health" ? {} : { method: "POST", headers, body: JSON.stringify(body) });
  return { request: Object.assign(request, country ? { cf: { country } } : {}), env: { DB: fakeD1(), QUOTA_SALT: "fixture-salt", ...env } };
}
beforeEach(() => vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected network request"); })));
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("Pages eligibility", () => {
  it("blocks exactly EU27, EEA additions, Switzerland and UK", () => {
    const countries = "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO CH GB".split(" ");
    expect(new Set(GEMINI_BLOCKED_COUNTRIES)).toEqual(new Set(countries));
    expect(GEMINI_BLOCKED_COUNTRIES).toHaveLength(32);
    for (const country of countries) expect(geminiEligibility(country.toLowerCase())).toEqual({ allowed: false, reason: "region" });
    for (const country of [undefined, "", "US", "VN", "CA", "AU"]) expect(geminiEligibility(country)).toEqual({ allowed: true });
  });
  it.each(["mark", "helper"])("blocks %s by region before body parsing or upstream calls", async (path) => {
    const ctx = context(path, {}, {}, "GB", null);
    const res = await onRequest(ctx);
    expect(res.status).toBe(451);
    expect(await res.json()).toEqual({ error: "region", message: REGION_MESSAGE });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([null, "0", "true", "2"])("requires the exact age header (%s)", async (age) => {
    for (const path of ["mark", "helper"]) {
      const res = await onRequest(context(path, {}, {}, "US", age));
      expect(res.status).toBe(403); expect(await res.json()).toEqual({ error: "age" });
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([undefined, "US", "FR"])("returns uncached health without leaking the secret (%s)", async (country) => {
    const res = await onRequest(context("health", null, { GEMINI_API_KEY: "site-secret" }, country));
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ ok: true, model: MODEL, configured: true, fixture: false, gemini: geminiEligibility(country), free: true, dailyLimit: 10, remainingToday: null });
    expect((await (await onRequest(context("health", null, {}))).json()).configured).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("Pages handlers with mocked Google", () => {
  it("marks with the real reviewer and shared model, and skips absent limiters", async () => {
    const network = vi.fn(async () => google(raw)); vi.stubGlobal("fetch", network);
    const res = await onRequest(context("mark"));
    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.calls).toBe(1); expect(result.overall).toBeTypeOf("number");
    expect(result.report.grammar.every((fix: { original: string }) => essay.includes(fix.original))).toBe(true);
    expect(network.mock.calls[0]).toEqual(expect.arrayContaining([expect.stringContaining(`/models/${MODEL}:generateContent`)]));
    expect(JSON.stringify(result)).not.toContain("site-secret");
  });
  it.each(["coach", "ideas"])("builds and calls the %s helper with the secret only in its header", async (role) => {
    const network = vi.fn<typeof fetch>().mockResolvedValue(google("A short hint.")); vi.stubGlobal("fetch", network);
    const res = await onRequest(context("helper", { role, message: "Help me plan." }));
    expect(res.status).toBe(200); expect(await res.json()).toEqual({ reply: "A short hint.", model: "gemini-3.1-flash-lite", remainingToday: 39, dailyLimit: 40 });
    const [url, init] = network.mock.calls[0];
    expect(String(url)).not.toContain("site-secret");
    expect(init?.headers).toMatchObject({ "x-goog-api-key": "site-secret" });
    expect(init?.body).not.toContain("site-secret");
  });
  it.each(["mark", "helper"])("uses the trusted connecting IP and the matching optional limiter for %s", async (path) => {
    const limit = vi.fn(async () => ({ success: false })), other = vi.fn(async () => ({ success: true }));
    const res = await onRequest(context(path, path === "mark" ? input : { role: "coach", message: "Timing?" }, {
      GEMINI_API_KEY: "k", MARK_LIMITER: { limit: path === "mark" ? limit : other }, HELPER_LIMITER: { limit: path === "helper" ? limit : other },
    }));
    expect(res.status).toBe(429); expect((await res.json()).error).toBe("limit");
    expect(limit).toHaveBeenCalledWith({ key: "192.0.2.1" }); expect(other).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
  it("allows an accepting limiter and maps helper quota and unreadable errors", async () => {
    const limit = vi.fn(async () => ({ success: true }));
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 429 })));
    const res = await onRequest(context("helper", { role: "coach", message: "Timing?" }, { GEMINI_API_KEY: "k", HELPER_LIMITER: { limit } }));
    expect(res.status).toBe(429); expect((await res.json()).error).toBe("quota"); expect(limit).toHaveBeenCalledOnce();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}")));
    const empty = await onRequest(context("helper", { role: "ideas", message: "Help me plan." }));
    expect(empty.status).toBe(502); expect((await empty.json()).error).toBe("unreadable");
  });
  it("keeps the shared three-request upstream budget including repair and retries", async () => {
    vi.useFakeTimers();
    const network = vi.fn().mockResolvedValueOnce(google("{}"))
      .mockResolvedValue(new Response("{}", { status: 503 }));
    vi.stubGlobal("fetch", network);
    const pending = onRequest(context("mark"));
    let response: Response | undefined;
    void pending.then((value) => { response = value; });
    for (let i = 0; i < 800 && !response; i++) await vi.advanceTimersByTimeAsync(250);
    expect(response?.status).toBe(502); expect(network).toHaveBeenCalledTimes(3);
  });
  it("handles validation, missing configuration, malformed JSON and unknown routes", async () => {
    for (const path of ["mark", "helper"]) {
      const invalid = await onRequest(context(path, {})); expect(invalid.status).toBe(400); expect((await invalid.json()).error).toBe("invalid");
      const missing = await onRequest(context(path, path === "mark" ? input : { role: "coach", message: "Timing?" }, {}));
      expect(missing.status).toBe(503); expect((await missing.json()).error).toBe("not_configured");
    }
    const ctx = context("mark"); ctx.request = new Request(ctx.request, { body: "{" });
    const broken = await onRequest(ctx); expect(broken.status).toBe(400); expect((await broken.json()).error).toBe("bad_json");
    expect((await onRequest(context("missing"))).status).toBe(404);
    const wrongMethod = context("mark"); wrongMethod.request = new Request(wrongMethod.request.url);
    expect((await onRequest(wrongMethod)).status).toBe(404); expect(fetch).not.toHaveBeenCalled();
  });
  it("limits both declared length and streamed UTF-8 bytes without Content-Length", async () => {
    const declared = context("mark"); declared.request.headers.set("Content-Length", String(MAX_BODY_BYTES + 1));
    expect((await onRequest(declared)).status).toBe(413);
    const stream = context("helper");
    // Multibyte characters must count by bytes, rather than JS string length.
    stream.request = new Request(stream.request, { body: JSON.stringify({ message: "é".repeat(MAX_BODY_BYTES / 2) }) });
    const res = await onRequest(stream);
    expect(res.status).toBe(413); expect((await res.json()).error).toBe("too_large"); expect(fetch).not.toHaveBeenCalled();
  });
  it("returns generic errors without logging credentials or student content", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await onRequest(context("mark", input, { GEMINI_API_KEY: "site-secret", MARK_LIMITER: { limit: async () => { throw new Error(essay + "site-secret"); } } }));
    expect(res.status).toBe(500); expect(await res.json()).toEqual({ error: "server", message: "Something went wrong on our side. No score was produced.", remainingToday: null });
    expect(log).not.toHaveBeenCalled(); log.mockRestore();
  });
});
