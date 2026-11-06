import { describe, it, expect } from "vitest";
import { crawlPace, hurriedRoam, pageNudge, spiderScale, stopSpot } from "../src/lib/spider";

const box = { x0: 20, x1: 780, y0: 10, y1: 990 };
const line = (left: number, right: number, top = 100) => ({ left, right, top, bottom: top + 26 });

describe("stopSpot (where the spider stands to tap a phrase)", () => {
  it("stands beside the phrase on the nearer side", () => {
    const s = stopSpot(line(300, 380), { x: 100, y: 100 }, box, 40);
    expect(s.near).toEqual({ x: 260, y: 113 });
    expect(s.tip.x).toBeGreaterThanOrEqual(300);
    expect(stopSpot(line(300, 380), { x: 700, y: 100 }, box, 40).near.x).toBe(420);
  });
  it("first word of a line: uses the right side when the left would leave the walkable area", () => {
    const s = stopSpot(line(30, 90), { x: 10, y: 100 }, box, 40);
    expect(s.near.x).toBe(130);
  });
  it("a phrase filling the whole line (long wrapped mark): stands one line up, or below on the first line", () => {
    const up = stopSpot(line(25, 775, 200), { x: 400, y: 400 }, box, 40);
    expect(up.near.y).toBeLessThan(200);
    expect(up.near.x).toBeGreaterThanOrEqual(box.x0);
    const down = stopSpot(line(25, 775, 12), { x: 400, y: 400 }, box, 40);
    expect(down.near.y).toBeGreaterThan(38);
  });
  it("always returns a spot inside the walkable area (so a burst can arrive)", () => {
    for (const l of [line(0, 800), line(-50, 900), line(760, 800, 980), line(0, 10, 0)]) {
      const { near } = stopSpot(l, { x: 400, y: 500 }, box, 50);
      expect(near.x).toBeGreaterThanOrEqual(box.x0); expect(near.x).toBeLessThanOrEqual(box.x1);
      expect(near.y).toBeGreaterThanOrEqual(box.y0); expect(near.y).toBeLessThanOrEqual(box.y1);
    }
  });
});

describe("pacing once the result is back", () => {
  it("roaming still to do lasts at most 2.5 s, and is never slowed down", () => {
    expect(hurriedRoam(0, 10) * (1 - 0)).toBeCloseTo(2.5);
    expect(hurriedRoam(0.5, 10) * 0.5).toBeCloseTo(2.5);
    expect(hurriedRoam(0.9, 10)).toBe(10); // 1 s left already
    expect(hurriedRoam(1, 10)).toBe(10);
  });
  it("taps speed up with many issues, capped at 3x", () => {
    expect(crawlPace(0)).toBe(1);
    expect(crawlPace(3)).toBe(1);
    expect(crawlPace(10)).toBe(2);
    expect(crawlPace(36)).toBe(3);
  });
  it("body scale follows the line height within limits", () => {
    expect(spiderScale(26)).toBeGreaterThan(1);
    expect(spiderScale(5)).toBe(0.8);
    expect(spiderScale(100)).toBe(1.6);
  });
});

describe("pageNudge (page follows a spider leaving the window)", () => {
  it("does nothing while the spider is in the comfortable band", () => {
    expect(pageNudge(400, 800, 100, 1400, 0.016)).toBe(0);
  });
  it("scrolls down when it nears the bottom edge and up near the top, smoothly", () => {
    const down = pageNudge(760, 800, 100, 1400, 0.016);
    expect(down).toBeGreaterThan(0);
    expect(down).toBeLessThan(760 - 800 * 0.72); // a fraction per frame, never a jump
    expect(pageNudge(40, 800, -400, 900, 0.016)).toBeLessThan(0);
  });
  it("leaves the page alone when the essay view is scrolled out of sight", () => {
    expect(pageNudge(-300, 800, -900, -10, 0.016)).toBe(0);
    expect(pageNudge(1200, 800, 900, 1600, 0.016)).toBe(0);
  });
});
