import { describe, it, expect } from "vitest";
import { makeQuota, makeSlots } from "../server/lib/limits.js";

describe("limits", () => {
  it("caps per id and globally per hour", () => {
    const q = makeQuota({ perId: 2, global: 3 });
    expect([q("a", 0), q("a", 1), q("a", 2)]).toEqual([true, true, false]);
    expect(q("b", 3)).toBe(true);
    expect(q("c", 4)).toBe(false); // global cap of 3 reached
    expect(q("c", 3600_001 + 4)).toBe(true); // window passed
  });
  it("limits concurrent slots and releases once", () => {
    const s = makeSlots(2);
    const a = s(), b = s();
    expect(s()).toBeNull();
    a(); a();
    expect(s()).not.toBeNull();
    expect(b).toBeTypeOf("function");
  });
});
