import { fakeD1 } from "./fake-d1";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import raw from "../server/fixtures/sample-report.fixture.json?raw";
import { freeCompletion, markFree, FREE_CONFIG } from "../shared/free.js";
import { onRequest } from "../functions/api/[[path]]";
import { validateMarkRequest } from "../shared/index.js";
import { overallBand, OPEN_CALIBRATIONS, calibrateOpen, openCalibration } from "../shared/score.js";
import { buildMarkUser, buildOpenSystem } from "../shared/prompt.js";

const essay = "Working from home has became normal. " + "More people can work from home today. ".repeat(40); // Over 250 words: the short-answer cap has its own tests.
const body = { task: "t2", question: "Discuss working from home.", essay, feedbackLanguage: "vi" };
const validated = validateMarkRequest(body);
if (!validated.ok) throw new Error(validated.error);
const input = validated.value;
const request = (path: string, payload: unknown = body, headers: Record<string, string> = {}) => Object.assign(new Request(`https://bandexe.pages.dev/api/${path}`, {
  method: "POST", headers: { "Content-Type": "application/json", "X-Requested-With": "bandexe", "CF-Connecting-IP": "192.0.2.1", ...headers }, body: JSON.stringify(payload),
}), { cf: { country: "GB" } });
beforeEach(() => { vi.useFakeTimers(); vi.setTimerTickMode("nextTimerAsync"); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

const completion = (content = raw) => new Response(JSON.stringify({ choices: [{ message: { content } }] }));

describe("Provider adapters, entirely mocked", () => {
  it("uses Bearer auth, JSON mode, shared prompts and provider/model version without leaking the key", async () => {
    const logs = [vi.spyOn(console, "log"), vi.spyOn(console, "warn"), vi.spyOn(console, "error")];
    const fetchFn = vi.fn(async () => completion());
    const result = await markFree(input, { MISTRAL_API_KEY: "mistral-secret" }, { fetchFn });
    expect(fetchFn).toHaveBeenCalledOnce();
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.mistral.ai/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ Authorization: "Bearer mistral-secret", "Content-Type": "application/json" });
    expect(JSON.parse(String(init.body))).toMatchObject({ model: "mistral-medium-latest", temperature: 0,
      response_format: { type: "json_schema", json_schema: { strict: true } }, messages: [{ role: "system", content: buildOpenSystem(input) }, { role: "user", content: buildMarkUser(input) }] });
    expect(result.markingVersion).toBe("open-report-v1/mistral/mistral-medium-latest/uncalibrated");
    expect(result.label).toBe("AI practice estimate (open model, uncalibrated)");
    expect(JSON.stringify([url, init.body, result, ...logs.map((s) => s.mock.calls)])).not.toContain("mistral-secret");
  });
  it("uses Groq then Workers, and repairs on the next model without revisiting failures", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => new Response("{}", { status: 401 }));
    const run = vi.fn().mockResolvedValueOnce({ response: "{}" }).mockResolvedValueOnce({ response: raw });
    const result = await markFree(input, { GROQ_API_KEY: "g", MISTRAL_API_KEY: "m", OPENROUTER_API_KEY: "r", AI: { run } }, { fetchFn });
    expect(result.calls).toBe(3); expect(result.provider).toBe("cf");
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(fetchFn.mock.calls[0][0]).toContain("groq.com");
    expect(run.mock.calls.map(([model]) => model)).toEqual(FREE_CONFIG.models.slice(0, 2));
  });
  it("tries the configured secondary Mistral model when budget permits", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 404 })).mockResolvedValueOnce(completion());
    const result = await markFree(input, { MISTRAL_API_KEY: "m" }, { fetchFn });
    expect(fetchFn.mock.calls.map(([, init]) => JSON.parse(init.body).model)).toEqual(FREE_CONFIG.mistralModels);
    expect(result.markingVersion).toContain("mistral-small-latest");
  });
  it.each([undefined, "86400", "invalid"])("moves on immediately for unknown/daily Retry-After %s", async (retry) => {
    const fetchFn = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 429, headers: retry ? { "Retry-After": retry } : {} }))
      .mockResolvedValueOnce(completion());
    const wait = vi.fn(async (ms: number) => { await new Promise((resolve) => setTimeout(resolve, ms)); });
    const result = await markFree(input, { OPENROUTER_API_KEY: "r", MISTRAL_API_KEY: "m" }, { fetchFn, wait });
    expect(wait).not.toHaveBeenCalled(); expect(result.markingVersion).toContain("/mistral/"); expect(result.calls).toBe(2);
  });
  it("retries a short 429 once on the same model then moves to the next provider", async () => {
    const limited = () => new Response("{}", { status: 429, headers: { "Retry-After": "1" } });
    const fetchFn = vi.fn().mockResolvedValueOnce(limited()).mockResolvedValueOnce(limited()).mockResolvedValueOnce(completion());
    const wait = vi.fn(async (ms: number) => { await new Promise((resolve) => setTimeout(resolve, ms)); });
    const result = await markFree(input, { OPENROUTER_API_KEY: "r", MISTRAL_API_KEY: "m" }, { fetchFn, wait });
    expect(wait).toHaveBeenCalledOnce(); expect(wait.mock.calls[0][0]).toBeGreaterThanOrEqual(1050); expect(wait.mock.calls[0][0]).toBeLessThanOrEqual(1250); expect(result.calls).toBe(3);
    expect(fetchFn.mock.calls.map(([url]) => url)).toEqual(["https://openrouter.ai/api/v1/chat/completions", "https://openrouter.ai/api/v1/chat/completions", "https://api.mistral.ai/v1/chat/completions"]);
  });
  it.each(["0", "0.5", "19"])("accepts a bounded Retry-After of %s seconds and returns the retried report", async (seconds) => {
    const fetchFn = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 429, headers: { "Retry-After": seconds } }))
      .mockResolvedValueOnce(completion());
    const wait = vi.fn(async (ms: number) => { await new Promise((resolve) => setTimeout(resolve, ms)); });
    const result = await markFree(input, { MISTRAL_API_KEY: "m" }, { fetchFn, wait });
    expect(wait).toHaveBeenCalledOnce(); expect(wait.mock.calls[0][0]).toBeGreaterThanOrEqual(Number(seconds) * 1000 + 50); expect(wait.mock.calls[0][0]).toBeLessThanOrEqual(Number(seconds) * 1000 + 250);
    expect(result.calls).toBe(2); expect(result.overall).not.toBeNull();
    expect(fetchFn.mock.calls.map(([, init]) => JSON.parse(init.body).model)).toEqual(["mistral-medium-latest", "mistral-medium-latest"]);
  });
  it("accepts HTTP-date Retry-After and keeps all waits inside the shared queue budget", async () => {
    vi.useFakeTimers(); vi.setTimerTickMode("nextTimerAsync"); vi.setSystemTime(new Date("2026-10-26T00:00:00Z"));
    const fetchFn = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 429, headers: { "Retry-After": "Mon, 26 Oct 2026 00:00:02 GMT" } }))
      .mockResolvedValueOnce(completion("{}"))
      .mockResolvedValueOnce(new Response("{}", { status: 429, headers: { "Retry-After": "1" } }));
    const wait = vi.fn(async (ms: number) => { await new Promise((resolve) => setTimeout(resolve, ms)); });
    await expect(markFree(input, { MISTRAL_API_KEY: "m" }, { fetchFn, wait })).rejects.toMatchObject({ code: "unreadable" });
    expect(wait).toHaveBeenCalledOnce(); expect(wait.mock.calls[0][0]).toBeGreaterThanOrEqual(2050); expect(wait.mock.calls[0][0]).toBeLessThanOrEqual(2250); expect(fetchFn).toHaveBeenCalledTimes(3);
    const budget = { calls: 0, queuedMs: FREE_CONFIG.queueMs - 500 };
    const noQueue = vi.fn(async () => new Response("{}", { status: 429, headers: { "Retry-After": "1" } }));
    await expect(freeCompletion([], { MISTRAL_API_KEY: "m" }, { fetchFn: noQueue, wait, budget })).rejects.toMatchObject({ code: "pool_empty" });
    expect(wait).toHaveBeenCalledOnce();
  });
  it("skips missing Mistral and Workers secrets/bindings", async () => {
    const fetchFn = vi.fn(async () => completion());
    const result = await markFree(input, { OPENROUTER_API_KEY: "r" }, { fetchFn });
    expect((fetchFn.mock.calls[0] as unknown as [string, RequestInit])[0]).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(result.markingVersion).toContain("/router/");
    await expect(freeCompletion([], {}, { fetchFn })).rejects.toMatchObject({ code: "pool_empty" });
    expect(fetchFn).toHaveBeenCalledOnce();
  });
  it("ends at unavailable within the bounded pool budget and never logs upstream errors", async () => {
    const logs = [vi.spyOn(console, "log"), vi.spyOn(console, "warn"), vi.spyOn(console, "error")];
    const fetchFn = vi.fn(async () => { throw new Error("mistral-secret"); });
    const run = vi.fn(async () => { throw new Error("capacity"); });
    await expect(markFree(input, { MISTRAL_API_KEY: "mistral-secret", OPENROUTER_API_KEY: "r", AI: { run } }, { fetchFn }))
      .rejects.toMatchObject({ code: "unavailable" });
    expect(fetchFn.mock.calls.length + run.mock.calls.length).toBeLessThanOrEqual(FREE_CONFIG.maxCalls);
    expect(JSON.stringify(logs.map((s) => s.mock.calls))).not.toContain("mistral-secret");
  });
  it.each(["coach", "ideas", "feedback"])("routes free %s through Mistral without age/region gates", async (role) => {
    const fetchFn = vi.fn(async () => completion("Consider one specific example.")); vi.stubGlobal("fetch", fetchFn);
    const payload = { role, message: "How can I practise?", ...(role === "feedback" ? { essay, reportSummary: "Reviewed report", history: [{ role: "model", text: "Try an example." }] } : {}) };
    const response = await onRequest({ request: request("helper", payload), env: { DB: fakeD1(), QUOTA_SALT: "fixture-salt", MISTRAL_API_KEY: "m" } });
    expect(response.status).toBe(200); expect((await response.json()).reply).toContain("example");
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.mistral.ai/v1/chat/completions");
    expect(JSON.parse(String(init.body))).not.toHaveProperty("response_format");
    if (role === "feedback") expect(JSON.parse(String(init.body)).messages[1]).toEqual({ role: "assistant", content: "Try an example." });
  });
  it("falls back for helpers in the same provider order", async () => {
    const fetchFn = vi.fn(async () => new Response("{}", { status: 429 })); vi.stubGlobal("fetch", fetchFn);
    const run = vi.fn(async () => ({ response: "Try one example." }));
    const response = await onRequest({ request: request("helper", { role: "coach", message: "Timing?" }),
      env: { DB: fakeD1(), QUOTA_SALT: "fixture-salt", GROQ_API_KEY: "g", MISTRAL_API_KEY: "m", OPENROUTER_API_KEY: "r", AI: { run }, GEMINI_API_KEY: "unused" } });
    expect(response.status).toBe(200);
    expect(fetchFn.mock.calls.map((call) => (call as unknown as [string])[0])).toEqual(
      FREE_CONFIG.groqModels.map(() => "https://api.groq.com/openai/v1/chat/completions"));
    expect(run).toHaveBeenCalledOnce();
  });
  it("calibrates only the winning provider/model and keeps raw research bands untouched", async () => {
    const key = "mistral/mistral-medium-latest";
    const original = await markFree(input, { MISTRAL_API_KEY: "m" }, { fetchFn: async () => completion() });
    OPEN_CALIBRATIONS[key] = { id: "test-fit", slope: 1, intercept: 1, scripts: 27 };
    try {
      const calibrated = await markFree(input, { MISTRAL_API_KEY: "m" }, { fetchFn: async () => completion() });
      const uncalibrated = await markFree(input, { MISTRAL_API_KEY: "m" }, { fetchFn: async () => completion(), raw: true });
      expect(calibrated.report.criteria.tr.band).toBe(Math.min(9, original.report.criteria.tr.band! + 1));
      expect(calibrated.markingVersion).toContain("/test-fit"); expect(calibrated.label).toContain("27 official scripts");
      expect(uncalibrated.report).toEqual(original.report); expect(uncalibrated.markingVersion).toContain("/uncalibrated");
      expect(calibrateOpen(null, "mistral", "mistral-medium-latest")).toBeNull();
      expect(calibrateOpen(6, "router", "mistral-medium-latest")).toBe(6);
    } finally { delete OPEN_CALIBRATIONS[key]; }
  });
});

