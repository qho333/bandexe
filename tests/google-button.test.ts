import { afterEach, expect, it, vi } from "vitest";
import type { GoogleIdentity } from "../src/lib/auth";
import { googleButtonOptions, watchGoogleButton } from "../src/lib/google-button";
import { THEMES } from "../src/lib/prefs";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
it("uses rectangular GSI buttons with the current locale, theme and bounded measured width", () => {
  for (const [theme] of THEMES) {
    expect(googleButtonOptions(theme, "ar", 398.8)).toEqual({ theme: theme === "paper" ? "outline" : "filled_black", text: "signin_with", size: "large", shape: "rectangular", width: 398, locale: "ar" });
  }
  expect(googleButtonOptions("mono", "vi", 999).width).toBe(400);
  expect(googleButtonOptions("mono", "ja", 0).width).toBe(1);
  expect(googleButtonOptions("paper", "th", NaN).width).toBe(1);
});
it("debounces container changes, rerenders with new width and cleans queued work on theme/language replacement", () => {
  vi.useFakeTimers();
  let width = 300, observerCallback: () => void = () => {};
  const disconnect = vi.fn(), observe = vi.fn(), win = new EventTarget();
  vi.stubGlobal("window", win);
  vi.stubGlobal("ResizeObserver", class { constructor(callback: () => void) { observerCallback = callback; } observe = observe; disconnect = disconnect; });
  const host = { getBoundingClientRect: () => ({ width }), replaceChildren: vi.fn() } as unknown as HTMLElement;
  const google = { renderButton: vi.fn() } as unknown as GoogleIdentity;
  const rendered = vi.fn(), failure = vi.fn();
  const stop = watchGoogleButton(host, google, "mono", "vi", rendered, failure);
  expect(observe).toHaveBeenCalledWith(host); expect(google.renderButton).toHaveBeenCalledOnce();
  width = 280; observerCallback(); width = 260; observerCallback();
  vi.advanceTimersByTime(119); expect(google.renderButton).toHaveBeenCalledOnce();
  vi.advanceTimersByTime(1); expect(google.renderButton).toHaveBeenCalledTimes(2);
  expect(google.renderButton).toHaveBeenLastCalledWith(host, expect.objectContaining({ width: 260, locale: "vi" }));
  width = 240; observerCallback(); stop(); vi.advanceTimersByTime(120);
  expect(google.renderButton).toHaveBeenCalledTimes(2); expect(disconnect).toHaveBeenCalledOnce();
  win.dispatchEvent(new Event("resize")); vi.advanceTimersByTime(120); expect(google.renderButton).toHaveBeenCalledTimes(2);
  const stopNext = watchGoogleButton(host, google, "paper", "ja", rendered, failure);
  expect(google.renderButton).toHaveBeenLastCalledWith(host, expect.objectContaining({ width: 240, locale: "ja", theme: "outline" }));
  stopNext(); expect(failure).not.toHaveBeenCalled();
});
it("waits for hidden containers and handles iframe rendering failures calmly", () => {
  vi.useFakeTimers(); let width = 0;
  vi.stubGlobal("window", new EventTarget()); vi.stubGlobal("ResizeObserver", undefined);
  const host = { getBoundingClientRect: () => ({ width }), replaceChildren: vi.fn() } as unknown as HTMLElement;
  const google = { renderButton: vi.fn(() => { throw new Error("provider failed"); }) } as unknown as GoogleIdentity;
  const failure = vi.fn(), rendered = vi.fn();
  const stop = watchGoogleButton(host, google, "mono", "en", rendered, failure);
  expect(google.renderButton).not.toHaveBeenCalled();
  width = 320; window.dispatchEvent(new Event("resize")); vi.advanceTimersByTime(120);
  expect(failure).toHaveBeenCalledOnce(); expect(rendered).not.toHaveBeenCalled(); stop();
});
