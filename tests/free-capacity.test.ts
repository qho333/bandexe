import { fakeD1 } from "./fake-d1";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import raw from "../server/fixtures/sample-report.fixture.json?raw";
import { freeCompletion, markFree, FREE_CONFIG } from "../shared/free.js";
import { buildMarkUser, buildOpenSystem, buildSystem } from "../shared/prompt.js";
import { freeCacheKey } from "../shared/free-cache";
import { validateMarkRequest } from "../shared/index.js";
import { OPEN_CALIBRATIONS } from "../shared/score.js";
import { onRequest } from "../functions/api/[[path]]";

const body = { task: "t2", question: "Discuss working from home.",
  essay: "Working from home has became normal. " + "More people can work from home today. ".repeat(8), feedbackLanguage: "vi" };
const valid = validateMarkRequest(body);
if (!valid.ok) throw new Error(valid.error);
const input = valid.value;
const completion = () => new Response(JSON.stringify({ choices: [{ message: { content: raw } }] }));
const request = (payload: unknown = body, path = "mark", headers = {}) => new Request(`https://bandexe.pages.dev/api/${path}`, {
  method: "POST", headers: { "Content-Type": "application/json", "X-Requested-With": "bandexe", "CF-Connecting-IP": "192.0.2.55", ...headers }, body: JSON.stringify(payload),
});
function kv() {
  const values = new Map<string, string>(), expires = new Map<string, number>();
  return { values, get: vi.fn(async (key: string) => {
    if ((expires.get(key) ?? Infinity) <= Date.now()) values.delete(key);
    return values.get(key) ?? null;
  }), put: vi.fn(async (key: string, value: string, options: { expirationTtl: number }) => {
    values.set(key, value); expires.set(key, Date.now() + options.expirationTtl * 1000);
  }) };
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("Groq free model quotas", () => {
  it("tries Qwen first for essays and keeps helpers on the fast order", async () => {
    const models = (fetchFn: ReturnType<typeof vi.fn>) => fetchFn.mock.calls.map(([, init]) => JSON.parse(String((init as RequestInit).body)).model);
    const essay = vi.fn<typeof fetch>(async () => completion());
    await markFree(input, { GROQ_API_KEY: "g" }, { fetchFn: essay });
    expect(models(essay)).toEqual(["qwen/qwen3.8-27b"]);
    const helper = vi.fn<typeof fetch>(async () => completion());
    await freeCompletion([{ role: "user", content: "hi" }], { GROQ_API_KEY: "g" }, { fetchFn: helper });
    expect(models(helper)).toEqual(["openai/gpt-oss-120b"]);
  });
  it("uses Bearer auth, JSON mode, the shared reviewer and its own calibration hook, without logging secrets", async () => {
    const logs = ["log", "warn", "error", "debug", "info"].map((method) => vi.spyOn(console, method as "log"));
    const fetchFn = vi.fn(async () => completion());
    const key = `groq/${FREE_CONFIG.groqModels[0]}`, saved = OPEN_CALIBRATIONS[key];
    OPEN_CALIBRATIONS[key] = { id: "groq-test", slope: 1, intercept: 1, scripts: 27 };
    try {
      const result = await markFree(input, { GROQ_API_KEY: "groq-private" }, { fetchFn, model: FREE_CONFIG.groqModels[0] });
      const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
      expect(init.method).toBe("POST");
      expect(init.headers).toEqual({ Authorization: "Bearer groq-private", "Content-Type": "application/json" });
      expect(JSON.parse(String(init?.body))).toMatchObject({ model: FREE_CONFIG.groqModels[0], temperature: 0,
        response_format: { type: "json_schema", json_schema: { strict: true } }, messages: [{ role: "system", content: buildOpenSystem(input) }, { role: "user", content: buildMarkUser(input) }] });
      expect(result.markingVersion).toContain(`/groq/${FREE_CONFIG.groqModels[0]}/groq-test`);
      expect(result.report.criteria.tr.band).toBe(Math.min(9, JSON.parse(raw).criteria.tr.band + 1));
      expect(result.report.grammar.every((fix) => body.essay.includes(fix.original))).toBe(true);
      expect(JSON.stringify([result, init.body, ...logs.map((log) => log.mock.calls)])).not.toContain("groq-private");
    } finally { if (saved) OPEN_CALIBRATIONS[key] = saved; else delete OPEN_CALIBRATIONS[key]; }
    const failing = vi.fn(async () => { throw new Error("groq-private"); });
    await expect(markFree(input, { GROQ_API_KEY: "groq-private" }, { fetchFn: failing })).rejects.toMatchObject({ code: "unavailable" });
    logs.forEach((log) => expect(log).not.toHaveBeenCalled());
  });
  it.each([undefined, "1", "86400"])("rotates models on 429 with Retry-After=%s before leaving Groq", async (retry) => {
    const fetchFn = vi.fn<typeof fetch>(async (_url, init) => JSON.parse(String(init?.body)).model === FREE_CONFIG.groqEssayModels.at(-1)
      ? completion() : new Response("{}", { status: 429, headers: retry ? { "Retry-After": retry } : {} }));
    const wait = vi.fn(), run = vi.fn();
    const result = await markFree(input, { GROQ_API_KEY: "private", OPENROUTER_API_KEY: "router", AI: { run } }, { fetchFn, wait });
    expect(fetchFn.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).model)).toEqual(FREE_CONFIG.groqEssayModels);
    expect(fetchFn.mock.calls.every(([url]) => String(url).includes("api.groq.com"))).toBe(true);
    expect(result.model).toBe(FREE_CONFIG.groqEssayModels.at(-1)); expect(wait).not.toHaveBeenCalled(); expect(run).not.toHaveBeenCalled();
  });
  it("rotates Groq models then reaches Workers within the shared call budget", async () => {
    const order: string[] = [];
    const fetchFn = vi.fn<typeof fetch>(async (url, init) => {
      order.push(`${String(url).includes("mistral.ai") ? "mistral" : String(url).includes("groq.com") ? "groq" : "router"}/${JSON.parse(String(init?.body)).model}`);
      return new Response("{}", { status: 429 });
    });
    const run = vi.fn(async (model: string) => {
      order.push(`cf/${model}`);
      if (model === FREE_CONFIG.models[0]) return { response: raw };
      throw new Error("Daily free allocation exhausted");
    });
    const result = await markFree(input, { MISTRAL_API_KEY: "m", GROQ_API_KEY: "g", OPENROUTER_API_KEY: "r", AI: { run } }, { fetchFn });
    expect(order).toEqual([...FREE_CONFIG.groqEssayModels.map((model) => `groq/${model}`), `cf/${FREE_CONFIG.models[0]}`]);
    expect(result.model).toBe(FREE_CONFIG.models[0]); expect(result.calls).toBe(FREE_CONFIG.groqEssayModels.length + 1);
    expect(result.markingVersion).toContain(result.model!); expect(result.calls).toBeLessThanOrEqual(FREE_CONFIG.maxCalls);
  });
  it.each([401, 402, 403])("leaves Groq immediately for account error %i", async (status) => {
    const fetchFn = vi.fn().mockResolvedValueOnce(new Response("{}", { status })).mockResolvedValueOnce(completion());
    await markFree(input, { GROQ_API_KEY: "g", OPENROUTER_API_KEY: "r" }, { fetchFn });
    expect(fetchFn.mock.calls.map(([url]) => String(url))).toEqual(["https://api.groq.com/openai/v1/chat/completions", "https://openrouter.ai/api/v1/chat/completions"]);
  });
  it("honours pinned Groq calibration models on 429", async () => {
    const fetchFn = vi.fn(async () => new Response("{}", { status: 429 }));
    await expect(freeCompletion([], { GROQ_API_KEY: "g", OPENROUTER_API_KEY: "r" },
      { fetchFn, provider: "groq", model: FREE_CONFIG.groqModels[0] })).rejects.toMatchObject({ code: "pool_empty" });
    expect(fetchFn).toHaveBeenCalledOnce();
  });
  it("bounds the enlarged pool by one shared deadline even during repair", async () => {
    vi.useFakeTimers();
    const started = Date.now();
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] })))
      .mockImplementation(() => new Promise<Response>(() => {}));
    const run = vi.fn(() => new Promise(() => {}));
    const pending = expect(markFree(input, { GROQ_API_KEY: "g", OPENROUTER_API_KEY: "r", AI: { run } }, { fetchFn }))
      .rejects.toMatchObject({ code: "unreadable" });
    await vi.runAllTimersAsync(); await pending;
    expect(Date.now() - started).toBe(Math.min((FREE_CONFIG.maxCalls - 1) * FREE_CONFIG.callTimeoutMs, FREE_CONFIG.requestTimeoutMs));
    expect(Date.now() - started).toBeLessThanOrEqual(FREE_CONFIG.requestTimeoutMs);
    expect(fetchFn.mock.calls.length + run.mock.calls.length).toBeLessThanOrEqual(FREE_CONFIG.maxCalls);
    expect(fetchFn.mock.calls.slice(1).every(([, init]) => init?.signal?.aborted)).toBe(true);
  });
});