describe("free provider pool, entirely mocked", () => {
  it("marks without Gemini age or region restrictions, reviewing exact quotes with that model's own calibration", async () => {
    vi.stubGlobal("fetch", vi.fn(() => { throw new Error("No network"); }));
    const run = vi.fn(async () => ({ response: raw }));
    const response = await onRequest({ request: request("mark"), env: { DB: fakeD1(), QUOTA_SALT: "fixture-salt", AI: { run } } });
    expect(response.status).toBe(200);
    const result = await response.json();
    const cal = openCalibration("cf", FREE_CONFIG.models[0]);
    expect(result.label).toBe(`AI practice estimate (open model, calibrated on ${cal.scripts} official scripts)`);
    expect(result.markingVersion).toContain(FREE_CONFIG.models[0]);
    expect(result.feedbackLanguage).toBe("vi");
    const bands = Object.fromEntries(Object.entries(JSON.parse(raw).criteria).map(([k, c]) => [k, calibrateOpen((c as { band: number }).band, "cf", FREE_CONFIG.models[0])])) as Parameters<typeof overallBand>[0];
    expect(result.overall).toBe(overallBand(bands));
    expect(result.report.grammar.every((f: { original: string }) => essay.includes(f.original))).toBe(true);
    expect(JSON.stringify(run.mock.calls)).toContain("Tiếng Việt");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("skips absent OpenRouter and tries the existing secondary Workers model on capacity failures", async () => {
    const run = vi.fn().mockRejectedValueOnce(new Error("Capacity exhausted")).mockResolvedValueOnce({ response: raw });
    const result = await markFree(input, { AI: { run } });
    expect(run.mock.calls.map(([model]) => model)).toEqual(FREE_CONFIG.models.slice(0, 2));
    expect(result.markingVersion).toContain(FREE_CONFIG.models[1]); expect(result.calls).toBe(2);
  });
  it.each([402, 429])("moves on from OpenRouter %s without a purchase or an unbounded queue", async (status) => {
    const fetchFn = vi.fn(async () => new Response("{}", { status }));
    const result = await markFree(input, { OPENROUTER_API_KEY: "router-secret", MISTRAL_API_KEY: "m" }, { fetchFn: vi.fn().mockImplementationOnce(fetchFn).mockResolvedValueOnce(completion()) });
    expect(result.calls).toBe(2); expect(fetchFn).toHaveBeenCalledOnce();
    expect(JSON.stringify(result)).not.toContain("router-secret");
    const init = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect((init[1].headers as Record<string, string>).Authorization).toBe("Bearer router-secret");
    expect(JSON.parse(String(init[1].body)).model).toMatch(/:free$/);
  });
  it("queues at most once for a short per-minute 429 and charges the retry to the budget", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 429, headers: { "Retry-After": "2" } }))
      .mockResolvedValueOnce(new Response("{}", { status: 429 }));
    const wait = vi.fn(async (ms: number) => { await new Promise((resolve) => setTimeout(resolve, ms)); });
    const result = await markFree(input, { OPENROUTER_API_KEY: "secret", MISTRAL_API_KEY: "m" }, { fetchFn: vi.fn().mockImplementationOnce(fetchFn).mockImplementationOnce(fetchFn).mockResolvedValueOnce(completion()), wait });
    expect(wait).toHaveBeenCalledOnce(); expect(wait.mock.calls[0][0]).toBeGreaterThanOrEqual(2050); expect(wait.mock.calls[0][0]).toBeLessThanOrEqual(2250); expect(result.calls).toBe(3);
  });
  it("returns unavailable when all free transports fail, within the configured call budget", async () => {
    const fetchFn = vi.fn(async () => new Response("{}", { status: 503 }));
    const run = vi.fn(async () => { throw new Error("Capacity"); });
    await expect(markFree(input, { OPENROUTER_API_KEY: "secret", AI: { run } }, { fetchFn })).rejects.toMatchObject({ code: "unavailable" });
    expect(fetchFn.mock.calls.length + run.mock.calls.length).toBeLessThanOrEqual(FREE_CONFIG.maxCalls);
    await expect(freeCompletion([], {})).rejects.toMatchObject({ code: "pool_empty" });
  });
  it("includes repair in the same budget and withholds invalid criteria rather than inventing them", async () => {
    // Unreadable first reply, then the repair succeeds on the next Workers model: both calls share one budget.
    const run = vi.fn().mockResolvedValueOnce({ response: "{}" }).mockResolvedValueOnce({ response: raw });
    const result = await markFree(input, { AI: { run } });
    expect(run).toHaveBeenCalledTimes(2); expect(result.calls).toBe(2); expect(result.overall).not.toBeNull();
    const broken = JSON.parse(raw); broken.criteria.tr.band = 6.5;
    const invalid = await markFree(input, { AI: { run: async () => ({ response: JSON.stringify(broken) }) } });
    expect(invalid.report.criteria.tr.band).toBeNull(); expect(invalid.overall).toBeNull();
  });
  it("free Coach and Ideas require no age question, while explicit Gemini still refuses in GB", async () => {
    const run = vi.fn(async () => ({ response: "Consider one specific example." }));
    for (const role of ["coach", "ideas"]) {
      const response = await onRequest({ request: request("helper", { role, message: "How can I practise?" }), env: { DB: fakeD1(), QUOTA_SALT: "fixture-salt", AI: { run } } });
      expect(response.status).toBe(200); expect((await response.json()).reply).toContain("example");
    }
    expect((await onRequest({ request: request("mark", body, { "X-Provider": "gemini", "X-Age-Confirmed": "1" }), env: { DB: fakeD1(), QUOTA_SALT: "fixture-salt", AI: { run } } })).status).toBe(451);
    expect((await onRequest({ request: request("model-answer", body, { "X-Provider": "gemini" }), env: { DB: fakeD1(), QUOTA_SALT: "fixture-salt", AI: { run } } })).status).toBe(451);
  });
});

