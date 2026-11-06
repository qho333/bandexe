import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Select, { nextIndex, typeaheadIndex } from "../src/components/Select";

describe("animated dropdown", () => {
  it("moves the highlight with the keyboard and stops at the ends", () => {
    expect(nextIndex("ArrowDown", 0, 3)).toBe(1); expect(nextIndex("ArrowDown", 2, 3)).toBe(2);
    expect(nextIndex("ArrowUp", 0, 3)).toBe(0); expect(nextIndex("Home", 2, 3)).toBe(0); expect(nextIndex("End", 0, 3)).toBe(2);
    expect(nextIndex("a", 0, 3)).toBeNull();
  });
  it("finds options by typing and wraps round", () => {
    const labels = ["English", "Tiếng Việt", "Español"];
    expect(typeaheadIndex(labels, "t", 0)).toBe(1); expect(typeaheadIndex(labels, "e", 0)).toBe(2); expect(typeaheadIndex(labels, "e", 2)).toBe(0); expect(typeaheadIndex(labels, "z", 0)).toBe(-1);
  });
  it("renders a labelled closed combobox showing the current value", () => {
    const html = renderToStaticMarkup(createElement(Select, { id: "x", value: "b", options: [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }], onChange: () => {} }));
    expect(html).toContain('role="combobox"'); expect(html).toContain('id="x"'); expect(html).toContain("Beta"); expect(html).not.toContain("Alpha"); expect(html).not.toContain('role="listbox"');
  });
});
