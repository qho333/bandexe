// Raw official-script runs through the production free marker. No provider/model fallback.
// Set secrets privately in the environment, then:
// node research-data/tools/calibrate_open.mjs --provider mistral --model mistral-medium-latest
import { readFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { markFree, FREE_CONFIG } from "../../shared/free.js";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jsonl = (path) => readFileSync(path, "utf8").split(/\r?\n/).filter((s) => s.trim()).map(JSON.parse);
const safeName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

export async function runCalibration({ argv = process.argv.slice(2), env = process.env, fetchFn = fetch,
  wait = sleep, log = console.log } = {}) {
  const { values } = parseArgs({ args: argv, options: {
    provider: { type: "string", default: "mistral" }, model: { type: "string" },
    scripts: { type: "string" }, out: { type: "string" },
  } });
  const provider = { openrouter: "router", workers: "cf" }[values.provider] || values.provider;
  const models = { mistral: FREE_CONFIG.mistralModels, groq: FREE_CONFIG.groqModels, router: FREE_CONFIG.routerModels, cf: FREE_CONFIG.models }[provider];
  if (!models) throw new Error("Choose provider mistral, groq, router or cf.");
  const model = values.model || models[0];
  if (provider === "router" && !model.endsWith(":free")) throw new Error("OpenRouter requires a :free model.");
  // Secrets are passed only to production adapters, never to output/log messages.
  const freeEnv = {};
  if (provider === "mistral") {
    if (!env.MISTRAL_API_KEY) throw new Error("Set MISTRAL_API_KEY privately first.");
    freeEnv.MISTRAL_API_KEY = env.MISTRAL_API_KEY;
  } else if (provider === "groq") {
    if (!env.GROQ_API_KEY) throw new Error("Set GROQ_API_KEY privately first.");
    freeEnv.GROQ_API_KEY = env.GROQ_API_KEY;
  } else if (provider === "router") {
    if (!env.OPENROUTER_API_KEY) throw new Error("Set OPENROUTER_API_KEY privately first.");
    freeEnv.OPENROUTER_API_KEY = env.OPENROUTER_API_KEY;
  } else {
    if (!env.CLOUDFLARE_API_TOKEN || !/^[a-f0-9]{32}$/i.test(env.CLOUDFLARE_ACCOUNT_ID || ""))
      throw new Error("Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID privately first.");
    freeEnv.AI = { async run(id, body) {
      const response = await fetchFn(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${id}`, {
        method: "POST", headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify(body), signal: AbortSignal.timeout(150000),
      });
      if (!response.ok) throw new Error("Workers AI unavailable.");
      return response.json();
    } };
  }
  const local = resolve(ROOT, "research-data/downloads/official/official_scripts.jsonl");
  const scripts = values.scripts || (existsSync(local) ? local : resolve(ROOT, "../research-data/downloads/official/official_scripts.jsonl"));
  const rows = jsonl(scripts);
  if (!values.scripts && rows.length !== 27) throw new Error("Expected the 27 official scripts.");
  if (!rows.every((r) => typeof r.prompt === "string" && typeof r.essay === "string" && Number.isFinite(r.overall)))
    throw new Error("Official scripts must have prompt, essay and numeric overall fields.");
  const out = values.out || resolve(ROOT, `research-data/marker/${provider}_${safeName(model)}_runs.jsonl`);
  const version = `open-report-v1/${provider}/${model}/uncalibrated`;
  const done = new Set(existsSync(out) ? jsonl(out).filter((r) => r.version === version
    && r.ai != null && !r.withheld?.length).map((r) => r.idx) : []);
  mkdirSync(dirname(out), { recursive: true });
  for (const [idx, row] of rows.entries()) {
    if (done.has(idx)) continue;
    const task = String(row.task) === "2" ? "t2" : row.module === "general" ? "gt1" : "ac1";
    const input = { task, question: row.prompt, essay: row.essay, words: row.essay.trim().split(/\s+/).length, image: null };
    const line = { idx, task, official: row.overall, provider, model, version, at: new Date().toISOString() };
    try {
      const result = await markFree(input, freeEnv, { fetchFn, wait, raw: true, provider, model });
      Object.assign(line, { ai: result.overall, bands: Object.fromEntries(Object.entries(result.report.criteria).map(([k, c]) => [k, c.band])),
        calls: result.calls, withheld: result.withheld });
    } catch (e) {
      if (e?.code === "pool_empty") {
        log(`#${idx}: free capacity unavailable; rerun later to resume.`);
        break;
      }
      // Never print provider errors: they could contain credentials or submitted text.
      line.error = "mark_failed";
    }
    appendFileSync(out, JSON.stringify(line) + "\n");
    log(`#${idx} ${task} official ${row.overall} ai ${line.ai ?? line.error ?? "withheld"}`);
    await wait(1100); // Stay below roughly one request/second; repairs use bounded 429 retry.
  }
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCalibration().catch(() => {
    console.error("Calibration stopped. Check provider, free-plan credentials and official-script paths; no secrets were logged.");
    process.exitCode = 1;
  });
}