describe("Workers AI last resort", () => {
  it.each(["throw", "exhausted", "returned-error"])("uses the cheap model after %s and labels the winner", async (mode) => {
    const run = vi.fn(async (model: string) => {
      if (model === FREE_CONFIG.models.at(-1)) return { response: raw };
      if (mode === "returned-error") return { success: false, errors: [{ message: "Daily free allocation exhausted" }] };
      throw new Error(mode === "exhausted" ? "Daily free allocation exhausted" : "transport failed");
    });
    const result = await markFree(input, { AI: { run } });
    expect(run.mock.calls.map(([model]) => model)).toEqual(FREE_CONFIG.models);
    expect(result.model).toBe(FREE_CONFIG.models.at(-1)); expect(result.markingVersion).toContain(result.model!);
  });
  it("never tries the cheap model when the main model succeeds", async () => {
    const run = vi.fn(async () => ({ response: raw }));
    await markFree(input, { AI: { run } }); expect(run).toHaveBeenCalledOnce();
  });
  it("reports pool_empty when all Workers models exhaust the daily allocation", async () => {
    const run = vi.fn(async () => { throw Object.assign(new Error("Daily free allocation exhausted"), { status: 429 }); });
    await expect(markFree(input, { AI: { run } })).rejects.toMatchObject({ code: "pool_empty" });
    expect(run).toHaveBeenCalledTimes(FREE_CONFIG.models.length);
  });
});

