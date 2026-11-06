import { fakeD1 } from "./fake-d1";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error Node-only test adapter; production uses Workers native comparison.
import { timingSafeEqual } from "node:crypto";
import type { onRequest as Handler } from "../functions/api/[[path]]";
import { FREE_CONFIG } from "../shared/free.js";

type Env = Parameters<typeof Handler>[0]["env"];
type Mode = "normal" | "rate" | "503" | "timeout" | "body-timeout" | "bad-json" | "bad-report" | "exhaust";
type Attempt = { marker: string; provider: string; at: number; signal?: AbortSignal | null };
let onRequest: typeof Handler;
const quotaWrites = (store: ReturnType<typeof kv>) => store.db.writes;
const nativeCrypto = globalThis.crypto;
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const marker = (i: number, op = 0) => `STUDENT_${i}_OP_${op}`;
const essay = (id: string) => `${id} has became common. ` + "People learn through practice and clear examples in their everyday lives. ".repeat(8);
const markBody = (id: string) => ({ task: "t2", question: "Discuss learning through practice.", essay: essay(id) });
const report = (id: string) => JSON.stringify({
  criteria: Object.fromEntries(["tr", "cc", "lr", "gra"].map((key) => [key, { band: 7, summary: id }])),
  grammar_corrections: [{ original: `${id} has became`, corrected: `${id} has become` },
    { original: "STUDENT_99999_OP_0", corrected: "foreign content" }],
  paragraphs: [{ original_start: id, comments: { tr: id } }], strengths: [id],
});
function kv(stale = false) {
  const values = new Map<string, string>(), lastWrite = new Map<string, number>();
  return { values, db: fakeD1(), get: vi.fn(async (key: string) => { await delay(2); return stale ? "0" : values.get(key) ?? null; }),
    put: vi.fn(async (key: string, value: string) => {
      if (Date.now() - (lastWrite.get(key) ?? -Infinity) < 1000) throw new Error("KV PUT failed: 429 Too Many Requests");
      lastWrite.set(key, Date.now()); await delay(3); values.set(key, value);
    }) };
}
function request(path: string, id: string, person: number, key?: string, token?: string) {
  const body = path === "helper" ? { role: person % 3 === 0 ? "feedback" : person % 3 === 1 ? "ideas" : "coach", message: `Help ${id}`,
    ...(person % 3 === 0 ? { essay: essay(id), reportSummary: id } : {}) } : markBody(id);
  return Object.assign(new Request(`https://bandexe.pages.dev/api/${path}`, { method: "POST", headers: {
    "Content-Type": "application/json", "X-Requested-With": "bandexe", "CF-Connecting-IP": `198.51.100.${person}`, ...(key ? { "Idempotency-Key": key } : {}),
    ...(token ? { "X-Tester-Token": token } : {}),
  }, body: JSON.stringify(body) }), { cf: { country: "GB" } }); // Free must never need an age gate.
}
function providers(mode: Mode = "normal") {
  const attempts: Attempt[] = [];
  let mistralActive = 0, maxMistralActive = 0;
  const mistralArrivals: string[] = [];
  const call = async (provider: string, input: { messages: unknown[]; response_format?: unknown }, signal?: AbortSignal | null) => {
    const text = JSON.stringify(input.messages), id = text.match(/STUDENT_\d+_OP_\d+/)?.[0];
    if (!id) throw new Error("Missing unique marker in provider request");
    attempts.push({ marker: id, provider, at: Date.now(), signal });
    const callNumber = attempts.length;
    if (provider === "mistral") { mistralActive++; maxMistralActive = Math.max(maxMistralActive, mistralActive); mistralArrivals.push(id); }
    try {
      if (mode === "timeout") return await new Promise<Response>(() => {}); // Even a transport ignoring abort is bounded.
      await delay(mode === "normal" ? 500 + (Number(id.match(/STUDENT_(\d+)/)![1]) * 7919 % 39501) : 500);
      if (mode === "rate" && provider === "groq") return new Response("{}", { status: 429, headers: { "Retry-After": "1" } });
      if (mode === "503") return new Response("{}", { status: 503 });
      if (mode === "exhaust" && callNumber > 12) return new Response("{}", { status: 429, headers: { "Retry-After": "86400" } });
      if (mode === "bad-json") return new Response("{broken");
      if (mode === "body-timeout") return { ok: true, json: () => new Promise(() => {}) } as Response;
      const content = mode === "bad-report" && input.response_format ? "{broken report" : input.response_format ? report(id) : `Hint for ${id}`;
      return new Response(JSON.stringify({ choices: [{ message: { content } }] }));
    } finally { if (provider === "mistral") mistralActive--; }
  };
  const fetchFn = vi.fn<typeof fetch>(async (url, init) => call(String(url).includes("mistral.ai") ? "mistral" : String(url).includes("groq.com") ? "groq" : "router", JSON.parse(String(init?.body)), init?.signal));
  vi.stubGlobal("fetch", fetchFn);
  const run = vi.fn(async (_model: string, input: unknown) => {
    // The Workers binding carries the same structured report flag as HTTP providers.
    const messages = (input as { messages: { content: string }[] }).messages;
    const marking = Boolean((input as { response_format?: unknown }).response_format);
    const res = await call("cf", { messages, response_format: marking ? {} : undefined });
    if (!res.ok) throw new Error("capacity");
    return { response: (await res.json()).choices[0].message.content };
  });
  return { attempts, mistralArrivals, maxActive: () => maxMistralActive, env: { GROQ_API_KEY: "fake-g", MISTRAL_API_KEY: "fake-m", OPENROUTER_API_KEY: "fake-r", AI: { run } } };
}

