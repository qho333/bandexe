import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import raw from "../server/fixtures/sample-report.fixture.json?raw";
import { onRequest } from "../functions/api/[[path]]";
import { clientAddress } from "../shared/client-address";
import { accountExists, base64url, readSession, signSession, upsertUser, userId } from "../shared/accounts";
import { replay } from "../shared/traffic";
import { sqliteD1 } from "./sqlite-d1";
import { accountRequest } from "../src/lib/auth";
import { sendReview } from "../src/lib/reviews";
import { recordStudent, recordVisit } from "../src/lib/stats";

const salt = "audit-fixture-salt";
const input = { task: "t2", question: "Discuss learning through practice.", essay: "People learn through practice and clear examples in their everyday lives. ".repeat(8) };
type Env = Parameters<typeof onRequest>[0]["env"];
let db: ReturnType<typeof sqliteD1>, run: ReturnType<typeof vi.fn<(_model: string, args: any) => Promise<{ response: string }>>>, env: Env;
function request(path: string, body: unknown = input, headers: Record<string, string> = {}, method = "POST") {
  return new Request(`https://bandexe.test/api/${path}`, { method,
    headers: { "Content-Type": "application/json", "X-Requested-With": "bandexe", "CF-Connecting-IP": "2001:db8:abcd:1234::1", ...headers },
    ...(method === "GET" || method === "DELETE" ? {} : { body: JSON.stringify(body) }) });
}
const call = (path: string, body: unknown = input, headers: Record<string, string> = {}, method = "POST", settings = env) =>
  onRequest({ request: request(path, body, headers, method), env: settings });