describe("daily salted D1 allowance", () => {
  it("counts marks and helpers separately, exposes remaining counts and rolls over at UTC midnight", async () => {
    vi.useFakeTimers(); vi.setTimerTickMode("nextTimerAsync"); vi.setSystemTime(new Date("2026-10-26T23:58:00Z"));
    const storage = new Map<string, string>();
    const get = vi.fn(async (key: string) => storage.get(key) ?? null);
    const put = vi.fn(async (key: string, value: string) => { storage.set(key, value); });
    const run = vi.fn(async () => ({ response: raw }));
    const db = fakeD1();
    const env = { AI: { run }, QUOTA_SALT: "private-salt", DB: db, QUOTA: { get, put } };
    for (let i = 0; i < 10; i++) {
      const response = await onRequest({ request: request("mark", { ...body, question: body.question + ` Version ${i}` }), env });
      expect(response.status).toBe(200); expect(response.headers.get("X-Remaining-Today")).toBe(String(9 - i));
      expect((await response.json()).remainingToday).toBe(9 - i);
    }
    const refused = await onRequest({ request: request("mark", { ...body, question: "A new uncached question" }), env });
    expect(refused.status).toBe(429); expect((await refused.json()).error).toBe("daily_limit"); expect(run).toHaveBeenCalledTimes(10);
    expect(JSON.stringify(db.writes)).not.toMatch(/192\.0\.2\.1|private-salt|Working from home/);
    expect(db.writes[0]).toEqual([expect.stringMatching(/^mark:[a-f0-9]{64}$/), "2026-10-26", 1]);
    const helper = await onRequest({ request: request("helper", { role: "coach", message: "Timing?" }), env });
    expect(helper.status).toBe(200); expect((await helper.json()).remainingToday).toBe(39);
    vi.setSystemTime(new Date("2026-10-27T00:00:01Z"));
    expect((await (await onRequest({ request: request("mark"), env })).json()).remainingToday).toBe(9);
  });
  it("refuses new marking when storage or its salt is absent", async () => {
    const run = async () => ({ response: raw });
    const result = await onRequest({ request: request("mark"), env: { AI: { run } } });
    expect(result.status).toBe(503);
    expect((await result.json()).remainingToday).toBeNull(); expect(result.headers.has("X-Remaining-Today")).toBe(false);
  });
});

