import type { HistorySummary } from "./history-summary";
export { validateHistory, type HistorySummary } from "./history-summary";
import type { Database } from "./storage.js";
import { timedCall } from "./free-traffic.js";

const encoder = new TextEncoder();
const algorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
const lifetime = 30 * 86400;
const bounded = <T>(run: () => Promise<T>) => timedCall(run, 3000);
export class AuthError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
const invalid = () => new AuthError(401, "invalid_credential", "Google sign-in could not be verified. Try again.");
export const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function decode(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw invalid();
  const bytes = Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  if (base64url(bytes) !== value) throw invalid();
  return bytes;
}
const jsonPart = (part: string) => JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(decode(part)));
const hmacKey = (bytes: Uint8Array<ArrayBuffer>) => crypto.subtle.importKey("raw", bytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
async function hmac(salt: string, value: string) {
  return new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(encoder.encode(salt)), encoder.encode(value)));
}
export const userId = async (salt: string, sub: string) => base64url(await hmac(salt, "uid|" + sub));
const sessionKey = async (salt: string) => hmacKey(await hmac(salt, "bandexe-session-v1"));
export async function signSession(uid: string, salt: string, now = Date.now(), epoch = 0) {
  const payload = base64url(encoder.encode(JSON.stringify({ uid, epoch, exp: Math.floor(now / 1000) + lifetime })));
  return payload + "." + base64url(new Uint8Array(await crypto.subtle.sign("HMAC", await sessionKey(salt), encoder.encode(payload))));
}
export async function readSession(request: Request, salt?: string, now = Date.now()): Promise<{ uid: string; epoch: number } | null> {
  if (!salt) return null;
  const cookie = request.headers.get("Cookie")?.split(";").map((s) => s.trim()).find((s) => s.startsWith("bx_session="))?.slice(11);
  if (!cookie || cookie.length > 512) return null;
  try {
    const [payload, signature, extra] = cookie.split(".");
    if (!payload || !signature || extra !== undefined || !await crypto.subtle.verify("HMAC", await sessionKey(salt), decode(signature), encoder.encode(payload))) return null;
    const value = jsonPart(payload), seconds = Math.floor(now / 1000);
    return /^[A-Za-z0-9_-]{43}$/.test(value.uid) && Number.isSafeInteger(value.epoch) && value.epoch >= 0 && Number.isSafeInteger(value.exp)
      && value.exp > seconds && value.exp <= seconds + lifetime ? { uid: value.uid, epoch: value.epoch } : null;
  } catch { return null; }
}
export const sessionCookie = (token = "") => `bx_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=${token ? lifetime : 0}`;