beforeEach(() => {
  db = sqliteD1();
  run = vi.fn(async (_model: string, args: any) => ({ response: args.image ? "The chart shows sales rising over time." : args.response_format ? raw : "Try one clear example." }));
  env = { DB: db, QUOTA_SALT: salt, AI: { run } };
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("No network allowed"); }));
});
afterEach(() => { db.close(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("universal mutation boundary", () => {
  it.each(["mark", "helper", "model-answer", "report-detail", "review", "hit", "reviews/moderate", "history", "auth/google", "auth/logout", "account", "unknown"])("gates anonymous %s before database or provider work", async (path) => {
    const settings = { ...env, DB: { prepare() { throw new Error("must not touch DB"); }, batch: db.batch } };
    for (const headers of ([{ "X-Requested-With": "" }, { "X-Requested-With": "other" }, { Origin: "https://attacker.test" }, { Origin: "http://bandexe.test" }, { Origin: "null" }] as Record<string, string>[])) {
      const response = await call(path, {}, headers, path === "account" ? "DELETE" : "POST", settings);
      expect(response.status).toBe(403); expect((await response.json()).error).toBe("csrf");
    }
    expect(run).not.toHaveBeenCalled(); expect(db.records).toHaveLength(0);
  });
  it.each(["text/plain", "application/x-www-form-urlencoded", "multipart/form-data", "application/jsonp", ""])("rejects non-JSON %s", async (type) => {
    for (const path of ["mark", "helper", "hit", "review", "auth/logout", "history", "reviews/moderate", "account"])
      expect((await call(path, {}, { "Content-Type": type }, path === "account" ? "DELETE" : "POST")).status).toBe(415);
    expect(run).not.toHaveBeenCalled(); expect(db.records).toHaveLength(0);
  });
  it("accepts own origin and JSON parameters; applies origin checks before a replay hit", async () => {
    const headers = { Origin: "https://bandexe.test", "Content-Type": "application/json; charset=UTF-8", "Idempotency-Key": "audit_origin_request_001" };
    expect((await call("mark", input, headers)).status).toBe(200);
    expect((await call("mark", input, { ...headers, Origin: "https://attacker.test" })).status).toBe(403);
    expect(run).toHaveBeenCalledOnce();
  });
  it("all mutating client paths send JSON and the CSRF header, including empty logout/delete/hit", async () => {
    const network = vi.fn<typeof fetch>(async () => new Response("{}")); vi.stubGlobal("fetch", network);
    const store = () => { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } }; };
    await accountRequest("/api/auth/logout", "POST");
    await accountRequest("/api/account", "DELETE");
    await accountRequest("/api/history", "POST", {});
    await sendReview({ rating: 4, text: "", task: null, public: false }, network, store());
    await recordVisit(store(), network, store());
    await recordVisit(store(), network, { getItem: () => "1", setItem() {}, removeItem() {} });
    await recordStudent(store(), network);
    expect(network).toHaveBeenCalledTimes(7);
    for (const [, init] of network.mock.calls) {
      const headers = new Headers(init?.headers);
      expect(headers.get("X-Requested-With")).toBe("bandexe");
      expect(headers.get("Content-Type")).toBe("application/json");
    }
  });
});

describe("address normalization and shared allowances", () => {
  it.each([
    ["2001:db8:abcd:1234::1", "2001:0db8:abcd:1234::/64"],
    ["2001:0DB8:ABCD:1234:ffff:eeee:dddd:cccc", "2001:0db8:abcd:1234::/64"],
    ["::1", "0000:0000:0000:0000::/64"],
    ["192.0.2.1", "192.0.2.1"], ["::ffff:192.0.2.1", "192.0.2.1"],
    ["0:0:0:0:0:FFFF:c000:201", "192.0.2.1"],
    ["invalid", null], [null, null], ["999.1.1.1", null],
  ])("normalizes %s", (ip, expected) => expect(clientAddress(ip)).toBe(expected));
  it("rotating /64 addresses share marking and review limits; a different prefix has its own allowance", async () => {
    for (let i = 0; i < 11; i++)
      expect((await call("mark", input, { "CF-Connecting-IP": `2001:db8:abcd:1234::${i + 1}` })).status).toBe(i < 10 ? 200 : 429);
    expect((await call("mark", input, { "CF-Connecting-IP": "2001:db8:abcd:1235::1" })).status).toBe(200);
    for (let i = 0; i < 6; i++)
      expect((await call("review", { rating: 4 }, { "CF-Connecting-IP": `2001:db8:abcd:1234::${i + 1}` })).status).toBe(i < 5 ? 200 : 429);
    expect(run).toHaveBeenCalledTimes(11);
  });
  it("mapped IPv6 shares the IPv4 mark key and /64 rotation shares replay and optional limiter keys", async () => {
    await call("mark", input, { "CF-Connecting-IP": "192.0.2.1" });
    await call("mark", input, { "CF-Connecting-IP": "::ffff:c000:201" });
    expect(db.rows("SELECT n FROM daily_allowance")).toEqual([{ n: 2 }]);
    const limit = vi.fn(async () => ({ success: true }));
    const headers = { "Idempotency-Key": "audit_ipv6_replay_001" };
    for (const ip of ["2001:db8:abcd:1234::a", "2001:0db8:abcd:1234:0:0:0:b"])
      expect((await call("mark", input, { ...headers, "CF-Connecting-IP": ip }, "POST", { ...env, MARK_LIMITER: { limit } })).status).toBe(200);
    expect(limit).toHaveBeenCalledExactlyOnceWith({ key: "2001:0db8:abcd:1234::/64" });
    expect(run).toHaveBeenCalledTimes(3);
  });
});

describe("storage failures and bounded metrics", () => {
  it.each(["mark", "helper", "model-answer", "report-detail"])("refuses %s on missing and broken reservations", async (path) => {
    for (const DB of [undefined, { prepare() { throw new Error("outage"); }, batch: db.batch }]) {
      const response = await call(path, path === "helper" ? { role: "coach", message: "Timing?" } : input, {}, "POST", { ...env, DB });
      expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ error: "allowance_unavailable", message: expect.stringContaining("try again shortly") });
    }
    expect(run).not.toHaveBeenCalled();
  });
  it("bounds a stalled guest reservation at three seconds with no provider call", async () => {
    vi.useFakeTimers();
    const settings = { ...env, DB: { prepare: () => ({ bind() { return this; }, first: () => new Promise<null>(() => {}), run: async () => ({}) }), batch: db.batch } };
    const pending = call("mark", input, {}, "POST", settings);
    for (let i = 0; i < 40; i++) await vi.advanceTimersByTimeAsync(100);
    expect((await pending).status).toBe(503); expect(run).not.toHaveBeenCalled();
  });
  it("signed-in reservation failures also refuse upstream work", async () => {
    const uid = await userId(salt, "signed-in"); await upsertUser(db, uid, "2026-10-30");
    const cookie = "bx_session=" + await signSession(uid, salt);
    const prepare = db.prepare;
    const settings = { ...env, GOOGLE_CLIENT_ID: "fixture", DB: { ...db, prepare(sql: string) { if (sql.includes("daily_allowance")) throw new Error("quota outage"); return prepare(sql); } } };
    expect((await call("mark", input, { Cookie: cookie }, "POST", settings)).status).toBe(503);
    expect(run).not.toHaveBeenCalled();
  });
  it("caps visits at 20 and combined first/student impact at three per /64/day, including actual D1 writes", async () => {
    for (let i = 0; i < 50; i++) {
      expect((await call("hit", { first: true }, { "CF-Connecting-IP": `2001:db8:abcd:1234::${i + 1}` })).status).toBe(200);
      if (i === 19) expect(db.rows("SELECT n FROM counters WHERE name = 'visits'")).toEqual([{ n: 20 }]);
    }
    expect(db.rows("SELECT n FROM counters WHERE name = 'visits'")).toEqual([{ n: 20 }]);
    expect(db.rows("SELECT n FROM metrics WHERE name = 'browsers'")).toEqual([{ n: 3 }]);
    expect(db.records.filter((record) => record.sql.startsWith("DELETE FROM daily_allowance"))).toHaveLength(1);
    const changes = db.rows("SELECT total_changes() AS n");
    await call("hit", { student: true });
    expect(db.rows("SELECT total_changes() AS n")).toEqual(changes);
    await call("hit", {}, { "CF-Connecting-IP": "2001:db8:abcd:1235::1" });
    expect(db.rows("SELECT n FROM counters WHERE name = 'visits'")).toEqual([{ n: 21 }]);
    // Allowance dates use new Date(), so use fake system time for rollover.
    vi.useFakeTimers(); vi.setSystemTime(new Date(Date.now() + 86400000));
    await call("hit", {});
    expect(db.rows("SELECT SUM(n) AS n FROM counters WHERE name = 'visits'")).toEqual([{ n: 22 }]);
  });
  it("does no counter/pruning writes when metric reservations fail", async () => {
    const prepare = vi.fn(() => { throw new Error("outage"); });
    expect((await call("hit", { first: true }, {}, "POST", { ...env, DB: { prepare, batch: db.batch } })).status).toBe(200);
    expect(prepare).toHaveBeenCalledOnce(); expect(db.records).toHaveLength(0);
  });
});

