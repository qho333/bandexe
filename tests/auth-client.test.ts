import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type * as Auth from "../src/lib/auth";
import type { HistoryEntry } from "../src/lib/history";

let auth: typeof Auth;
let values: Map<string, string>;
const config = { googleClientId: "test-client" };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const entry = (id = "check-001"): HistoryEntry => ({ id, date: "2026-10-25T12:34:56Z", task: "t2", overall: 6.5,
  bands: { tr: 6, cc: 6.5, lr: 7, gra: 6 }, words: 270, markingVersion: "v1", range: { lo: 6, hi: 7 },
  priorities: ['Verb tense: replace "PRIVATE ESSAY EXCERPT" with a past tense.'] });
beforeEach(async () => {
  vi.resetModules();
  values = new Map();
  vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
  vi.stubGlobal("window", { matchMedia: () => ({ matches: false }), google: { accounts: { id: { disableAutoSelect: vi.fn() } } } });
  auth = await import("../src/lib/auth");
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
async function login() {
  vi.stubGlobal("fetch", vi.fn(async (path) => response(String(path).endsWith("google") ? { signedIn: true, firstName: "Sam" }
    : { signedIn: true, limit: 15, remainingToday: 12 })));
  await auth.signIn("test-credential");
}

describe("account client", () => {
  it("adds CSRF protection and cookies to account and cloud mutations", async () => {
    const fetchFn = vi.fn(async () => response({ ok: true })); vi.stubGlobal("fetch", fetchFn);
    await auth.accountRequest("/api/history", "POST", { id: "summary" });
    await auth.accountRequest("/api/account", "DELETE");
    const { cloudRequest } = await import("../src/lib/cloud-request");
    await cloudRequest("/api/mark", { method: "POST", body: "{}" });
    for (const [, init] of fetchFn.mock.calls as unknown as [string, RequestInit][]) {
      expect(init.credentials).toBe("same-origin");
      expect(new Headers(init.headers).get("X-Requested-With")).toBe("bandexe");
    }
  });
  it("leaves Coming soon and guest mode available when the flag is off", async () => {
    const fetchFn = vi.fn(async () => response({ googleClientId: null })); vi.stubGlobal("fetch", fetchFn);
    await auth.loadAuth();
    expect(auth.getAuth()).toMatchObject({ signedIn: false, googleClientId: null });
    const { createElement } = await import("react"), { renderToStaticMarkup } = await import("react-dom/server");
    const Login = (await import("../src/components/Login")).default;
    const html = renderToStaticMarkup(createElement(Login, { active: true, onGuest: () => {} }));
    expect(html).toContain("Coming soon"); expect(html).toContain("Continue as guest");
    expect(html).not.toContain("google-sign-in"); expect(fetchFn).toHaveBeenCalledOnce();
  });
  it("loads config once, greets from localStorage and shows the account allowance", async () => {
    values.set("bandexe-first-name", "Sam");
    const fetchFn = vi.fn(async (path) => response(String(path).endsWith("config") ? config : { signedIn: true, limit: 15, remainingToday: 13 }));
    vi.stubGlobal("fetch", fetchFn);
    await Promise.all([auth.loadAuth(), auth.loadAuth()]);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(auth.getAuth()).toMatchObject({ googleClientId: "test-client", signedIn: true, firstName: "Sam" });
    const { getAllowance } = await import("../src/lib/allowance");
    expect(getAllowance()).toEqual({ remaining: 13, limit: 15 });
    const { createElement } = await import("react"), { renderToStaticMarkup } = await import("react-dom/server");
    const Header = (await import("../src/components/Header")).default;
    const { DEFAULT_PREFS } = await import("../src/lib/prefs");
    expect(renderToStaticMarkup(createElement(Header, { current: "write", prefs: DEFAULT_PREFS, setPrefs: () => {}, onReplayBoot: () => {} }))).toContain("Hi, Sam");
  });
  it("keeps the name only locally, and sign-out clears it plus local results (shared computers)", async () => {
    await login();
    expect(values.get("bandexe-first-name")).toBe("Sam");
    expect(auth.getAuth()).toMatchObject({ signedIn: true, firstName: "Sam" });
    values.set("bandexe-history-v1", JSON.stringify([entry()]));
    const fetchFn = vi.fn(async () => response({ signedIn: false })); vi.stubGlobal("fetch", fetchFn);
    await auth.leaveAccount();
    expect(fetchFn).toHaveBeenCalledWith("/api/auth/logout", expect.objectContaining({ method: "POST" }));
    expect(values.has("bandexe-first-name")).toBe(false);
    expect(values.has("bandexe-history-v1")).toBe(false);
    expect(auth.getAuth().signedIn).toBe(false);
    const { getAllowance } = await import("../src/lib/allowance");
    expect(getAllowance().limit).toBe(10);
  });
  it("keeps the 15-check limit in an exhausted account's error and status", async () => {
    await login();
    const { markEssay } = await import("../src/lib/api");
    const { getAllowance } = await import("../src/lib/allowance");
    vi.stubGlobal("fetch", vi.fn(async () => response({ error: "daily_limit", remainingToday: 0 }, 429)));
    await expect(markEssay({ task: "t2", question: "Discuss learning.", essay: "People learn through practice. ".repeat(20) }, null)).rejects.toThrow("Your 15 free checks");
    expect(getAllowance()).toEqual({ remaining: 0, limit: 15 });
  });
  it("deletes only after the account action, and keeps signed-in state on failure", async () => {
    await login();
    vi.stubGlobal("fetch", vi.fn(async () => response({}, 503)));
    await expect(auth.leaveAccount(true)).rejects.toThrow("could not be deleted");
    expect(auth.getAuth().signedIn).toBe(true);
    const fetchFn = vi.fn(async () => response({ signedIn: false })); vi.stubGlobal("fetch", fetchFn);
    await auth.leaveAccount(true);
    expect(fetchFn).toHaveBeenCalledWith("/api/account", expect.objectContaining({ method: "DELETE" }));
    expect(auth.getAuth().signedIn).toBe(false);
  });
  it("loads the Google script once asynchronously and uses the official button", async () => {
    vi.stubGlobal("window", {});
    const scripts: any[] = [];
    vi.stubGlobal("document", { createElement: () => ({}), head: { appendChild: (tag: unknown) => scripts.push(tag) } });
    const a = auth.loadGoogle(), b = auth.loadGoogle();
    expect(a).toBe(b); expect(scripts).toHaveLength(1);
    expect(scripts[0]).toMatchObject({ src: "https://accounts.google.com/gsi/client", async: true });
    const id = { initialize: vi.fn(), renderButton: vi.fn(), disableAutoSelect: vi.fn() };
    window.google = { accounts: { id } };
    scripts[0].onload(); expect(await a).toBe(id);
  });
});

describe("summary sync", () => {
  it("sends only fixed practice labels, scores and IDs, never quoted writing or other result fields", async () => {
    await login();
    const { historySummary, syncHistory } = await import("../src/lib/account-history");
    const result = historySummary(entry());
    expect(result).toEqual({ id: "check-001", day: "2026-10-25", task: "t2", overall: 6.5,
      bands: entry().bands, priorities: ["Practise verb tense"] });
    const fetchFn = vi.fn(async () => response({ ok: true })); vi.stubGlobal("fetch", fetchFn);
    await syncHistory(entry(), auth.getAuth().revision);
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(String((fetchFn.mock.calls as unknown as [string, RequestInit][])[0][1].body)).not.toMatch(/PRIVATE|words|range|markingVersion|essay|question/);
  });
  it("ignores sync failures and never sends guest or stale account results", async () => {
    const { syncHistory } = await import("../src/lib/account-history");
    const fetchFn = vi.fn(async () => { throw new Error("offline"); }); vi.stubGlobal("fetch", fetchFn);
    await syncHistory(entry(), auth.getAuth().revision); expect(fetchFn).not.toHaveBeenCalled();
    await login(); const revision = auth.getAuth().revision;
    vi.stubGlobal("fetch", fetchFn);
    await expect(syncHistory(entry(), revision)).resolves.toBeUndefined();
    expect(fetchFn).toHaveBeenCalledOnce();
    fetchFn.mockClear();
    await syncHistory(entry(), revision - 1); expect(fetchFn).not.toHaveBeenCalled();
  });
  it("merges remote history by ID, preserves richer local summaries and never persists remote history locally", async () => {
    const { fetchHistory, mergeHistory, historySummary } = await import("../src/lib/account-history");
    const local = entry(), other = entry("check-002");
    vi.stubGlobal("fetch", vi.fn(async () => response({ history: [historySummary(local), historySummary(other), { essay: "bad" }] })));
    const remote = await fetchHistory();
    expect(remote).toHaveLength(2);
    const merged = mergeHistory([local], remote);
    expect(merged).toHaveLength(2); expect(merged.find((h) => h.id === local.id)).toEqual(local);
    expect(values.has("bandexe-history-v1")).toBe(false);
  });
});