type GoogleKey = JsonWebKey & { kid?: string };
let keys: { values: GoogleKey[]; until: number } | undefined;
let loading: Promise<GoogleKey[]> | undefined;
async function googleKeys(): Promise<GoogleKey[]> {
  if (keys && keys.until > Date.now()) return keys.values;
  return loading ??= (async () => {
    try {
      const response = await fetch("https://www.googleapis.com/oauth2/v3/certs", { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error("jwks");
      const data = await response.json() as { keys?: GoogleKey[] };
      if (!Array.isArray(data.keys)) throw new Error("jwks");
      const maxAge = Number(response.headers.get("Cache-Control")?.match(/(?:^|[,\s])max-age=(\d+)/i)?.[1] ?? 0);
      keys = { values: data.keys, until: Date.now() + maxAge * 1000 };
      return keys.values;
    } catch { throw new AuthError(503, "auth_unavailable", "Google sign-in is temporarily unavailable."); }
    finally { loading = undefined; }
  })();
}
export async function verifyGoogleToken(credential: unknown, clientId: string, now = Date.now()): Promise<{ sub: string; firstName: string; email: string }> {
  if (typeof credential !== "string" || credential.length > 16384) throw invalid();
  try {
    const [header, payload, signature, extra] = credential.split(".");
    if (!header || !payload || !signature || extra !== undefined) throw invalid();
    const head = jsonPart(header), value = jsonPart(payload), seconds = Math.floor(now / 1000);
    if (head.alg !== "RS256" || typeof head.kid !== "string" || !head.kid || head.crit !== undefined
      || !["accounts.google.com", "https://accounts.google.com"].includes(value.iss) || value.aud !== clientId
      || !Number.isSafeInteger(value.exp) || value.exp <= seconds - 60
      || !Number.isSafeInteger(value.iat) || value.iat <= 0 || value.iat > seconds + 60
      || value.iat < seconds - 86400 || value.exp <= value.iat || value.exp - value.iat > 86400
      || typeof value.sub !== "string" || !value.sub || value.sub.length > 255) throw invalid();
    const jwk = (await googleKeys()).find((key) => key.kid === head.kid && key.kty === "RSA"
      && (!key.alg || key.alg === "RS256") && (!key.use || key.use === "sig"));
    if (!jwk) throw invalid();
    const key = await crypto.subtle.importKey("jwk", jwk, algorithm, false, ["verify"]);
    if (!await crypto.subtle.verify(algorithm, key, decode(signature), encoder.encode(header + "." + payload))) throw invalid();
    // Only a Google-verified address counts, so nobody can claim an email they do not own.
    const email = value.email_verified === true && typeof value.email === "string" ? value.email.toLowerCase() : "";
    return { sub: value.sub, email, firstName: typeof value.given_name === "string" ? value.given_name.replace(/[\p{Cc}\p{Cf}]/gu, "").trim().slice(0, 60) : "" };
  } catch (error) { if (error instanceof AuthError) throw error; throw invalid(); }
}

/** Owner-granted extras: UNLOCK_ALL_EMAILS is a comma-separated Cloudflare secret, never stored in code or D1. */
export const unlocksAll = (email: string, list = "") => !!email && list.toLowerCase().split(",").map((e) => e.trim()).includes(email);

export async function accountExists(db: Database, uid: string, epoch: number) {
  return Boolean(await bounded(() => db.prepare("SELECT uid FROM users WHERE uid = ? AND session_epoch = ?").bind(uid, epoch).first()));
}
export async function upsertUser(db: Database, uid: string, day: string) {
  await pruneRevocations(db);
  const row = await bounded(() => db.prepare(`INSERT INTO users (uid, created, last_seen, session_epoch)
    VALUES (?, ?, ?, COALESCE((SELECT session_epoch FROM session_revocations WHERE uid = ?), 0))
    ON CONFLICT(uid) DO UPDATE SET last_seen = excluded.last_seen RETURNING session_epoch`)
    .bind(uid, day, day, uid).first<{ session_epoch: number }>());
  if (!row) throw new Error("account");
  return row.session_epoch;
}
export async function saveHistory(db: Database, uid: string, h: HistorySummary) {
  await bounded(() => db.batch([
    // An account deleted concurrently cannot be recreated by an in-flight sync.
    db.prepare(`INSERT INTO history (uid, id, day, task, overall, bands, priorities)
      SELECT ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM users WHERE uid = ?)
      ON CONFLICT(uid, id) DO UPDATE SET day = excluded.day, task = excluded.task,
      overall = excluded.overall, bands = excluded.bands, priorities = excluded.priorities`)
      .bind(uid, h.id, h.day, h.task, h.overall, JSON.stringify(h.bands), JSON.stringify(h.priorities), uid),
    db.prepare(`DELETE FROM history WHERE uid = ? AND id IN
      (SELECT id FROM history WHERE uid = ? ORDER BY day DESC, id DESC LIMIT -1 OFFSET 500)`).bind(uid, uid),
  ]));
}
export async function readHistory(db: Database, uid: string): Promise<HistorySummary[]> {
  const [result] = await bounded(() => db.batch([
    db.prepare("SELECT id, day, task, overall, bands, priorities FROM history WHERE uid = ? ORDER BY day DESC, id DESC LIMIT 200").bind(uid),
  ]));
  if (result.success === false) throw new Error("history");
  return (result.results || []).map((row) => ({ ...row, bands: JSON.parse(String(row.bands)), priorities: JSON.parse(String(row.priorities)) })) as HistorySummary[];
}
export async function revokeSessions(db: Database, uid: string) {
  await bounded(() => db.prepare("UPDATE users SET session_epoch = session_epoch + 1 WHERE uid = ?").bind(uid).run());
}
async function pruneRevocations(db: Database, now = Date.now()) {
  await bounded(() => db.prepare("DELETE FROM session_revocations WHERE revoked_at < ?").bind(now - 31 * 86400000).run());
}
export async function deleteAccount(db: Database, uid: string, now = Date.now()) {
  await bounded(() => db.batch([
    // Persist the next epoch atomically with deletion. It outlives every old cookie,
    // so re-creating the same uid cannot revive a session (including same-ms signup).
    db.prepare(`INSERT INTO session_revocations (uid, session_epoch, revoked_at)
      SELECT uid, session_epoch + 1, ? FROM users WHERE uid = ?
      ON CONFLICT(uid) DO UPDATE SET session_epoch = MAX(session_epoch, excluded.session_epoch), revoked_at = excluded.revoked_at`)
      .bind(now, uid),
    db.prepare("DELETE FROM history WHERE uid = ?").bind(uid),
    // Today's allowance rows stay (pseudonymous, pruned daily) so delete-and-rejoin cannot reset the daily limit.
    db.prepare("DELETE FROM users WHERE uid = ?").bind(uid),
  ]));
}