describe("open calibration ceiling", () => {
  it("never extrapolates a calibrated criterion beyond band 8", () => {
    expect(calibrateOpen(7, "groq", "openai/gpt-oss-120b")).toBe(8);
    expect(calibrateOpen(9, "cf", "@cf/mistralai/mistral-small-3.1-24b-instruct")).toBe(8);
    expect(calibrateOpen(9, "groq", "uncalibrated/model")).toBe(9);
  });
});

describe("Groq per-minute limit (keeps Cloudflare's daily neurons for real overflow)", () => {
  const busy = (seconds: string) => new Response("{}", { status: 429, headers: { "Retry-After": seconds } });
  it("waits once for a short per-minute limit and stays on Groq", async () => {
    const fetchFn = vi.fn<typeof fetch>();
    for (const _ of FREE_CONFIG.groqModels) fetchFn.mockResolvedValueOnce(busy("2"));
    fetchFn.mockResolvedValueOnce(completion());
    const run = vi.fn(), wait = vi.fn(async (_ms: number) => {});
    const result = await markFree(input, { GROQ_API_KEY: "g", AI: { run } }, { fetchFn, wait });
    expect(wait).toHaveBeenCalledOnce(); expect(wait.mock.calls[0][0]).toBe(2250);
    expect(result.provider).toBe("groq"); expect(run).not.toHaveBeenCalled();
    expect(result.calls).toBe(FREE_CONFIG.groqModels.length + 1); expect(result.calls).toBeLessThanOrEqual(FREE_CONFIG.maxCalls);
  });
  it("does not wait when today's Groq tokens are gone, and still reaches Cloudflare", async () => {
    const fetchFn = vi.fn(async () => busy("86400"));
    const run = vi.fn(async () => ({ response: raw })), wait = vi.fn(async () => {});
    const result = await markFree(input, { GROQ_API_KEY: "g", AI: { run } }, { fetchFn, wait });
    expect(wait).not.toHaveBeenCalled(); expect(result.provider).toBe("cf"); expect(run).toHaveBeenCalledOnce();
  });
  it("leaves a Cloudflare call even if Groq is still busy after the wait", async () => {
    const fetchFn = vi.fn(async () => busy("1"));
    const run = vi.fn(async () => ({ response: raw })), wait = vi.fn(async () => {});
    const result = await markFree(input, { GROQ_API_KEY: "g", AI: { run } }, { fetchFn, wait });
    expect(wait).toHaveBeenCalledOnce(); expect(result.provider).toBe("cf"); expect(result.calls).toBeLessThanOrEqual(FREE_CONFIG.maxCalls);
  });
  it("no longer falls back to Cloudflare's expensive gpt-oss-120b", () => {
    expect(FREE_CONFIG.models).not.toContain("@cf/openai/gpt-oss-120b");
  });
});

