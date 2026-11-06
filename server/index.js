// BAND.EXE local API server. Node 22+, standard library only.
//   POST /api/mark   {task, question, essay, chartImageBase64?, mime?}
//   GET  /api/health
// The Gemini key comes from env GEMINI_API_KEY and never leaves this process.
// Logs never contain essays, questions, images or the key.
import { publicStats } from "../shared/storage.js";
import { markFree, helperFree, modelAnswerFree } from "../shared/free.js";
import { modelAnswer } from "../shared/study.js";
import { createServer } from "node:http";
import { validateMarkRequest, MAX_BODY_BYTES } from "./lib/validate.js";
import { mark, MarkError, MODEL } from "./lib/mark.js";
import { makeQuota, makeSlots, LIMIT_MESSAGE } from "./lib/limits.js";
import { fixtureFetch, fixtureOptions } from "./lib/fixture.js";
import { validateHelperRequest, askHelper, makeLimiter, fixtureHelperReply, HelperError, HELPER_MODEL } from "./lib/helper.js";

const helperLimit = makeLimiter(); // extra per-tab cap (X-Session) for Ideas/Coach; not trusted for the shared quota
const markQuota = makeQuota({ perId: 10, global: 400, windowMs: 24 * 3600_000 }); // 10 checks per client IP per day (owner), plus a server-wide daily cap
const helperQuota = makeQuota({ perId: 20, global: 200 });
const markSlots = makeSlots(2); // concurrent upstream marking calls

const PORT = Number(process.env.API_PORT || 8787);
const KEY = process.env.GEMINI_API_KEY || "";
const FIXTURE = process.env.MARK_FIXTURE === "1";
// Local testing only (owner): TESTER_UNLIMITED=1 turns off this server's own per-person and site limits.
// Upstream free quotas (Gemini etc.) still apply. Never set in production.
const UNLIMITED = process.env.TESTER_UNLIMITED === "1";

// Fixture mode: replays hand-written sample data through the real reviewer and scoring.
// For UI work only; responses carry fixture: true and the UI labels them.
// Which fixture and how slow: see lib/fixture.js (essay markers like [fixture:many] [delay:30], or env).

function send(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY_BYTES) throw new MarkError(413, "too_large", "The request is too large. Images must be 4 MB or smaller.");
    chunks.push(c);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new MarkError(400, "bad_json", "The request could not be read.");
  }
}