describe("bounded replay retention", () => {
  it("evicts the requester's oldest slot at eight across scopes without denying another client", async () => {
    const { replay } = await import("../shared/traffic");
    const invoke = vi.fn(async () => new Response("ok"));
    const prefix = crypto.randomUUID();
    for (let i = 0; i < 520; i++) expect((await replay(prefix + i, "input", invoke, "one-client-" + prefix)).status).toBe(200);
    expect((await replay(prefix + "other", "input", invoke, "other-client-" + prefix)).status).toBe(200);
    await replay(prefix + "519", "input", invoke, "one-client-" + prefix);
    expect(invoke).toHaveBeenCalledTimes(521);
    await replay(prefix + "0", "input", invoke, "one-client-" + prefix);
    expect(invoke).toHaveBeenCalledTimes(522);
  });
  it.each([302, 400, 401, 403, 429, 500, 503])("does not retain HTTP %s", async (status) => {
    const key = crypto.randomUUID(), invoke = vi.fn(async () => new Response("retry", { status }));
    await replay(key, "input", invoke, key); await replay(key, "input", invoke, key);
    expect(invoke).toHaveBeenCalledTimes(2);
  });
  it("retains success for two minutes, isolates clients, and admits after global capacity", async () => {
    const invoke = vi.fn(async () => new Response("ok")), prefix = crypto.randomUUID();
    for (let i = 0; i < 520; i++) expect((await replay(prefix + i, "input", invoke, prefix + "client" + i)).status).toBe(200);
    await replay(prefix + "519", "input", invoke, prefix + "client519");
    expect(invoke).toHaveBeenCalledTimes(520);
    vi.useFakeTimers(); vi.setSystemTime(Date.now() + 120001);
    await replay(prefix + "519", "input", invoke, prefix + "client519");
    expect(invoke).toHaveBeenCalledTimes(521);
  });
});

