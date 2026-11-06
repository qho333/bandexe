import { fakeD1 } from "./fake-d1";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { timingSafeEqual } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import raw from "../server/fixtures/sample-report.fixture.json?raw";
import { isTester, FREE_CONFIG } from "../shared/free.js";
import { onRequest } from "../functions/api/[[path]]";
import { captureTesterToken, getTesterMode, leaveTesterMode, onTesterMode, testerHeaders } from "../src/lib/tester";
import { TesterChip } from "../src/components/Header";
import { markEssay } from "../src/lib/api";
import { askHelperAnswer, synonyms } from "../src/lib/helper";
import { geminiAccess } from "../src/lib/gemini";

const token = "a1".repeat(24);
const draft = { task: "t2", question: "Discuss working from home.", essay: "Working from home has became normal. " + "More people can work from home today. ".repeat(8) };
const payload = (path) => path === "mark" ? draft : { role: "coach", message: "Timing?" };
const request = (path, supplied = token) => new Request(`https://bandexe.pages.dev/api/${path}`, {
  method: "POST", headers: { "Content-Type": "application/json", "X-Requested-With": "bandexe", "CF-Connecting-IP": "192.0.2.1", ...(supplied == null ? {} : { "X-Tester-Token": supplied }) },
  body: JSON.stringify(payload(path)),
});
const nativeCrypto = globalThis.crypto;
let compare, logs;
beforeEach(() => {
  // Node lacks Workers' extension: exercise its equivalent native constant-time primitive.
  compare = vi.fn((a, b) => timingSafeEqual(new Uint8Array(a), new Uint8Array(b)));
  vi.stubGlobal("crypto", { randomUUID: () => nativeCrypto.randomUUID(), subtle: { digest: (...args) => nativeCrypto.subtle.digest(...args), timingSafeEqual: compare } });
  logs = ["log", "warn", "error", "info", "debug"].map((method) => vi.spyOn(console, method).mockImplementation(() => {}));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Pages owner pass", () => {
  it.each([token, "b" + token.slice(1), token.slice(0, -1) + "b", "x", token + "a"])("compares fixed-size digests with the native constant-time primitive (%#)", async (supplied) => {
    expect(await isTester(request("mark", supplied), { TESTER_TOKEN: token })).toBe(supplied === token);
    expect(compare).toHaveBeenCalledOnce();
    expect(compare.mock.calls[0].map((buffer) => buffer.byteLength)).toEqual([32, 32]);
  });
  it.each([undefined, "", "too-short", "z".repeat(48)])("disables the pass without a valid configured secret (%#)", async (secret) => {
    expect(await isTester(request("mark"), { TESTER_TOKEN: secret })).toBe(false);
    expect(compare).not.toHaveBeenCalled();
  });
  it.each([null, ""])("ignores absent/empty headers (%#)", async (supplied) => {
    expect(await isTester(request("mark", supplied), { TESTER_TOKEN: token })).toBe(false);
    expect(compare).not.toHaveBeenCalled();
  });
  it.each(["mark", "helper"])("skips %s limits and does not read or decrement exhausted personal allowances", async (path) => {
    const get = vi.fn(async () => "999"), put = vi.fn(), limit = vi.fn(async () => ({ success: false }));
    const run = vi.fn(async () => ({ response: path === "mark" ? raw : "Try one example." }));
    const env = { DB: fakeD1(999), TESTER_TOKEN: token, QUOTA_SALT: "salt", QUOTA: { get, put }, AI: { run }, MARK_LIMITER: { limit }, HELPER_LIMITER: { limit } };
    for (let i = 0; i < 2; i++) {
      const res = await onRequest({ request: request(path), env });
      expect(res.status).toBe(200); expect(res.headers.has("X-Remaining-Today")).toBe(false);
      const data = await res.json(); expect(data.remainingToday).toBeNull(); expect(JSON.stringify(data)).not.toContain(token);
    }
    expect(run).toHaveBeenCalledTimes(2); expect(get).not.toHaveBeenCalled(); expect(put).not.toHaveBeenCalled(); expect(limit).not.toHaveBeenCalled();
    expect(JSON.stringify(run.mock.calls)).not.toContain(token);
    logs.forEach((log) => expect(log).not.toHaveBeenCalled());
  });
  it.each(["mark", "helper"])("keeps normal %s reservations and responses for wrong/missing tokens or secrets", async (path) => {
    for (const [secret, supplied] of [[token, "b".repeat(48)], [token, null], [undefined, token], ["", token]]) {
      const limit = vi.fn(async () => ({ success: true }));
      const db = fakeD1(2);
      const env = { DB: db, TESTER_TOKEN: secret, QUOTA_SALT: "salt", AI: { run: async () => ({ response: path === "mark" ? raw : "Try one example." }) }, MARK_LIMITER: { limit }, HELPER_LIMITER: { limit } };
      const res = await onRequest({ request: request(path, supplied), env });
      const allowance = path === "mark" ? FREE_CONFIG.checksPerDay : FREE_CONFIG.helpersPerDay;
      expect(res.status).toBe(200); expect((await res.json()).remainingToday).toBe(allowance - 3);
      expect(db.writes).toEqual([[expect.stringMatching(new RegExp(`^${path}:`)), expect.any(String), 3]]);
      expect(limit).toHaveBeenCalledExactlyOnceWith({ key: "192.0.2.1" });
      for (const key of db.values.keys()) db.values.set(key, 999);
      const exhausted = await onRequest({ request: request(path, supplied), env });
      expect(exhausted.status).toBe(429); expect((await exhausted.json()).error).toBe("daily_limit"); expect(db.writes).toHaveLength(1);
      limit.mockResolvedValue({ success: false });
      const limited = await onRequest({ request: request(path, supplied), env });
      expect(limited.status).toBe(429); expect((await limited.json()).error).toBe("limit");
    }
  });
  it("keeps provider fallback, capacity failures and the shared repair budget", async () => {
    const network = vi.fn(async () => new Response("{}", { status: 429 })); vi.stubGlobal("fetch", network);
    const run = vi.fn(async () => ({ response: raw }));
    const env = { TESTER_TOKEN: token, GROQ_API_KEY: "g", MISTRAL_API_KEY: "m", OPENROUTER_API_KEY: "r", AI: { run } };
    const res = await onRequest({ request: request("mark"), env });
    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.calls).toBe(FREE_CONFIG.groqModels.length + 1); expect(result.calls).toBeLessThanOrEqual(FREE_CONFIG.maxCalls);
    expect(network.mock.calls.map(([url]) => url)).toEqual(FREE_CONFIG.groqModels.map(() => "https://api.groq.com/openai/v1/chat/completions"));
    expect(run).toHaveBeenCalledOnce(); expect(JSON.stringify([...network.mock.calls, ...run.mock.calls])).not.toContain(token);
    run.mockRejectedValue(new Error(token));
    const empty = await onRequest({ request: request("helper"), env: { DB: fakeD1(), QUOTA_SALT: "fixture-salt", ...env, AI: undefined } });
    expect(empty.status).toBe(503); expect((await empty.json()).error).toBe("pool_empty");
    run.mockClear().mockResolvedValue({ response: "{}" }); // every Workers model returns an unreadable report
    const broken = await onRequest({ request: request("mark"), env: { DB: fakeD1(), QUOTA_SALT: "fixture-salt", TESTER_TOKEN: token, AI: { run } } });
    expect(broken.status).toBe(502); expect(run).toHaveBeenCalledTimes(2); // first reply + one repair, never more expect(run.mock.calls.length).toBeLessThanOrEqual(FREE_CONFIG.maxCalls);
    expect(await broken.text()).not.toContain(token); logs.forEach((log) => expect(log).not.toHaveBeenCalled());
  });
  it("does not bypass request validation or Gemini eligibility gates", async () => {
    const invalid = new Request(request("mark"), { body: "{}" });
    expect((await onRequest({ request: invalid, env: { DB: fakeD1(), QUOTA_SALT: "fixture-salt", TESTER_TOKEN: token } })).status).toBe(400);
    const gated = request("mark"); gated.headers.set("X-Provider", "gemini");
    expect((await onRequest({ request: gated, env: { DB: fakeD1(), QUOTA_SALT: "fixture-salt", TESTER_TOKEN: token } })).status).toBe(403);
    expect((await onRequest({ request: Object.assign(gated, { cf: { country: "GB" } }), env: { DB: fakeD1(), QUOTA_SALT: "fixture-salt", TESTER_TOKEN: token } })).status).toBe(451);
  });
});

