import { describe, expect, it } from "vitest";
import { startScreen, WELCOMED_KEY } from "../src/lib/routes";
import { en } from "../src/i18n/en";

const store = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m }; };

describe("first visit routing", () => {
  it("opens the login page once, then Write", () => {
    const s = store();
    expect(startScreen("", s)).toBe("login");
    expect(s.m.get(WELCOMED_KEY)).toBe("1");
    expect(startScreen("", s)).toBe("write");
  });
  it("respects an explicit screen in the address", () => {
    const s = store();
    expect(startScreen("#stats", s)).toBe("stats");
    expect(s.m.has(WELCOMED_KEY)).toBe(false);
  });
  it("falls back to Write when storage is blocked", () => {
    const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(startScreen("", blocked)).toBe("write");
    expect(startScreen("", undefined)).toBe("write");
  });
  it("has the owner note in the catalogue", () => {
    expect(en["Meet the owner"]).toBe("Meet the owner");
  });
});