describe("band-boundary guide routing", () => {
  it("sends the guide only to models calibrated with it", async () => {
    const { BAND_GUIDE_V2 } = await import("../shared/guide.js");
    const run = vi.fn(async (_model: string, _input: any) => ({ response: raw }));
    const cf = await markFree(input, { AI: { run } });
    expect(cf.model).toBe("@cf/qwen/qwen3-30b-a3b-fp8");
    expect(run.mock.calls[0][1].messages[0].content).toContain(BAND_GUIDE_V2);
    expect(cf.markingVersion).toContain("guide2");
    const fetchFn = vi.fn(async () => completion());
    await markFree(input, { GROQ_API_KEY: "g" }, { fetchFn, provider: "groq", model: "qwen/qwen3.8-27b" }); // calibrated without the guide
    expect(JSON.parse(String((fetchFn.mock.calls[0] as any)[1].body)).messages[0].content).not.toContain("BAND BOUNDARY RULES");
  });
  it("sends the lean method only when asked (or when a model's calibration says so), with the same safety rules", async () => {
    const fetchFn = vi.fn(async () => completion());
    const sent = async (lean?: boolean) => { fetchFn.mockClear(); await markFree(input, { GROQ_API_KEY: "g" }, { fetchFn, provider: "groq", model: "qwen/qwen3.8-27b", lean }); return JSON.parse(String((fetchFn.mock.calls[0] as any)[1].body)).messages[0].content as string; };
    const full = await sent(), lean = await sent(true);
    expect(full).toContain("Checks examiners make"); expect(lean).not.toContain("Checks examiners make");
    expect(lean.length).toBeLessThan(full.length * 0.7);
    for (const kept of ["Untrusted student text", "Compact report: JSON only", "Feedback language"]) expect(lean).toContain(kept);
  });
});

