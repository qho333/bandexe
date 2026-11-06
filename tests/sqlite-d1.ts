// Real SQLite exercises migrations, bindings, transactions and history retention.
// @ts-expect-error Node-only test adapter, no production dependency or Node typings.
import { DatabaseSync } from "node:sqlite";
import migration1 from "../migrations/0001_counters.sql?raw";
import migration2 from "../migrations/0002_impact.sql?raw";
import migration3 from "../migrations/0003_accounts.sql?raw";
import migration4 from "../migrations/0004_session_epoch.sql?raw";
import migration5 from "../migrations/0005_review_retention.sql?raw";
import type { Database, Statement } from "../shared/storage.js";

export function sqliteD1() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  sqlite.exec(migration1 + migration2 + migration3 + migration4 + migration5);
  const records: { sql: string; args: unknown[] }[] = [];
  const states = new Map<Statement, { sql: string; args: unknown[] }>();
  const db: Database = {
    prepare(sql) {
      const record = { sql, args: [] as unknown[] }; records.push(record);
      const statement: Statement = {
        bind(...args) { record.args = args; return statement; },
        async first<T>() { return sqlite.prepare(sql).get(...record.args) as T || null; },
        async run() { sqlite.prepare(sql).run(...record.args); return { success: true }; },
      };
      states.set(statement, record);
      return statement;
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const results = statements.map((statement) => {
          const { sql, args } = states.get(statement)!;
          if (sql.trimStart().startsWith("SELECT")) return { success: true, results: sqlite.prepare(sql).all(...args) };
          sqlite.prepare(sql).run(...args);
          return { success: true, results: [] };
        });
        sqlite.exec("COMMIT");
        return results;
      } catch (e) { sqlite.exec("ROLLBACK"); throw e; }
    },
  };
  return Object.assign(db, { records, rows: (sql: string, ...args: unknown[]) => sqlite.prepare(sql).all(...args) as Record<string, unknown>[], close: () => sqlite.close() });
}
