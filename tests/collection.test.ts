import { beforeEach, describe, expect, it, vi } from "vitest";
import { CHARACTERS } from "../src/content/characters";
import { BACKGROUNDS } from "../src/content/backgrounds";
import { BACKGROUND_ART } from "../src/content/background-art";
import { addTestCoins, forceNextBand, completeMission, duplicates, getCollection, ODDS, ownsItem, pickBand, recordMarked, recordReviewed, resetCollection, roll, tradeIn } from "../src/lib/collection";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), clear: () => store.clear() });

const words = (n: number) => Array(n).fill("word").join(" ");

describe("collection", () => {
  const empty = () => { resetCollection(); addTestCoins(-getCollection().coins); };
  beforeEach(() => { vi.useRealTimers(); localStorage.clear(); empty(); });
  it("reset also clears a forced next band", () => {
    forceNextBand(9); resetCollection();
    expect(pickBand(1, () => 0)).toBe(5);
  });

  it("a new student starts with 2 coins and no items, and a spent coin stays spent", () => {
    localStorage.clear();
    const s = getCollection();
    expect(s.coins).toBe(2);
    expect(s.owned).toEqual({});
    roll("roll", () => 0);
    expect(getCollection().coins).toBe(1);
    localStorage.clear();
    resetCollection();
    expect(getCollection().coins).toBe(2);
  });


  it("every band has all three helpers, ids never clash, every background has art", () => {
    for (const band of [5, 6, 7, 8, 9]) expect(new Set(CHARACTERS.filter((c) => c.band === band).map((c) => c.helper)).size).toBe(3);
    const ids = [...CHARACTERS, ...BACKGROUNDS].map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(CHARACTERS).toHaveLength(28);
    for (const b of BACKGROUNDS) expect(BACKGROUND_ART[b.id]).toBeTruthy();
    for (const band of [5, 6, 7, 8, 9]) expect(BACKGROUNDS.some((b) => b.band === band)).toBe(true);
    expect(ODDS.reduce((sum, [, w]) => sum + w, 0)).toBe(100);
  });

  it("every drawing has the parts the helper animations move", () => {
    for (const c of CHARACTERS) {
      expect(c.svg.match(/class="[^"]*m-hand/g), c.id).toHaveLength(2);
      expect(c.svg.match(/class="[^"]*m-foot/g), c.id).toHaveLength(2);
      expect(c.svg.match(/class="m-eyes"/g), c.id).toHaveLength(1);
      expect(c.svg).toContain('class="mascot"');
      expect(c.svg, c.id).not.toMatch(/="[^"]*</);
      expect(c.svg.match(/<g[ >]/g)?.length ?? 0, c.id).toBe(c.svg.match(/<\/g>/g)?.length ?? 0);
    }
  });

  it("every Band 8 and 9 character has its own special move", () => {
    const moves = CHARACTERS.filter((c) => c.band >= 8).map((c) => [...c.svg.matchAll(/sx-[a-z0-9]+/g)].map((m) => m[0]).sort().join());
    expect(moves).toHaveLength(11);
    expect(moves.every(Boolean)).toBe(true);
    expect(new Set(moves).size).toBe(11);
    for (const c of CHARACTERS) if (c.band < 8) expect(c.svg).not.toContain("sx-");
  });

  it("a forced test roll applies once", () => {
    forceNextBand(9);
    expect(pickBand(1, () => 0)).toBe(9);
    expect(pickBand(1, () => 0)).toBe(5);
  });

  it("pays at most 2 coins a day and each mission once", () => {
    expect(completeMission("mark")).toBe(true);
    expect(completeMission("mark")).toBe(false);
    expect(completeMission("learn")).toBe(true);
    expect(completeMission("timed")).toBe(false);
    expect(getCollection().coins).toBe(2);
    expect(getCollection().done).toHaveLength(3);
  });

  it("marks count only at the word minimum; timed needs the clock inside the limit", () => {
    expect(recordMarked("t2", words(249), 30)).toBe(0);
    expect(getCollection().done).toEqual([]);
    expect(recordMarked("t2", words(250), null)).toBe(1);
    expect(getCollection().done).toEqual(["mark"]);
    empty();
    expect(recordMarked("t2", words(250), 41)).toBe(1);
    expect(getCollection().done).toEqual(["mark"]);
    empty();
    expect(recordMarked("ac1", words(150), 20)).toBe(2);
  });

  it("needs 3 reviewed corrections, counted across reports", () => {
    expect(recordReviewed(0)).toBe(false);
    expect(recordReviewed(2)).toBe(false);
    expect(recordReviewed(1)).toBe(true);
    expect(getCollection().coins).toBe(1);
  });

  it("missions reset at midnight UTC but saved coins and items stay", () => {
    vi.useFakeTimers({ now: new Date("2026-11-01T23:59:00Z") });
    empty();
    completeMission("mark");
    expect(roll("roll", () => 0)?.band).toBe(5);
    completeMission("learn");
    vi.setSystemTime(new Date("2026-11-02T00:00:01Z"));
    const s = getCollection();
    expect(s.done).toEqual([]);
    expect(s.coins).toBe(1);
    expect(Object.keys(s.owned)).toHaveLength(1);
  });

  it("a roll costs a coin, refuses at 0, and every 10th roll is at least Band 7", () => {
    expect(roll("roll")).toBeNull();
    addTestCoins(1);
    expect(roll("roll", () => 0)).toMatchObject({ band: 5, duplicate: false, machine: "roll" });
    expect(getCollection().coins).toBe(0);
    expect(pickBand(10, () => 0)).toBe(7);
    expect(pickBand(20, () => 0.999)).toBe(9);
    expect(pickBand(9, () => 0)).toBe(5);
    for (let i = 0; i < 2000; i++) expect(pickBand(10)).toBeGreaterThanOrEqual(7);
  });

  it("rolled odds match the published odds", () => {
    const seen: Record<number, number> = {};
    for (let i = 0; i < 100000; i++) { const b = pickBand(1); seen[b] = (seen[b] ?? 0) + 1; }
    for (const [band, weight] of ODDS) expect(Math.abs(seen[band] / 1000 - weight)).toBeLessThan(1);
  });

  it("machines hand out the right kind of item and flag duplicates", () => {
    addTestCoins(3);
    const a = roll("skin", () => 0)!;
    expect(BACKGROUNDS.some((b) => b.id === a.id)).toBe(true);
    expect(roll("skin", () => 0)!.duplicate).toBe(true);
    expect(CHARACTERS.some((c) => c.id === roll("roll", () => 0)!.id)).toBe(true);
  });

  it("trades 3 spare copies for 1 coin and never takes the last copy", () => {
    addTestCoins(4);
    for (let i = 0; i < 4; i++) roll("roll", () => 0);
    expect(duplicates(getCollection())).toBe(3);
    expect(tradeIn()).toBe(true);
    const s = getCollection();
    expect(s.coins).toBe(1);
    expect(duplicates(s)).toBe(0);
    expect(ownsItem(s, CHARACTERS[0].id)).toBe(true);
    expect(tradeIn()).toBe(false);
  });

  it("survives corrupt or hostile saves", () => {
    for (const bad of ["{not json", '{"coins":-5,"owned":{"nope":9,"dot":"x"},"done":["hack"],"rolls":null}', "[]", "null"]) {
      localStorage.setItem("bandexe-collection", bad);
      const s = getCollection();
      expect(s.coins).toBe(0);
      expect(s.owned).toEqual({});
      expect(s.done).toEqual([]);
      expect(s.rolls).toEqual({ roll: 0, skin: 0 });
    }
  });
});
