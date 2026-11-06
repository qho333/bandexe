import { afterEach, expect, it, vi } from "vitest";
import { followVisibility, siblingDelay, watchPageVisibility } from "../src/lib/motion";
import { toast, TOAST_EVENT } from "../src/lib/toast";
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
it("pauses component timelines in hidden tabs, resumes them and removes listeners", () => {
  const doc = Object.assign(new EventTarget(), { hidden: true });
  const animation = { paused: vi.fn() };
  const stop = followVisibility(animation, doc);
  expect(animation.paused).toHaveBeenLastCalledWith(true);
  doc.hidden = false; doc.dispatchEvent(new Event("visibilitychange"));
  expect(animation.paused).toHaveBeenLastCalledWith(false);
  doc.hidden = true; doc.dispatchEvent(new Event("visibilitychange"));
  expect(animation.paused).toHaveBeenLastCalledWith(true);
  stop(); doc.dispatchEvent(new Event("visibilitychange")); expect(animation.paused).toHaveBeenCalledTimes(3);
});
it("pauses CSS animations from first mount and clears the visibility attribute on unmount", () => {
  const attributes = new Set<string>();
  const doc = Object.assign(new EventTarget(), { hidden: true, documentElement: { toggleAttribute: (name: string, on: boolean) => on ? attributes.add(name) : attributes.delete(name), removeAttribute: (name: string) => attributes.delete(name) } });
  const stop = watchPageVisibility(doc as unknown as Document);
  expect(attributes.has("data-page-hidden")).toBe(true);
  doc.hidden = false; doc.dispatchEvent(new Event("visibilitychange")); expect(attributes.size).toBe(0);
  stop(); doc.hidden = true; doc.dispatchEvent(new Event("visibilitychange")); expect(attributes.size).toBe(0);
});
it("bounds stagger time for arbitrarily long lists", () => {
  const children = Array.from({ length: 500 }, () => ({}));
  const el = children[400] as Element; Object.assign(el, { parentElement: { children } });
  expect(siblingDelay(el, 0.035)).toBeCloseTo(0.1 * 400 / 499);
  Object.assign(children[499], { parentElement: { children } });
  expect(siblingDelay(children[499] as Element, 0.035)).toBeCloseTo(0.1);
  expect(siblingDelay({ parentElement: null } as Element, 0.03)).toBe(0);
});
it("sends terminal toasts to the visual dock and the existing polite live region", () => {
  vi.useFakeTimers();
  const live = { textContent: "" }, win = new EventTarget(), show = vi.fn();
  vi.stubGlobal("window", win); vi.stubGlobal("document", { getElementById: () => live });
  vi.stubGlobal("CustomEvent", class extends Event { detail: unknown; constructor(type: string, init: { detail: unknown }) { super(type); this.detail = init.detail; } });
  win.addEventListener(TOAST_EVENT, show); toast("Copied");
  expect(show).toHaveBeenCalledOnce(); expect((show.mock.calls[0][0] as CustomEvent).detail).toBe("Copied");
  vi.advanceTimersByTime(30); expect(live.textContent).toBe("Copied");
});
