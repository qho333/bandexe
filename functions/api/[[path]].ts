import { AuthError, verifyGoogleToken, unlocksAll, userId, signSession, readSession, sessionCookie, accountExists, upsertUser, validateHistory, saveHistory, readHistory, deleteAccount, revokeSessions } from "../../shared/accounts";
import { clientAddress } from "../../shared/client-address";
import { digest, replay } from "../../shared/traffic";
import { mark, MarkError, MODEL, validateMarkRequest, validateQuestionImage, MAX_BODY_BYTES, askHelper, validateHelperRequest, HelperError, HELPER_MODEL } from "../../shared/index.js";
import { markFree, helperFree, modelAnswerFree, questionFromImage, isTester, FREE_CONFIG, type FreeEnv } from "../../shared/free.js";
import { modelAnswer } from "../../shared/study.js";
import { geminiEligibility, REGION_MESSAGE } from "../../shared/eligibility.js";
import { dailyAllowance, count, countImpact, validateReview, saveReview, pendingReviews, moderateReview, publicStats, pruneAllowances, type Database } from "../../shared/storage.js";
import { freeCacheKey, readFreeCache, writeFreeCache } from "../../shared/free-cache";

interface Limiter { limit(input: { key: string }): Promise<{ success: boolean }> }
interface Context {
  request: Request & { cf?: { country?: string } };
  env: FreeEnv & { GEMINI_API_KEY?: string; MARK_LIMITER?: Limiter; HELPER_LIMITER?: Limiter; QUOTA_SALT?: string; GOOGLE_CLIENT_ID?: string; UNLOCK_ALL_EMAILS?: string; DB?: Database;
    QUOTA?: { get(key: string): Promise<string | null>; put(key: string, value: string, options: { expirationTtl: number }): Promise<void> } };
}
const responseSecurityHeaders = {
  "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin", "X-Frame-Options": "DENY",
};
const send = (status: number, body: unknown, remaining?: number | null) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store",
    ...responseSecurityHeaders,
    ...(remaining != null ? { "X-Remaining-Today": String(remaining) } : {}) },
});

const DEFAULT_BODY_BYTES = 64 * 1024;
async function readJson(request: Request, maxBytes = DEFAULT_BODY_BYTES): Promise<{ body: unknown; bytes: Uint8Array<ArrayBuffer> }> {
  const tooLarge = () => new MarkError(413, "too_large", "The request is too large. Images must be 4 MB or smaller.");
  if (Number(request.headers.get("Content-Length")) > maxBytes) throw tooLarge();
  const reader = request.body?.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw tooLarge(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.byteLength; }
  // Sign-out and account deletion carry no body: an empty body is an empty object, not unreadable JSON.
  if (!bytes.length) return { body: {}, bytes };
  try { return { body: JSON.parse(new TextDecoder().decode(bytes)), bytes }; }
  catch { throw new MarkError(400, "bad_json", "The request could not be read."); }
}

// Allowance keys store a salted daily digest, never an IP or essay. Reports use cache: keys.
const dailyLimit = (uid: string | null, helper = false) => helper
  ? uid ? FREE_CONFIG.accountHelpersPerDay : FREE_CONFIG.helpersPerDay
  : uid ? FREE_CONFIG.accountChecksPerDay : FREE_CONFIG.checksPerDay;
