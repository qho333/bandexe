// Speaking API on Cloudflare Pages: /api/speak/talk, /questions, /hear, /mark.
// Same logic as the local prototype (shared/speaking.js). Each route has a per-connection daily allowance
// (salted daily digest of the IP, like writing checks) so one visitor cannot use up the shared free Groq key.
import { PROMPTS, cleanHistory, talk, questions, hear, cleanAnswers, mark, setKeys } from "../../../shared/speaking.js";
import { clientAddress } from "../../../shared/client-address";
import { digest } from "../../../shared/traffic";
import { dailyAllowance, type Database } from "../../../shared/storage.js";
import { geminiEligibility } from "../../../shared/eligibility.js";

interface Context {
  request: Request & { cf?: { country?: string } };
  env: { GROQ_API_KEY?: string; GEMINI_API_KEY?: string; QUOTA_SALT?: string; DB?: Database };
}

// Per connection per UTC day. A full mock test uses about 20 hear calls and 1 mark.
export const SPEAK_LIMITS = { talk: 80, questions: 20, hear: 150, mark: 5 } as const;
type Route = keyof typeof SPEAK_LIMITS;
const MAX_JSON = { talk: 60_000, questions: 1_000, mark: 200_000 } as const;
const MAX_AUDIO = 4_000_000;

const send = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin" },
});

async function admit(request: Request, env: Context["env"], route: Route) {
  const ip = clientAddress(request.headers.get("CF-Connecting-IP"));
  if (!env.DB || !env.QUOTA_SALT || !ip) return true; // local runs without D1; production always has both
  const day = new Date().toISOString().slice(0, 10);
  const r = await dailyAllowance(env.DB, `speak-${route}:${await digest(`${env.QUOTA_SALT}|${ip}|${day}`)}`, day, SPEAK_LIMITS[route], true);
  return r ? r.admitted : false; // storage error: refuse rather than spend the shared key
}

async function readBody(request: Request, max: number) {
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared > max) return null;
  const bytes = new Uint8Array(await request.arrayBuffer());
  return bytes.byteLength > max ? null : bytes;
}

export async function onRequest({ request, env }: Context): Promise<Response> {
  const route = new URL(request.url).pathname.replace(/^\/api\/speak\//, "") as Route;
  if (request.method !== "POST" || !(route in SPEAK_LIMITS)) return send(404, { error: "not_found" });
  if (!env.GROQ_API_KEY) return send(503, { error: "Speaking is not set up on this server." });
  setKeys(env);
  try {
    if (route === "hear") {
      const type = String(request.headers.get("Content-Type") || "");
      if (!/^audio\/(webm|mp4|ogg)/.test(type)) return send(400, { error: "bad audio" });
      const bytes = await readBody(request, MAX_AUDIO);
      if (!bytes) return send(413, { error: "Recording too long." });
      if (bytes.byteLength < 2000) return send(200, { text: "", unclear: [] });
      if (!(await admit(request, env, route))) return send(429, { error: "daily_limit" });
      return send(200, await hear(bytes, type.split(";")[0], new URL(request.url).searchParams.get("full") === "1"));
    }
    const bytes = await readBody(request, MAX_JSON[route]);
    if (!bytes) return send(413, { error: "Request too large." });
    let body: Record<string, unknown> = {};
    try { body = bytes.byteLength ? JSON.parse(new TextDecoder().decode(bytes)) : {}; } catch { return send(400, { error: "bad request" }); }
    if (route === "talk") {
      const mode = String(body.mode), history = cleanHistory(body.history);
      if (!Object.hasOwn(PROMPTS, mode) || !history) return send(400, { error: "bad request" });
      if (!(await admit(request, env, route))) return send(429, { error: "daily_limit" });
      return send(200, await talk(mode, history));
    }
    if (route === "questions") {
      if (!(await admit(request, env, route))) return send(429, { error: "daily_limit" });
      const set = await questions();
      return send(set ? 200 : 503, set || { error: "no fresh set" });
    }
    const answers = cleanAnswers(body.answers);
    if (!answers) return send(400, { error: "bad request" });
    const unsure = Array.isArray(body.unsure) ? body.unsure.filter((w): w is string => typeof w === "string").map((w) => w.slice(0, 40)).slice(0, 20) : [];
    if (!(await admit(request, env, route))) return send(429, { error: "daily_limit" });
    const out = await mark(answers, unsure, null, { gemini: geminiEligibility(request.cf?.country).allowed });
    return send(out.error ? 400 : 200, out);
  } catch (e) {
    console.error("speak", route, String((e as Error).message).replace(/gsk_\w+|AIza[\w-]+/g, "[key]").slice(0, 200));
    return send(502, { error: "Echo is busy right now. Please try again in a minute." });
  }
}