describe("provider order", () => {
  it("marks essays with Gemma first but keeps Groq first for helpers", async () => {
    const env = { GROQ_API_KEY: "g", GEMINI_API_KEY: "k", FREE_GEMMA: "1" };
    const fetchFn = vi.fn(async () => completion());
    expect((await markFree(input, env, { fetchFn })).provider).toBe("google");
    expect(JSON.parse(String((fetchFn.mock.calls[0] as any)[1].body)).messages[0].content).not.toContain("Checks examiners make"); // calibrated on the lean prompt
    expect(String((fetchFn.mock.calls[0] as any)[0])).toContain("generativelanguage");
    fetchFn.mockClear(); fetchFn.mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: "hi" } }] }), { status: 200 }));
    await freeCompletion([{ role: "user", content: "hi" }], env, { fetchFn });
    expect(String((fetchFn.mock.calls[0] as any)[0])).toContain("groq");
  });
});

describe("mean calibration", () => {
  it("stretches Gemma's criterion mean and rounds once, so a raw all-5 essay is 5.5, not 6", async () => {
    const { calibrateOpenMean, calibrateOpen } = await import("../shared/score.js");
    expect(calibrateOpen(5, "google", "gemma-4-26b-a4b-it")).toBe(6);
    expect(calibrateOpenMean({ tr: 5, cc: 5, lr: 5, gra: 5 }, "google", "gemma-4-26b-a4b-it")).toBe(5.5);
    expect(calibrateOpenMean({ tr: 4, cc: 4, lr: 5, gra: 5 }, "google", "gemma-4-26b-a4b-it")).toBe(5);
    expect(calibrateOpenMean({ tr: 4, cc: null, lr: 5, gra: 5 }, "google", "gemma-4-26b-a4b-it")).toBeNull();
  });
});

