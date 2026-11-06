import { describe, expect, it } from "vitest";
import { groupTags, isReportAnchor, placePopover } from "../src/lib/report";
import { scanProgress } from "../src/lib/scan";
import { spiderScale, type Line } from "../src/lib/spider";

const line = (top: number, left = 80, right = 150): Line => ({ left, right, top, bottom: top + 20 });

describe("first-line gutter tags", () => {
  it("uses only the first fragment of a wrapped mark", () => {
    expect(groupTags([0], { 0: [line(10), line(36)] })).toEqual([{ ids: [0], top: 12, bottom: 28 }]);
  });
  it("groups marks sharing a line regardless of horizontal position or input order", () => {
    expect(groupTags([2, 1, 0], { 0: [line(10)], 1: [line(11, 250, 300)], 2: [line(36)] })).toEqual([
      { ids: [0, 1], top: 12, bottom: 28 }, { ids: [2], top: 38, bottom: 54 },
    ]);
  });
  it("groups close rows rather than overlapping chips and ignores missing geometry", () => {
    const groups = groupTags([0, 1, 2, 3], { 0: [line(10)], 1: [line(22)], 2: [line(36)] });
    expect(groups.map((g) => g.ids)).toEqual([[0, 1], [2]]);
    expect(groups[1].top).toBeGreaterThanOrEqual(groups[0].bottom + 2);
  });
  it("regroups after reflow without keeping stale row positions", () => {
    expect(groupTags([0, 1], { 0: [line(10)], 1: [line(10)] })).toHaveLength(1);
    expect(groupTags([0, 1], { 0: [line(10)], 1: [line(62)] }).map((g) => g.top)).toEqual([12, 64]);
  });
});

describe("viewport popup placement", () => {
  const phone: Line = { left: 0, top: 0, right: 390, bottom: 700 };
  const size = { width: 300, height: 180 };
  it("stays below the whole wrapped mark with room to spare", () => {
    const mark = { left: 240, right: 360, top: 60, bottom: 110 };
    const p = placePopover(mark, size, phone);
    expect(p.side).toBe("below");
    expect(p.top).toBeGreaterThan(mark.bottom);
    expect(p.left).toBe(82);
    expect(p.left + size.width).toBeLessThanOrEqual(phone.right - 8);
  });
  it("flips above a low mark and clears the dock", () => {
    const mark = line(640);
    const p = placePopover(mark, size, { ...phone, bottom: 672 });
    expect(p.side).toBe("above");
    expect(p.top).toBeGreaterThanOrEqual(8);
    expect(p.top + Math.min(size.height, p.maxHeight)).toBeLessThan(mark.top);
  });
  it("limits tall popup content to the free space without covering the mark", () => {
    const mark = line(300);
    const p = placePopover(mark, { ...size, height: 900 }, phone);
    expect(p.side).toBe("below");
    expect(p.top + p.maxHeight).toBeLessThanOrEqual(phone.bottom - 8);
    expect(p.top).toBeGreaterThan(mark.bottom);
  });
  it("respects visual viewport offsets and marks near either horizontal edge", () => {
    const viewport = { left: 40, right: 340, top: 100, bottom: 500 };
    for (const left of [0, 300]) {
      const p = placePopover(line(180, left), { width: 280, height: 100 }, viewport);
      expect(p.left).toBeGreaterThanOrEqual(48);
      expect(p.left + 280).toBeLessThanOrEqual(332);
      expect(p.top).toBeGreaterThanOrEqual(108);
      expect(p.top + 100).toBeLessThanOrEqual(492);
    }
  });
  it("keeps the panel in view when its mark scrolls out of view", () => {
    for (const top of [-100, 800]) {
      const p = placePopover(line(top), size, phone);
      expect(p.top).toBeGreaterThanOrEqual(8);
      expect(p.top + Math.min(size.height, p.maxHeight)).toBeLessThanOrEqual(692);
    }
  });
});

describe("real scan progress", () => {
  it("labels the paragraph reached and fills only the completed paragraphs", () => {
    expect(scanProgress(0, 4)).toEqual({ text: "Scanning paragraph 1 of 4", value: 0, max: 4 });
    expect(scanProgress(1, 4)).toEqual({ text: "Scanning paragraph 2 of 4", value: 1, max: 4 });
    expect(scanProgress(3, 4).value).toBe(3);
    expect(scanProgress(3, 4, true)).toEqual({ text: "Scan complete", value: 4, max: 4 });
  });
  it("handles empty essays and clamps paragraph indexes", () => {
    expect(scanProgress(0, 0)).toEqual({ text: "Waiting for essay text", value: 0, max: 1 });
    expect(scanProgress(-1, 4).text).toBe("Scanning paragraph 1 of 4");
    expect(scanProgress(20, 4).value).toBe(3);
    expect(scanProgress(20, 4).text).toBe("Scanning paragraph 4 of 4");
  });
});

describe("spider sizing", () => {
  it("keeps the capsule 1.45 times the essay line height at the app's reading sizes", () => {
    for (const height of [26.25, 28, 31.5]) expect(36 * spiderScale(height) / height).toBeCloseTo(1.45);
  });
});

describe("report section routing", () => {
  it("recognises every mini-nav and criterion target", () => {
    for (const id of ["score", "essay", "criteria", "grammar", "words", "paras", "next", "model", "chat", "crit-tr", "crit-cc", "crit-lr", "crit-gra"]) expect(isReportAnchor("#r-" + id)).toBe(true);
  });
  it("leaves main routes and unknown fragments to the app router", () => {
    for (const hash of ["#login", "#write", "#results", "#overview", "#r-nope", "#r-crit-tr/extra"]) expect(isReportAnchor(hash)).toBe(false);
  });
});
