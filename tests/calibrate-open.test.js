import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCalibration } from "../research-data/tools/calibrate_open.mjs";
import { OPEN_CALIBRATIONS } from "../shared/score.js";
import raw from "../server/fixtures/sample-report.fixture.json?raw";

const folders = [];
beforeEach(() => { vi.useFakeTimers(); vi.setTimerTickMode("nextTimerAsync"); });
afterEach(() => { vi.useRealTimers(); for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true }); });
const setup = (count = 27) => {
  const folder = mkdtempSync(join(tmpdir(), "bandexe-calibration-")); folders.push(folder);
  const scripts = join(folder, "scripts.jsonl"), out = join(folder, "runs.jsonl");
  const row = { task: "2", module: "academic", prompt: "Discuss working from home.",
    essay: "Working from home has became normal. " + "More people can work from home today. ".repeat(8), overall: 7 };
  writeFileSync(scripts, Array.from({ length: count }, () => JSON.stringify(row)).join("\n") + "\n");
  const argv = ["--provider", "mistral", "--model", "mistral-small-latest", "--scripts", scripts, "--out", out];
  return { argv, out };
};
const completion = () => new Response(JSON.stringify({ choices: [{ message: { content: raw } }] }));

it("marks 27 scripts with one pinned model, writes raw bands, and resumes without duplicate successes", async () => {
  const { argv, out } = setup();
  const fetchFn = vi.fn(async () => completion()), wait = vi.fn(async () => {}), log = vi.fn();
  const options = { argv, env: { MISTRAL_API_KEY: "private-key" }, fetchFn, wait, log };
  OPEN_CALIBRATIONS["mistral/mistral-small-latest"] = { id: "test-fit", slope: 1, intercept: 2, scripts: 27 };
  try {
    await runCalibration(options);
    const lines = readFileSync(out, "utf8").trim().split("\n").map(JSON.parse);
    expect(lines).toHaveLength(27); expect(fetchFn).toHaveBeenCalledTimes(27);
    expect(lines[0]).toMatchObject({ idx: 0, provider: "mistral", model: "mistral-small-latest", official: 7,
      version: "open-report-v1/mistral/mistral-small-latest/uncalibrated", bands: { tr: JSON.parse(raw).criteria.tr.band } });
    expect(fetchFn.mock.calls.every(([, init]) => JSON.parse(init.body).model === "mistral-small-latest")).toBe(true);
    expect(wait).toHaveBeenCalledWith(1100);
    await runCalibration(options);
    expect(fetchFn).toHaveBeenCalledTimes(27);
    expect(readFileSync(out, "utf8").trim().split("\n")).toHaveLength(27);
    expect(JSON.stringify(log.mock.calls) + readFileSync(out, "utf8")).not.toContain("private-key");
  } finally { delete OPEN_CALIBRATIONS["mistral/mistral-small-latest"]; }
});

it("stops at exhausted capacity without switching models, then resumes later", async () => {
  const { argv, out } = setup(2), log = vi.fn(), wait = vi.fn(async () => {});
  const fetchFn = vi.fn().mockResolvedValueOnce(completion()).mockResolvedValueOnce(new Response("{}", { status: 429 }));
  await runCalibration({ argv, env: { MISTRAL_API_KEY: "private-key" }, fetchFn, wait, log });
  expect(readFileSync(out, "utf8").trim().split("\n")).toHaveLength(1);
  expect(log.mock.calls.at(-1)[0]).toContain("rerun later to resume");
  const resumed = vi.fn(async () => completion());
  await runCalibration({ argv, env: { MISTRAL_API_KEY: "private-key" }, fetchFn: resumed, wait, log });
  expect(resumed).toHaveBeenCalledOnce(); expect(readFileSync(out, "utf8").trim().split("\n")).toHaveLength(2);
});

it("requires secrets and refuses non-free OpenRouter models before making a request", async () => {
  const fetchFn = vi.fn();
  await expect(runCalibration({ argv: [], env: {}, fetchFn })).rejects.toThrow("MISTRAL_API_KEY");
  await expect(runCalibration({ argv: ["--provider", "router", "--model", "paid-model"], env: {}, fetchFn })).rejects.toThrow(":free");
  expect(fetchFn).not.toHaveBeenCalled();
});