beforeEach(async () => {
  vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-26T12:00:00Z"));
  // Digest is real native crypto; only the Workers-specific comparison is adapted for Node.
  vi.stubGlobal("crypto", { randomUUID: () => nativeCrypto.randomUUID(), subtle: { digest: nativeCrypto.subtle.digest.bind(nativeCrypto.subtle),
    timingSafeEqual: (a: ArrayBuffer, b: ArrayBuffer) => timingSafeEqual(new Uint8Array(a), new Uint8Array(b)) } });
  ({ onRequest } = await import("../functions/api/[[path]]"));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function settle(jobs: { request: Request; id: string; handler?: typeof Handler }[], env: Env, bound = FREE_CONFIG.requestTimeoutMs + FREE_CONFIG.queueMs) {
  const completed = jobs.map(() => 0);
  const responses: { response: Response; data: any; elapsed: number }[] = [];
  const started = Date.now();
  const promises = jobs.map(async (job, i) => {
    const response = await (job.handler || onRequest)({ request: job.request, env });
    const data = await response.json();
    completed[i]++; responses[i] = { response, data, elapsed: Date.now() - started };
  });
  // Native crypto settles outside the fake timer queue. Yield the host loop too.
  for (let step = 0; step < bound / 250; step++) {
    await vi.advanceTimersByTimeAsync(250);
    if (completed.every((count) => count === 1)) break;
  }
  expect(completed).toEqual(jobs.map(() => 1)); // Fails immediately at the deadline, never await a hung promise.
  await Promise.all(promises);
  for (const [i, { response, data, elapsed }] of responses.entries()) {
    expect(elapsed).toBeLessThanOrEqual(bound);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    if (response.ok) {
      expect(data.report || data.reply).toBeTruthy();
      const markers = JSON.stringify(data).match(/STUDENT_\d+_OP_\d+/g);
      expect(markers?.length).toBeGreaterThan(0);
      expect(new Set(markers)).toEqual(new Set([jobs[i].id]));
      if (data.report) {
        expect(Object.keys(data.report.criteria)).toEqual(["tr", "cc", "lr", "gra"]);
        expect(data.overall).toBeTypeOf("number");
        expect(data.calls).toBeLessThanOrEqual(FREE_CONFIG.maxCalls);
        expect(data.report.grammar).toHaveLength(1); // Foreign corrections rejected by real reviewer.
      }
    } else {
      expect(["daily_limit", "pool_empty", "unavailable", "unreadable", "busy"]).toContain(data.error);
      expect(data.message).toBeTypeOf("string"); expect(data.report).toBeUndefined();
    }
  }
  return responses;
}
function group(attempts: Attempt[]) {
  const groups = new Map<string, Attempt[]>();
  for (const attempt of attempts) groups.set(attempt.marker, [...(groups.get(attempt.marker) || []), attempt]);
  return groups;
}
function checkBudget(attempts: Attempt[]) {
  const groups = group(attempts);
  for (const calls of groups.values()) expect(calls.length).toBeLessThanOrEqual(FREE_CONFIG.maxCalls);
  const starts = attempts.filter((attempt) => attempt.provider === "mistral");
  for (let i = 1; i < starts.length; i++) expect(starts[i].at - starts[i - 1].at).toBeGreaterThanOrEqual(1000);
}

describe("Pages handler classroom load (no network, real validation/mark/reviewer)", () => {
  it.each([50, 100, 200])("serves %i students each marking and chatting, at 0.5–40 s provider latency", async (students) => {
    const pool = providers(), store = kv();
    const jobs = Array.from({ length: students }, (_, i) => ["mark", "helper"].map((path, op) => ({ id: marker(i, op), request: request(path, marker(i, op), i, `normal_${students}_${i}_${op}_request`) }))).flat();
    const results = await settle(jobs, { ...pool.env, DB: store.db, QUOTA: store, QUOTA_SALT: `normal-${students}` });
    expect(results.every(({ response }) => response.ok)).toBe(true);
    expect(store.db.values.size).toBe(students * 2);
    expect([...store.values.keys()].filter((key) => key.startsWith("cache:")).length).toBe(students);
    expect([...store.db.values.values()]).toEqual(Array(students * 2).fill(1));
    expect(pool.maxActive()).toBeLessThanOrEqual(4);
    checkBudget(pool.attempts);
    // Entries admitted before overflow stay FIFO; later arrivals bypass the full queue to fallback.
    const submitted = jobs.map(({ id }) => id);
    const indexes = pool.mistralArrivals.map((id) => submitted.indexOf(id));
    // Crypto completion can change arrival order; a direct FIFO test below removes that variable.
    expect(new Set(indexes).size).toBe(indexes.length);
    expect(pool.attempts.every((attempt) => attempt.provider === "groq")).toBe(true);
  });

  it.each<Mode>(["rate", "503", "timeout", "body-timeout", "bad-json", "bad-report", "exhaust"])("bounds 50 concurrent students through %s failures", async (mode) => {
    const pool = providers(mode), store = kv();
    const jobs = Array.from({ length: 50 }, (_, i) => ({ id: marker(i), request: request(i % 3 === 0 ? "mark" : i % 3 === 1 ? "helper" : "model-answer", marker(i), i) }));
    const results = await settle(jobs, { ...pool.env, DB: store.db, QUOTA: store, QUOTA_SALT: mode });
    checkBudget(pool.attempts); expect(quotaWrites(store)).toHaveLength(50);
    if (mode === "rate") expect(results.every(({ response }) => response.ok)).toBe(true);
    if (["503", "timeout", "body-timeout", "bad-json"].includes(mode)) expect(results.every(({ response }) => !response.ok)).toBe(true);
    if (mode === "bad-report") expect(results.filter((_, i) => i % 3 === 0).every(({ data }) => data.error === "unreadable")).toBe(true);
    if (mode === "exhaust") { expect(results.some(({ data }) => data.error === "pool_empty")).toBe(true); expect(results.some(({ response }) => response.ok)).toBe(true); }
    if (mode === "timeout" || mode === "body-timeout") expect(pool.attempts.filter((a) => a.signal).every((a) => a.signal!.aborted)).toBe(true);
    if (mode === "503") for (const calls of group(pool.attempts).values()) {
      // Server errors are not per-minute limits: no Groq wait, then the remaining providers use the remaining calls.
      const cfCalls = Math.min(FREE_CONFIG.models.length, FREE_CONFIG.maxCalls - FREE_CONFIG.groqModels.length);
      const routerCalls = Math.min(FREE_CONFIG.routerModels.length, FREE_CONFIG.maxCalls - FREE_CONFIG.groqModels.length - cfCalls);
      expect(calls.map((call) => call.provider)).toEqual([...FREE_CONFIG.groqModels.map(() => "groq"), ...Array(cfCalls).fill("cf"), ...Array(routerCalls).fill("router")]);
    }
  });

  it.each([false, true])("permits exactly 10 marks and 40 shared helper/model requests per person with D1 despite stale cache KV=%s", async (stale) => {
    const pool = providers(), store = kv(stale);
    // Each of 50 students presses repeatedly before any replies are returned.
    const jobs = Array.from({ length: 50 }, (_, person) => Array.from({ length: 63 }, (_, op) => ({ id: marker(person, op),
      request: request(op < 12 ? "mark" : op % 2 ? "helper" : "model-answer", marker(person, op), person) }))).flat();
    const results = await settle(jobs, { ...pool.env, DB: store.db, QUOTA: store, QUOTA_SALT: `races-${stale}` });
    for (let person = 0; person < 50; person++) {
      const own = results.slice(person * 63, (person + 1) * 63);
      expect(own.slice(0, 12).filter(({ response }) => response.ok)).toHaveLength(10);
      expect(own.slice(12).filter(({ response }) => response.ok)).toHaveLength(40);
      expect(own.filter(({ data }) => data.error === "daily_limit")).toHaveLength(13);
    }
    expect([...store.db.values].filter(([key]) => key.startsWith("mark:")).map(([, value]) => value)).toEqual(Array(50).fill(10));
    expect([...store.db.values].filter(([key]) => key.startsWith("helper:")).map(([, value]) => value)).toEqual(Array(50).fill(40));
    expect(JSON.stringify(quotaWrites(store))).not.toMatch(/STUDENT_|198\.51\.100|races-/);
    checkBudget(pool.attempts);
  }, 20000);

  it("coalesces simultaneous retries, replays successes without retaining errors, rejects changed input and isolates identities", async () => {
    const pool = providers(), store = kv();
    const env = { ...pool.env, DB: store.db, QUOTA: store, QUOTA_SALT: "retries" };
    const jobs = Array.from({ length: 50 }, (_, i) => ({ id: marker(i % 2), request: request("mark", marker(i % 2), i % 2, "same_retry_request_key") }));
    const results = await settle(jobs, env);
    expect(quotaWrites(store)).toHaveLength(2); expect(pool.attempts).toHaveLength(2);
    expect(new Set(results.filter((_, i) => i % 2 === 0).map(({ data }) => JSON.stringify(data))).size).toBe(1);
    const again = await onRequest({ request: request("mark", marker(0), 0, "same_retry_request_key"), env });
    expect(again.status).toBe(200); expect(quotaWrites(store)).toHaveLength(2);
    const conflict = await onRequest({ request: request("mark", marker(99), 0, "same_retry_request_key"), env });
    expect(conflict.status).toBe(409); expect((await conflict.json()).error).toBe("idempotency_conflict");
    const emptyEnv = { DB: store.db, QUOTA: store, QUOTA_SALT: "error-replay" };
    const failed = await settle([{ id: marker(3), request: request("mark", marker(3), 3, "failed_retry_request_key") }], emptyEnv);
    const [failedAgain] = await settle([{ id: marker(3), request: request("mark", marker(3), 3, "failed_retry_request_key") }], emptyEnv);
    expect(failedAgain.data).toMatchObject({ error: failed[0].data.error, remainingToday: 8 }); expect(quotaWrites(store)).toHaveLength(4);
  });

  it("tester pass bypasses personal allowance but shares pacing, fallback and the bounded call budget", async () => {
    const pool = providers("503"), store = kv(); const token = "a1".repeat(24);
    const jobs = Array.from({ length: 50 }, (_, i) => ({ id: marker(i), request: request("mark", marker(i), 1, undefined, token) }));
    const results = await settle(jobs, { ...pool.env, TESTER_TOKEN: token, DB: store.db, QUOTA: store, QUOTA_SALT: "tester" });
    expect(store.get).not.toHaveBeenCalled(); expect(store.put).not.toHaveBeenCalled();
    expect(results.every(({ data }) => data.remainingToday === null)).toBe(true); checkBudget(pool.attempts);
  });

  it("returns busy rather than claiming the daily pool is empty when the only provider queue is full", async () => {
    const pool = providers();
    const jobs = Array.from({ length: 50 }, (_, i) => ({ id: marker(i), request: request("mark", marker(i), i) }));
    const results = await settle(jobs, { MISTRAL_API_KEY: pool.env.MISTRAL_API_KEY, DB: fakeD1(), QUOTA_SALT: "fixture-salt" });
    expect(results.some(({ data }) => data.error === "busy")).toBe(true);
    expect(results.some(({ response }) => response.ok)).toBe(true);
    expect(results.every(({ data }) => data.error !== "pool_empty")).toBe(true); checkBudget(pool.attempts);
  });

  it("enforces ten across independently imported isolates even with permanently stale cache KV", async () => {
    const first = onRequest;
    vi.resetModules();
    const second = (await import("../functions/api/[[path]]")).onRequest;
    const store = kv(true);
    const env = { DB: store.db, QUOTA: store, QUOTA_SALT: "distributed-race", AI: { run: async (_model: string, input: unknown) => {
      const id = JSON.stringify(input).match(/STUDENT_\d+_OP_\d+/)![0];
      return { response: report(id) };
    } } };
    const wave = (handler: typeof Handler, offset: number) => Array.from({ length: 10 }, (_, i) => ({ handler, id: marker(1, i + offset), request: request("mark", marker(1, i + offset), 1) }));
    expect((await settle(wave(first, 0), env)).every(({ response }) => response.ok)).toBe(true);
    await vi.advanceTimersByTimeAsync(1100);
    expect((await settle(wave(second, 10), env)).every(({ data }) => data.error === "daily_limit")).toBe(true);
    expect([...store.db.values].filter(([key]) => key.startsWith("mark:")).map(([, value]) => value)).toEqual([10]); // Conditional UPSERT coordinates both handlers.
  });

  it("Mistral admission is fair FIFO, capped at four in flight, and expires queued work", async () => {
    const { mistralQueue } = await import("../shared/free-traffic.js");
    const scheduler = mistralQueue(fetch, "fifo-key");
    const starts: number[] = [], releases: (() => void)[] = [];
    const pending = Array.from({ length: 8 }, (_, i) => scheduler.acquire(5000).then((release: (() => void) | null) => {
      if (release) { starts.push(i); releases.push(release); }
      return release;
    }));
    await vi.advanceTimersByTimeAsync(5100);
    expect(starts).toEqual([0, 1, 2, 3]); expect((await Promise.all(pending)).slice(4)).toEqual([null, null, null, null]);
    releases.forEach((release) => release()); expect(vi.getTimerCount()).toBe(0);
  });
});
