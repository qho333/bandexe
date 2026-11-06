import { geminiAccess } from "../src/lib/gemini";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { markEssay } from "../src/lib/api";
import { askHelper } from "../src/lib/helper";
import { getChecker, setChecker } from "../src/lib/checker";
import { toEntry, addEntry, loadHistory } from "../src/lib/history";
import { geminiRequest, testKey } from "../shared/gemini.js";
import { MODEL } from "../shared/mark.js";
import { buildSystem } from "../shared/prompt.js";

const key = "student-test-key";
const draft = { task: "t2", question: "Discuss working from home.", essay: "Working from home has became normal. " + "More people can work from home today. ".repeat(8) };
const raw = JSON.parse(readFileSync(new URL("../server/fixtures/sample-report.fixture.json", import.meta.url), "utf8"));
const reply = (value) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: typeof value === "string" ? value : JSON.stringify(value) }] } }] }));
const store = () => {
  const values = new Map();
  return { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: (k) => values.delete(k) };
};
beforeEach(async () => {
  await geminiAccess.load(async () => new Response(JSON.stringify({ ok: true, gemini: { allowed: true } })));
  geminiAccess.confirmAge();
});
beforeEach(() => vi.stubGlobal("localStorage", store()));
afterEach(() => { setChecker({ mode: "site", key: "" }); vi.unstubAllGlobals(); });

describe("own-key requests", () => {
  it("builds credentials only in a header on the fixed Google origin", () => {
    const req = geminiRequest(MODEL, key, { contents: [] });
    expect(new URL(req.url).origin).toBe("https://generativelanguage.googleapis.com");
    expect(req.url).not.toContain(key);
    expect(new URL(req.url).search).toBe("");
    expect(req.init.headers["x-goog-api-key"]).toBe(key);
    expect(req.init.body).not.toContain(key);
  });
  it("marks directly with the same model, prompt and reviewer, then saves provenance", async () => {
    setChecker({ mode: "own", key });
    const network = vi.fn(async () => reply(raw)); vi.stubGlobal("fetch", network);
    const result = await markEssay(draft, null);
    const [url, init] = network.mock.calls[0];
    expect(url).toContain(`/models/${MODEL}:generateContent`);
    expect(url).not.toContain(key);
    expect(init.headers["x-goog-api-key"]).toBe(key);
    const body = JSON.parse(init.body);
    expect(body.systemInstruction.parts[0].text).toBe(buildSystem(draft));
    expect(init.body).not.toContain(key);
    expect(result.checker).toBe("own");
    expect(result.report.grammar.every((fix) => draft.essay.includes(fix.original))).toBe(true);
    const saved = store(); addEntry(toEntry(result), saved);
    expect(loadHistory(saved)[0].checker).toBe("own");
    expect(JSON.stringify(loadHistory(saved))).not.toContain(key);
    expect(network.mock.calls.every(([u]) => u.startsWith("https://generativelanguage.googleapis.com/"))).toBe(true);
  });
  it("uses the shared repair retry and withholds invalid bands", async () => {
    setChecker({ mode: "own", key });
    const bad = { ...raw, criteria: { ...raw.criteria, tr: { band: 6.5 } } };
    const network = vi.fn(async () => reply(bad)); vi.stubGlobal("fetch", network);
    const result = await markEssay(draft, null);
    expect(network).toHaveBeenCalledTimes(2);
    expect(result.report.criteria.tr.band).toBeNull();
    expect(result.overall).toBeNull();
    expect(JSON.parse(network.mock.calls[1][1].body).contents.at(-1).parts[0].text).toContain("missing or invalid criterion bands");
  });
  it("never falls back to the site if a key is missing or Google rejects it", async () => {
    setChecker({ mode: "own", key: "" });
    const network = vi.fn(async () => new Response("{}", { status: 429 })); vi.stubGlobal("fetch", network);
    await expect(markEssay(draft, null)).rejects.toMatchObject({ code: "missing_key" });
    expect(network).not.toHaveBeenCalled();
    setChecker({ key });
    await expect(markEssay(draft, null)).rejects.toMatchObject({ code: "quota" });
    expect(network.mock.calls.every(([u]) => !u.startsWith("/api"))).toBe(true);
  });
  it("routes both helpers directly when own-key mode is selected", async () => {
    setChecker({ mode: "own", key });
    const network = vi.fn(async () => reply("A short hint.")); vi.stubGlobal("fetch", network);
    for (const role of ["ideas", "coach"]) expect(await askHelper({ role, message: "Help me plan." })).toBe("A short hint.");
    for (const [url, init] of network.mock.calls) {
      expect(url).toContain("/models/gemini-3.1-flash-lite:generateContent");
      expect(url).not.toContain(key); expect(init.headers["x-goog-api-key"]).toBe(key);
      expect(init.body).not.toContain(key);
    }
  });
  it("keeps site marking credentials out of /api even when a student key is saved", async () => {
    setChecker({ mode: "site", key });
    const network = vi.fn(async () => new Response(JSON.stringify({ error: "limit", message: "Daily free limit reached on this server, try later." }), { status: 429 }));
    vi.stubGlobal("fetch", network);
    await expect(markEssay(draft, null)).rejects.toMatchObject({ code: "limit" });
    expect(network.mock.calls[0][0]).toBe("/api/mark");
    expect(JSON.stringify(network.mock.calls)).not.toContain(key);
  });
  it("tests a key with exactly one cheap request and displays a redacted Google error", async () => {
    const network = vi.fn(async () => reply("OK"));
    expect(await testKey(key, network)).toMatch(/^OK/);
    expect(network).toHaveBeenCalledTimes(1);
    expect(network.mock.calls[0][0]).toContain("gemini-3.1-flash-lite");
    expect(network.mock.calls[0][0]).not.toContain(key);
    expect(network.mock.calls[0][1].headers["x-goog-api-key"]).toBe(key);
    const fail = async () => new Response(JSON.stringify({ error: { message: `Invalid API key: ${key}` } }), { status: 400 });
    await expect(testKey(key, fail)).rejects.toThrow("Invalid API key: [key removed]");
  });
  it("normalizes obsolete device choices to Free checker, keeping keys out of the request", async () => {
    setChecker({ mode: "device", key });
    const network = vi.fn(async () => new Response(JSON.stringify({ task: "t2" }))); vi.stubGlobal("fetch", network);
    expect((await markEssay(draft, null)).checker).toBe("free"); expect(getChecker().mode).toBe("free");
    expect(network.mock.calls[0][0]).toBe("/api/mark"); expect(JSON.stringify(network.mock.calls)).not.toContain(key);
  });
});