describe("reviewed free result KV cache", () => {
  it("stores reviewed JSON for 24 hours and hits before providers, rate limiters and the exhausted daily allowance", async () => {
    const store = kv(), run = vi.fn(async () => ({ response: raw })), limit = vi.fn(async () => ({ success: true }));
    const fetchFn = vi.fn(); vi.stubGlobal("fetch", fetchFn);
    const db = fakeD1();
    const env = { DB: db, QUOTA: store, QUOTA_SALT: "private-salt", AI: { run }, MARK_LIMITER: { limit } };
    const first = await (await onRequest({ request: request(), env })).json();
    expect(first.remainingToday).toBe(9);
    const writes = store.put.mock.calls.filter(([key]) => key.startsWith("cache:"));
    expect(writes).toHaveLength(1); expect(writes[0][0]).toMatch(/^cache:[a-f0-9]{64}$/);
    expect(writes[0][2]).toEqual({ expirationTtl: 86400 });
    const saved = JSON.parse(writes[0][1]); expect(saved.report).toEqual(first.report);
    expect(saved.report.grammar.every((fix: { original: string }) => body.essay.includes(fix.original))).toBe(true);
    expect(saved).not.toHaveProperty("remainingToday");
    for (const key of db.values.keys()) db.values.set(key, 10);
    store.get.mockClear(); store.put.mockClear(); limit.mockClear(); limit.mockResolvedValue({ success: false });
    const hit = await onRequest({ request: request(), env }); const result = await hit.json();
    expect(hit.status).toBe(200); expect(result).toMatchObject({ cached: true, calls: 0, report: first.report, model: first.model });
    expect(store.get).toHaveBeenCalledExactlyOnceWith(writes[0][0]); expect(store.put).not.toHaveBeenCalled();
    expect(run).toHaveBeenCalledOnce(); expect(fetchFn).not.toHaveBeenCalled(); expect(limit).not.toHaveBeenCalled();
    expect(JSON.stringify(writes)).not.toMatch(/private-salt|192\.0\.2\.55/);
  });
  it("changes its hash for every marking input, language, version and chart", async () => {
    const base = await freeCacheKey(input);
    for (const change of [{ task: "gt1" }, { question: "Different question" }, { essay: input.essay + " Changed." },
      { feedbackLanguage: "en" as const }, { image: { data: "chart-a", mime: "image/png" } }]) {
      expect(await freeCacheKey({ ...input, ...change })).not.toBe(base);
    }
    expect(await freeCacheKey(input, "next-version")).not.toBe(base);
    expect(await freeCacheKey(input)).toBe(base);
    const chart = { ...input, image: { data: "chart-a", mime: "image/png" } };
    expect(await freeCacheKey(chart)).not.toBe(await freeCacheKey({ ...chart, image: { ...chart.image, data: "chart-b" } }));
    OPEN_CALIBRATIONS["groq/test"] = { id: "changed", slope: 1, intercept: 1, scripts: 27 };
    try { expect(await freeCacheKey(input)).not.toBe(base); } finally { delete OPEN_CALIBRATIONS["groq/test"]; }
  });
  it.each(["{broken", "999", JSON.stringify({ checker: "free", report: {} })])("ignores invalid cache data %s", async (bad) => {
    const store = kv(); store.values.set(await freeCacheKey(input), bad);
    const run = vi.fn(async () => ({ response: raw }));
    expect((await onRequest({ request: request(), env: { DB: fakeD1(), QUOTA_SALT: "fixture-salt", QUOTA: store, AI: { run } } })).status).toBe(200);
    expect(run).toHaveBeenCalledOnce();
  });
  it("continues marking without logging cache errors or secrets", async () => {
    const logs = ["log", "warn", "error", "debug", "info"].map((method) => vi.spyOn(console, method as "log"));
    const store = { get: vi.fn(async () => { throw new Error("private-cache-key"); }),
      put: vi.fn(async () => { throw new Error("private-cache-key"); }) };
    vi.stubGlobal("fetch", vi.fn(async () => completion()));
    const res = await onRequest({ request: request(), env: { DB: fakeD1(), QUOTA_SALT: "fixture-salt", QUOTA: store, GROQ_API_KEY: "groq-private" } });
    expect(res.status).toBe(200); expect(await res.text()).not.toMatch(/groq-private|private-cache-key/);
    logs.forEach((log) => expect(log).not.toHaveBeenCalled());
  });
  it("does not cache invalid or unreadable reports", async () => {
    const store = kv(), run = vi.fn(async () => ({ response: "{}" }));
    const res = await onRequest({ request: request(), env: { DB: fakeD1(), QUOTA_SALT: "fixture-salt", QUOTA: store, AI: { run } } });
    expect(res.status).toBe(502); expect(store.put).not.toHaveBeenCalled();
  });
  it("calls the provider again after the 24-hour KV expiration", async () => {
    vi.useFakeTimers();
    const store = kv(), run = vi.fn(async () => ({ response: raw }));
    const env = { QUOTA_SALT: "fixture-salt", DB: fakeD1(), QUOTA: store, AI: { run } };
    expect((await onRequest({ request: request(), env })).status).toBe(200);
    vi.setSystemTime(Date.now() + 23 * 3600000);
    expect((await (await onRequest({ request: request(), env })).json()).cached).toBe(true);
    vi.setSystemTime(Date.now() + 3600001);
    expect((await onRequest({ request: request(), env })).status).toBe(200);
    expect(run).toHaveBeenCalledTimes(2);
  });
  it("does not cache study answers, helpers or explicit Gemini marks", async () => {
    const store = kv(), run = vi.fn(async () => ({ response: "Try an example." }));
    for (const [path, payload] of [["helper", { role: "coach", message: "Timing?" }], ["model-answer", body]] as const) {
      expect((await onRequest({ request: request(payload, path), env: { DB: fakeD1(), QUOTA_SALT: "fixture-salt", QUOTA: store, AI: { run } } })).status).toBe(200);
    }
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: raw }] } }] }))));
    expect((await onRequest({ request: request(body, "mark", { "X-Provider": "gemini", "X-Age-Confirmed": "1" }), env: { DB: fakeD1(), QUOTA_SALT: "fixture-salt", QUOTA: store, GEMINI_API_KEY: "g" } })).status).toBe(200);
    expect(store.get).not.toHaveBeenCalled(); expect(store.put).not.toHaveBeenCalled();
  });
});

