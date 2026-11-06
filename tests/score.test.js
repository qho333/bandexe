import { describe, it, expect } from "vitest";
import { overallBand, bandRange } from "../server/lib/score.js";

describe("overallBand", () => {
  it("rounds the mean down to the half band", () => {
    expect(overallBand({ tr: 7, cc: 6, lr: 7, gra: 6 })).toBe(6.5); // 6.5 exact
    expect(overallBand({ tr: 7, cc: 7, lr: 6, gra: 5 })).toBe(6); // 6.25 -> 6.0
    expect(overallBand({ tr: 7, cc: 7, lr: 7, gra: 6 })).toBe(6.5); // 6.75 -> 6.5
    expect(overallBand({ tr: 9, cc: 9, lr: 9, gra: 9 })).toBe(9);
    expect(overallBand({ tr: 5, cc: 5, lr: 5, gra: 4 })).toBe(4.5); // 4.75 -> 4.5
  });
  it("withholds the overall when any criterion is missing or invalid", () => {
    expect(overallBand({ tr: 7, cc: null, lr: 7, gra: 6 })).toBeNull();
    expect(overallBand({ tr: 7, cc: 6.5, lr: 7, gra: 6 })).toBeNull();
    expect(overallBand({ tr: 0, cc: 6, lr: 7, gra: 6 })).toBeNull();
  });
});

describe("bandRange", () => {
  it("is +/-0.5 clipped to 1..9", () => {
    expect(bandRange(6.5)).toEqual({ lo: 6, hi: 7 });
    expect(bandRange(6.5, false)).toEqual({ lo: 5.5, hi: 7.5 });
    expect(bandRange(9)).toEqual({ lo: 8.5, hi: 9 });
    expect(bandRange(1)).toEqual({ lo: 1, hi: 1.5 });
    expect(bandRange(null)).toBeNull();
  });
});

import { capUneven } from "../shared/score.js";

describe("very uneven bands", () => {
  it("caps the overall at the bands' mean only when they differ by 3 or more", () => {
    expect(capUneven(7.5, { tr: 4, cc: 8, lr: 8, gra: 8 })).toBe(7);
    expect(capUneven(7.5, { tr: 6, cc: 8, lr: 8, gra: 8 })).toBe(7.5); // spread 2: untouched
    expect(capUneven(5.5, { tr: 6, cc: 6, lr: 6, gra: 6 })).toBe(5.5);
    expect(capUneven(4, { tr: 3, cc: 8, lr: 8, gra: 8 })).toBe(4); // never raises
    expect(capUneven(7, { tr: null, cc: 8, lr: 8, gra: 3 })).toBe(7); // withheld band: no mean to cap at
  });
});
