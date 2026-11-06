import { describe, it, expect } from "vitest";
import { replaceFirst, countWords } from "../src/lib/fixes";

describe("replaceFirst (accept/reject on the essay)", () => {
  it("replaces only the first exact occurrence", () => {
    expect(replaceFirst("they has and they has", "they has", "they have")).toEqual({ text: "they have and they has", ok: true });
  });
  it("reports when the text was already edited", () => {
    expect(replaceFirst("they have", "they has", "they have")).toEqual({ text: "they have", ok: false });
  });
  it("round-trips accept then reject", () => {
    const a = replaceFirst("less cars here", "less cars", "fewer cars").text;
    expect(replaceFirst(a, "fewer cars", "less cars").text).toBe("less cars here");
  });
  it("counts words like the server", () => {
    expect(countWords("It's a well-known fact, isn't it?")).toBe(6);
  });
});
