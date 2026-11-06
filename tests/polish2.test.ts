import { afterEach, describe, expect, it, vi } from "vitest";
import { watchLocalDate } from "../src/lib/local-date";
import { dayKey, practiceRhythm } from "../src/lib/progress";
import type { HistoryEntry } from "../src/lib/history";
import { observeElementHeight } from "../src/lib/element-height";
import { dismissAfterFocusLeaves, dockTucking, restoreHelperFocus } from "../src/lib/mascot-interactions";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("practice rhythm freshness (finding 2)", () => {
  const setup = () => {
    vi.useFakeTimers();
    const doc = Object.assign(new EventTarget(), { hidden: false });
    vi.stubGlobal("document", doc);
    vi.setSystemTime(new Date(2026, 9, 25, 23, 59, 59)); // Sunday, just before a new week
    const history = [{ date: new Date(2026, 9, 24, 12).toISOString() }] as HistoryEntry[];
    const refresh = vi.fn((now: Date) => practiceRhythm(history, now));
    return { doc, refresh };
  };
  it("recomputes the streak, grid and today marker at local midnight without a history change", () => {
    const { refresh } = setup();
    const stop = watchLocalDate(refresh);
    expect(refresh.mock.results.at(-1)?.value.streak).toBe(1);
    vi.advanceTimersByTime(1000);
    const rhythm = refresh.mock.results.at(-1)?.value;
    expect(rhythm.streak).toBe(0);
    expect(rhythm.weeks[4][0].today).toBe(true);
    expect(rhythm.weeks[4][0].key).toBe("2026-10-26");
    expect(refresh).toHaveBeenCalledTimes(2);
    stop();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("refreshes immediately on screen activation and reactivation after time away", () => {
    const { refresh } = setup();
    let stop = watchLocalDate(refresh);
    expect(refresh).toHaveBeenCalledTimes(1);
    stop();
    vi.setSystemTime(new Date(2026, 9, 27, 12));
    stop = watchLocalDate(refresh);
    expect(dayKey(refresh.mock.calls.at(-1)![0])).toBe("2026-10-27");
    expect(refresh.mock.results.at(-1)?.value.streak).toBe(0);
    stop();
  });
  it("refreshes on visibility restoration, and removes the listener on deactivation", () => {
    const { refresh, doc } = setup();
    const stop = watchLocalDate(refresh);
    doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date(2026, 9, 28, 12));
    doc.hidden = false;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(dayKey(refresh.mock.calls.at(-1)![0])).toBe("2026-10-28");
    expect(refresh).toHaveBeenCalledTimes(2);
    stop();
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(refresh).toHaveBeenCalledTimes(2);
  });
  it("detects local date changes after a clock adjustment while still visible", () => {
    const { refresh } = setup();
    const stop = watchLocalDate(refresh);
    vi.setSystemTime(new Date(2026, 9, 28, 10));
    vi.advanceTimersByTime(60_000);
    expect(dayKey(refresh.mock.calls.at(-1)![0])).toBe("2026-10-28");
    stop();
  });
});

describe("bottom overlay geometry (findings 3 and 4)", () => {
  it("observes the real action height, including growth, hiding, desktop display:none and cleanup", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("document", { documentElement: { style: { setProperty: (k: string, v: string) => values.set(k, v) } } });
    let resize = () => {};
    const disconnect = vi.fn(), observe = vi.fn();
    vi.stubGlobal("ResizeObserver", class {
      constructor(cb: () => void) { resize = cb; }
      observe = observe;
      disconnect = disconnect;
    });
    let height = 64;
    const el = { hidden: false, getBoundingClientRect: () => ({ height }) } as HTMLElement;
    let stop = observeElementHeight(el, "--action-h");
    expect(observe).toHaveBeenCalledWith(el, { box: "border-box" });
    expect(values.get("--action-h")).toBe("64px");
    height = 117.5; resize(); // error row, wrapping or larger text
    expect(values.get("--action-h")).toBe("117.5px");
    el.hidden = true; resize();
    expect(values.get("--action-h")).toBe("0px");
    el.hidden = false; height = 0; resize(); // desktop CSS hides the bar
    expect(values.get("--action-h")).toBe("0px");
    height = 64; resize();
    stop();
    expect(values.get("--action-h")).toBe("0px");
    expect(disconnect).toHaveBeenCalledOnce();
    stop = observeElementHeight(el, "--action-h", false); // inactive screen / keyboard
    expect(values.get("--action-h")).toBe("0px");
    stop();
  });
});

