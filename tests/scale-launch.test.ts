import { afterEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error Node built-in, used only by tests; no added packages.
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import raw from "../server/fixtures/sample-report.fixture.json?raw";
import { markFree, modelAnswerFree, FREE_CONFIG, CHART_NOTE, CHART_PROMPT } from "../shared/free.js";
import { reportSchema, reportFormat } from "../shared/report-schema.js";
import { OPEN_CALIBRATIONS, bandRange } from "../shared/score.js";
import { validateMarkRequest } from "../shared/index.js";
import { freeCacheKey } from "../shared/free-cache";
import { dailyAllowance, count, publicStats, pruneAllowances, utcDay } from "../shared/storage.js";
import { fakeD1 } from "./fake-d1";
import { onRequest } from "../functions/api/[[path]]";
import { recordVisit, formatCount, sparkline, loadStats, VISIT_KEY } from "../src/lib/stats";
import { screenFromHash } from "../src/lib/routes";
import { evaluationReason } from "../src/lib/evaluation";
import { setChecker } from "../src/lib/checker";
import { DEFAULT_PREFS } from "../src/lib/prefs";
import Write from "../src/components/Write";
import PublicPage from "../src/components/PublicPage";
import { exportReport } from "../src/lib/report-export";
import { Report } from "../src/components/Results";

const essay = "Working from home has became normal. " + "More people can work from home today. ".repeat(8);
const input = { task: "t2", question: "Describe the chart and comparisons.", essay, words: 63, image: null };
const chart = { ...input, task: "ac1", image: { data: "Y2hhcnQ=", mime: "image/png" } };
const description = "Sales (thousands), 2020 to 2025: A rises from 10 to 20, B falls from 30 to 15.";
const completion = (text = raw) => new Response(JSON.stringify({ choices: [{ message: { content: text } }] }));
const request = (path: string, method = "POST", body: unknown = input) => new Request(`https://bandexe.pages.dev/api/${path}`, {
  method, headers: { "Content-Type": "application/json", "X-Requested-With": "bandexe", "CF-Connecting-IP": "192.0.2.101", Cookie: "private-cookie=secret", "User-Agent": "private-agent" },
  ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
});
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8") as string;
const display = { prefs: { ...DEFAULT_PREFS, reduced: "on" as const }, setPrefs: vi.fn(), onReplayBoot: vi.fn() };
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("open pool contracts", () => {
  it("honours Groq → CF → Router → Mistral and skips missing bindings within the shared call budget", async () => {
    const seen: string[] = [];
    const fetchFn = vi.fn<typeof fetch>(async (url) => { seen.push(String(url)); return new Response("{}", { status: 401 }); });
    const run = vi.fn(async () => { seen.push("cf"); return { response: raw }; });
    const env = { GROQ_API_KEY: "g", AI: { run }, OPENROUTER_API_KEY: "r", MISTRAL_API_KEY: "m" };
    const workers = await markFree(input, env, { fetchFn });
    expect(workers.provider).toBe("cf"); expect(workers.calls).toBeLessThanOrEqual(FREE_CONFIG.maxCalls);
    expect(seen).toEqual(["https://api.groq.com/openai/v1/chat/completions", "cf"]);
    seen.length = 0;
    const mistral = await markFree(input, { ...env, AI: undefined }, { fetchFn: async (url) => {
      seen.push(String(url)); return String(url).includes("mistral") ? completion() : new Response("{}", { status: 401 });
    } });
    expect(mistral.provider).toBe("mistral"); expect(mistral.calls).toBeLessThanOrEqual(FREE_CONFIG.maxCalls);
    expect(seen).toEqual(["https://api.groq.com/openai/v1/chat/completions", "https://openrouter.ai/api/v1/chat/completions", "https://api.mistral.ai/v1/chat/completions"]);
  });
  it.each(["groq", "cf", "router", "mistral"])("sends the shared compact/full schema through %s in its supported envelope", async (provider) => {
    for (const full of [false, true]) {
      const fetchFn = vi.fn<typeof fetch>(async () => completion());
      const run = vi.fn(async (_model: string, _input: unknown) => ({ response: JSON.parse(raw) }));
      const env = { groq: { GROQ_API_KEY: "g" }, cf: { AI: { run } }, router: { OPENROUTER_API_KEY: "r" }, mistral: { MISTRAL_API_KEY: "m" } }[provider]!;
      // Fake timers cover legacy Mistral's pacing without a live wait.
      vi.useFakeTimers(); vi.setTimerTickMode("nextTimerAsync");
      await markFree({ ...input, reportMode: full ? "full" : "compact" }, env, { fetchFn, ...(provider === "groq" ? { model: FREE_CONFIG.groqModels[0] } : {}) });
      const body = provider === "cf" ? run.mock.calls[0][1] as any : JSON.parse(String(fetchFn.mock.calls[0][1]?.body));
      // OpenRouter's current free models (gemma/nemotron) get plain JSON mode; review checks the shape afterwards.
      if (provider === "router") { expect(body.response_format).toEqual({ type: "json_object" }); expect(body.provider).toEqual({ require_parameters: true }); continue; }
      expect(body.response_format.type).toBe("json_schema");
      const schema = provider === "cf" ? body.response_format.json_schema : body.response_format.json_schema.schema;
      expect(schema).toEqual(reportSchema(full));
      expect(schema.properties.criteria.properties.tr.properties.subskills !== undefined).toBe(full);
      if (provider === "router") expect(body.provider).toEqual({ require_parameters: true });
    }
  });
  it("keeps strict objects fully required and falls back to JSON object mode for other models", () => {
    const visit = (schema: any) => {
      if (schema.type === "object") {
        expect(schema.required).toEqual(Object.keys(schema.properties)); expect(schema.additionalProperties).toBe(false);
        Object.values(schema.properties).forEach(visit);
      }
      if (schema.items) visit(schema.items);
    };
    visit(reportSchema(true)); visit(reportSchema(false));
    expect(reportFormat("groq", "other-open-model")).toEqual({ type: "json_object" });
    expect(reportFormat("router", FREE_CONFIG.routerModels[1])).toEqual({ type: "json_object" });
    expect(reportFormat("router", "openai/gpt-oss-120b:free").type).toBe("json_schema"); // strict schema if gpt-oss returns to the free list
  });
  it("repairs unreadable JSON once on the next model and labels that model", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValueOnce(completion("{bad")).mockResolvedValueOnce(completion());
    const key = `groq/${FREE_CONFIG.groqEssayModels[1]}`, saved = OPEN_CALIBRATIONS[key];
    delete OPEN_CALIBRATIONS[key];
    try {
      const result = await markFree(input, { GROQ_API_KEY: "g" }, { fetchFn });
      expect(result.calls).toBe(2); expect(result.model).toBe(FREE_CONFIG.groqEssayModels[1]);
      expect(result.label).toBe("AI practice estimate (open model, uncalibrated)");
      expect(result.range).toEqual(bandRange(result.overall, false));
      expect(fetchFn.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).model)).toEqual(FREE_CONFIG.groqEssayModels.slice(0, 2));
    } finally { if (saved) OPEN_CALIBRATIONS[key] = saved; }
  });
  it("never fabricates a report after two unreadable answers", async () => {
    const run = vi.fn(async () => ({ response: "broken" }));
    await expect(markFree(input, { AI: { run } })).rejects.toMatchObject({ code: "unreadable" });
    expect(run).toHaveBeenCalledTimes(2);
  });
});