// A school or phone network shares one address, so a connection gets this many browsers' worth of guest checks.
const CONNECTION_SHARE = 4;
async function allowance(request: Request, env: Context["env"], helper = false, reserve = false, uid: string | null = null) {
  const limit = dailyLimit(uid, helper);
  const ip = clientAddress(request.headers.get("CF-Connecting-IP"));
  if (!env.DB || !env.QUOTA_SALT || (!uid && !ip)) return null;
  const day = new Date().toISOString().slice(0, 10), kind = helper ? "helper" : "mark";
  const browser = uid ? null : request.headers.get("X-Browser");
  // Older pages send no browser ID: they keep the plain per-connection allowance.
  if (!browser || !/^[a-f0-9-]{36}$/.test(browser)) {
    const key = `${kind}:${uid ? `acct:${uid}` : await digest(`${env.QUOTA_SALT}|${ip}|${day}`)}`;
    const result = await dailyAllowance(env.DB, key, day, limit, reserve);
    return result ? { ...result, limit, remaining: Math.max(0, limit - result.used) } : null;
  }
  // The browser is counted first, so a student who is out of checks never uses up the connection's share.
  const own = await dailyAllowance(env.DB, `${kind}:b:${await digest(`${env.QUOTA_SALT}|${browser}|${day}`)}`, day, limit, reserve);
  if (!own?.admitted) return own ? { ...own, limit, remaining: 0 } : null;
  const shared = await dailyAllowance(env.DB, `${kind}:${await digest(`${env.QUOTA_SALT}|${ip}|${day}`)}`, day, limit * CONNECTION_SHARE, reserve);
  if (!shared) return null;
  return { used: own.used, admitted: shared.admitted, limit, remaining: shared.admitted ? Math.max(0, limit - own.used) : 0 };
}

// Separate namespaces share the same daily salt and pruning policy as marking.
async function optionalAllowance(request: Request, env: Context["env"], prefix: string, limit: number) {
  const ip = clientAddress(request.headers.get("CF-Connecting-IP"));
  if (!env.DB || !env.QUOTA_SALT || !ip) return null;
  const day = new Date().toISOString().slice(0, 10);
  const key = `${prefix}:${await digest(`${env.QUOTA_SALT}|${ip}|${day}`)}`;
  return dailyAllowance(env.DB, key, day, limit, true);
}

