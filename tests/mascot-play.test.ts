import { describe, expect, it } from "vitest";
import {
  areMeeting, canPlay, DOUBLE_POKE_MS, dragBounds, gutterClimb, idleRemaining, isDoublePoke,
  isDrag, isSleepTime, nextPlay, overlaps, PLAYS, playGap, reactionTransition, settleDrop, SLEEP_AFTER_MS,
} from "../src/lib/mascot-play";

describe("calm shared play scheduler", () => {
  it("can select every scene, never repeats the last one, and leaves calm gaps", () => {
    expect(new Set(PLAYS.map((_, i) => nextPlay(null, i / PLAYS.length)))).toEqual(new Set(PLAYS));
    for (const kind of PLAYS) for (const r of [0, 0.3, 0.6, 1]) expect(nextPlay(kind, r)).not.toBe(kind);
    expect(playGap(0)).toBe(9000); expect(playGap(1)).toBeLessThanOrEqual(20000);
    expect(nextPlay(null, NaN)).toBe(PLAYS[0]);
  });
  it("blocks play during work, sleep, drag, hidden/typing/tucked holds and panels/nudges", () => {
    const free = { held: false, occupied: false, scanning: false, sleeping: false, dragging: false };
    expect(canPlay(free)).toBe(true);
    for (const key of Object.keys(free)) expect(canPlay({ ...free, [key]: true })).toBe(false);
  });
});

describe("drag, landing and meetings", () => {
  it("distinguishes a proper click from a deliberate mouse or touch drag", () => {
    expect(isDrag(3, 2)).toBe(false); expect(isDrag(7, 0)).toBe(true); expect(isDrag(5, 5)).toBe(true);
    expect(dragBounds(-50, -300, 56, 300, 34)).toEqual({ x: 0, y: -34 });
    expect(dragBounds(500, 100, 56, 300, 34)).toEqual({ x: 244, y: 0 });
    expect(dragBounds(50, -10, 56, 0, -20)).toEqual({ x: 0, y: 0 });
  });
  it("settles drops and resizes without overlap, regardless of bot order or drop location", () => {
    for (const lane of [184, 200, 255, 600, 1200]) for (let bot = 0; bot < 3; bot++) {
      for (let target = -100; target < lane + 100; target += 13) {
        const xs = settleDrop([550, 9, 200], bot, target, 56, lane);
        xs.forEach((x, i) => {
          expect(x).toBeGreaterThanOrEqual(0); expect(x + 56).toBeLessThanOrEqual(lane + 0.01);
          xs.forEach((other, j) => { if (i !== j) expect(overlaps(x, other, 56, 7.99)).toBe(false); });
        });
      }
    }
    expect(settleDrop([0, 200, 400], 1, 280, 56, 600)[1]).toBe(280);
    // Finishing a leapfrog swaps identities; normalizing must retain their spatial order.
    expect(settleDrop([96, 8, 184], 0, 96, 56, 600)).toEqual([96, 8, 184]);
    expect(settleDrop([184, 8, 96], 0, 184, 56, 600)).toEqual([184, 8, 96]);
  });
  it("only high-fives bots within horizontal reach and on the same level", () => {
    expect(areMeeting({ x: 10, y: 0 }, { x: 74, y: 0 }, 56)).toBe(true);
    expect(areMeeting({ x: 10, y: -40 }, { x: 74, y: 0 }, 56)).toBe(false);
    expect(areMeeting({ x: 10, y: 0 }, { x: 160, y: 0 }, 56)).toBe(false);
    expect(areMeeting({ x: 10, y: 0 }, { x: 20, y: 0 }, 56)).toBe(false);
  });
});

describe("safe climbing corridors", () => {
  it("uses a truly empty desktop gutter and falls back to the label on phones", () => {
    expect(gutterClimb(1400, 800, 56, [{ left: 120, right: 1280, top: 0, bottom: 900 }])?.side).toBe("left");
    expect(gutterClimb(375, 650, 56, [])).toBeNull();
    expect(gutterClimb(1400, 100, 56, [])).toBeNull();
    expect(gutterClimb(1400, 800, 56, [{ left: 0, right: 1400, top: 0, bottom: 900 }])).toBeNull();
  });
  it("checks the whole corridor including controls and its clearance margin", () => {
    expect(gutterClimb(1400, 800, 56, [{ left: 0, right: 70, top: 700, bottom: 760 }])?.side).toBe("right");
    expect(gutterClimb(1400, 800, 56, [{ left: 65, right: 1400, top: 700, bottom: 760 }])).toBeNull();
  });
});

describe("idle and reaction clocks", () => {
  it("sleeps after two minutes, resets on activity and never schedules negative timers", () => {
    expect(isSleepTime(SLEEP_AFTER_MS - 1, 0)).toBe(false);
    expect(isSleepTime(SLEEP_AFTER_MS, 0)).toBe(true);
    expect(isSleepTime(SLEEP_AFTER_MS, 100)).toBe(false);
    expect(idleRemaining(300_000, 0)).toBe(0);
    expect(idleRemaining(120_000, 120_000)).toBe(SLEEP_AFTER_MS);
  });
  it("recognizes only two quick pokes, including taps, within the same clock", () => {
    expect(isDoublePoke(0, null)).toBe(false);
    expect(isDoublePoke(DOUBLE_POKE_MS, 0)).toBe(true);
    expect(isDoublePoke(DOUBLE_POKE_MS + 1, 0)).toBe(false);
    expect(isDoublePoke(9, 10)).toBe(false);
  });
  it("deduplicates dispatched events and DOM fallbacks, and resets for the next scan", () => {
    let s = reactionTransition({ scanning: false, report: false }, "scan-start");
    expect(s.scanning).toBe(true);
    s = reactionTransition(s, "scan-end"); expect(s.scanning).toBe(false);
    s = reactionTransition(s, "report-open"); expect(s.cheer).toBe(true);
    s = reactionTransition(s, "report-open"); expect(s.cheer).toBe(false);
    s = reactionTransition(s, "scan-start"); expect(s.report).toBe(false);
    s = reactionTransition(s, "report-open"); expect(s.cheer).toBe(true);
  });
});