describe("Academic Task 1 reference", () => {
  it("reads the image once with Workers vision, then marks with Groq using text only", async () => {
    const run = vi.fn(async () => ({ response: description })), fetchFn = vi.fn<typeof fetch>(async () => completion());
    const result = await markFree(chart, { AI: { run }, GROQ_API_KEY: "g" }, { fetchFn });
    expect(run).toHaveBeenCalledExactlyOnceWith(FREE_CONFIG.visionModel, expect.objectContaining({ prompt: CHART_PROMPT, image: "data:image/png;base64,Y2hhcnQ=" }));
    const body = JSON.parse(String(fetchFn.mock.calls[0][1]?.body));
    expect(body.messages[1].content).toContain(description); expect(typeof body.messages[1].content).toBe("string");
    expect(JSON.stringify(body)).not.toContain("Y2hhcnQ="); expect(body.messages[0].content).toContain("chart reference supplied");
    expect(result).toMatchObject({ chartNotice: CHART_NOTE, chartDescription: description, calls: 2 });
    const html = renderToStaticMarkup(createElement(Report, { ...display, active: true, job: { id: 1, status: "done", essay, minutes: null }, result, essay, setEssay: vi.fn(), onWrite: vi.fn(), onRetry: vi.fn() }));
    expect(html).toContain(CHART_NOTE); expect(html).toContain(description);
    const exported = exportReport({ result, essay, date: "2026-10-30", states: {} }, "txt");
    expect(exported).toContain(CHART_NOTE); expect(exported).toContain(description);
  });
  it("uses Groq vision without an AI binding and respects the same budget", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValueOnce(completion(description)).mockResolvedValueOnce(completion());
    const result = await markFree(chart, { GROQ_API_KEY: "g" }, { fetchFn });
    const bodies = fetchFn.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
    expect(bodies[0].model).toBe(FREE_CONFIG.groqVisionModel);
    expect(bodies[0].messages[0].content[1].image_url.url).toBe("data:image/png;base64,Y2hhcnQ=");
    expect(result.calls).toBe(2); expect(bodies[1].messages[1].content).toContain(description);
  });
  it("falls back from unavailable Workers vision to Groq and leaves one marking call", async () => {
    const run = vi.fn(async () => { throw new Error("busy"); });
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValueOnce(completion(description)).mockResolvedValueOnce(completion());
    expect((await markFree(chart, { AI: { run }, GROQ_API_KEY: "g" }, { fetchFn })).calls).toBe(3);
  });
  it("asks for a typed reference when vision fails, never gives the image to a text model", async () => {
    const run = vi.fn(async () => ({ response: "" })), fetchFn = vi.fn<typeof fetch>(async () => new Response("{}", { status: 429 }));
    await expect(markFree(chart, { AI: { run }, GROQ_API_KEY: "g" }, { fetchFn })).rejects.toMatchObject({ code: "chart_reference", message: expect.stringContaining("Type the chart") });
    expect(run).toHaveBeenCalledOnce(); expect(fetchFn).toHaveBeenCalledOnce();
  });
  it("bounds slow vision and preserves the marking budget", async () => {
    vi.useFakeTimers();
    const run = vi.fn(() => new Promise(() => {}));
    const pending = expect(markFree(chart, { AI: { run } })).rejects.toMatchObject({ code: "chart_reference" });
    await vi.advanceTimersByTimeAsync(FREE_CONFIG.callTimeoutMs); await pending;
    expect(run).toHaveBeenCalledOnce();
  });
  it("accepts and validates typed references through both the client and handler", async () => {
    const draft = { ...input, task: "ac1" as const, chartDescription: description };
    const v = validateMarkRequest(draft); expect(v.ok).toBe(true);
    expect(validateMarkRequest({ ...draft, chartDescription: "x".repeat(6001) }).ok).toBe(false);
    expect(validateMarkRequest({ ...draft, chartDescription: " " }).ok).toBe(false);
    expect(validateMarkRequest({ ...draft, chartImageBase64: "!bad", mime: "image/png" }).ok).toBe(false);
    setChecker({ mode: "free" }); expect(evaluationReason(draft, null)).toBe("");
    const run = vi.fn(async () => ({ response: raw }));
    const res = await onRequest({ request: request("mark", "POST", draft), env: { DB: fakeD1(), QUOTA_SALT: "fixture-salt", AI: { run } } });
    expect(res.status).toBe(200); expect(run).toHaveBeenCalledOnce();
    expect(JSON.stringify(run.mock.calls)).toContain(description);
    expect((await res.json()).chartNotice).toBeUndefined();
    const missing = await onRequest({ request: request("mark", "POST", { ...draft, chartDescription: "" }), env: { DB: fakeD1(), QUOTA_SALT: "fixture-salt", AI: { run } } });
    expect(missing.status).toBe(400); expect(run).toHaveBeenCalledOnce();
  });
  it("includes typed chart reference in cache identity and in study examples", async () => {
    const typed = { ...chart, image: null, chartDescription: description };
    expect(await freeCacheKey(typed)).not.toBe(await freeCacheKey({ ...typed, chartDescription: "different chart" }));
    const run = vi.fn(async () => ({ response: "Study example." }));
    await modelAnswerFree(typed, { AI: { run } });
    expect(JSON.stringify(run.mock.calls)).toContain(description);
  });
});