describe("single bounded body read", () => {
  it("parses once and fingerprints the original bytes, with and without replay", async () => {
    const parse = vi.spyOn(JSON, "parse");
    const headers = { "Idempotency-Key": "audit_parse_once_request" };
    const body = JSON.stringify(input);
    expect((await call("mark", input, headers)).status).toBe(200);
    expect(parse.mock.calls.filter(([value]) => value === body)).toHaveLength(1);
    const changedBytes = new Request(request("mark", input, headers), { body: " " + body });
    expect((await onRequest({ request: changedBytes, env })).status).toBe(409);
    await call("mark");
    expect(parse.mock.calls.filter(([value]) => value === body)).toHaveLength(2);
  });
  it.each(["helper", "review", "hit", "reviews/moderate", "model-answer", "report-detail"])("caps streamed %s at 64 KB without Content-Length", async (path) => {
    let pulls = 0, cancelled = false;
    const stream = new ReadableStream({ pull(controller) { pulls++; controller.enqueue(new Uint8Array(32768)); }, cancel() { cancelled = true; } });
    const req = new Request(request(path), { body: stream, duplex: "half" } as RequestInit);
    expect((await onRequest({ request: req, env })).status).toBe(413);
    expect(cancelled).toBe(true); expect(pulls).toBeLessThanOrEqual(4); expect(run).not.toHaveBeenCalled();
  });
  it("rejects large text-only marks but accepts chart-bearing marks above 64 KB", async () => {
    expect((await call("mark", { ...input, extra: "é".repeat(32768) })).status).toBe(413);
    expect((await call("mark", { ...input, task: "ac1", chartImageBase64: "a".repeat(70000), mime: "image/png" })).status).toBe(200);
    expect(run).toHaveBeenCalledTimes(2); // vision and marking
  });
});