describe("OVH marking fallback", () => {
  it("is reached keylessly, with its guide and calibration, when Gemma and Groq are full", async () => {
    const fetchFn = vi.fn(async (url: any, _init: any) => {
      if (String(url).includes("ovh.net")) return completion();
      return new Response(JSON.stringify({ error: { message: "per day" } }), { status: 429 });
    });
    const run = vi.fn();
    const result = await markFree(input, { GROQ_API_KEY: "g", GEMINI_API_KEY: "k", FREE_GEMMA: "1", FREE_OVH: "1", AI: { run } } as any, { fetchFn: fetchFn as any });
    expect(result.provider).toBe("ovh"); expect(result.markingVersion).toContain("ovh-llama70b"); expect(run).not.toHaveBeenCalled();
    const call = fetchFn.mock.calls.find(([url]) => String(url).includes("ovh.net"))!;
    expect(call[1].headers.Authorization).toBeUndefined();
    expect(JSON.parse(call[1].body).messages[0].content).not.toContain("BAND BOUNDARY RULES"); // Llama was calibrated without the guide
  });
  it("still reaches Cloudflare when OVH is full too", async () => {
    const fetchFn = vi.fn(async () => new Response("{}", { status: 429 }));
    const run = vi.fn(async () => ({ response: raw }));
    const result = await markFree(input, { GROQ_API_KEY: "g", GEMINI_API_KEY: "k", FREE_GEMMA: "1", FREE_OVH: "1", AI: { run } } as any, { fetchFn: fetchFn as any });
    expect(result.provider).toBe("cf");
  });
});

