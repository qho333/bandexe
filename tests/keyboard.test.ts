import { describe, expect, it } from "vitest";
import { isKeyboardOpen } from "../src/lib/keyboard";

const phone = { focused: true, referenceHeight: 844, viewportHeight: 510 };
describe("essay keyboard detection", () => {
  it("hides controls only when the essay is focused and the viewport shrinks substantially", () => {
    expect(isKeyboardOpen(phone)).toBe(true);
    expect(isKeyboardOpen({ ...phone, focused: false })).toBe(false);
    expect(isKeyboardOpen({ ...phone, viewportHeight: 844 })).toBe(false);
  });
  it("keeps controls for browser chrome changes and hardware keyboards", () => {
    for (const viewportHeight of [844, 800, 744]) expect(isKeyboardOpen({ ...phone, viewportHeight })).toBe(false);
  });
  it("returns after keyboard dismissal even while the essay retains focus", () => {
    expect([510, 650, 844].map((viewportHeight) => isKeyboardOpen({ ...phone, viewportHeight }))).toEqual([true, true, false]);
  });
  it("supports short landscape viewports while rejecting minor resizes", () => {
    expect(isKeyboardOpen({ ...phone, referenceHeight: 390, viewportHeight: 240 })).toBe(true);
    expect(isKeyboardOpen({ ...phone, referenceHeight: 390, viewportHeight: 300 })).toBe(false);
  });
  it("ignores pinch zoom and invalid viewport measurements", () => {
    expect(isKeyboardOpen({ ...phone, scale: 2 })).toBe(false);
    expect(isKeyboardOpen({ ...phone, scale: NaN })).toBe(false);
    for (const height of [0, -1, NaN, Infinity]) {
      expect(isKeyboardOpen({ ...phone, referenceHeight: height })).toBe(false);
      expect(isKeyboardOpen({ ...phone, viewportHeight: height })).toBe(false);
    }
  });
});
