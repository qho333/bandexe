import { vi } from "vitest";
import type { Database, Statement, PendingReview } from "../shared/storage.js";
// Executes each reservation before yielding, like D1's conditional atomic UPSERT.
// Shared by independently imported handlers to exercise cross-isolate admission.
export function fakeD1(initialUsed = 0) {
  const values = new Map<string, number>();
  const counters = new Map<string, number>();
  const metrics = new Map<string, number>();
  const reviews: (PendingReview & { status: string })[] = [];
  const writes: unknown[][] = [];
  const statements: { sql: string; args: unknown[] }[] = [];
  const states = new Map<Statement, { sql: string; args: unknown[] }>();
  const db: Database = {
    prepare: vi.fn((sql: string) => {
      const state = { sql, args: [] as unknown[] }; statements.push(state);
      const stmt: Statement = {
        bind(...args) { state.args = args; return stmt; },
        async first<T>() {
          if (sql.startsWith("UPDATE reviews")) {
            const [status, id] = state.args;
            const review = reviews.find((r) => r.id === id && (status === "hidden" || r.public === 1));
            if (review) review.status = String(status);
            return (review ? { id } : null) as T | null;
          }
          const [key, day, limit] = state.args as [string, string, number];
          const id = `${key}|${day}`;
          const n = values.get(id) ?? initialUsed;
          if (sql.startsWith("SELECT")) return (n ? { n } : null) as T | null;
          if (!sql.includes("ON CONFLICT") || !sql.includes("WHERE n < ?") || !sql.includes("RETURNING n")) throw new Error("Non-atomic allowance");
          if (n >= limit) return null;
          values.set(id, n + 1); writes.push([key, day, n + 1]);
          return { n: n + 1 } as T;
        },
        async run() {
          if (sql.startsWith("DELETE FROM reviews")) {
            for (let i = reviews.length - 1; i >= 0; i--)
              if (["pending", "hidden"].includes(reviews[i].status) && reviews[i].day < String(state.args[0])) reviews.splice(i, 1);
          } else if (sql.startsWith("DELETE")) {
            for (const key of values.keys()) if (key.split("|")[1] < String(state.args[0])) values.delete(key);
          } else if (sql.startsWith("INSERT INTO reviews")) {
            const [day, rating, text, task, visible] = state.args as [string, number, string, PendingReview["task"], number];
            reviews.push({ id: reviews.length + 1, day, rating, text, task, public: visible, status: "pending" });
          } else {
            const [name, day, key = ""] = state.args as string[];
            if (!sql.includes("ON CONFLICT") || !sql.includes("n = n + 1")) throw new Error("Non-atomic counter");
            const table = sql.includes("INTO metrics") ? metrics : counters;
            const id = `${name}|${day}` + (table === metrics ? `|${key}` : "");
            table.set(id, (table.get(id) || 0) + 1);
          }
          return { success: true };
        },
      };
      states.set(stmt, state);
      return stmt;
    }),
    async batch(batch) {
      return Promise.all(batch.map(async (stmt) => {
        const { sql, args } = states.get(stmt)!;
        if (sql.startsWith("INSERT")) { await stmt.run(); return { success: true }; }
        let results: any[] = [];
        if (sql.includes("MIN(day)")) {
          const days = [...counters.keys(), ...metrics.keys()].map((key) => key.split("|")[1]).sort();
          results = [{ day: days[0] || null }];
        } else if (sql.includes("FROM metrics")) {
          const totals = new Map<string, number>();
          for (const [id, n] of metrics) {
            const [name, , key] = id.split("|");
            totals.set(`${name}|${key}`, (totals.get(`${name}|${key}`) || 0) + n);
          }
          results = [...totals].map(([id, n]) => ({ name: id.split("|")[0], key: id.split("|")[1], n }));
        } else if (sql.includes("FROM reviews")) {
          results = reviews.filter((r) => r.text && (sql.includes("'approved'") ? r.status === "approved" && r.public === 1 : r.status === "pending"))
            .sort((a, b) => b.id - a.id).slice(0, sql.includes("LIMIT 6") ? 6 : 50)
            .map(({ id, day, rating, text, task, public: visible }) => sql.includes("'approved'") ? { day, rating, text, task } : { id, day, rating, text, task, public: visible });
        } else if (sql.includes("GROUP BY name")) {
          results = ["visits", "essays"].map((name) => ({ name, n: [...counters].filter(([key]) => key.startsWith(name + "|")).reduce((n, [, v]) => n + v, 0) }));
        } else {
          results = [...counters].map(([key, n]) => ({ name: key.split("|")[0], day: key.split("|")[1], n }))
            .filter((row) => row.day >= String(args[0]) && row.day <= String(args[1]));
        }
        return { success: true, results };
      }));
    },
  };
  return Object.assign(db, { values, counters, metrics, reviews, writes, statements });
}
