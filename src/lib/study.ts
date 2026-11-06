import { cloudRequest } from "./cloud-request";
import { modelAnswer as googleModel } from "../../shared/study.js";
import { validateHelperRequest } from "../../shared/helper.js";
import type { HelperInput, MarkInput } from "../../shared/index.js";
import { testerHeaders } from "./tester";
import { getChecker } from "./checker";
import { geminiAccess } from "./gemini";
import { askHelperAnswer, type HelperTurn } from "./helper";
import type { MarkResult } from "./types";

export interface StudyAnswer { text: string; engine: string }
export const studyEngineOrder = (kind: "model" | "chat") => kind === "model" ? ["free", "gemini"] : ["cloud"];

/** Cache the in-flight promise too. Failed calls are evicted so a later click can retry. */
export function createModelCache() {
  const cache = new Map<string, Promise<StudyAnswer>>();
  return async (key: string, generate: () => Promise<StudyAnswer>) => {
    let answer = cache.get(key);
    if (!answer) {
      answer = generate().catch((e) => { cache.delete(key); throw e; });
      cache.set(key, answer);
      if (cache.size > 20) cache.delete(cache.keys().next().value!);
    }
    return answer;
  };
}
export async function essayHash(input: MarkInput) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify([input.task, input.question, input.essay, input.image])));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}
const modelCache = createModelCache();
const googleReady = async () => {
  await geminiAccess.load();
  const state = geminiAccess.getSnapshot();
  return state.allowed === true && state.confirmed;
};
export async function getModelAnswer(input: MarkInput): Promise<StudyAnswer> {
  const { mode, key } = getChecker();
  // Separate provider identities so switching checker never returns another provider's cached answer.
  return modelCache(`${mode}:${key}:${await essayHash(input)}`, async () => {
    if (mode === "own") {
      await geminiAccess.require();
      if (!key) throw new Error("Save your Gemini key first.");
      return { text: await googleModel(input, { key }), engine: "Gemini" };
    }
    let res: Response;
    try { res = await cloudRequest("/api/model-answer", { method: "POST", headers: { "Content-Type": "application/json", ...testerHeaders() }, body: JSON.stringify({
      ...input, ...(input.image ? { chartImageBase64: input.image.data, mime: input.image.mime } : {}),
    }) }); } catch { throw new Error("Cannot reach the server. Check your connection, then try the model answer again."); }
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.reply) throw new Error(data?.message || "Study model unavailable. Try again later. No score was changed.");
    return { text: data.reply, engine: data.fixture ? "Fixture example (not AI)" : data.model || "Free cloud study model" };
  });
}

export function reviewedSummary(result: MarkResult): string {
  const r = result.report;
  // No raw model reply, subskill estimates or history bands enter the tutor context.
  return JSON.stringify({ feedbackOnly: !!result.feedbackOnly, criteria: Object.fromEntries(Object.entries(r.criteria).map(([k, c]) => [k, c.summary])),
    grammar: r.grammar, upgrades: r.upgrades, paragraphs: r.paragraphs, priorities: r.priorities, strengths: r.strengths, structureAdvice: r.structureAdvice }).slice(0, 16000);
}
export const recentChat = (turns: HelperTurn[]) => turns.slice(-10).map((t) => ({ ...t, text: t.text.slice(0, 800) }));
export async function askFeedback(input: HelperInput): Promise<StudyAnswer> {
  const v = validateHelperRequest(input);
  if (!v.ok) throw new Error(v.error);
  const { mode } = getChecker();
  // The zero-setup path uses the same free helper pool as Coach; Gemini is explicit and gated.
  if (mode === "free" || await googleReady()) {
    const answer = await askHelperAnswer({ ...v.value, role: "feedback", task: input.task as MarkResult["task"], history: recentChat(input.history as HelperTurn[]) });
    return { text: answer.reply, engine: answer.model };
  }
  throw new Error("No feedback tutor is available right now. Try the Free checker.");
}
