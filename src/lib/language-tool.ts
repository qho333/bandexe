export const LANGUAGE_TOOL_URL = "https://api.languagetool.org/v2/check";
export const TIMED_GRAMMAR_NOTE = "Not available during a timed attempt — the real test has no spellchecker.";

export interface GrammarMatch {
  id: number;
  offset: number;
  length: number;
  original: string;
  message: string;
  suggestions: string[];
}

export function grammarDisabled(text: string, running: boolean, busy = false, locked = false) {
  return running || busy || locked || !text.trim();
}

export function grammarRequest(text: string): RequestInit {
  if (!text.trim()) throw new Error("Write something first, then check it.");
  if (new TextEncoder().encode(text).length > 20_000) throw new Error("LanguageTool accepts up to 20 KB at a time. Shorten the draft, then re-check.");
  return { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ text, language: "en-GB" }) };
}

export function mapGrammarResponse(data: unknown, text: string): GrammarMatch[] {
  if (!data || typeof data !== "object" || !("matches" in data) || !Array.isArray(data.matches)) throw new Error("LanguageTool's reply could not be read. Please try again.");
  return data.matches.flatMap((m, id): GrammarMatch[] => {
    if (!m || !Number.isInteger(m.offset) || !Number.isInteger(m.length) || m.offset < 0 || m.length < 0 || m.offset + m.length > text.length || typeof m.message !== "string") return [];
    return [{ id, offset: m.offset, length: m.length, original: text.slice(m.offset, m.offset + m.length), message: m.message,
      suggestions: Array.isArray(m.replacements) ? [...new Set<string>(m.replacements.filter((r: { value?: unknown } | null) => r && typeof r.value === "string").map((r: { value: string }) => r.value))].slice(0, 3) : [] }];
  });
}

export async function checkGrammar(text: string, fetchFn: typeof fetch = fetch, signal?: AbortSignal): Promise<GrammarMatch[]> {
  const request = grammarRequest(text);
  let res: Response;
  try { res = await fetchFn(LANGUAGE_TOOL_URL, { ...request, signal }); }
  catch (e) {
    if (signal?.aborted) throw e;
    throw new Error("Cannot reach LanguageTool. Check your connection and try again.");
  }
  if (res.status === 429) throw new Error("LanguageTool is busy with requests from your IP. Try again in a minute.");
  if (!res.ok) throw new Error(`LanguageTool could not check this draft (${res.status}). Please try again later.`);
  let data: unknown;
  try { data = await res.json(); } catch { throw new Error("LanguageTool's reply could not be read. Please try again."); }
  return mapGrammarResponse(data, text);
}

export function grammarContext(text: string, match: GrammarMatch) {
  const before = text.slice(0, match.offset), after = text.slice(match.offset + match.length);
  const start = Math.max(before.lastIndexOf(". "), before.lastIndexOf("? "), before.lastIndexOf("! "), before.lastIndexOf("\n")) + 1;
  const end = after.search(/[.!?\n]/);
  return { before: before.slice(start).trimStart(), problem: match.original, after: end < 0 ? after : after.slice(0, end + 1) };
}

/** A full snapshot check also prevents a shifted or repeated quote replacing the wrong occurrence. */
export function applyGrammarSuggestion(text: string, checkedText: string, match: GrammarMatch, replacement: string) {
  if (text !== checkedText || text.slice(match.offset, match.offset + match.length) !== match.original || !match.suggestions.includes(replacement)) return null;
  return text.slice(0, match.offset) + replacement + text.slice(match.offset + match.length);
}

export function remainingGrammar(matches: GrammarMatch[], applied: GrammarMatch, replacement: string) {
  const end = applied.offset + applied.length, delta = replacement.length - applied.length;
  return matches.filter((m) => m.id !== applied.id && (m.offset + m.length <= applied.offset || m.offset >= end))
    .map((m) => m.offset >= end ? { ...m, offset: m.offset + delta } : m);
}