describe("durable session revocation", () => {
  const settings = () => ({ ...env, GOOGLE_CLIENT_ID: "fixture" });
  async function session(sub = "student") {
    const uid = await userId(salt, sub), epoch = await upsertUser(db, uid, new Date().toISOString().slice(0, 10));
    return { uid, epoch, Cookie: "bx_session=" + await signSession(uid, salt, Date.now(), epoch) };
  }
  it("signs out and deletes with the browser's bodyless requests", async () => {
    const bare = (path: string, method: string, Cookie: string) => onRequest({ env: settings(), request: new Request(`https://bandexe.test/api/${path}`, { method,
      headers: { "Content-Type": "application/json", "X-Requested-With": "bandexe", "CF-Connecting-IP": "2001:db8:abcd:1234::1", Cookie },
      body: "" }) }); // Cloudflare hands Functions an empty body stream, not a missing body
    const a = await session(), b = await session("other-student");
    expect((await bare("auth/logout", "POST", a.Cookie)).status).toBe(200);
    expect((await bare("account", "DELETE", b.Cookie)).status).toBe(200);
    expect(db.rows("SELECT uid FROM users WHERE uid = ?", b.uid)).toHaveLength(0);
  });
  it("logout invalidates every copied cookie and cached signed-in reply while retaining history", async () => {
    const a = await session(), b = await session("other-student"), headers = { Cookie: a.Cookie, "Idempotency-Key": "audit_logout_replay_001" };
    expect((await call("mark", input, headers, "POST", settings())).status).toBe(200);
    expect((await call("auth/logout", {}, { Cookie: a.Cookie }, "POST", settings())).status).toBe(200);
    for (const path of ["history", "account"])
      expect((await call(path, {}, { Cookie: a.Cookie }, path === "history" ? "GET" : "DELETE", settings())).status).toBe(401);
    expect(await (await call("auth/me", {}, { Cookie: a.Cookie }, "GET", settings())).json()).toMatchObject({ signedIn: false });
    expect(await (await call("mark", input, headers, "POST", settings())).json()).toMatchObject({ dailyLimit: 10 });
    expect(await accountExists(db, a.uid, 0)).toBe(false); expect(await accountExists(db, b.uid, 0)).toBe(true);
    const fresh = await session(); expect(fresh.epoch).toBe(1);
    expect(await (await call("auth/me", {}, { Cookie: fresh.Cookie }, "GET", settings())).json()).toMatchObject({ signedIn: true });
  });
  it("delete and immediate re-signup cannot revive any old epoch, including repeated deletion", async () => {
    for (let i = 0; i < 3; i++) {
      const old = await session();
      expect((await call("account", {}, { Cookie: old.Cookie }, "DELETE", settings())).status).toBe(200);
      expect(db.rows("SELECT * FROM users")).toHaveLength(0);
      const fresh = await session(); expect(fresh.epoch).toBe(old.epoch + 1);
      expect((await call("history", {}, { Cookie: old.Cookie }, "GET", settings())).status).toBe(401);
      expect((await call("history", {}, { Cookie: fresh.Cookie }, "GET", settings())).status).toBe(200);
    }
    expect(db.rows("SELECT * FROM session_revocations")).toHaveLength(1);
  });
  it("prunes deletion records only after 31 days, beyond old cookie expiry", async () => {
    // Freeze the clock first: real milliseconds between the delete and the jump would age the record past 31 days.
    vi.useFakeTimers({ toFake: ["Date"] }); const start = Date.now(); vi.setSystemTime(start);
    const old = await session();
    await call("account", {}, { Cookie: old.Cookie }, "DELETE", settings());
    vi.setSystemTime(start + 31 * 86400000);
    await session("other-student"); expect(db.rows("SELECT * FROM session_revocations")).toHaveLength(1);
    vi.setSystemTime(Date.now() + 1); await session();
    expect(db.rows("SELECT * FROM session_revocations")).toHaveLength(0);
    expect(await readSession(request("auth/me", {}, { Cookie: old.Cookie }, "GET"), salt)).toBeNull();
  });
  it("rejects genuinely signed legacy cookies that have no epoch", async () => {
    const uid = await userId(salt, "legacy"); await upsertUser(db, uid, "2026-10-30");
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(salt), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const derived = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("bandexe-session-v1"));
    const signingKey = await crypto.subtle.importKey("raw", derived, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const payload = base64url(new TextEncoder().encode(JSON.stringify({ uid, exp: Math.floor(Date.now() / 1000) + 3600 })));
    const signature = base64url(new Uint8Array(await crypto.subtle.sign("HMAC", signingKey, new TextEncoder().encode(payload))));
    const Cookie = `bx_session=${payload}.${signature}`;
    expect(await readSession(request("auth/me", {}, { Cookie }, "GET"), salt)).toBeNull();
    expect((await call("history", {}, { Cookie }, "GET", settings())).status).toBe(401);
  });
});
