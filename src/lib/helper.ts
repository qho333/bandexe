import { cloudRequest } from "./cloud-request";
// Browser side of the helper mascots: Datamuse synonyms (free, no AI quota) and the /api/helper AI endpoint.
import type { Task } from "./types";
import { askHelper as askGoogle, validateHelperRequest, HELPER_MODEL } from "../../shared/index.js";
import { getChecker } from "./checker";
import { loadPrefs } from "./prefs";
import { geminiAccess } from "./gemini";
import { testerHeaders } from "./tester";

export interface Syn { word: string; rare: boolean }

/** Datamuse synonyms with frequency; falls back to "means like" when there are no strict synonyms. */
export async function synonyms(word: string, fetchFn: typeof fetch = fetch): Promise<Syn[]> {
  const q = encodeURIComponent(word.trim().toLowerCase());
  const get = async (rel: string) => {
    const res = await fetchFn(`https://api.datamuse.com/words?${rel}=${q}&md=f&max=12`);
    if (!res.ok) throw new Error("lookup failed");
    return (await res.json()) as { word: string; tags?: string[] }[];
  };
  let list = await get("rel_syn");
  if (!list.length) list = await get("ml");
  return list.slice(0, 12).map((w) => {
    const f = Number((w.tags || []).find((t) => t.startsWith("f:"))?.slice(2) ?? "NaN");
    return { word: w.word, rare: Number.isFinite(f) && f < 4 }; // under ~4 per million words: less common, "band 7+"
  });
}

function sessionId() {
  try {
    let id = sessionStorage.getItem("bandexe-sid");
    if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("bandexe-sid", id); }
    return id;
  } catch { return ""; }
}

export interface HelperTurn { role: "user" | "model"; text: string }
export interface HelperRequest { role: "ideas" | "coach" | "feedback"; feedbackLanguage?: import("../../shared/language.js").FeedbackLanguage; memory?: string; essay?: string; reportSummary?: string; message: string; task?: Task; taskQuestion?: string; paragraph?: string; history?: HelperTurn[] }
export async function askHelper(body: HelperRequest): Promise<string> {
  return (await askHelperAnswer(body)).reply;
}
export async function askHelperAnswer(body: HelperRequest): Promise<{ reply: string; model: string }> {
  const { key, mode } = getChecker();
  const google = mode === "own" || mode === "site";
  body = { ...body, feedbackLanguage: body.feedbackLanguage || loadPrefs().feedbackLanguage || "en" };
  if (google) await geminiAccess.require();
  if (google && key) {
    const v = validateHelperRequest(body);
    if (!v.ok) throw new Error(v.error);
    return { reply: await askGoogle(v.value, { key }), model: HELPER_MODEL };
  }
  let res: Response;
  try {
    res = await cloudRequest("/api/helper", { method: "POST", headers: { "Content-Type": "application/json", "X-Session": sessionId(), ...testerHeaders(), ...(google ? { "X-Age-Confirmed": "1", "X-Provider": "gemini" } : {}) }, body: JSON.stringify(body) });
  } catch {
    throw new Error("Cannot reach the BAND.EXE server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.reply) throw new Error(data?.message || `The helper is not available right now (${res.status}).`);
  return { reply: plainReply(data.reply), model: data.model || (data.fixture ? "Fixture helper (not AI)" : "Free cloud helper") };
}

/** Models add markdown despite "plain text": drop emphasis/heading marks and show list dashes as bullets (text only, never HTML). */
export function plainReply(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^(\s*)[-*]\s+/gm, "$1• ")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
