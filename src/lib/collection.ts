// Coins, missions and rolls. Everything here is cosmetic and saved only in this browser, so editing
// it gains nothing. shortcut: no sync between devices, add it to D1 if signed-in students ask.
import { useSyncExternalStore } from "react";
import { utcDay } from "../../shared/storage.js";
import { BACKGROUNDS } from "../content/backgrounds";
import { CHARACTERS, type Band } from "../content/characters";
import { TASKS, type Task } from "./types";
import { countWords } from "./fixes";

export type Mission = "mark" | "timed" | "learn";
export type Machine = "roll" | "skin";
export const MISSIONS: Mission[] = ["mark", "timed", "learn"];
export const DAILY_COINS = 2;
export const TRADE_COST = 3;
export const STARTING_COINS = 2;
export const REVIEWS_NEEDED = 3;
export const ODDS: [Band, number][] = [[5, 50], [6, 28], [7, 15], [8, 6], [9, 1]];

export interface CollectionState {
  day: string; done: Mission[]; reviewed: number; coins: number;
  rolls: Record<Machine, number>; owned: Record<string, number>; unlockAll: boolean;
}
export interface RollResult { id: string; band: Band; duplicate: boolean; machine: Machine }

const KEY = "bandexe-collection";
const ITEMS: Record<Machine, { id: string; band: Band }[]> = { roll: CHARACTERS, skin: BACKGROUNDS };
const known = new Set([...CHARACTERS, ...BACKGROUNDS].map((item) => item.id));
const whole = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);
const fresh = (): CollectionState => ({ day: utcDay(), done: [], reviewed: 0, coins: STARTING_COINS, rolls: { roll: 0, skin: 0 }, owned: {}, unlockAll: false });

function parse(raw: string | null): CollectionState {
  const state = fresh();
  if (raw === null) return state; // first visit keeps the starting coins
  state.coins = 0;
  try {
    const saved = JSON.parse(raw || "{}");
    state.coins = whole(saved.coins);
    state.unlockAll = saved.unlockAll === true;
    state.rolls = { roll: whole(saved.rolls?.roll), skin: whole(saved.rolls?.skin) };
    for (const [id, count] of Object.entries(saved.owned ?? {})) if (known.has(id) && whole(count)) state.owned[id] = whole(count);
    if (saved.day === state.day) {
      state.done = MISSIONS.filter((m) => saved.done?.includes(m));
      state.reviewed = whole(saved.reviewed);
    }
  } catch { /* corrupt save starts fresh */ }
  return state;
}

let memory: string | null = null; // keeps the session working when storage is blocked
const read = () => { try { return localStorage.getItem(KEY); } catch { return memory; } };
let lastRaw = read();
let state = parse(lastRaw);
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

function refresh() {
  const raw = read();
  if (raw !== lastRaw || state.day !== utcDay()) { lastRaw = raw; state = parse(raw); }
  return state;
}
function update(next: CollectionState) {
  state = next; lastRaw = memory = JSON.stringify(next);
  try { localStorage.setItem(KEY, lastRaw); } catch { /* memory only */ }
  emit();
}

export const getCollection = refresh;
export function onCollection(fn: () => void) {
  const other = (e: StorageEvent) => { if (e.key === KEY) fn(); };
  listeners.add(fn); window.addEventListener("storage", other);
  return () => { listeners.delete(fn); window.removeEventListener("storage", other); };
}
export const useCollection = () => useSyncExternalStore(onCollection, getCollection, getCollection);
export const ownsItem = (s: CollectionState, id: string) => s.unlockAll || (s.owned[id] ?? 0) > 0;
export const duplicates = (s: CollectionState) => Object.values(s.owned).reduce((sum, n) => sum + Math.max(0, n - 1), 0);

/** Returns true when this mission paid a coin. A third mission still ticks but the day's 2 coins are already paid. */
export function completeMission(mission: Mission) {
  const s = refresh();
  if (s.done.includes(mission)) return false;
  const paid = s.done.length < DAILY_COINS;
  update({ ...s, done: [...s.done, mission], coins: s.coins + (paid ? 1 : 0) });
  return paid;
}

/** A marked essay counts for "mark" at the word minimum, and for "timed" if the clock ran and had not ended. */
export function recordMarked(task: Task, essay: string, minutes: number | null) {
  if (countWords(essay) < TASKS[task].words) return 0;
  let coins = completeMission("mark") ? 1 : 0;
  if (minutes !== null && minutes <= TASKS[task].minutes && completeMission("timed")) coins++;
  return coins;
}

export function recordReviewed(count: number) {
  if (count < 1) return false;
  const s = refresh(), reviewed = s.reviewed + count;
  update({ ...s, reviewed });
  return reviewed >= REVIEWS_NEEDED && completeMission("learn");
}

/** Every 10th roll on a machine is at least Band 7. */
export function pickBand(rollNumber: number, random: () => number = Math.random): Band {
  if (testBand) { const band = testBand; testBand = null; return band; }
  const odds = rollNumber % 10 === 0 ? ODDS.filter(([band]) => band >= 7) : ODDS;
  let at = random() * odds.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [band, weight] of odds) { at -= weight; if (at < 0) return band; }
  return odds[odds.length - 1][0];
}

export function roll(machine: Machine, random: () => number = Math.random): RollResult | null {
  const s = refresh();
  if (s.coins < 1) return null;
  const count = s.rolls[machine] + 1, band = pickBand(count, random);
  const pool = ITEMS[machine].filter((item) => item.band === band);
  const item = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
  const duplicate = (s.owned[item.id] ?? 0) > 0;
  update({ ...s, coins: s.coins - 1, rolls: { ...s.rolls, [machine]: count }, owned: { ...s.owned, [item.id]: (s.owned[item.id] ?? 0) + 1 } });
  return { id: item.id, band, duplicate, machine };
}

/** Spends the commonest spare copies first, so rare duplicates are the last to go. */
export function tradeIn() {
  const s = refresh();
  if (duplicates(s) < TRADE_COST) return false;
  const owned = { ...s.owned };
  let left = TRADE_COST;
  for (const { id } of [...CHARACTERS, ...BACKGROUNDS].sort((a, b) => a.band - b.band)) {
    while (left > 0 && (owned[id] ?? 0) > 1) { owned[id]--; left--; }
  }
  update({ ...s, owned, coins: s.coins + 1 });
  return true;
}

// Local test controls only.
let testBand: Band | null = null;
export const forceNextBand = (band: Band) => { testBand = band; };
export const addTestCoins = (n: number) => { const s = refresh(); update({ ...s, coins: s.coins + n }); };
export const setUnlockAll = (unlockAll: boolean) => update({ ...refresh(), unlockAll });
export const resetCollection = () => { testBand = null; update(fresh()); };
