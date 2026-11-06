import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const memory = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: (k) => data.delete(k) };
};
const health = (allowed = true) => async () => new Response(JSON.stringify({ ok: true, fixture: false, gemini: { allowed, ...(!allowed ? { reason: "region" } : {}) } }));
const render = (component, props = {}) => renderToStaticMarkup(createElement(component, props));
let access, controls, gate, settings, clients;
beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal("localStorage", memory());
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected network request"); }));
  access = await import("../src/lib/gemini");
  controls = await import("../src/components/Checker");
  gate = await import("../src/components/GeminiGate");
  settings = await import("../src/lib/checker");
  clients = await import("../src/lib/api");
});
afterEach(() => vi.unstubAllGlobals());

describe("Gemini browser gate", () => {
  it("keeps Free checker available and fails the Gemini gate closed on health errors", async () => {
    let html = render(controls.CheckerPicker);
    expect(html).toContain("Free checker"); expect(html).toContain('value="own"'); expect(html).not.toContain('value="site"');
    await access.geminiAccess.load(async () => { throw new Error("offline"); });
    html = render(controls.CheckerPicker);
    expect(html).toContain('value="own"'); expect(html).toContain("Free checker");
    await expect(access.geminiAccess.require()).rejects.toMatchObject({ code: "unavailable" });
  });
  it("blocks ineligible Gemini setup and Coach/Ideas while keeping Synonyms and grammar", async () => {
    await access.geminiAccess.load(health(false));
    access.geminiAccess.confirmAge(); settings.setChecker({ mode: "own", key: "test-key" });
    const html = render(controls.CheckerPicker);
    expect(html).toContain('value="own"'); expect(html).not.toContain('value="site"'); expect(render(controls.CheckerSetup)).toContain("available in your region");
    expect(render(controls.CheckerSetup)).not.toContain('type="password"');
    const { default: Mascots } = await import("../src/components/Mascots");
    const { DEFAULT_PREFS } = await import("../src/lib/prefs");
    const helpers = render(Mascots, { prefs: { ...DEFAULT_PREFS, reduced: "on" }, task: "t2", history: [], question: "", essay: "", setEssay: () => {} });
    expect(helpers).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Coach:/);
    expect(helpers).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Ideas:/);
    const synonymButton = helpers.match(/<button[^>]*aria-label="Synonyms:[^>]*>/)?.[0];
    expect(synonymButton).toBeTruthy(); expect(synonymButton).not.toContain("disabled");
    expect(helpers).toContain("Coach and Ideas:"); expect(helpers).toContain("available in your region");
    const { default: GrammarCheck } = await import("../src/components/GrammarCheck");
    expect(render(GrammarCheck, { text: "An essay.", setText: () => {}, running: false, locked: false, editor: { current: null } })).toContain("Check spelling");
  });
  it("shows the age card on the own-key mode, confirms, and persists across a new page", async () => {
    await access.geminiAccess.load(health());
    for (const mode of ["own"]) {
      settings.setChecker({ mode, key: "" });
      const html = render(controls.CheckerSetup);
      expect(html).toContain("Gemini age confirmation"); expect(html).toContain("18 or over"); expect(html).toContain("Use Free checker"); expect(html).not.toContain('type="password"');
    }
    await expect(access.geminiAccess.require()).rejects.toMatchObject({ code: "age" });
    const card = gate.AgeConfirmation({ onConfirm: access.geminiAccess.confirmAge, onDevice: () => settings.setChecker({ mode: "free" }) });
    card.props.children[1].props.onClick();
    expect(localStorage.getItem("bandexe-age-confirmed")).toBe("1");
    expect(render(controls.CheckerSetup)).toContain('type="password"');
    expect(render(controls.CheckerSetup)).not.toContain("Gemini age confirmation");
    const nextPage = access.createGeminiAccess(() => localStorage);
    await nextPage.load(health()); await expect(nextPage.require()).resolves.toBeUndefined();
    expect(nextPage.getSnapshot().confirmed).toBe(true);
  });
  it("Use Free checker cancels the Gemini choice without storing a confirmation", async () => {
    await access.geminiAccess.load(health()); settings.setChecker({ mode: "site" });
    const onDevice = vi.fn(() => settings.setChecker({ mode: "free" }));
    const card = gate.AgeConfirmation({ onConfirm: access.geminiAccess.confirmAge, onDevice });
    card.props.children[2].props.onClick();
    expect(onDevice).toHaveBeenCalledOnce(); expect(settings.getChecker().mode).toBe("free");
    expect(localStorage.getItem("bandexe-age-confirmed")).toBeNull(); expect(fetch).not.toHaveBeenCalled();
  });
  it("confirms for this page when storage is unavailable or throws", async () => {
    for (const store of [null, { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } }]) {
      const a = access.createGeminiAccess(() => store);
      await a.load(health()); await expect(a.require()).rejects.toMatchObject({ code: "age" });
      a.confirmAge(); await expect(a.require()).resolves.toBeUndefined();
    }
  });
  it.each(["age", "region"])("refuses own-key checking and both helper routes for %s, without a fallback or Google call", async (reason) => {
    await access.geminiAccess.load(health(reason !== "region"));
    if (reason === "region") access.geminiAccess.confirmAge();
    const tiers = { getGeneration: () => 0, engine: () => null, readyEngine: vi.fn(), releaseAll: vi.fn() };
    settings.setChecker({ mode: "own", key: "own-test-key" });
    await expect(clients.markEssay({ task: "t2", question: "A task question", essay: "An essay. ".repeat(50) }, null, tiers)).rejects.toMatchObject({ code: reason });
    const { askHelper } = await import("../src/lib/helper");
    for (const mode of ["own"]) {
      settings.setChecker({ mode });
      for (const role of ["coach", "ideas"]) await expect(askHelper({ role, message: "Help me plan." })).rejects.toMatchObject({ code: reason });
    }
    expect(fetch).not.toHaveBeenCalled(); expect(tiers.readyEngine).not.toHaveBeenCalled();
  });
  it("retired site choice uses free endpoints without Gemini headers", async () => {
    await access.geminiAccess.load(health()); access.geminiAccess.confirmAge(); settings.setChecker({ mode: "site", key: "" });
    const network = vi.fn(async () => new Response(JSON.stringify({ reply: "A hint.", task: "t2" })));
    vi.stubGlobal("fetch", network);
    await clients.markEssay({ task: "t2", question: "A task question", essay: "An essay. ".repeat(50) }, null);
    const { askHelper } = await import("../src/lib/helper"); await askHelper({ role: "ideas", message: "Help me plan." });
    expect(network.mock.calls.map(([url]) => url)).toEqual(["/api/mark", "/api/helper"]);
    for (const [, init] of network.mock.calls) { expect(init.headers["X-Age-Confirmed"]).toBeUndefined(); expect(init.headers["X-Provider"]).toBeUndefined(); }
  });
  it("deduplicates health calls and accepts the unchanged local and fixture health payloads", async () => {
    vi.stubGlobal("location", { hostname: "localhost" });
    const network = vi.fn(async () => new Response(JSON.stringify({ ok: true, fixture: true })));
    const a = access.createGeminiAccess(() => null);
    await Promise.all([a.load(network), a.load(network)]);
    expect(network).toHaveBeenCalledOnce(); expect(a.getSnapshot()).toMatchObject({ allowed: true, fixture: true });
  });
  it("refuses a health payload without eligibility outside local dev", async () => {
    vi.stubGlobal("location", { hostname: "bandexe.pages.dev" });
    await access.geminiAccess.load(async () => new Response(JSON.stringify({ ok: true })));
    expect(access.geminiAccess.getSnapshot()).toMatchObject({ allowed: false, reason: "unavailable" });
  });
});
