// Start the API and Vite. Free mode uses explicitly configured open providers; never read personal credentials automatically.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const env = { ...process.env };

const viteEnv = { ...env };
for (const name of ["GEMINI_API_KEY", "MISTRAL_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY", "TESTER_TOKEN"]) delete viteEnv[name]; // server credentials never reach Vite

const procs = [
  spawn(process.execPath, ["server/index.js"], { cwd: root, env, stdio: "inherit" }),
  spawn(process.execPath, ["node_modules/vite/bin/vite.js", ...process.argv.slice(2)], { cwd: root, env: viteEnv, stdio: "inherit" }),
];
const stop = () => procs.forEach((p) => p.kill());
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
procs.forEach((p) => p.on("exit", (code) => { stop(); process.exitCode = code ?? 0; }));