describe("D1 allowance and public aggregates", () => {
  it("atomically admits ten concurrent checks and forty helpers, with no KV writes", async () => {
    const db = fakeD1();
    const results = await Promise.all(Array.from({ length: 100 }, () => dailyAllowance(db, "mark:digest", "2026-10-30", 10, true)));
    expect(results.filter((r) => r?.admitted)).toHaveLength(10); expect(db.values.get("mark:digest|2026-10-30")).toBe(10);
    expect(await dailyAllowance(db, "mark:digest", "2026-10-30", 10)).toEqual({ used: 10, admitted: true });
    expect(await dailyAllowance(db, "mark:digest", "2026-10-31", 10, true)).toEqual({ used: 1, admitted: true });
    const helpers = await Promise.all(Array.from({ length: 50 }, () => dailyAllowance(db, "helper:digest", "2026-10-30", 40, true)));
    expect(helpers.filter((r) => r?.admitted)).toHaveLength(40);
  });
  it.each([undefined, { prepare() { throw new Error("private database failure"); } }])("refuses new marking for absent/broken D1 (%#)", async (db) => {
    const run = vi.fn(async () => ({ response: raw }));
    const res = await onRequest({ request: request("mark"), env: {  DB: db as any, QUOTA_SALT: "salt", AI: { run } } });
    expect(res.status).toBe(503); expect((await res.json()).error).toBe("allowance_unavailable"); expect(run).not.toHaveBeenCalled();
    expect(await publicStats(db as any)).toMatchObject({ available: false, visits: 0, essays: 0 });
    await expect(count(db as any, "visits")).resolves.toBeUndefined();
    await expect(pruneAllowances(db as any)).resolves.toBeUndefined();
  });
  it("bounds stalled D1 operations and reports an unknown allowance", async () => {
    vi.useFakeTimers();
    const db = { prepare: () => ({ bind() { return this; }, first: () => new Promise(() => {}) }) } as any;
    const pending = expect(dailyAllowance(db, "digest", utcDay(), 10, true)).resolves.toBeNull();
    await vi.advanceTimersByTimeAsync(3000); await pending;
  });
  it("prunes old daily identities while retaining current/yesterday rows", async () => {
    const db = fakeD1();
    for (const day of ["2026-10-28", "2026-10-29", "2026-10-30"]) await dailyAllowance(db, "digest", day, 10, true);
    await pruneAllowances(db, Date.parse("2026-10-30T12:00:00Z"));
    expect([...db.values.keys()]).toEqual(["digest|2026-10-29", "digest|2026-10-30"]);
    expect(utcDay(Date.parse("2026-10-30T23:59:59Z"))).toBe("2026-10-30");
  });
  it("hit ignores arbitrary bodies, cookies and all identifying headers; stats expose aggregates only", async () => {
    const db = fakeD1();
    const hit = request("hit", "POST", { essay, email: "private@example.com", session: "private-session" });
    hit.headers.set("Idempotency-Key", "invalid");
    expect((await onRequest({ request: hit, env: { QUOTA_SALT: "fixture-salt", DB: db } })).status).toBe(200);
    const res = await onRequest({ request: request("stats", "GET"), env: { QUOTA_SALT: "fixture-salt", DB: db } });
    const stats = await res.json();
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=300");
    expect(stats).toMatchObject({ available: true, visits: 1, essays: 0 }); expect(stats.days).toHaveLength(30);
    expect(stats.days.at(-1)).toMatchObject({ visits: 1, visitors: 1, essays: 0 });
    const stored = JSON.stringify(db.statements);
    expect(stored).not.toMatch(/192\.0\.2|private|Working from home|cookie|agent|session|email/);
    expect(JSON.stringify(stats)).not.toMatch(/private|192\.0\.2|Working from home/);
    expect((await onRequest({ request: request("stats"), env: { QUOTA_SALT: "fixture-salt", DB: db } })).status).toBe(404);
    expect((await onRequest({ request: request("hit", "GET"), env: { QUOTA_SALT: "fixture-salt", DB: db } })).status).toBe(404);
  });
  it("counts only successful fresh marks, not cache hits, failures, helpers or full detail", async () => {
    const db = fakeD1(), values = new Map<string, string>();
    const env = { QUOTA_SALT: "fixture-salt", DB: db, QUOTA: { get: async (key: string) => values.get(key) ?? null, put: async (key: string, value: string) => { values.set(key, value); } }, AI: { run: async () => ({ response: raw }) } };
    await onRequest({ request: request("mark"), env });
    await onRequest({ request: request("mark"), env });
    await onRequest({ request: request("report-detail"), env });
    await onRequest({ request: request("helper", "POST", { role: "coach", message: "Help" }), env });
    await onRequest({ request: request("mark", "POST", {}), env });
    expect([...db.counters]).toEqual([[`essays|${utcDay()}`, 1]]);
    expect([...values.keys()].every((key) => key.startsWith("cache:"))).toBe(true);
  });
  it("fills zero days, approximates visitors by sessions and caches for five minutes", async () => {
    const db = fakeD1(), now = Date.parse("2026-10-30T12:00:00Z");
    await count(db, "visits", "2026-10-28"); await count(db, "essays", "2026-10-30"); await count(db, "invalid-name", "2026-10-30");
    const stats = await publicStats(db, now);
    expect(stats.days[0].day).toBe("2026-10-01"); expect(stats.days[0].visits).toBe(0);
    expect(stats.days.at(-3)).toMatchObject({ visits: 1, visitors: 1 });
    await count(db, "visits", "2026-10-30"); expect((await publicStats(db, now + 299999)).visits).toBe(1);
    expect((await publicStats(db, now + 300000)).visits).toBe(2);
  });
});