describe("browser owner pass", () => {
  let store, events, replace;
  beforeEach(() => {
    const values = new Map();
    store = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
    vi.stubGlobal("localStorage", store);
    vi.stubGlobal("location", new URL(`https://bandexe.pages.dev/?view=practice#tester=${token}`));
    events = new EventTarget();
    replace = vi.fn((_state, _title, url) => { location.href = new URL(url, location.href).href; });
    vi.stubGlobal("window", { history: { state: { page: 1 }, replaceState: replace }, addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) });
  });
  it("captures the fragment, immediately replaces the URL, persists across routing and renders no credential", () => {
    captureTesterToken();
    expect(replace).toHaveBeenCalledExactlyOnceWith({ page: 1 }, "", "/?view=practice");
    expect(location.hash).toBe(""); expect(store.getItem("bandexe-tester")).toBe(token);
    expect(getTesterMode()).toBe(true);
    const html = renderToStaticMarkup(createElement(TesterChip));
    expect(html).toContain("Tester mode"); expect(html).toContain(">Leave</button>"); expect(html).not.toContain(token);
    location.hash = "#overview"; captureTesterToken();
    expect(location.hash).toBe("#overview"); expect(store.getItem("bandexe-tester")).toBe(token); expect(replace).toHaveBeenCalledOnce();
    logs.forEach((log) => expect(log).not.toHaveBeenCalled());
  });
  it("clears empty fragments and scrubs credentials even when storage fails", () => {
    location.hash = "#tester="; captureTesterToken();
    expect(location.hash).toBe(""); expect(getTesterMode()).toBe(false);
    location.hash = `#tester=${token}`;
    vi.spyOn(store, "setItem").mockImplementation(() => { throw new Error(token); });
    captureTesterToken(); expect(location.hash).toBe(""); expect(getTesterMode()).toBe(false);
    logs.forEach((log) => expect(log).not.toHaveBeenCalled());
  });
  it("sends headers only to marking/helper endpoints; Leave deletes the token and notifies the chip", async () => {
    const changed = vi.fn(), unsubscribe = onTesterMode(changed);
    captureTesterToken(); expect(changed).toHaveBeenCalledOnce();
    const network = vi.fn(async (url) => new Response(JSON.stringify(url === "/api/health" ? { ok: true, gemini: { allowed: true } }
      : url === "/api/mark" ? { markingVersion: "open-report-v1/test" } : { reply: "Try an example." })));
    vi.stubGlobal("fetch", network);
    await geminiAccess.load();
    await markEssay(draft, null); await askHelperAnswer(payload("helper"));
    for (const [url, init] of network.mock.calls) {
      expect(url).not.toContain(token); expect(init.body || "").not.toContain(token);
      expect(new Headers(init.headers).get("X-Tester-Token")).toBe(url === "/api/health" ? null : token);
    }
    const external = vi.fn(async () => new Response("[]")); await synonyms("example", external);
    expect(JSON.stringify(external.mock.calls)).not.toContain(token);
    leaveTesterMode();
    expect(store.getItem("bandexe-tester")).toBeNull(); expect(changed).toHaveBeenCalledTimes(2);
    expect(testerHeaders()).toEqual({}); expect(renderToStaticMarkup(createElement(TesterChip))).toBe("");
    await markEssay(draft, null); await askHelperAnswer(payload("helper"));
    for (const [, init] of network.mock.calls.slice(-2)) expect(new Headers(init.headers).has("X-Tester-Token")).toBe(false);
    unsubscribe(); logs.forEach((log) => expect(log).not.toHaveBeenCalled());
  });
});
