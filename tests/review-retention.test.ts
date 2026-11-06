import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pendingReviews, pruneReviews, saveReview, type Database } from "../shared/storage.js";
import { onRequest } from "../functions/api/[[path]]";
import { sqliteD1 } from "./sqlite-d1";

let db: ReturnType<typeof sqliteD1>;
const review = { rating: 4, text: "Useful practice feedback.", task: "t2" as const, public: true };
const deletes = () => db.records.filter(({ sql }) => sql.startsWith("DELETE FROM reviews"));
async function seed(day: string, status: string, text = status) {
  await db.prepare("INSERT INTO reviews (day, rating, text, public, status) VALUES (?, 4, ?, 1, ?)").bind(day, text, status).run();
}
beforeEach(() => { db = sqliteD1(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-30T18:00:00Z")); });
afterEach(() => { db.close(); vi.useRealTimers(); });

describe("opportunistic unapproved review retention", () => {
  it("uses the indexed UTC creation day, deleting only old pending/hidden reviews, including private and empty reviews", async () => {
    for (const status of ["pending", "hidden", "approved"]) {
      await seed("2026-09-29", status, `old-${status}`);
      await seed("2026-09-30", status, `boundary-${status}`);
      await seed("2026-10-30", status, `fresh-${status}`);
    }
    await db.prepare("INSERT INTO reviews (day, rating) VALUES ('2026-09-01', 3)").run();
    await pruneReviews(db);
    expect(db.rows("SELECT text FROM reviews ORDER BY id").map((r) => r.text)).toEqual([
      "boundary-pending", "fresh-pending", "boundary-hidden", "fresh-hidden", "old-approved", "boundary-approved", "fresh-approved",
    ]);
    expect(deletes()).toHaveLength(1);
    expect(deletes()[0].args).toEqual(["2026-09-30"]);
    expect(db.rows("EXPLAIN QUERY PLAN DELETE FROM reviews WHERE status IN ('pending', 'hidden') AND day < ?", "2026-09-30").some((r) => String(r.detail).includes("reviews_status_day"))).toBe(true);
  });

  it("shares one prune across concurrent submissions and moderation lists, then runs again at UTC midnight", async () => {
    await seed("2026-09-29", "pending");
    await Promise.all(Array.from({ length: 10 }, (_, i) => i % 2 ? saveReview(db, review) : pendingReviews(db)));
    expect(deletes()).toHaveLength(1);
    expect(db.rows("SELECT * FROM reviews")).toHaveLength(5);
    await seed("2026-09-30", "hidden");
    vi.setSystemTime(new Date("2026-10-30T23:59:59Z"));
    await pendingReviews(db); expect(deletes()).toHaveLength(1);
    vi.setSystemTime(new Date("2026-10-31T00:00:00Z"));
    await pendingReviews(db);
    expect(deletes()).toHaveLength(2);
    expect(db.rows("SELECT * FROM reviews WHERE status = 'hidden'")).toEqual([]);
  });

  it("triggers cleanup from a moderation list request without a submission", async () => {
    await seed("2026-09-01", "pending");
    expect(await pendingReviews(db)).toEqual([]);
    expect(deletes()).toHaveLength(1);
  });

  it("keeps aggregate rating buckets and approved reviews when comments expire", async () => {
    await saveReview(db, review, "2026-09-01");
    await seed("2026-09-01", "approved");
    vi.setSystemTime(Date.now() + 86400000);
    await pendingReviews(db);
    expect(db.rows("SELECT status FROM reviews")).toEqual([{ status: "approved" }]);
    expect(db.rows("SELECT n FROM metrics WHERE name = 'rating'")).toEqual([{ n: 1 }]);
  });

  it("isolates daily guards between database bindings and tolerates missing storage", async () => {
    const other = sqliteD1();
    try {
      await Promise.all([pruneReviews(db), pruneReviews(other), pruneReviews(undefined)]);
      expect(deletes()).toHaveLength(1);
      expect(other.records.filter((r) => r.sql.startsWith("DELETE FROM reviews"))).toHaveLength(1);
      expect(await saveReview(undefined, review)).toBe(false);
      expect(await pendingReviews(undefined)).toBeNull();
    } finally { other.close(); }
  });

  it("a failed prune cannot break an actual review submission and is attempted only once that day", async () => {
    const prune = vi.fn(() => { throw new Error("cleanup unavailable"); });
    const binding: Database = { ...db, prepare(sql) { if (sql.startsWith("DELETE FROM reviews")) prune(); return db.prepare(sql); } };
    const request = () => new Request("https://bandexe.test/api/review", { method: "POST", headers: {
      "Content-Type": "application/json", "X-Requested-With": "bandexe", "CF-Connecting-IP": "192.0.2.1",
    }, body: JSON.stringify(review) });
    for (let i = 0; i < 2; i++) expect((await onRequest({ request: request(), env: { DB: binding, QUOTA_SALT: "test-salt" } })).status).toBe(200);
    expect(prune).toHaveBeenCalledOnce();
    expect(db.rows("SELECT * FROM reviews")).toHaveLength(2);
    expect(await pendingReviews(binding)).toHaveLength(2);
    vi.setSystemTime(Date.now() + 86400000);
    await pendingReviews(binding); expect(prune).toHaveBeenCalledTimes(2);
  });

  it("bounds a hung cleanup to three seconds and still saves the review", async () => {
    const binding: Database = { ...db, prepare(sql) {
      if (sql.startsWith("DELETE FROM reviews")) return { bind() { return this; }, first: async () => null, run: () => new Promise(() => {}) };
      return db.prepare(sql);
    } };
    const result = saveReview(binding, review);
    await vi.advanceTimersByTimeAsync(3001);
    expect(await result).toBe(true);
    expect(db.rows("SELECT * FROM reviews")).toHaveLength(1);
  });
});