describe("helper focus (findings 5 and 6)", () => {
  it("expands with a still-open keyboard, permits focus after becoming interactive, then tucks for the next input", () => {
    let tucked = false;
    const tuck = dockTucking(() => true, () => false, (t) => { tucked = t; });
    tuck.focusField();
    expect(tucked).toBe(true);
    tuck.expand();
    tuck.update(); // delayed viewport resize must not undo explicit expansion
    expect(tucked).toBe(false);
    const opener = { focus: vi.fn(() => expect(tucked).toBe(false)) } as unknown as HTMLElement;
    const handle = { focus: vi.fn() } as unknown as HTMLElement;
    restoreHelperFocus(tucked, handle, opener);
    expect(opener.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(handle.focus).not.toHaveBeenCalled();
    tuck.focusField();
    expect(tucked).toBe(true);
  });
  it("restores focus to the visible handle when a helper closes, retaining it after keyboard dismissal", () => {
    let keyboard = true, focusedHandle = false, tucked = false;
    const tuck = dockTucking(() => keyboard, () => focusedHandle, (t) => { tucked = t; });
    tuck.focusField();
    const handle = { focus: vi.fn(() => { focusedHandle = true; }) } as unknown as HTMLElement;
    const opener = { focus: vi.fn() } as unknown as HTMLElement;
    restoreHelperFocus(tucked, handle, opener);
    expect(handle.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(opener.focus).not.toHaveBeenCalled(); // opener is inside an inert toolbar
    keyboard = false;
    tuck.releaseField();
    expect(tucked).toBe(true); // do not hide the currently focused handle
    focusedHandle = false;
    tuck.releaseField();
    expect(tucked).toBe(false);
    restoreHelperFocus(tucked, handle, opener);
    expect(opener.focus).toHaveBeenCalledOnce();
  });
});

describe("focused tip lifetime (finding 7)", () => {
  it("suspends expiry during focus, including movement between tip controls, and resumes after leaving", () => {
    vi.useFakeTimers();
    const text = {}, close = {}, outside = {};
    const doc = { activeElement: outside };
    vi.stubGlobal("document", doc);
    const box = Object.assign(new EventTarget(), { contains: (node: unknown) => node === text || node === close });
    const dismiss = vi.fn();
    const stop = dismissAfterFocusLeaves(box as unknown as HTMLElement, dismiss, 10_000);
    vi.advanceTimersByTime(9000);
    doc.activeElement = text; box.dispatchEvent(new Event("focusin"));
    vi.advanceTimersByTime(20_000);
    expect(dismiss).not.toHaveBeenCalled();
    box.dispatchEvent(Object.assign(new Event("focusout"), { relatedTarget: close }));
    doc.activeElement = close; box.dispatchEvent(new Event("focusin"));
    vi.advanceTimersByTime(20_000);
    expect(dismiss).not.toHaveBeenCalled();
    // focusout can fire before activeElement has updated; relatedTarget decides whether it left.
    box.dispatchEvent(Object.assign(new Event("focusout"), { relatedTarget: outside }));
    doc.activeElement = outside;
    vi.advanceTimersByTime(9999);
    expect(dismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(dismiss).toHaveBeenCalledOnce();
    stop();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("expires an untouched tip and cancels timers/listeners when the tip unmounts", () => {
    vi.useFakeTimers();
    vi.stubGlobal("document", { activeElement: null });
    const box = Object.assign(new EventTarget(), { contains: () => false });
    const dismiss = vi.fn();
    let stop = dismissAfterFocusLeaves(box as unknown as HTMLElement, dismiss, 10_000);
    vi.advanceTimersByTime(10_000);
    expect(dismiss).toHaveBeenCalledOnce();
    stop(); dismiss.mockClear();
    stop = dismissAfterFocusLeaves(box as unknown as HTMLElement, dismiss, 10_000);
    stop();
    box.dispatchEvent(Object.assign(new Event("focusout"), { relatedTarget: null }));
    vi.advanceTimersByTime(20_000);
    expect(dismiss).not.toHaveBeenCalled();
  });
});
