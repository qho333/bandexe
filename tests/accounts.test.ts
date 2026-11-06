import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sqliteD1 } from "./sqlite-d1";
import type { onRequest as Handler } from "../functions/api/[[path]]";
import type * as Accounts from "../shared/accounts";

let accounts: typeof Accounts, onRequest: typeof Handler;
let pair: CryptoKeyPair, jwk: JsonWebKey;
let db: ReturnType<typeof sqliteD1>;
const clientId = "test.apps.googleusercontent.com", salt = "test-only-quota-salt";
const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const claims = () => ({ iss: "https://accounts.google.com", aud: clientId, exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000), sub: "google-private-sub", given_name: "Student", email: "private@example.com" });
async function token(patch = {}, head = {}, signingKey?: CryptoKey) {
  const input = encode({ alg: "RS256", kid: "test-rsa", ...head }) + "." + encode({ ...claims(), ...patch });
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", signingKey || pair.privateKey, new TextEncoder().encode(input));
  return input + "." + accounts.base64url(new Uint8Array(signature));
}
const markBody = { task: "t2", question: "Discuss learning through practice.", essay: "People learn through practice and clear examples in their everyday lives. ".repeat(8) };
const report = JSON.stringify({ criteria: Object.fromEntries(["tr", "cc", "lr", "gra"].map((k) => [k, { band: 6, summary: "ok" }])),
  grammar_corrections: [], paragraphs: [], strengths: [] });
const summary = () => ({ id: "result-001", day: new Date().toISOString().slice(0, 10), task: "t2", overall: 6.5,
  bands: { tr: 6, cc: 6.5, lr: 7, gra: null }, priorities: ["Practise verb tense"] });
type Env = Parameters<typeof Handler>[0]["env"];
const env = (): Env => ({ GOOGLE_CLIENT_ID: clientId, QUOTA_SALT: salt, DB: db, AI: { run: async (_model, input: any) =>
  ({ response: input.response_format ? report : "A short hint." }) } });
function request(path: string, method = "GET", body?: unknown, cookie?: string, headers: Record<string, string> = {}) {
  return new Request("https://bandexe.pages.dev/api/" + path, { method,
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.55", "X-Requested-With": "bandexe", ...(cookie ? { Cookie: cookie } : {}), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function account(sub = "google-private-sub") {
  const uid = await accounts.userId(salt, sub);
  await accounts.upsertUser(db, uid, new Date().toISOString().slice(0, 10));
  return { uid, cookie: "bx_session=" + await accounts.signSession(uid, salt) };
}
const call = (path: string, method = "GET", body?: unknown, cookie?: string, headers?: Record<string, string>, settings = env()) =>
  onRequest({ request: request(path, method, body, cookie, headers), env: settings });

beforeAll(async () => {
  pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
});
beforeEach(async () => {
  vi.resetModules();
  accounts = await import("../shared/accounts");
  ({ onRequest } = await import("../functions/api/[[path]]"));
  db = sqliteD1();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ keys: [{ ...jwk, kid: "test-rsa" }] }), { headers: { "Cache-Control": "public, max-age=3600" } })));
});
afterEach(() => { db.close(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Google RS256 verification", () => {
  it("verifies WebCrypto signatures, both issuers and transient first names", async () => {
    expect(await accounts.verifyGoogleToken(await token(), clientId)).toEqual({ sub: "google-private-sub", firstName: "Student" });
    expect(await accounts.verifyGoogleToken(await token({ iss: "accounts.google.com" }), clientId)).toHaveProperty("sub");
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith("https://www.googleapis.com/oauth2/v3/certs", expect.anything());
  });
  it.each([
    ["audience", { aud: "another-client" }, {}], ["array audience", { aud: [clientId] }, {}],
    ["expired", { exp: Math.floor(Date.now() / 1000) - 61, iat: Math.floor(Date.now() / 1000) - 3661 }, {}],
    ["issuer", { iss: "https://attacker.example" }, {}], ["future issued", { iat: Math.floor(Date.now() / 1000) + 120 }, {}],
    ["missing issued", { iat: null }, {}], ["missing sub", { sub: "" }, {}],
    ["wrong kid", {}, { kid: "unknown" }], ["algorithm", {}, { alg: "HS256" }],
  ])("rejects %s", async (_label, patch, head) => {
    await expect(accounts.verifyGoogleToken(await token(patch as object, head as object), clientId)).rejects.toMatchObject({ status: 401 });
  });
  it("rejects bad signatures, altered payloads and malformed tokens", async () => {
    const other = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
    await expect(accounts.verifyGoogleToken(await token({}, {}, other.privateKey), clientId)).rejects.toMatchObject({ status: 401 });
    const valid = await token();
    const parts = valid.split("."); parts[1] = encode({ ...claims(), sub: "altered" });
    for (const value of [parts.join("."), valid + ".extra", "broken", null, "x".repeat(16385)])
      await expect(accounts.verifyGoogleToken(value, clientId)).rejects.toMatchObject({ status: 401 });
  });
  it("allows 60 seconds of expiry skew and refreshes JWKS at Cache-Control max-age", async () => {
    const now = Date.now();
    await expect(accounts.verifyGoogleToken(await token({ exp: Math.floor(now / 1000) - 59, iat: Math.floor(now / 1000) - 3599 }), clientId)).resolves.toHaveProperty("sub");
    vi.spyOn(Date, "now").mockReturnValue(now + 3599_000);
    await accounts.verifyGoogleToken(await token(), clientId); expect(fetch).toHaveBeenCalledOnce();
    vi.spyOn(Date, "now").mockReturnValue(now + 3601_000);
    await accounts.verifyGoogleToken(await token(), clientId); expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("fails cleanly when keys cannot be fetched", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 503 })));
    const response = await call("auth/google", "POST", { credential: await token() });
    expect(response.status).toBe(503); expect(response.headers.has("Set-Cookie")).toBe(false);
  });
});

