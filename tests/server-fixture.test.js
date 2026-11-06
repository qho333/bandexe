import { afterEach, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({ handler: null, listen: vi.fn((_port, _host, ready) => ready()) }));
vi.mock("node:http", () => ({ createServer: (handler) => { http.handler = handler; return { listen: http.listen }; } }));
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

it("initializes fixture mode and serves health and reviewed marking through the HTTP handler", async () => {
  vi.stubEnv("MARK_FIXTURE", "1"); vi.stubEnv("GEMINI_API_KEY", ""); vi.stubEnv("API_PORT", "8787");
  vi.spyOn(console, "log").mockImplementation(() => {});
  const network = vi.spyOn(globalThis, "fetch");
  await import("../server/index.js");
  expect(http.listen).toHaveBeenCalledWith(8787, "127.0.0.1", expect.any(Function));
  const request = async (method, url, body, headers = {}) => {
    const req = { method, url, headers, socket: { remoteAddress: "127.0.0.1" }, async *[Symbol.asyncIterator]() { if (body) yield Buffer.from(JSON.stringify(body)); } };
    const res = { statusCode: 0, body: null, writeHead(status) { this.statusCode = status; }, end(value) { this.body = JSON.parse(value); } };
    await http.handler(req, res);
    return res;
  };
  expect((await request("GET", "/api/health")).body).toMatchObject({ ok: true, configured: true, fixture: true });
  const res = await request("POST", "/api/mark", { task: "t2", question: "Discuss working from home.", essay: "Working from home has became normal. " + "More people can work from home today. ".repeat(8) });
  expect(res.statusCode).toBe(200);
  expect(res.body).toMatchObject({ fixture: true, calls: 1 });
  expect(res.body.overall).toBeGreaterThan(0);
  expect(res.body.report.criteria.tr.band).toBeGreaterThan(0);
  const body = { task: "t2", question: "Discuss working from home.", essay: "Home working has many benefits. ".repeat(12) };
  expect((await request("POST", "/api/model-answer", body)).body).toMatchObject({ fixture: true, reply: expect.stringContaining("Fixture study example") });
  expect((await request("POST", "/api/model-answer", body, { "x-provider": "gemini" })).statusCode).toBe(403);
  expect(network).not.toHaveBeenCalled();
});

it("routes local Free requests to open providers, never the server Gemini key", async () => {
  vi.resetModules(); vi.stubEnv("MARK_FIXTURE", "0"); vi.stubEnv("GEMINI_API_KEY", "must-stay-unused"); vi.stubEnv("GROQ_API_KEY", "test-only");
  vi.stubEnv("TESTER_UNLIMITED", "1");
  vi.spyOn(console, "log").mockImplementation(() => {});
  const { readFileSync } = await import("node:fs");
  const raw = readFileSync(new URL("../server/fixtures/sample-report.fixture.json", import.meta.url), "utf8");
  const network = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => new Response(JSON.stringify({ choices: [{ message: { content: String(url).includes("groq.com") ? raw : "unexpected Google call" } }] })));
  await import("../server/index.js");
  const request = async (url, body, headers = {}) => {
    const req = { method: "POST", url, headers, socket: { remoteAddress: "127.0.0.1" }, async *[Symbol.asyncIterator]() { yield Buffer.from(JSON.stringify(body)); } };
    const res = { statusCode: 0, body: null, writeHead(status) { this.statusCode = status; }, end(value) { this.body = JSON.parse(value); } };
    await http.handler(req, res); return res;
  };
  const body = { task: "t2", question: "Discuss working from home.", essay: "Working from home has became normal. " + "More people can work from home today. ".repeat(8) };
  const res = await request("/api/mark", { ...body, reportMode: "full" });
  expect(res.statusCode).toBe(200); expect(res.body).toMatchObject({ checker: "free", reportMode: "compact" });
  expect((await request("/api/report-detail", body)).body.reportMode).toBe("full");
  for (const [url, init] of network.mock.calls) {
    expect(String(url)).toContain("groq.com"); expect(JSON.stringify(init)).not.toContain("must-stay-unused");
  }
});
