import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Prefs } from "../src/lib/prefs";

const harness = vi.hoisted(() => ({
  values: [] as unknown[], index: 0,
  effects: [] as { deps: unknown[] | undefined; cleanup?: () => void }[],
  pending: [] as (() => void)[],
  auth: { googleClientId: "test-client" as string | null, signedIn: false, firstName: "Sam", revision: 0 },
  loadGoogle: vi.fn(), signIn: vi.fn(), watchButton: vi.fn(),
}));
vi.mock("react", async (importActual) => {
  const actual = await importActual<typeof import("react")>();
  return { ...actual,
    useState(initial: unknown) {
      const i = harness.index++;
      if (!(i in harness.values)) harness.values[i] = typeof initial === "function" ? initial() : initial;
      return [harness.values[i], (next: unknown) => { harness.values[i] = typeof next === "function" ? next(harness.values[i]) : next; }];
    },
    useRef(initial: unknown) { const i = harness.index++; if (!(i in harness.values)) harness.values[i] = { current: initial }; return harness.values[i]; },
    useEffect(effect: () => (() => void) | undefined, deps?: unknown[]) {
      const i = harness.index++, old = harness.effects[i];
      if (old && deps && old.deps?.length === deps.length && deps.every((value, j) => Object.is(value, old.deps![j]))) return;
      harness.pending.push(() => { old?.cleanup?.(); harness.effects[i] = { deps, cleanup: effect() }; });
    },
    useSyncExternalStore(_subscribe: unknown, snapshot: () => unknown) { return snapshot(); },
  };
});
vi.mock("../src/lib/auth", () => ({ getAuth: () => harness.auth, onAuth: () => () => {}, loadGoogle: harness.loadGoogle, signIn: harness.signIn }));
vi.mock("../src/lib/google-button", () => ({ watchGoogleButton: harness.watchButton }));

let Login: typeof import("../src/components/Login").default;
let props: Parameters<typeof Login>[0];
let onGuest = vi.fn<() => void>();
let credential: (value: { credential: string }) => void;
const host = { replaceChildren: vi.fn() };
const stopButton = vi.fn();
interface ElementLike { type?: unknown; props?: Record<string, any> }
const flatten = (node: unknown): ElementLike[] => {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as ElementLike;
  return [element, ...flatten(element.props?.children)];
};
const text = (node: any): string => Array.isArray(node) ? node.map(text).join("") : node && typeof node === "object" ? text(node.props?.children) : node == null || typeof node === "boolean" ? "" : String(node);
const render = () => {
  harness.index = 0; const tree = Login(props);
  for (const node of flatten(tree)) if (node.props?.ref && node.props.className === "google-sign-in") node.props.ref.current = host;
  harness.pending.splice(0).forEach((run) => run()); return tree;
};
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
const unmount = () => { harness.effects.forEach((effect) => effect?.cleanup?.()); harness.effects = []; };

beforeEach(async () => {
  vi.resetModules(); vi.useFakeTimers();
  harness.values = []; harness.effects = []; harness.pending = []; harness.index = 0;
  harness.auth = { googleClientId: "test-client", signedIn: false, firstName: "Sam", revision: 0 };
  harness.loadGoogle.mockReset(); harness.signIn.mockReset(); harness.watchButton.mockReset(); stopButton.mockClear();
  vi.stubGlobal("window", Object.assign(new EventTarget(), { matchMedia: () => ({ matches: false }) }));
  vi.stubGlobal("document", Object.assign(new EventTarget(), { documentElement: { lang: "en", dir: "ltr" } }));
  harness.loadGoogle.mockResolvedValue({ initialize: (options: { callback: typeof credential }) => { credential = options.callback; } });
  harness.watchButton.mockImplementation((_host, _google, _theme, _language, ready) => { ready(); return stopButton; });
  const { DEFAULT_PREFS } = await import("../src/lib/prefs");
  const { setUILanguage } = await import("../src/lib/i18n"); setUILanguage("en");
  Login = (await import("../src/components/Login")).default;
  onGuest = vi.fn<() => void>(); props = { active: true, onGuest, prefs: { ...DEFAULT_PREFS, uiLanguage: "en" }, setPrefs: vi.fn() };
});
afterEach(() => { unmount(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it("keeps guest access during script load and exposes a calm error when loading rejects", async () => {
  harness.loadGoogle.mockRejectedValue(new Error("blocked script"));
  const initial = render();
  expect(flatten(initial).find((el) => text(el.props?.children) === "Continue as guest")?.props?.disabled).toBeUndefined();
  await flush(); const failed = render();
  expect(text(failed)).toContain("Google sign-in could not load. You can continue as a guest.");
  expect(flatten(failed).some((el) => el.props?.className === "google-skeleton")).toBe(false);
  expect(onGuest).not.toHaveBeenCalled();
});
it("times out a stalled script, and cleans late-load work after leaving login", async () => {
  let resolve!: (value: unknown) => void;
  harness.loadGoogle.mockReturnValue(new Promise((done) => { resolve = done; }));
  render(); vi.advanceTimersByTime(10000);
  expect(text(render())).toContain("Google sign-in could not load.");
  props = { ...props, active: false }; render();
  resolve({ initialize: vi.fn() }); await flush();
  expect(harness.watchButton).not.toHaveBeenCalled();
});
it("replaces the button watcher on language/theme changes and disconnects it on exit", async () => {
  render(); await flush(); render();
  expect(harness.watchButton).toHaveBeenLastCalledWith(host, expect.anything(), "mono", "en", expect.any(Function), expect.any(Function));
  const { setUILanguage } = await import("../src/lib/i18n"); setUILanguage("ar");
  props = { ...props, prefs: { ...props.prefs!, theme: "paper", uiLanguage: "ar" } }; render(); await flush();
  expect(stopButton).toHaveBeenCalledOnce();
  expect(harness.watchButton).toHaveBeenLastCalledWith(host, expect.anything(), "paper", "ar", expect.any(Function), expect.any(Function));
  unmount(); expect(stopButton).toHaveBeenCalledTimes(2);
});
it("deduplicates credentials, confirms access briefly, then continues", async () => {
  let resolve!: () => void;
  harness.signIn.mockReturnValue(new Promise<void>((done) => { resolve = done; }));
  render(); await flush(); credential({ credential: "fake-token" }); credential({ credential: "duplicate" });
  expect(harness.signIn).toHaveBeenCalledOnce();
  harness.auth.signedIn = true; resolve(); await flush();
  expect(text(render())).toContain("ACCESS GRANTED"); expect(onGuest).not.toHaveBeenCalled();
  vi.advanceTimersByTime(259); expect(onGuest).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1); expect(onGuest).toHaveBeenCalledOnce();
});
it("continues instantly with reduced motion", async () => {
  props = { ...props, prefs: { ...props.prefs, reduced: "on" } as Prefs };
  harness.signIn.mockResolvedValue(undefined);
  render(); await flush(); credential({ credential: "fake-token" }); await flush();
  expect(onGuest).toHaveBeenCalledOnce();
});
it("does not navigate when an old request completes after leaving and reopening login", async () => {
  let resolve!: () => void;
  harness.signIn.mockReturnValue(new Promise<void>((done) => { resolve = done; }));
  render(); await flush(); credential({ credential: "fake-token" });
  props = { ...props, active: false }; render(); props = { ...props, active: true }; render();
  resolve(); await flush(); vi.advanceTimersByTime(1000);
  expect(onGuest).not.toHaveBeenCalled();
});
