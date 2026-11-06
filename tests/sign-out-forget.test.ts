import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("sign-out forgets this browser's essay", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) });
    vi.stubGlobal("window", Object.assign(new EventTarget(), { localStorage: globalThis.localStorage }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("removes the draft and local results and signals other tabs", async () => {
    const { forgetDevice, SIGNED_OUT_EVENT, SIGNED_OUT_KEY } = await import("../src/lib/auth");
    const { DRAFT_KEY } = await import("../src/lib/draft");
    const { HISTORY_KEY } = await import("../src/lib/history");
    store.set(DRAFT_KEY, JSON.stringify({ essay: "my private essay" }));
    store.set(HISTORY_KEY, "[]");
    store.set("bandexe-prefs", "{}");
    const heard = vi.fn();
    window.addEventListener(SIGNED_OUT_EVENT, heard);
    forgetDevice();
    expect(store.has(DRAFT_KEY)).toBe(false);
    expect(store.has(HISTORY_KEY)).toBe(false);
    expect(store.has("bandexe-prefs")).toBe(true); // display settings are not personal writing
    expect(store.get(SIGNED_OUT_KEY)).toBeTruthy();
    expect(heard).toHaveBeenCalledOnce();
  });
});
