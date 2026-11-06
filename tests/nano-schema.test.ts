import { describe, expect, it } from "vitest";
import { nanoSchema } from "../src/lib/nano";

// Unbounded replies ran past Chrome's output limit on 7 of 27 official scripts; every list and string is bounded now.
describe("Nano response schema", () => {
  const walk = (node: unknown, path: string, out: string[]) => {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (n.type === "string" && typeof n.maxLength !== "number") out.push(path);
    if (n.type === "array" && typeof n.maxItems !== "number") out.push(path);
    for (const [k, v] of Object.entries(n)) walk(v, `${path}.${k}`, out);
  };
  it.each([false, true])("bounds every string and array (bands: %s)", (bands) => {
    const unbounded: string[] = [];
    walk(nanoSchema(bands), "schema", unbounded);
    expect(unbounded).toEqual([]);
  });
});
