import { afterEach, describe, expect, it, vi } from "vitest";
import { loadChecker, saveChecker, deviceAvailability, checkerLabel } from "../src/lib/checker";

function memStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}
afterEach(() => vi.unstubAllGlobals());

describe("checker persistence", () => {
  it("defaults to Free checker even with a saved key, and migrates retired choices", () => {
    const store = memStore();
    expect(loadChecker(store)).toEqual({ mode: "free", key: "" });
    store.setItem("bandexe-own-key", "student-test-key");
    expect(loadChecker(store).mode).toBe("free");
    for (const mode of ["free", "site", "own", "device"] as const) {
      expect(saveChecker({ mode, key: "student-test-key" }, store)).toBe(true);
      expect(loadChecker(store)).toEqual({ mode: mode === "own" ? "own" : "free", key: "student-test-key" });
    }
    saveChecker({ mode: "site", key: "" }, store);
    expect(store.getItem("bandexe-own-key")).toBeNull();
    store.setItem("bandexe-checker", "corrupt");
    expect(loadChecker(store).mode).toBe("free");
  });
  it("tolerates absent and blocked storage", () => {
    const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); } };
    for (const store of [null, blocked]) {
      expect(loadChecker(store)).toEqual({ mode: "free", key: "" });
      expect(saveChecker({ mode: "own", key: "test" }, store)).toBe(false);
    }
  });
});

describe("on-device availability", () => {
  it("suggests own key without downloading anything when WebGPU is unsupported", async () => {
    vi.stubGlobal("navigator", {});
    const network = vi.fn(); vi.stubGlobal("fetch", network);
    expect(await deviceAvailability()).toMatch(/not supported.*My own key/);
    expect(await deviceAvailability({ requestAdapter: async () => null })).toMatch(/not supported/);
    expect(await deviceAvailability({ requestAdapter: async () => { throw new Error("denied"); } })).toMatch(/not available/);
    expect(network).not.toHaveBeenCalled();
  });
  it("allows supported devices to proceed to consent without downloading", async () => {
    expect(await deviceAvailability({ requestAdapter: async () => ({}) })).toBe("");
  });
  it("labels the checker independently of the current selection", () => {
    expect(checkerLabel("own")).toBe("Checked with your own Gemini key");
    expect(checkerLabel()).toBe("Checked with the Free checker");
  });
});