describe("launch UI, session counts and SEO artifacts", () => {
  it("deduplicates visits per tab including simultaneous calls; retries a failed POST on a later visit", async () => {
    const values = new Map<string, string>();
    const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } };
    const fetchFn = vi.fn<typeof fetch>(async () => new Response("{}"));
    await Promise.all([recordVisit(storage, fetchFn), recordVisit(storage, fetchFn)]); await recordVisit(storage, fetchFn);
    expect(fetchFn).toHaveBeenCalledOnce(); expect(values.get(VISIT_KEY)).toBe("1");
    expect(fetchFn.mock.calls[0]).toEqual(["/api/hit", expect.objectContaining({ method: "POST", credentials: "omit", referrerPolicy: "no-referrer" })]);
    expect(fetchFn.mock.calls[0][1]?.body).toBe("{}");
    values.clear(); fetchFn.mockResolvedValueOnce(new Response("{}", { status: 503 }));
    await recordVisit(storage, fetchFn); expect(values.size).toBe(0);
    await recordVisit(storage, fetchFn); expect(values.size).toBe(1);
    const blocked = { ...storage, getItem() { throw new Error("blocked"); } };
    await expect(recordVisit(blocked, fetchFn)).resolves.toBeUndefined(); expect(fetchFn).toHaveBeenCalledTimes(3);
  });
  it("formats counts and produces finite sparkline points including empty/all-zero data", () => {
    expect(formatCount(12345)).toBe("12,345"); expect(formatCount(1234567)).toBe("1.2M");
    expect(sparkline([])).toBe(""); expect(sparkline([0])).toBe("0.00,100.00");
    expect(sparkline([0, 10])).toBe("0.00,100.00 600.00,0.00");
  });
  it("shares a bounded stats fetch and exposes failures for the page to explain", async () => {
    vi.resetModules();
    const mod = await import("../src/lib/stats");
    const value = { available: true, visits: 12, essays: 3, days: [] };
    const fetchFn = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(value))); vi.stubGlobal("fetch", fetchFn);
    await Promise.all([mod.loadStats(), mod.loadStats()]); expect(await mod.loadStats()).toEqual(value); expect(fetchFn).toHaveBeenCalledOnce();
    vi.useFakeTimers(); vi.setSystemTime(Date.now() + 300001);
    fetchFn.mockResolvedValueOnce(new Response("{}", { status: 503 })); await expect(mod.loadStats()).rejects.toThrow("stats");
    fetchFn.mockResolvedValueOnce(new Response("{}")); await expect(mod.loadStats()).rejects.toThrow("stats");
    expect(typeof loadStats).toBe("function");
  });
  it("renders a typed chart field without a Free age prompt", () => {
    setChecker({ mode: "free" });
    const html = renderToStaticMarkup(createElement(Write, { ...display, active: true, draft: { ...input, task: "ac1" }, setDraft: vi.fn(), chart: null, setChart: vi.fn(), onEvaluate: vi.fn(), pending: false }));
    expect(html).toContain('id="chartDescription"'); expect(html).not.toContain("Gemini age confirmation");
    expect(read("src/styles.css")).toContain("[hidden] { display: none !important; }");
  });
  it.each(["about", "stats"] as const)("routes #%s and renders accessible Mono page content", (kind) => {
    expect(screenFromHash(`#${kind}`)).toBe(kind);
    const html = renderToStaticMarkup(createElement(PublicPage, { ...display, kind }));
    expect(html).toContain('aria-labelledby="publicTitle"'); expect(html).toContain('href="#write"');
    if (kind === "about") { expect(html).toContain("Quan Ho"); expect(html).toContain("https://www.linkedin.com/in/quan-ho-a56799409/"); expect(html).toContain("Contributors"); expect(html).toContain("70%"); expect(html).toContain("calibrated separately"); }
    else expect(html).toContain("daily visitors are approximated");
  });
  it("ships crawlable root metadata, free WebApplication data, verification config and favicon set", () => {
    const html = read("index.html");
    expect(html).toContain("Free IELTS Writing Checker"); expect(html).toContain('rel="canonical"');
    for (const key of ["og:title", "og:url", "og:image", "twitter:card"]) expect(html).toContain(key);
    const data = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1]);
    expect(data).toMatchObject({ "@type": "WebApplication", isAccessibleForFree: true, offers: { price: "0" } });
    expect(read("public/robots.txt")).toContain("Allow: /");
    const sitemap = read("public/sitemap.xml"); expect(sitemap).toContain("https://bandexe.pages.dev/"); expect(sitemap).not.toContain("#");
    const png = readFileSync(new URL("../public/og-preview.png", import.meta.url));
    expect(png.readUInt32BE(16)).toBe(1200); expect(png.readUInt32BE(20)).toBe(630);
    for (const file of ["favicon.svg", "favicon.ico", "favicon-32.png", "apple-touch-icon.png"]) expect(readFileSync(new URL(`../public/${file}`, import.meta.url)).length).toBeGreaterThan(0);
    expect(read("vite.config.ts")).toContain("VITE_GOOGLE_SITE_VERIFICATION"); expect(read("vite.config.ts")).toContain("VITE_SITE_URL");
    expect(read("wrangler.toml")).toMatch(/database_id = "[0-9a-f-]{36}"/);
    expect(read("migrations/0001_counters.sql")).toContain("PRIMARY KEY (key, day)");
  });
});