async function handle({ request, env }: Context, body: unknown, uid: string | null): Promise<Response> {
  let remaining: number | null = null;
  try {
    const path = new URL(request.url).pathname;
    const accountRoute = path.startsWith("/api/auth/") || path === "/api/account" || path === "/api/history";
    if (path === "/api/auth/config" && request.method === "GET") return send(200, { googleClientId: env.GOOGLE_CLIENT_ID || null });
    if (accountRoute && !env.GOOGLE_CLIENT_ID) return send(404, { error: "not_found", message: "Sign-in is not enabled." });
    if (accountRoute && (!env.QUOTA_SALT || !env.DB)) return send(503, { error: "auth_unavailable", message: "Sign-in is temporarily unavailable." });
    const withCookie = (body: unknown, token = "") => {
      const response = send(200, body);
      response.headers.set("Set-Cookie", sessionCookie(token));
      return response;
    };
    if (accountRoute) try {
      if (path === "/api/auth/google" && request.method === "POST") {
        const credentialBody = body as { credential?: unknown } | null;
        if (!credentialBody || typeof credentialBody !== "object" || Array.isArray(credentialBody) || Object.keys(credentialBody).some((k) => k !== "credential"))
          return send(400, { error: "invalid", message: "Choose Sign in with Google." });
        const identity = await verifyGoogleToken(credentialBody.credential, env.GOOGLE_CLIENT_ID!);
        const nextUid = await userId(env.QUOTA_SALT!, identity.sub);
        const epoch = await upsertUser(env.DB!, nextUid, new Date().toISOString().slice(0, 10));
        return withCookie({ signedIn: true, firstName: identity.firstName, ...(unlocksAll(identity.email, env.UNLOCK_ALL_EMAILS) ? { unlockAll: true } : {}) }, await signSession(nextUid, env.QUOTA_SALT!, Date.now(), epoch));
      }
      if (path === "/api/auth/logout" && request.method === "POST") {
        if (uid) await revokeSessions(env.DB!, uid);
        return withCookie({ signedIn: false });
      }
      if (path === "/api/auth/me" && request.method === "GET") {
        const quota = await allowance(request, env, false, false, uid);
        return send(200, { signedIn: Boolean(uid), limit: dailyLimit(uid), remainingToday: quota?.remaining ?? null });
      }
      if (["/api/account", "/api/history"].includes(path) && !uid) return send(401, { error: "sign_in", message: "Sign in to use your saved progress." });
      if (path === "/api/account" && request.method === "DELETE") {
        await deleteAccount(env.DB!, uid!);
        return withCookie({ signedIn: false });
      }
      if (path === "/api/history" && request.method === "POST") {
        if (!validateHistory(body)) return send(400, { error: "invalid_history", message: "Only scores and up to three short practice priorities can be saved." });
        await saveHistory(env.DB!, uid!, body);
        return send(200, { ok: true });
      }
      if (path === "/api/history" && request.method === "GET") return send(200, { history: await readHistory(env.DB!, uid!) });
      return send(404, { error: "not_found", message: "Not found." });
    } catch (error) {
      if (error instanceof AuthError || error instanceof MarkError) throw error;
      throw new AuthError(503, "auth_unavailable", "Your account could not be updated. Try again.");
    }

    if (request.method === "POST" && path === "/api/hit") {
      // Accept only boolean events. No submitted identity or writing reaches storage.
      const hit = (body && typeof body === "object" && !Array.isArray(body) ? body : {}) as { first?: boolean; student?: boolean };
      // No metrics or cleanup writes on a missing/failed/exhausted reservation.
      const visit = await optionalAllowance(request, env, "hitvisit", 20);
      if (visit?.admitted) {
        if (hit.student !== true) await count(env.DB, "visits");
        if (!(await isTester(request, env))) {
          for (const [event, name] of [[hit.first === true, "browsers"], [hit.student === true, "students"]] as const) {
            if (!event) continue;
            const quota = await optionalAllowance(request, env, "hitfirst", 3);
            if (quota?.admitted) await countImpact(env.DB, name, request.cf?.country);
          }
        }
        // At most one cleanup per daily client allowance, never on blocked hits.
        if (visit.used === 1) await pruneAllowances(env.DB);
      }
      return send(200, { ok: true });
    }
    if (path === "/api/reviews/pending" && request.method === "GET") {
      if (!(await isTester(request, env))) return send(403, { message: "Tester pass required." });
      const reviews = await pendingReviews(env.DB);
      return reviews ? send(200, { reviews }) : send(503, { message: "Reviews are temporarily unavailable." });
    }
    if (path === "/api/reviews/moderate" && request.method === "POST") {
      if (!(await isTester(request, env))) return send(403, { message: "Tester pass required." });
      const moderation = body as { id?: number; status?: string } | null;
      if (!moderation || !Number.isSafeInteger(moderation.id) || moderation.id! < 1 || !["approved", "hidden"].includes(moderation.status || ""))
        return send(400, { message: "Choose a review and Approve or Hide." });
      const changed = await moderateReview(env.DB, moderation.id!, moderation.status as "approved" | "hidden");
      return changed === null ? send(503, { message: "Reviews are temporarily unavailable." })
        : changed ? send(200, { ok: true }) : send(400, { message: "That review is missing or has no permission to be public." });
    }
    if (path === "/api/review" && request.method === "POST") {
      const validated = validateReview(body);
      if (!validated.value) return send(400, { message: validated.error });
      const quota = await optionalAllowance(request, env, "review", 5);
      if (!quota) return send(503, { message: "Ratings are temporarily unavailable. Try again shortly." });
      if (!quota.admitted) return send(429, { message: "Thanks for your feedback. You can send up to five ratings per UTC day." });
      const saved = await saveReview(env.DB, validated.value);
      return saved ? send(200, { ok: true }) : send(503, { message: "Ratings are temporarily unavailable. Your report is ready." });
    }
    if (request.method === "GET" && path === "/api/stats") {
      const response = send(200, await publicStats(env.DB));
      response.headers.set("Cache-Control", "public, max-age=300");
      return response;
    }
    const gemini = geminiEligibility(request.cf?.country);
    if (request.method === "GET" && path === "/api/health") {
      const quota = await allowance(request, env, false, false, uid);
      return send(200, { ok: true, model: MODEL, configured: Boolean(env.GEMINI_API_KEY), fixture: false, gemini,
        free: true, dailyLimit: dailyLimit(uid), remainingToday: quota?.remaining ?? null }, quota?.remaining);
    }
    if (request.method === "POST" && path === "/api/question-image") {
      const picture = validateQuestionImage(body);
      if (!picture.ok) throw new MarkError(400, "invalid", picture.error);
      const tester = await isTester(request, env);
      if (!tester && env.HELPER_LIMITER && !(await env.HELPER_LIMITER.limit({ key: uid ? `acct:${uid}` : clientAddress(request.headers.get("CF-Connecting-IP")) || "unknown" })).success)
        throw new MarkError(429, "limit", "Daily free limit reached on this server, try later.");
      const quota = tester ? null : await allowance(request, env, true, true, uid);
      if (!tester && !quota) throw new MarkError(503, "allowance_unavailable", "Your allowance could not be checked. Please try again shortly.");
      if (quota && !quota.admitted) throw new MarkError(429, "daily_limit", "Your free helper allowance resets at midnight UTC.");
      remaining = quota?.remaining ?? null;
      return send(200, { ...await questionFromImage(picture.value, env), remainingToday: remaining, dailyLimit: dailyLimit(uid, true) }, remaining);
    }
    if (request.method !== "POST" || !["/api/mark", "/api/helper", "/api/model-answer", "/api/report-detail"].includes(path)) return send(404, { error: "not_found", message: "Not found." });
    const detail = path === "/api/report-detail";
    const study = path === "/api/model-answer";
    const google = request.headers.get("X-Provider") === "gemini";
    const marking = path === "/api/mark" || study || detail;
    const v = marking ? { kind: "mark" as const, ...validateMarkRequest(body) } : { kind: "helper" as const, ...validateHelperRequest(body) };
    if (v.ok && v.kind === "mark") v.value.reportMode = detail ? "full" : "compact";
    if (!v.ok) throw new MarkError(400, "invalid", v.error);
    if (google && !env.GEMINI_API_KEY) throw new MarkError(503, "not_configured", "Gemini is not set up on this server.");
    const tester = await isTester(request, env);
    // Check before rate limiting/reserving: a reused report spends no provider or
    // personal allowance, even if today's ten new marks are already used up.
    // Tester runs bypass KV entirely so owners can exercise fresh provider output.
    const cacheKey = !google && !study && v.kind === "mark" && !tester && env.QUOTA
      ? await freeCacheKey(v.value) : null;
    if (cacheKey && env.QUOTA) {
      const cached = await readFreeCache(env.QUOTA, cacheKey);
      if (cached) return send(200, { ...cached, cached: true, calls: 0,
        remainingToday: null, dailyLimit: dailyLimit(uid, detail) });
    }
    const limiter = marking && !study && !detail ? env.MARK_LIMITER : env.HELPER_LIMITER;
    if (!tester && limiter && !(await limiter.limit({ key: uid ? `acct:${uid}` : clientAddress(request.headers.get("CF-Connecting-IP")) || "unknown" })).success)
      throw new MarkError(429, "limit", "Daily free limit reached on this server, try later.");
    const quota = tester ? null : await allowance(request, env, !marking || study || detail, true, uid);
    if (!tester && !quota) throw new MarkError(503, "allowance_unavailable", "Your allowance could not be checked. Please try again shortly.");
    remaining = quota?.remaining ?? null;
    if (quota && !quota.admitted) throw new MarkError(429, "daily_limit", marking && !study && !detail
      ? `Your ${quota.limit} free checks for today are used up. They reset at midnight UTC.` : "Your free helper allowance resets at midnight UTC.");
    // Reserve before upstream work so failed requests cannot bypass the daily allowance.
    if (quota) remaining = quota.remaining;
    const key = env.GEMINI_API_KEY || "";
    const result = v.kind === "mark" ? (study ? google ? { reply: await modelAnswer(v.value, { key }), model: MODEL } : await modelAnswerFree(v.value, env)
      : google ? await mark(v.value, { key }) : await markFree(v.value, env))
      : google ? { reply: await askHelper(v.value, { key }), model: HELPER_MODEL } : await helperFree(v.value, env);
    if (cacheKey && env.QUOTA && "report" in result) await writeFreeCache(env.QUOTA, cacheKey, result);
    if (path === "/api/mark" && "report" in result && result.overall !== null && !tester) await count(env.DB, "essays");
    return send(200, { ...result, remainingToday: remaining, dailyLimit: dailyLimit(uid, !marking || study || detail) }, remaining);
  } catch (e) {
    const err = e instanceof MarkError || e instanceof HelperError || e instanceof AuthError ? e
      : new MarkError(500, "server", "Something went wrong on our side. No score was produced.");
    return send(err.status, { error: err.code, message: err.message, remainingToday: remaining }, remaining);
  }
}

