import { accountRequest, getAuth, refreshAccount } from "./auth";
import type { HistoryEntry } from "./history";
import { difficultyThemes, CRIT_SHORT } from "./progress";
import { validateHistory, type HistorySummary } from "../../shared/history-summary";

// Use fixed practice labels: model priorities can contain quotations from an essay.
export function historySummary(entry: HistoryEntry): HistorySummary {
  const themes = difficultyThemes(entry.themes ?? entry.priorities);
  const weakest = Object.entries(entry.bands).filter((pair): pair is [keyof typeof CRIT_SHORT, number] => typeof pair[1] === "number")
    .sort((a, b) => a[1] - b[1])[0]?.[0];
  return { id: entry.id, day: entry.date.slice(0, 10), task: entry.task, overall: entry.overall,
    bands: { tr: entry.bands.tr, cc: entry.bands.cc, lr: entry.bands.lr, gra: entry.bands.gra },
    priorities: themes.length ? themes.slice(0, 3).map((theme) => `Practise ${theme}`) : weakest ? [`Work on ${CRIT_SHORT[weakest]}`] : [] };
}
export async function syncHistory(entry: HistoryEntry, revision: number) {
  if (!getAuth().signedIn || getAuth().revision !== revision) return;
  try { await accountRequest("/api/history", "POST", historySummary(entry)); }
  catch { /* Saving progress must never block a report. */ }
}
export async function fetchHistory(): Promise<HistoryEntry[]> {
  const response = await accountRequest("/api/history");
  if (response.status === 401) await refreshAccount();
  if (!response.ok) throw new Error("Saved progress could not be loaded. Your browser history is still available.");
  const data = await response.json();
  if (!Array.isArray(data.history)) throw new Error("Saved progress could not be loaded.");
  return data.history.filter(validateHistory).map((h: HistorySummary) => ({
    id: h.id, date: h.day + "T12:00:00.000Z", task: h.task, overall: h.overall, bands: h.bands,
    priorities: h.priorities, range: null, words: 0, markingVersion: "synced-summary",
  }));
}
export function mergeHistory(local: HistoryEntry[], remote: HistoryEntry[]) {
  const entries = new Map(remote.map((h) => [h.id, h]));
  for (const entry of local) entries.set(entry.id, entry);
  return [...entries.values()].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}
