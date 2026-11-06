import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { CheckerPicker, CheckerSetup } from "../src/components/Checker";
import Results from "../src/components/Results";
import { DEFAULT_PREFS } from "../src/lib/prefs";
import { setChecker } from "../src/lib/checker";
import { geminiAccess } from "../src/lib/gemini";
import { POOL_EMPTY_MESSAGE } from "../src/lib/api";
const render = (component, props = {}) => renderToStaticMarkup(createElement(component, props));
beforeEach(async () => {
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
  await geminiAccess.load(async () => new Response(JSON.stringify({ ok: true, gemini: { allowed: true } }))); geminiAccess.confirmAge();
});
afterEach(() => { setChecker({ mode: "free", key: "" }); vi.unstubAllGlobals(); });
describe("checker controls", () => {
  it("offers only Free checker and a disclosed own key", () => {
    setChecker({ mode: "free", key: "" }); const picker = render(CheckerPicker);
    expect(picker).toMatch(/<input[^>]*checked=""[^>]*value="free"/); expect(picker).toContain('<summary>More options</summary>');
    expect(picker).toContain("Your own Gemini key (18+)"); expect(picker).not.toContain('<details class="checker-more" open');
    expect(picker).not.toMatch(/download|unlimited|value="device"|value="site"/i);
  });
  it("keeps radio groups independent when the menu and workspace pickers coexist", () => {
    const html = renderToStaticMarkup(createElement("div", null, createElement(CheckerPicker), createElement(CheckerPicker)));
    const names = [...html.matchAll(/name="([^"]+)"/g)].map((match) => match[1]);
    expect(names).toHaveLength(4); expect(names[0]).toBe(names[1]); expect(names[2]).toBe(names[3]); expect(names[0]).not.toBe(names[2]);
  });
  it("preserves private key controls and clear storage warnings", () => {
    setChecker({ mode: "own", key: "" }); const setup = render(CheckerSetup);
    expect(setup).toContain('type="password"'); expect(setup).toContain('autoComplete="off"'); expect(setup).toContain('spellCheck="false"');
    for (const text of ["Save", "Remove", "Test key", "Anyone using this browser profile", "Use only the free allowance", "shared computers", "https://aistudio.google.com/apikey"]) expect(setup).toContain(text);
  });
  it.each(["pool_empty", "daily_limit"])("renders the %s result without setup offers", (errorCode) => {
    const html = render(Results, { active: true, prefs: { ...DEFAULT_PREFS, reduced: "on" }, setPrefs: () => {}, onReplayBoot: () => {}, essay: "A short draft.", setEssay: () => {}, onRetry: () => {}, onWrite: () => {},
      job: { id: 1, status: "error", checker: "free", errorCode, error: POOL_EMPTY_MESSAGE, essay: "A short draft.", minutes: null } });
    expect(html).toContain(POOL_EMPTY_MESSAGE.replaceAll("'", "&#x27;"));
    expect(html).not.toMatch(/download|unlimited|Check on this device|Use my own free key/i); expect(html).toContain("Back to the editor");
  });
});