export async function onRequest(context: Context): Promise<Response> {
  const { request, env } = context;
  const path = new URL(request.url).pathname;
  try {
    const changing = ["POST", "DELETE", "PUT", "PATCH"].includes(request.method);
    // Gate every mutation before reading bodies, touching D1, or consulting replay.
    if (changing && (request.headers.get("X-Requested-With") !== "bandexe"
      || (request.headers.has("Origin") && request.headers.get("Origin") !== new URL(request.url).origin)))
      return send(403, { error: "csrf", message: "Reload the page and try again." });
    if (changing && request.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json")
      return send(415, { error: "content_type", message: "Send this request as application/json." });
    // Preserve the provider eligibility preflight before consuming a request body.
    if (request.method === "POST" && ["/api/mark", "/api/helper", "/api/model-answer", "/api/report-detail"].includes(path)
      && request.headers.get("X-Provider") === "gemini") {
      if (!geminiEligibility(request.cf?.country).allowed) return send(451, { error: "region", message: REGION_MESSAGE });
      if (request.headers.get("X-Age-Confirmed") !== "1") return send(403, { error: "age" });
    }
    let body: unknown;
    let bytes = new Uint8Array(0);
    if (changing && request.body) {
      const max = path === "/api/mark" || path === "/api/question-image" ? MAX_BODY_BYTES : path === "/api/auth/google" ? 32768 : path === "/api/history" ? 4096 : DEFAULT_BODY_BYTES;
      ({ body, bytes } = await readJson(request, max));
      // Only the chart-bearing mark route needs the image-sized streaming cap.
      const chart = body as { task?: unknown; chartImageBase64?: unknown } | null;
      if (bytes.byteLength > DEFAULT_BODY_BYTES && path !== "/api/question-image" && !(path === "/api/mark" && chart?.task === "ac1"
        && typeof chart.chartImageBase64 === "string" && chart.chartImageBase64.length > 0))
        throw new MarkError(413, "too_large", "The request is too large.");
    }
    const needsSession = path.startsWith("/api/auth/") || ["/api/account", "/api/history", "/api/health", "/api/mark", "/api/helper", "/api/model-answer", "/api/report-detail", "/api/question-image"].includes(path);
    const session = needsSession && env.GOOGLE_CLIENT_ID ? await readSession(request, env.QUOTA_SALT) : null;
    let uid: string | null = null;
    if (session) {
      try { if (env.DB && await accountExists(env.DB, session.uid, session.epoch)) uid = session.uid; }
      catch { throw new AuthError(503, "auth_unavailable", "Your account could not be checked. Try again."); }
    }
    const id = request.headers.get("Idempotency-Key"), ip = clientAddress(request.headers.get("CF-Connecting-IP"));
    if (!["/api/mark", "/api/helper", "/api/model-answer", "/api/report-detail"].includes(path) || request.method !== "POST" || !id || !ip)
      return handle(context, body, uid);
    if (!/^[a-zA-Z0-9_-]{16,128}$/.test(id)) return send(400, { error: "invalid", message: "Invalid request ID." });
    const day = new Date().toISOString().slice(0, 10);
    const client = await digest(`${env.QUOTA_SALT}|${ip}|${day}`);
    const scope = await digest(JSON.stringify([client, path,
      request.headers.get("X-Provider"), request.headers.get("X-Age-Confirmed"), request.cf?.country,
      request.headers.get("X-Tester-Token"), request.headers.get("Cookie"), uid, id]));
    const fingerprint = await digest(bytes);
    // Session validity was checked before replay, so revoked cookies cannot reuse
    // successful signed-in replies. The original parsed value goes straight through.
    const response = await replay(scope, fingerprint, () => handle(context, body, uid), client);
    // replay also constructs its own 409 conflict response outside send().
    for (const [name, value] of Object.entries(responseSecurityHeaders)) response.headers.set(name, value);
    return response;
  } catch (e) {
    const err = e instanceof MarkError || e instanceof AuthError ? e : new MarkError(500, "server", "Something went wrong on our side. No score was produced.");
    return send(err.status, { error: err.code, message: err.message });
  }
}