describe("OVH chart reader", () => {
  it("reads the chart keylessly when Cloudflare is out of neurons", async () => {
    const description = "Bicycle sales in Hanoi rose from 120 thousand in 2010 to 240 thousand in 2020.";
    const fetchFn = vi.fn(async (_url: any, _init: any) => new Response(JSON.stringify({ choices: [{ message: { content: description } }] }), { status: 200 }));
    const run = vi.fn(async () => { throw Object.assign(new Error("4006: you have used up your daily free allocation of 10,000 neurons"), { status: 429 }); });
    const { chartReference } = await import("../shared/free.js");
    const result = await chartReference({ task: "ac1", image: { mime: "image/png", data: "AAAA" } } as any, { AI: { run }, FREE_OVH: "1" } as any, { fetchFn } as any);
    expect(result.input.chartDescription).toBe(description);
    expect(String(fetchFn.mock.calls[0][0])).toContain("ovh.net");
    expect(fetchFn.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });
});

describe("Gemma brief server errors", () => {
  const env = { GROQ_API_KEY: "g", GEMINI_API_KEY: "k", FREE_GEMMA: "1" };
  it("retries once, so a brief 500 keeps the essay on Gemma", async () => {
    const fetchFn = vi.fn(async () => completion());
    fetchFn.mockResolvedValueOnce(new Response("[]", { status: 500 }));
    const wait = vi.fn(async () => {});
    expect((await markFree(input, env, { fetchFn, wait })).provider).toBe("google");
    expect(fetchFn).toHaveBeenCalledTimes(2); expect(wait).toHaveBeenCalledOnce();
  });
  it("moves on to Groq after the second 500", async () => {
    const fetchFn = vi.fn(async (url: any) => String(url).includes("generativelanguage") ? new Response("[]", { status: 500 }) : completion());
    const wait = vi.fn(async () => {});
    expect((await markFree(input, env, { fetchFn: fetchFn as any, wait })).provider).toBe("groq");
    expect(fetchFn.mock.calls.filter(([url]) => String(url).includes("generativelanguage"))).toHaveLength(2);
  });
});

describe("short answer cap", () => {
  it("uses the task's minimum and only caps well-short answers", async () => {
    const { lengthCap } = await import("../shared/score.js");
    expect(lengthCap(75, "ac1")).toBe(5.5); expect(lengthCap(112, "gt1")).toBe(5.5); expect(lengthCap(130, "ac1")).toBe(6.5); expect(lengthCap(140, "ac1")).toBeNull();
    expect(lengthCap(180, "t2")).toBe(5.5); expect(lengthCap(220, "t2")).toBe(6.5); expect(lengthCap(240, "t2")).toBeNull();
  });
  it("lowers only the overall, says so, and leaves research runs untouched", async () => {
    const fetchFn = vi.fn(async () => completion());
    const short = { ...input, words: 100 };
    const live = await markFree(short, { GROQ_API_KEY: "g" }, { fetchFn, provider: "groq", model: "openai/gpt-oss-120b" });
    expect(live.overall).toBeLessThanOrEqual(5.5);
    const research = await markFree(short, { GROQ_API_KEY: "g" }, { fetchFn, provider: "groq", model: "openai/gpt-oss-120b", raw: true });
    expect(research.note).toBe("");
  });
});

describe("Gemma per-minute cap", () => {
  it("waits for the time in Google's 429 body (it sends no Retry-After) and retries Gemma", async () => {
    const fetchFn = vi.fn(async () => completion());
    fetchFn.mockResolvedValueOnce(new Response(JSON.stringify([{ error: { code: 429, message: "Quota exceeded ... per minute.\nPlease retry in 25.98s." } }]), { status: 429 }));
    const wait = vi.fn(async () => {});
    const result = await markFree(input, { GEMINI_API_KEY: "k", FREE_GEMMA: "1" }, { fetchFn, wait });
    expect(result.provider).toBe("google"); expect(fetchFn).toHaveBeenCalledTimes(2);
    expect((wait.mock.calls[0] as any)[0]).toBeGreaterThanOrEqual(25980);
  });
});

describe("reading Gemma replies", () => {
  it("skips a leading <thought> block, closed or not, and keeps plain JSON working", async () => {
    const { parse } = await import("../shared/free.js");
    expect(parse('{"a":1}')).toEqual({ a: 1 });
    expect(parse('<thought>plan {not json}</thought>\n{"a":2}')).toEqual({ a: 2 });
    expect(parse('<thought>thought\n* Task: chart {x}\n* Plan\n{"a":3}')).toEqual({ a: 3 });
    expect(parse("<thought>never finished")).toBeNull();
  });
});

describe("guest checks per browser on a shared connection", () => {
  it("gives each browser its own 10 and caps the connection at 40", async () => {
    vi.useFakeTimers(); vi.setTimerTickMode("nextTimerAsync"); vi.setSystemTime(new Date("2026-11-06T10:00:00Z"));
    const run = vi.fn(async () => ({ response: raw }));
    const env = { AI: { run }, QUOTA_SALT: "private-salt", DB: fakeD1() };
    const browser = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
    const mark = (n: number, i: number) => onRequest({ request: request("mark", { ...body, question: `${body.question} B${n} V${i}` }, { "X-Browser": browser(n) }), env });
    for (let n = 0; n < 4; n++) for (let i = 0; i < 10; i++) expect((await mark(n, i)).status).toBe(200);
    const ownLimit = await mark(0, 10);
    expect(ownLimit.status).toBe(429); expect((await ownLimit.json()).error).toBe("daily_limit");
    const connectionFull = await mark(4, 0);
    expect(connectionFull.status).toBe(429); expect((await connectionFull.json()).error).toBe("daily_limit");
    expect(JSON.stringify(env.DB.writes)).not.toContain(browser(1));
    const noId = await onRequest({ request: request("mark", { ...body, question: `${body.question} old page` }), env });
    expect(noId.status).toBe(429); // an older page without an ID shares the connection's count
    expect(run).toHaveBeenCalledTimes(40);
    vi.useRealTimers();
  });
});
