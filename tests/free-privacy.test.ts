import { describe, expect, it } from "vitest";
import { scrubContacts } from "../shared/free.js";

describe("contact details sent to free providers", () => {
  it("removes emails and +-prefixed phone numbers", () => {
    expect(scrubContacts("Write to linh.tran+x@mail.example.vn today")).toBe("Write to [contact removed] today");
    expect(scrubContacts("Call +84 912 345 678.")).toBe("Call [contact removed].");
  });
  it("leaves essay and chart figures alone", () => {
    const text = "Sales rose from 1200 1300 1400 in 2000-2010 to 45.5% (2020), a 3+ point rise.";
    expect(scrubContacts(text)).toBe(text);
  });
});