const server = createServer(async (req, res) => {
  const t0 = Date.now();
  let url = { pathname: "-" };
  let info = "";
  try {
    try {
      url = new URL(req.url || "/", "http://localhost");
    } catch {
      throw new MarkError(400, "bad_request", "The request could not be read.");
    }
    // Accounts need the Pages D1 binding; the local Node fallback stays in guest mode.
    if (req.method === "GET" && url.pathname === "/api/auth/config") return send(res, 200, { googleClientId: null });
    if (req.method === "POST" && url.pathname === "/api/hit") return send(res, 200, { ok: true });
    if (req.method === "GET" && url.pathname === "/api/stats") return send(res, 200, await publicStats());
    const ip = req.socket.remoteAddress || "unknown";
    const google = req.headers["x-provider"] === "gemini";
    if (google && req.headers["x-age-confirmed"] !== "1") throw new MarkError(403, "age", "Confirm Gemini eligibility first.");
    if (req.method === "GET" && url.pathname === "/api/health") {
      return send(res, 200, { ok: true, model: MODEL, configured: Boolean(KEY) || FIXTURE, fixture: FIXTURE });
    }
    if (req.method === "POST" && ["/api/mark", "/api/report-detail"].includes(url.pathname)) {
      const v = validateMarkRequest(await readJson(req));
      if (!v.ok) throw new MarkError(400, "invalid", v.error);
      const detail = url.pathname === "/api/report-detail";
      v.value.reportMode = detail ? "full" : "compact";
      info = `task=${v.value.task} words=${v.value.words}${v.value.image ? " image" : ""}`;
      if (google && !KEY && !FIXTURE) throw new MarkError(503, "not_configured", "The AI marker is not set up on this server. No score was produced.");
      // Fixture mode skips the hourly quota (scan testing needs many runs); [fixture:limit] shows the limit instead.
      if (FIXTURE ? fixtureOptions(v.value.essay, process.env).name === "limit" : !UNLIMITED && !(detail ? helperQuota(ip) : markQuota(ip))) throw new MarkError(429, "limit", LIMIT_MESSAGE);
      const release = markSlots();
      if (!release) throw new MarkError(429, "busy", LIMIT_MESSAGE);
      let result;
      try {
        result = FIXTURE ? await mark(v.value, { key: "fixture", fetchFn: fixtureFetch(v.value) })
          : google ? await mark(v.value, { key: KEY }) : await markFree(v.value, process.env);
        if (FIXTURE) result.reportMode = detail ? "full" : "compact";
      } finally {
        release();
      }
      info += ` overall=${result.overall ?? "withheld"} calls=${result.calls}`;
      return send(res, 200, FIXTURE ? { ...result, fixture: true } : result);
    }
    if (req.method === "POST" && url.pathname === "/api/model-answer") {
      const v = validateMarkRequest(await readJson(req));
      if (!v.ok) throw new MarkError(400, "invalid", v.error);
      if (req.headers["x-provider"] === "gemini" && req.headers["x-age-confirmed"] !== "1") throw new MarkError(403, "age", "Confirm Gemini eligibility first.");
      if (!UNLIMITED && !helperQuota(ip)) throw new MarkError(429, "limit", LIMIT_MESSAGE);
      if (FIXTURE) return send(res, 200, { reply: "Fixture study example (not AI):\n\n" + v.value.essay, fixture: true });
      if (!google) return send(res, 200, await modelAnswerFree(v.value, process.env));
      if (!KEY) throw new MarkError(503, "not_configured", "The study model is not set up on this server.");
      return send(res, 200, { reply: await modelAnswer(v.value, { key: KEY }), model: MODEL });
    }
    if (req.method === "POST" && url.pathname === "/api/helper") {
      const v = validateHelperRequest(await readJson(req));
      if (!v.ok) throw new MarkError(400, "invalid", v.error);
      info = `role=${v.value.role} chars=${v.value.message.length}${v.value.paragraph ? " +paragraph" : ""}`;
      if (!UNLIMITED && !helperQuota(ip)) throw new MarkError(429, "limit", LIMIT_MESSAGE);
      const sid = String(req.headers["x-session"] || "").slice(0, 64) || ip;
      if (!UNLIMITED && !helperLimit(sid)) throw new MarkError(429, "helper_limit", "You have asked a lot of helper questions in a short time. Wait a few minutes and try again.");
      if (FIXTURE) return send(res, 200, { reply: fixtureHelperReply(v.value), fixture: true });
      if (!google) return send(res, 200, await helperFree(v.value, process.env));
      if (!KEY) throw new MarkError(503, "not_configured", "The AI helpers are not set up on this server.");
      try {
        return send(res, 200, { reply: await askHelper(v.value, { key: KEY }), model: HELPER_MODEL });
      } catch (e) {
        if (e instanceof HelperError) throw new MarkError(e.status, e.code, e.message);
        throw e;
      }
    }
    send(res, 404, { error: "not_found", message: "Not found." });
  } catch (e) {
    const err = e instanceof MarkError ? e : new MarkError(500, "server", "Something went wrong on our side. No score was produced.");
    if (!(e instanceof MarkError)) console.error("internal error:", e?.name || "Error");
    info += ` error=${err.code}${err.detail ? ` upstream="${err.detail}"` : ""}`;
    send(res, err.status, { error: err.code, message: err.message });
  } finally {
    console.log(`${req.method} ${url.pathname} ${res.statusCode} ${Date.now() - t0}ms ${info}`.trim());
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`BAND.EXE API on http://127.0.0.1:${PORT} (model ${MODEL}; ${FIXTURE ? "FIXTURE MODE, no real marking" : KEY ? "key loaded" : process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY || process.env.MISTRAL_API_KEY ? "open pool configured" : "no open provider key"}${UNLIMITED ? "; TESTER UNLIMITED: no site limits" : ""})`);
});