it("keeps all open marking rules and descriptors while leaving Gemini's prompt intact", () => {
  const original = buildSystem(input), compact = buildOpenSystem({ ...input, reportMode: "full" });
  expect(compact.length).toBeLessThan(original.length);
  const normalize = (text: string) => text.replace(/^#{1,6} /gm, "").replace(/\*\*/g, "").trim();
  // Only the duplicate report title/synopsis and visual separators may be removed.
  for (const line of original.split("\n")) {
    if (!line.trim() || line === "---" || line.startsWith("# IELTS Writing Report") || line.startsWith("Use the marking method in prompt_v2.md")) continue;
    expect(compact).toContain(normalize(line));
  }
  expect(original).toContain("Use the marking method in prompt_v2.md");
  expect(original).toContain("**Task Response (TR)**");
});

describe("Groq strict-schema rejection", () => {
  // Strict schemas are only sent to gpt-oss, which is not first for essays.
  const essayOrder = FREE_CONFIG.groqEssayModels;
  beforeEach(() => { FREE_CONFIG.groqEssayModels = FREE_CONFIG.groqModels; });
  afterEach(() => { FREE_CONFIG.groqEssayModels = essayOrder; });
  it("retries the same model once in plain JSON mode, then fails over normally", async () => {
    const schemaError = () => new Response(JSON.stringify({ error: { code: "json_validate_failed", message: "Generated JSON does not match the expected schema." } }), { status: 400 });
    const bodies: { model: string; response_format: { type: string }; reasoning_effort?: string }[] = [];
    const fetchFn = vi.fn(async (_url: URL | RequestInfo, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return bodies.length === 1 ? schemaError() : completion();
    });
    const result = await markFree(input, { GROQ_API_KEY: "g" }, { fetchFn, raw: true });
    expect(bodies.map((b) => [b.model, b.response_format.type])).toEqual([
      [FREE_CONFIG.groqModels[0], "json_schema"], [FREE_CONFIG.groqModels[0], "json_object"]]);
    expect(bodies.every((b) => b.reasoning_effort === "low")).toBe(true);
    expect(result.calls).toBe(2);
    const always = vi.fn(async (_url: URL | RequestInfo, init?: RequestInit) => { bodies.push(JSON.parse(String(init?.body))); return schemaError(); });
    bodies.length = 0;
    await expect(markFree(input, { GROQ_API_KEY: "g" }, { fetchFn: always })).rejects.toMatchObject({ code: "unavailable" });
    expect(bodies.length).toBeLessThanOrEqual(FREE_CONFIG.maxCalls);
  });
});
