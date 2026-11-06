import { describe, expect, it } from "vitest";
import { isScaled } from "../src/lib/spider";

// The results screen draws in from a thin line (scaleY). Rects measured then sit off the words.
const el = (offsetWidth: number, offsetHeight: number, width: number, height: number) =>
  ({ offsetWidth, offsetHeight, getBoundingClientRect: () => ({ width, height }) }) as unknown as HTMLElement;

describe("isScaled", () => {
  it("detects an ancestor transform mid screen-transition", () => {
    expect(isScaled(el(600, 900, 600, 13.5))).toBe(true); // scaleY 0.015
    expect(isScaled(el(600, 900, 600, 450))).toBe(true); // half way: the old squashed check missed this
  });
  it("accepts the settled layout and hidden elements", () => {
    expect(isScaled(el(600, 900, 600, 900))).toBe(false);
    expect(isScaled(el(600, 900, 600.4, 899.6))).toBe(false); // sub-pixel rounding
    expect(isScaled(el(0, 0, 0, 0))).toBe(false); // display: none is handled by the caller
  });
});
