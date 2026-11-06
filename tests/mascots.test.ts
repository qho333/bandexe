import { describe, expect, it } from "vitest";
import css from "../src/mascots.css?raw";
import { MASCOT_SVG } from "../src/mascot-art";
import { MASCOT_SVG as FROM_CONTENT } from "../src/content";
import {
  canNudge, fitLane, laneBounds, loadNudges, markDismissed, markShown, NUDGE_COOLDOWN_MS, NUDGE_DISMISS_MS, saveNudges, shortText, singleWord,
} from "../src/lib/mascots";

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};
const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };

describe("mascot art", () => {
  it("keeps the class hook other screens rely on and is re-exported from content", () => {
    expect(FROM_CONTENT).toBe(MASCOT_SVG);
    for (const svg of Object.values(MASCOT_SVG)) expect(svg).toContain('<svg class="mascot" ');
  });
  it("is flat, theme coloured and has animation hooks", () => {
    for (const [id, svg] of Object.entries(MASCOT_SVG)) {
      expect(svg, id).toContain('viewBox="0 0 64 64"');
      expect(svg, id).toContain('aria-hidden="true"');
      expect(svg, id).toMatch(/class="m-eyes"/);
      expect(svg.match(/m-foot/g)?.length, id).toBe(2);
      expect(svg, id).toMatch(/class="m-ant"/);
      // No hard-coded colours, gradients, filters or 3D effects: everything comes from CSS tokens.
      expect(svg, id).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|fill="|stroke="|Gradient|filter|<image/i);
    }
  });
  it("gives each helper a different silhouette", () => {
    const shapes = Object.values(MASCOT_SVG).map((s) => s.replace(/data-mascot="[a-z]+"/, ""));
    expect(new Set(shapes).size).toBe(3);
  });
  it("styles mascots only with theme tokens", () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
  });
});

describe("nudge rules", () => {
  it("allows a first nudge, then enforces the cooldown and once per session", () => {
    const shown = new Set<"ideas-empty" | "coach-priority" | "synonyms-select">();
    let n = loadNudges(memory());
    const t = 10 * NUDGE_COOLDOWN_MS;
    expect(canNudge(n, "ideas-empty", t, shown)).toBe(true);
    n = markShown(n, t); shown.add("ideas-empty");
    expect(canNudge(n, "coach-priority", t + 1000, shown)).toBe(false);
    expect(canNudge(n, "coach-priority", t + NUDGE_COOLDOWN_MS, shown)).toBe(true);
    expect(canNudge(n, "ideas-empty", t + 2 * NUDGE_COOLDOWN_MS, shown)).toBe(false);
  });
  it("remembers dismissals across loads and lets them expire", () => {
    const s = memory();
    saveNudges(markDismissed(loadNudges(s), "synonyms-select", 1_000), s);
    const n = loadNudges(s);
    expect(n.dismissed["synonyms-select"]).toBe(1_000);
    expect(canNudge(n, "synonyms-select", 1_000 + NUDGE_COOLDOWN_MS, new Set())).toBe(false);
    expect(canNudge(n, "synonyms-select", 1_000 + NUDGE_DISMISS_MS, new Set())).toBe(true);
  });
  it("survives blocked or corrupt storage", () => {
    expect(loadNudges(broken)).toEqual({ last: 0, dismissed: {} });
    expect(() => saveNudges({ last: 1, dismissed: {} }, broken)).not.toThrow();
    expect(loadNudges({ getItem: () => "{not json", setItem: () => {} })).toEqual({ last: 0, dismissed: {} });
    expect(loadNudges(null)).toEqual({ last: 0, dismissed: {} });
  });
  it("only treats a single word selection as a word", () => {
    expect(singleWord("  important ")).toBe("important");
    expect(singleWord("well-being")).toBe("well-being");
    expect(singleWord("very important")).toBeNull();
    expect(singleWord("2024")).toBeNull();
    expect(singleWord("")).toBeNull();
  });
  it("shortens long priorities at a word boundary", () => {
    expect(shortText("Use more linking words.")).toBe("Use more linking words.");
    const long = "Develop each main idea with a specific example and explain how it supports your position, instead of listing several ideas briefly.";
    const s = shortText(long, 60);
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.endsWith("…")).toBe(true);
    expect(long.startsWith(s.slice(0, -1))).toBe(true);
  });
});

describe("lane geometry", () => {
  it("keeps each runner between its neighbours", () => {
    const bots = [{ x: 0, target: 0 }, { x: 200, target: 260 }, { x: 500, target: 500 }];
    expect(laneBounds(0, bots, 56, 800, 10)).toEqual([0, 134]);
    expect(laneBounds(1, bots, 56, 800, 10)).toEqual([66, 434]);
    expect(laneBounds(2, bots, 56, 800, 10)).toEqual([326, 744]);
  });
  it("fits runners into a narrower lane without overlap", () => {
    const xs = fitLane([100, 600, 1100], 48, 260, 8);
    expect(xs[2]).toBeLessThanOrEqual(260 - 48);
    expect(xs[1] + 48 + 8).toBeLessThanOrEqual(xs[2]);
    expect(xs[0] + 48 + 8).toBeLessThanOrEqual(xs[1]);
    expect(xs[0]).toBeGreaterThanOrEqual(0);
  });
});