describe("pseudonymous sessions and accounts", () => {
  it("derives the required stable uid and session key with HMAC, and rejects tampering and expiry", async () => {
    const uid = await accounts.userId(salt, "google-private-sub");
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(salt), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("uid|google-private-sub")));
    expect(uid).toBe(accounts.base64url(expected));
    const now = Date.now(), signed = await accounts.signSession(uid, salt, now);
    const cookieRequest = (value: string) => request("auth/me", "GET", undefined, "other=1; bx_session=" + value);
    expect(await accounts.readSession(cookieRequest(signed), salt, now)).toEqual({ uid, epoch: 0 });
    expect(await accounts.readSession(cookieRequest(signed), "wrong-salt", now)).toBeNull();
    expect(await accounts.readSession(cookieRequest(signed), salt, now + 30 * 86400_000)).toBeNull();
    const [payload, signature] = signed.split(".");
    const sessionKeyBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("bandexe-session-v1"));
    const sessionKey = await crypto.subtle.importKey("raw", sessionKeyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const bytes = Uint8Array.from(atob(signature.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    expect(await crypto.subtle.verify("HMAC", sessionKey, bytes, new TextEncoder().encode(payload))).toBe(true);
    for (const bad of [signed + ".extra", encode({ uid: "a".repeat(43), exp: Math.floor(now / 1000) + 100 }) + "." + signature,
      payload + "." + (signature.startsWith("a") ? "b" : "a") + signature.slice(1), "broken"])
      expect(await accounts.readSession(cookieRequest(bad), salt, now)).toBeNull();
    expect(await accounts.readSession(cookieRequest(signed))).toBeNull();
  });
  it("stores only uid and day stamps, sets the restricted cookie, and never returns name from /me", async () => {
    const response = await call("auth/google", "POST", { credential: await token() });
    expect(await response.json()).toEqual({ signedIn: true, firstName: "Student" });
    const cookie = response.headers.get("Set-Cookie")!;
    for (const flag of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/api", "Max-Age=2592000"]) expect(cookie).toContain(flag);
    const me = await call("auth/me", "GET", undefined, cookie.split(";")[0]);
    expect(await me.json()).toEqual({ signedIn: true, limit: 15, remainingToday: 15 });
    await call("auth/google", "POST", { credential: await token() });
    expect(db.rows("SELECT * FROM users")).toHaveLength(1);
    const stored = JSON.stringify(db.records);
    for (const privateValue of ["google-private-sub", "Student", "private@example.com", "192.0.2.55", "credential"])
      expect(stored).not.toContain(privateValue);
    expect(Object.keys(db.rows("SELECT * FROM users")[0]).sort()).toEqual(["created", "last_seen", "session_epoch", "uid"]);
  });
  it("logs out by clearing the cookie, retaining the account and history", async () => {
    const a = await account();
    await call("history", "POST", summary(), a.cookie);
    const response = await call("auth/logout", "POST", undefined, a.cookie);
    expect(response.headers.get("Set-Cookie")).toContain("bx_session=;");
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect(db.rows("SELECT * FROM users")).toHaveLength(1);
    expect(db.rows("SELECT * FROM history")).toHaveLength(1);
  });
  it("deletes all account records, preserves other accounts and rejects a deleted account's cookies", async () => {
    const a = await account(), b = await account("other-sub");
    for (const owner of [a, b]) {
      await call("history", "POST", summary(), owner.cookie);
      await call("mark", "POST", markBody, owner.cookie);
      await call("helper", "POST", { role: "coach", message: "Timing?" }, owner.cookie);
    }
    const response = await call("account", "DELETE", undefined, a.cookie);
    expect(response.status).toBe(200); expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect(db.rows("SELECT uid FROM users")).toEqual([{ uid: b.uid }]);
    expect(db.rows("SELECT uid FROM history")).toEqual([{ uid: b.uid }]);
    // Deleting and signing in again must not reset today's allowance.
    expect(db.rows("SELECT key FROM daily_allowance").some((r) => String(r.key).endsWith(a.uid))).toBe(true);
    expect((await call("history", "GET", undefined, a.cookie)).status).toBe(401);
    expect((await call("history", "POST", summary(), a.cookie)).status).toBe(401);
    expect((await (await call("auth/me", "GET", undefined, a.cookie)).json()).signedIn).toBe(false);
  });
});

describe("account allowances and request cloning", () => {
  it("admits 15 checks per account across IPs and 10 per guest IP", async () => {
    const a = await account();
    for (let i = 0; i < 16; i++) {
      const response = await call("mark", "POST", markBody, a.cookie, { "CF-Connecting-IP": `192.0.2.${i}` });
      expect(response.status).toBe(i < 15 ? 200 : 429);
      if (i < 15) expect(await response.json()).toMatchObject({ dailyLimit: 15, remainingToday: 14 - i });
    }
    for (let i = 0; i < 11; i++) expect((await call("mark", "POST", markBody)).status).toBe(i < 10 ? 200 : 429);
    expect(db.rows("SELECT n FROM daily_allowance WHERE key = ?", "mark:acct:" + a.uid)).toEqual([{ n: 15 }]);
  });
  it("uses 60 vs 40 helpers, sharing that allowance with model answers and report detail", async () => {
    const a = await account();
    for (const [cookie, limit] of [[a.cookie, 60], [undefined, 40]] as const) {
      for (let i = 0; i <= limit; i++) {
        const path = i % 3 === 0 ? "helper" : i % 3 === 1 ? "model-answer" : "report-detail";
        const response = await call(path, "POST", path === "helper" ? { role: "coach", message: "Timing?" } : markBody, cookie);
        expect(response.status).toBe(i < limit ? 200 : 429);
        if (i < limit) expect((await response.json()).dailyLimit).toBe(limit);
      }
    }
  });
  it("preserves Cookie through Idempotency-Key cloning, replays once and isolates accounts", async () => {
    const a = await account(), b = await account("other-sub");
    const run = vi.fn(async () => ({ response: report }));
    const settings = { ...env(), AI: { run } };
    const headers = { "Idempotency-Key": "account_clone_request_001" };
    for (let i = 0; i < 2; i++) {
      const response = await call("mark", "POST", markBody, a.cookie, headers, settings);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ dailyLimit: 15, remainingToday: 14 });
    }
    expect(run).toHaveBeenCalledOnce();
    expect(db.rows("SELECT key, n FROM daily_allowance")).toEqual([{ key: "mark:acct:" + a.uid, n: 1 }]);
    expect((await call("mark", "POST", markBody, b.cookie, headers, settings)).status).toBe(200);
    expect(run).toHaveBeenCalledTimes(2);
    expect((await call("mark", "POST", markBody, a.cookie, { ...headers, "X-Requested-With": "" }, settings)).status).toBe(403);
  });
  it("keys shared mark and helper limiters by account, and leaves guest keys unchanged", async () => {
    const a = await account(), limit = vi.fn(async () => ({ success: false }));
    const settings = { ...env(), MARK_LIMITER: { limit }, HELPER_LIMITER: { limit } };
    for (const path of ["mark", "helper", "model-answer", "report-detail"]) {
      expect((await call(path, "POST", path === "helper" ? { role: "coach", message: "Timing?" } : markBody, a.cookie, {}, settings)).status).toBe(429);
      expect(limit).toHaveBeenLastCalledWith({ key: "acct:" + a.uid });
    }
    await call("mark", "POST", markBody, undefined, {}, settings);
    expect(limit).toHaveBeenLastCalledWith({ key: "192.0.2.55" });
  });
});

