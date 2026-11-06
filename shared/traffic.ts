import { MarkError } from "./index.js";
import { timedCall } from "./free-traffic.js";
// KV is eventually consistent. These guards serialize one isolate and remember its
// high-water counts even when KV returns a stale value; quota keys hold counts only.
export interface QuotaStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
}
type Reply = { status: number; body: string; headers: [string, string][] };
type Entry = { client: string; fingerprint: string; expires: number; pending: boolean; reply: Promise<Reply> };
type Writer = { nextAt: number; persisted: number; pending: Promise<void> | null };
type QuotaState = { counts: Map<string, number>; locks: Map<string, Promise<void>>; writers: Map<string, Writer>; day: string };
const states = new WeakMap<object, QuotaState>();
async function persist(store: QuotaStore, state: QuotaState, key: string) {
  let writer = state.writers.get(key);
  if (!writer) { writer = { nextAt: 0, persisted: -1, pending: null }; state.writers.set(key, writer); }
  const current = writer;
  if (!current.pending) {
    current.pending = Promise.resolve().then(async () => {
      while ((state.counts.get(key) || 0) > current.persisted) {
        const wait = Math.max(0, current.nextAt - Date.now());
        if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
        const target = state.counts.get(key) || 0;
        // Coalesce a burst into the latest high-water count. KV accepts only one
        // write per key per second, even though many distinct people can write.
        try { await timedCall(() => store.put(key, String(target), { expirationTtl: 172800 }), 5000); }
        finally { current.nextAt = Date.now() + 1000; }
        current.persisted = target;
      }
    }).finally(() => { current.pending = null; });
  }
  await current.pending;
}
const requests = new Map<string, Entry>();
export async function digest(value: string | Uint8Array<ArrayBuffer>) {
  const bytes = await crypto.subtle.digest("SHA-256", typeof value === "string" ? new TextEncoder().encode(value) : value);
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}
export async function quotaCount(store: QuotaStore, key: string, reserve: boolean, limit: number) {
  const day = new Date().toISOString().slice(0, 10);
  let state = states.get(store);
  if (!state) { state = { counts: new Map(), locks: new Map(), writers: new Map(), day }; states.set(store, state); }
  if (state.day !== day && !state.locks.size && ![...state.writers.values()].some((writer) => writer.pending)) { state.counts.clear(); state.writers.clear(); state.day = day; }
  const current = state;
  const prior = current.locks.get(key) || Promise.resolve();
  let release!: () => void;
  const lock = new Promise<void>((resolve) => { release = resolve; });
  current.locks.set(key, lock);
  await prior;
  let used = 0;
  try {
    // Bound memory without evicting an active daily counter (which would allow extras).
    if (!current.counts.has(key) && current.counts.size >= 10000) throw new MarkError(503, "busy", "Busy right now — please try again in a minute.");
    used = Math.max(current.counts.get(key) || 0, Math.max(0, Number(await timedCall(() => store.get(key), 5000)) || 0));
    if (reserve && used < limit) {
      // Keep the reservation if the KV write fails: an uncertain write must not grant extras.
      current.counts.set(key, used + 1);
    } else current.counts.set(key, used);
  } finally { release(); if (current.locks.get(key) === lock) current.locks.delete(key); }
  if (reserve && used < limit) await persist(store, current, key);
  return used;
}

// Short, bounded replay cache. Scope includes trusted identity, UTC day, provider,
// tester credential digest and route. A reused key with changed input is rejected.
export async function replay(key: string, fingerprint: string, run: () => Promise<Response>, client = key): Promise<Response> {
  for (const [id, entry] of requests) if (!entry.pending && entry.expires <= Date.now()) requests.delete(id);
  let entry = requests.get(key);
  if (entry && entry.fingerprint !== fingerprint) return new Response(JSON.stringify({ error: "idempotency_conflict", message: "This request ID was already used for different input." }), { status: 409, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  if (!entry) {
    // A client can only occupy eight slots across routes/credentials/request IDs.
    const own = [...requests].filter(([, value]) => value.client === client);
    if (own.length >= 8) requests.delete(own[0][0]);
    // Keep the global bound without refusing other clients admission.
    if (requests.size >= 512) requests.delete(requests.keys().next().value!);
    entry = { client, fingerprint, expires: Infinity, pending: true, reply: Promise.resolve().then(run).then(async (res) => ({ status: res.status, body: await res.text(), headers: Array.from(res.headers.entries()) })) };
    requests.set(key, entry);
    const created = entry;
    const remove = () => { if (requests.get(key) === created) requests.delete(key); };
    void entry.reply.then((reply) => {
      if (reply.status < 200 || reply.status >= 300) { remove(); return; }
      created.pending = false; created.expires = Date.now() + 120000;
    }, remove);
  }
  const result = await entry.reply;
  return new Response(result.body, { status: result.status, headers: result.headers });
}
