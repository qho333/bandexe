import { describe, expect, it } from "vitest";
import { plainReply } from "../src/lib/helper";

describe("plainReply", () => {
  it("removes markdown emphasis and headings, keeps the words", () => {
    const md = "**How to write a good conclusion (≈40-50 words)**  \n\n- **Restate the question** in different words.  \n- Summarise your points.\n\n\n\n## Structure\n* Final thought";
    expect(plainReply(md)).toBe("How to write a good conclusion (≈40-50 words)\n\n• Restate the question in different words.\n• Summarise your points.\n\nStructure\n• Final thought");
  });
  it("leaves plain text and maths alone", () => {
    expect(plainReply("Band 7 needs 2 * 3 ideas")).toBe("Band 7 needs 2 * 3 ideas");
    expect(plainReply("Use <b>tags</b> literally")).toBe("Use <b>tags</b> literally");
  });
});