describe("summary history, CSRF and the feature flag", () => {
  it.each([
    { essay: "private writing" }, { question: "private question" }, { name: "Private" }, { email: "private@example.com" },
    { priorities: ["x".repeat(121)] }, { priorities: ["a", "b", "c", "d"] }, { priorities: [7] }, { priorities: ["private@example.com"] },
    { bands: { tr: 6, cc: 6, lr: 6, gra: 6, essay: "private" } }, { bands: { tr: 10, cc: 6, lr: 6, gra: 6 } },
    { overall: 6.3 }, { task: "essay" }, { day: "2026-02-30" }, { id: "private prose with spaces" },
  ])("rejects invalid history %j before any write", async (patch) => {
    const a = await account();
    expect((await call("history", "POST", { ...summary(), ...patch }, a.cookie)).status).toBe(400);
    expect(db.rows("SELECT * FROM history")).toEqual([]);
  });
  it("upserts only the owner's summary, caps 500 and returns the latest 200 in order", async () => {
    const a = await account(), b = await account("other-sub");
    for (let i = 0; i < 505; i++) await accounts.saveHistory(db, a.uid, { ...summary(), task: "t2", id: `result-${String(i).padStart(4, "0")}` });
    await call("history", "POST", { ...summary(), id: "result-0504", overall: null }, a.cookie);
    await call("history", "POST", summary(), b.cookie);
    expect(db.rows("SELECT id FROM history WHERE uid = ?", a.uid)).toHaveLength(500);
    expect(db.rows("SELECT id FROM history WHERE uid = ? AND id = ?", a.uid, "result-0000")).toEqual([]);
    const result = await (await call("history", "GET", undefined, a.cookie)).json();
    expect(result.history).toHaveLength(200); expect(result.history[0]).toMatchObject({ id: "result-0504", overall: null });
    expect(Object.keys(result.history[0]).sort()).toEqual(["bands", "day", "id", "overall", "priorities", "task"]);
    expect((await (await call("history", "GET", undefined, b.cookie)).json()).history).toHaveLength(1);
  });
  it("requires the exact CSRF header for all account mutations and signed-in marking routes", async () => {
    const a = await account();
    for (const header of ["", "wrong"]) for (const [path, method, body] of [
      ["auth/google", "POST", { credential: await token() }], ["auth/logout", "POST", undefined],
      ["account", "DELETE", undefined], ["history", "POST", summary()],
      ...["mark", "model-answer", "report-detail"].map((path): [string, string, unknown] => [path, "POST", markBody]),
      ["helper", "POST", { role: "coach", message: "Timing?" }],
    ] as const) expect((await call(path, method, body, a.cookie, { "X-Requested-With": header })).status).toBe(403);
    expect((await call("auth/google", "POST", {}, undefined, { "X-Requested-With": "" })).status).toBe(403);
    expect((await call("mark", "POST", markBody, undefined, { "X-Requested-With": "" })).status).toBe(403);
    expect((await call("history")).status).toBe(401);
  });
  it("keeps accounts disabled without GOOGLE_CLIENT_ID, including when a cookie is present", async () => {
    const a = await account(), disabled = { ...env(), GOOGLE_CLIENT_ID: undefined };
    const config = await call("auth/config", "GET", undefined, undefined, {}, disabled);
    expect(await config.json()).toEqual({ googleClientId: null });
    for (const [path, method] of [["auth/google", "POST"], ["auth/logout", "POST"], ["auth/me", "GET"], ["account", "DELETE"], ["history", "GET"], ["history", "POST"]])
      expect((await call(path, method, method === "GET" ? undefined : {}, a.cookie, {}, disabled)).status).toBe(404);
    expect(await (await call("health", "GET", undefined, a.cookie, {}, disabled)).json()).toMatchObject({ dailyLimit: 10 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("returns 503 for missing account storage or salt and 401 for invalid credentials", async () => {
    for (const settings of [{ ...env(), DB: undefined }, { ...env(), QUOTA_SALT: undefined }])
      expect((await call("auth/me", "GET", undefined, undefined, {}, settings)).status).toBe(503);
    const response = await call("auth/google", "POST", { credential: await token({ aud: "wrong" }) });
    expect(response.status).toBe(401); expect(db.rows("SELECT * FROM users")).toEqual([]);
  });
});
