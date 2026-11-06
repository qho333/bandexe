import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Read the authored CSS: Vitest's default CSS stubs return empty strings, even for ?raw.
const mascotCSS = readFileSync(new URL("../src/mascots.css", import.meta.url), "utf8");
const layoutCSS = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

describe("bottom overlay CSS regressions", () => {
  it("includes the handle's safe-area inset inside its measured box (finding 3)", () => {
    const handle = mascotCSS.match(/\.mascot-handle \{([^}]+)\}/)[1];
    expect(handle).toMatch(/bottom: 0;/);
    expect(handle).toContain("height: calc(30px + env(safe-area-inset-bottom, 0px))");
    expect(handle).toContain("padding: 0 var(--s-3) env(safe-area-inset-bottom, 0px)");
    expect(layoutCSS).toContain("bottom: var(--dock-h, var(--track-h))");
  });
  it("positions bubbles above dock plus actual action height and reserves scrolling space (finding 4)", () => {
    expect(mascotCSS).toMatch(/\.mascot-bubbles\s*\{[^}]*bottom: calc\(100% \+ var\(--action-h, 0px\)\)/);
    expect(layoutCSS).toContain("scroll-padding-bottom: calc(var(--dock-h, var(--track-h)) + var(--action-h, 0px) + 16px)");
    expect(layoutCSS).toContain("padding-bottom: calc(var(--s-12) + var(--action-h, 0px))");
  });
});
