import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { timingSafeEqual } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { onRequest } from "../functions/api/[[path]]";
import { count, countImpact, publicStats, validateReview, saveReview, pendingReviews, moderateReview, utcDay } from "../shared/storage.js";
import { recordVisit, recordStudent, FIRST_SEEN_KEY, FIRST_REPORT_KEY, countryName } from "../src/lib/stats";
import { sendReview, RATING_KEY, loadPendingReviews, moderateReview as moderateClient } from "../src/lib/reviews";
import { fakeD1 } from "./fake-d1";
import Impact from "../src/components/Impact";
import ReviewForm from "../src/components/ReviewForm";
import ModerateReviews from "../src/components/ModerateReviews";
import Privacy from "../src/components/Privacy";
import { DEFAULT_PREFS } from "../src/lib/prefs";

const token = "a1".repeat(24), ip = "192.0.2.44";
const review = { rating: 4, text: "Clear next steps.", public: true, task: "t2" };
const store = () => {
  const values = new Map();
  return { values, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
};
const req = (path, body, supplied, country = "VN") => Object.assign(new Request(`https://bandexe.test/api/${path}`, {
  method: body === undefined ? "GET" : "POST", headers: { "Content-Type": "application/json", "X-Requested-With": "bandexe", "CF-Connecting-IP": ip,
    ...(supplied ? { "X-Tester-Token": supplied } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
}), { cf: { country } });
const nativeCrypto = globalThis.crypto;
let local;
beforeEach(() => {
  local = store(); vi.stubGlobal("localStorage", local);
  vi.stubGlobal("crypto", { subtle: { digest: (...args) => nativeCrypto.subtle.digest(...args),
    timingSafeEqual: (a, b) => timingSafeEqual(new Uint8Array(a), new Uint8Array(b)) } });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("anonymous impact events", () => {
  it("counts session hits, first browsers/country and students separately, ignoring arbitrary data", async () => {
    const db = fakeD1(), env = { DB: db, QUOTA_SALT: "salt" };
    await onRequest({ request: req("hit", { first: true, essay: "private essay", email: "private@test.example", id: "private ID" }), env });
    await onRequest({ request: req("hit", { student: true }), env });
    await onRequest({ request: req("hit", {}), env });
    const res = await onRequest({ request: req("stats"), env });
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=300");
    expect(await res.json()).toMatchObject({ visits: 2, browsers: 1, students: 1, countries: 1, topCountries: [{ code: "VN", n: 1 }], since: utcDay() });
    expect(JSON.stringify(db.statements)).not.toMatch(/192\.0\.2|private|salt|Cookie|User-Agent/);
    expect([...db.values.keys()].sort()).toEqual([expect.stringMatching(/^hitfirst:[a-f0-9]{64}\|\d{4}-\d{2}-\d{2}$/), expect.stringMatching(/^hitvisit:[a-f0-9]{64}\|\d{4}-\d{2}-\d{2}$/)]);
  });
  it("admits at most three first/student increments combined, even concurrently", async () => {
    const db = fakeD1(), env = { DB: db, QUOTA_SALT: "salt" };
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => onRequest({ request: req("hit", i % 2 ? { first: true } : { student: true }), env })));
    expect(results.every((r) => r.status === 200)).toBe(true);
    const stats = await publicStats(db);
    expect(stats.browsers + stats.students).toBe(3); expect(stats.visits).toBe(10);
    expect([...db.values.values()].sort((a, b) => a - b)).toEqual([3, 20]);
  });
  it.each(["vn", "VNM", "V1", "", "US:private", undefined])("skips invalid country %s", async (country) => {
    const db = fakeD1(); await countImpact(db, "browsers", country);
    expect((await publicStats(db)).countries).toBe(0);
    expect([...db.metrics.keys()]).toEqual([`browsers|${utcDay()}|`]);
  });
  it("requires literal booleans and skips tester impact events without spending limits", async () => {
    const db = fakeD1(), env = { DB: db, QUOTA_SALT: "salt", TESTER_TOKEN: token };
    await onRequest({ request: req("hit", { first: "true", student: 1 }), env });
    await onRequest({ request: req("hit", { first: true }, token), env });
    await onRequest({ request: req("hit", { student: true }, token), env });
    expect(db.metrics.size).toBe(0); expect(db.values.size).toBe(1); expect((await publicStats(db)).visits).toBe(2);
    await onRequest({ request: req("hit", { first: true }, "wrong"), env });
    expect([...db.metrics.keys()]).toContain(`browsers|${utcDay()}|`);
  });
  it("first flags contain only 1, sessions remain independent, failures retry quietly", async () => {
    const network = vi.fn(async () => new Response("{}"));
    const session = store();
    await Promise.all([recordVisit(session, network, local), recordVisit(session, network, local)]);
    expect(network).toHaveBeenCalledOnce(); expect(JSON.parse(network.mock.calls[0][1].body)).toEqual({ first: true });
    expect(local.getItem(FIRST_SEEN_KEY)).toBe("1");
    await recordVisit(store(), network, local); expect(network.mock.calls[1][1].body).toBe("{}");
    await Promise.all([recordStudent(local, network), recordStudent(local, network)]); expect(network).toHaveBeenCalledTimes(3);
    expect(JSON.parse(network.mock.calls[2][1].body)).toEqual({ student: true });
    expect(local.getItem(FIRST_REPORT_KEY)).toBe("1");
    local.values.clear(); network.mockResolvedValueOnce(new Response("{}", { status: 503 }));
    await recordVisit(store(), network, local); expect(local.getItem(FIRST_SEEN_KEY)).toBeNull();
    network.mockRejectedValueOnce(new Error("offline")); await expect(recordStudent(local, network)).resolves.toBeUndefined();
    expect(local.getItem(FIRST_REPORT_KEY)).toBeNull();
    await recordStudent(local, network); expect(local.getItem(FIRST_REPORT_KEY)).toBe("1");
    for (const [, init] of network.mock.calls) { expect(init.credentials).toBe("omit"); expect(init.referrerPolicy).toBe("no-referrer"); }
  });
  it("survives blocked local storage and forwards a tester pass on session hits", async () => {
    const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
    const network = vi.fn(async () => new Response("{}"));
    await recordVisit(store(), network, blocked); expect(network.mock.calls[0][1].body).toBe("{}");
    await expect(recordStudent(blocked, network)).resolves.toBeUndefined(); expect(network).toHaveBeenCalledOnce();
    local.setItem("bandexe-tester", token);
    await recordVisit(store(), network, local); await recordStudent(local, network);
    expect(network).toHaveBeenCalledTimes(2); expect(network.mock.calls[1][1].headers["X-Tester-Token"]).toBe(token);
    expect(local.getItem(FIRST_SEEN_KEY)).toBeNull(); expect(local.getItem(FIRST_REPORT_KEY)).toBeNull();
  });
});

describe("rating validation, privacy and limits", () => {
  it.each([null, [], "bad", {}, { rating: 0 }, { rating: 6 }, { rating: 2.5 }, { rating: "5" }, { ...review, text: 1 }, { ...review, public: 1 }, { ...review, task: "unknown" }, { ...review, text: "x".repeat(281) }])("rejects invalid review %#", async (body) => {
    const db = fakeD1(); const res = await onRequest({ request: req("review", body), env: { QUOTA_SALT: "fixture-salt", DB: db } });
    expect(res.status).toBe(400); expect(db.reviews).toHaveLength(0); expect(db.metrics.size).toBe(0);
  });
  it.each(["private@example.com", "https://example.com", "www.example.com", "example.com", "https://localhost", "1234567", "+1 (234) 567-8900", "a\u200bb@example.com", "1\u00002\u00003\u00004\u00005\u00006\u00007", "١٢٣٤٥٦٧"])("rejects contact details or links: %s", async (text) => {
    const res = await onRequest({ request: req("review", { ...review, text }), env: { QUOTA_SALT: "fixture-salt", DB: fakeD1() } });
    expect(res.status).toBe(400); expect((await res.json()).message).toContain("remove");
  });
  it("trims and strips controls, stores only allowed fields, and counts ratings before moderation", async () => {
    const db = fakeD1();
    expect(validateReview({ rating: 1 })).toEqual({ value: { rating: 1, text: "", task: null, public: false } });
    const res = await onRequest({ request: req("review", { ...review, text: " \u0000Helpful\u202e.\n ", name: "private name", essay: "private essay", email: "private@example.com" }), env: { QUOTA_SALT: "fixture-salt", DB: db } });
    expect(res.status).toBe(200); expect(db.reviews[0]).toMatchObject({ text: "Helpful.", status: "pending", public: 1 });
    const stats = await publicStats(db);
    expect(stats.ratings).toEqual({ count: 1, average: 4, fourPlus: 100 }); expect(stats.reviews).toEqual([]);
    expect(JSON.stringify(db.statements)).not.toMatch(/private|192\.0\.2/);
    expect(validateReview({ ...review, text: " " + "x".repeat(280) + " " }).value.text).toHaveLength(280);
    expect(validateReview({ ...review, text: "6 tasks in 2026" }).value).toBeDefined();
  });
  it("caps review submissions at five per digest/day across concurrent requests", async () => {
    const db = fakeD1(), env = { DB: db, QUOTA_SALT: "salt" };
    const responses = await Promise.all(Array.from({ length: 15 }, () => onRequest({ request: req("review", review), env })));
    expect(responses.filter((r) => r.status === 200)).toHaveLength(5); expect(responses.filter((r) => r.status === 429)).toHaveLength(10);
    expect(db.reviews).toHaveLength(5); expect([...db.values.keys()][0]).toMatch(/^review:[a-f0-9]{64}\|/);
    vi.useFakeTimers(); vi.setSystemTime(Date.now() + 86400000);
    expect((await onRequest({ request: req("review", review), env })).status).toBe(200);
  });
  it("caps client ratings per UTC day, rolls back failures and persists only the day/count", async () => {
    const network = vi.fn(async () => new Response("{}"));
    await Promise.all(Array.from({ length: 5 }, () => sendReview(review, network, local)));
    await expect(sendReview(review, network, local)).rejects.toThrow("five"); expect(network).toHaveBeenCalledTimes(5);
    expect(JSON.parse(local.getItem(RATING_KEY))).toEqual({ day: utcDay(), n: 5 });
    vi.useFakeTimers(); vi.setSystemTime(Date.now() + 86400000);
    network.mockResolvedValueOnce(new Response(JSON.stringify({ message: "Please remove contact details." }), { status: 400 }));
    await expect(sendReview(review, network, local)).rejects.toThrow("remove"); expect(JSON.parse(local.getItem(RATING_KEY)).n).toBe(0);
    await sendReview(review, network, local); expect(JSON.parse(local.getItem(RATING_KEY)).n).toBe(1);
    for (const [, init] of network.mock.calls) { expect(init.credentials).toBe("omit"); expect(JSON.parse(init.body)).toEqual(review); }
  });
  it("handles corrupt and unavailable client storage, server and network failures", async () => {
    local.setItem(RATING_KEY, "broken");
    const network = vi.fn(async () => new Response("{}"));
    await sendReview(review, network, local);
    const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
    await sendReview(review, network, blocked);
    network.mockRejectedValueOnce(new Error("offline")); await expect(sendReview(review, network, local)).rejects.toThrow("offline");
    expect(JSON.parse(local.getItem(RATING_KEY)).n).toBe(1);
  });
});

describe("consent and moderation", () => {
  it.each([undefined, "wrong"])("rejects non-testers for both moderation routes (%s)", async (supplied) => {
    const env = { DB: fakeD1(), TESTER_TOKEN: token };
    expect((await onRequest({ request: req("reviews/pending", undefined, supplied), env })).status).toBe(403);
    expect((await onRequest({ request: req("reviews/moderate", { id: 1, status: "approved" }, supplied), env })).status).toBe(403);
    expect(env.DB.statements).toHaveLength(0);
  });
  it("shows pending text only to testers and never publishes a private or hidden comment", async () => {
    const db = fakeD1(), env = { DB: db, TESTER_TOKEN: token };
    await saveReview(db, review); await saveReview(db, { ...review, text: "Private comment.", public: false }); await saveReview(db, { ...review, text: "" });
    const pending = await onRequest({ request: req("reviews/pending", undefined, token), env });
    expect(pending.headers.get("Cache-Control")).toBe("no-store"); expect((await pending.json()).reviews.map((r) => r.id)).toEqual([2, 1]);
    expect((await onRequest({ request: req("reviews/moderate", { id: 2, status: "approved" }, token), env })).status).toBe(400);
    expect(await moderateReview(db, 1, "approved")).toBe(true);
    expect(await moderateReview(db, 2, "hidden")).toBe(true);
    expect((await publicStats(db)).reviews).toEqual([{ text: review.text, rating: 4, day: utcDay(), task: "t2" }]);
    expect(await pendingReviews(db)).toEqual([]);
  });
  it.each([{}, { id: -1, status: "approved" }, { id: 1.1, status: "hidden" }, { id: "1", status: "approved" }, { id: 1, status: "pending" }, null])("validates moderation payload %#", async (body) => {
    const res = await onRequest({ request: req("reviews/moderate", body, token), env: { QUOTA_SALT: "fixture-salt", DB: fakeD1(), TESTER_TOKEN: token } }); expect(res.status).toBe(400);
  });
  it("returns latest 50 pending comments and latest six public approved reviews", async () => {
    const db = fakeD1();
    for (let i = 1; i <= 55; i++) await saveReview(db, { ...review, text: `Feedback ${i}` });
    const pending = await pendingReviews(db); expect(pending).toHaveLength(50); expect(pending[0].id).toBe(55); expect(pending.at(-1).id).toBe(6);
    for (let i = 1; i <= 10; i++) await moderateReview(db, i, "approved");
    expect((await publicStats(db)).reviews.map((r) => r.text)).toEqual([10, 9, 8, 7, 6, 5].map((n) => `Feedback ${n}`));
  });
  it("sends tester credentials only as headers to moderation endpoints", async () => {
    local.setItem("bandexe-tester", token);
    const network = vi.fn(async () => new Response(JSON.stringify({ reviews: [] }))); vi.stubGlobal("fetch", network);
    expect(await loadPendingReviews()).toEqual([]); await moderateClient(2, "hidden");
    expect(network.mock.calls.map(([url]) => url)).toEqual(["/api/reviews/pending", "/api/reviews/moderate"]);
    for (const [url, init] of network.mock.calls) { expect(init.headers["X-Tester-Token"]).toBe(token); expect(url + (init.body || "")).not.toContain(token); }
  });
});

describe("honest public stats and optional outages", () => {
  it("aggregates lifetime totals, earliest day, top ten countries and weighted rating buckets with five-minute caching", async () => {
    const db = fakeD1(), now = Date.parse("2026-10-30T12:00:00Z");
    await count(db, "essays", "2026-01-01"); await countImpact(db, "students", undefined, "2026-10-30");
    for (const code of ["VN", "US", "GB", "DE", "AU", "CA", "FR", "JP", "KR", "IN", "NZ"]) await countImpact(db, "browsers", code, "2026-10-30");
    await countImpact(db, "browsers", "VN", "2026-10-30");
    for (const rating of [1, 4, 5]) await saveReview(db, { ...review, rating }, "2026-10-30");
    const stats = await publicStats(db, now);
    expect(stats).toMatchObject({ since: "2026-01-01", browsers: 12, students: 1, essays: 1, countries: 11,
      ratings: { count: 3, average: 3.3, fourPlus: 67 } });
    expect(stats.topCountries).toHaveLength(10); expect(stats.topCountries[0]).toEqual({ code: "VN", n: 2 });
    await countImpact(db, "students");
    expect((await publicStats(db, now + 299999)).students).toBe(1); expect((await publicStats(db, now + 300000)).students).toBe(2);
  });
  it("has honest empty defaults and falls back to legacy counters if impact tables are missing", async () => {
    expect(await publicStats()).toMatchObject({ since: null, browsers: 0, students: 0, countries: 0, ratings: { count: 0, average: 0, fourPlus: 0 }, reviews: [] });
    const db = fakeD1(); expect((await publicStats(db)).since).toBeNull();
    const legacy = fakeD1(); await count(legacy, "visits");
    const batch = legacy.batch; legacy.batch = vi.fn().mockImplementationOnce(batch).mockRejectedValueOnce(new Error("no such table"));
    expect(await publicStats(legacy)).toMatchObject({ available: true, visits: 1, browsers: 0 });
    expect(countryName("VN")).toBe("Vietnam"); expect(countryName("invalid")).toBe("invalid");
    vi.stubGlobal("Intl", { ...Intl, DisplayNames: undefined }); expect(countryName("VN")).toBe("VN");
  });
  it.each([undefined, { prepare() { throw new Error("private failure"); } }])("keeps impact outages quiet and review outages friendly (%#)", async (db) => {
    const env = { DB: db, QUOTA_SALT: "salt", TESTER_TOKEN: token };
    expect((await onRequest({ request: req("hit", { first: true }), env })).status).toBe(200);
    const res = await onRequest({ request: req("review", review), env }); expect(res.status).toBe(503); expect(await res.text()).not.toContain("private failure");
    expect((await onRequest({ request: req("reviews/pending", undefined, token), env })).status).toBe(503);
    expect((await onRequest({ request: req("reviews/moderate", { id: 1, status: "hidden" }, token), env })).status).toBe(503);
    await expect(countImpact(db, "browsers", "VN")).resolves.toBeUndefined();
  });
  it("bounds stalled impact and review writes", async () => {
    vi.useFakeTimers();
    const db = { prepare: () => ({ bind() { return this; } }), batch: () => new Promise(() => {}) };
    const impact = countImpact(db, "browsers", "VN"), rating = saveReview(db, review);
    await vi.advanceTimersByTimeAsync(3000);
    await expect(impact).resolves.toBeUndefined(); await expect(rating).resolves.toBe(false);
  });
  it("renders labelled rating controls, honest impact numbers, escaped quotes and privacy details", async () => {
    const form = renderToStaticMarkup(createElement(ReviewForm, { task: "t2" }));
    expect(form).toContain("Was this report helpful?"); expect(form.match(/aria-pressed="false"/g)).toHaveLength(5);
    expect(form).toContain('maxLength="280"'); expect(form).toContain('aria-label="5 stars"'); expect(form).toContain('type="checkbox"');
    expect(form).toContain("0/280"); expect(form).toContain("personal details"); expect(form).toContain("OK to show my comment publicly");
    const stats = { ...await publicStats(), available: true, since: "2026-10-30", browsers: 12, students: 3, essays: 8, countries: 1, topCountries: [{ code: "VN", n: 12 }],
      ratings: { count: 2, average: 4.5, fourPlus: 100 }, reviews: [{ text: "<script>private</script>", rating: 5, day: "2026-10-30", task: "t2" }] };
    const impact = renderToStaticMarkup(createElement(Impact, { stats }));
    for (const text of ["Since 2026-10-30", "unique browsers", "students got feedback", "essays marked", "countries", "4.5", "2 ratings", "100% rated 4–5", "Vietnam", "cleared storage", "only after approval", "not verified individual people"]) expect(impact).toContain(text);
    expect(renderToStaticMarkup(createElement(Impact, { stats: { visits: 2, essays: 1 } }))).toContain("No counts recorded yet.");
    expect(impact).not.toContain("<script>"); expect(impact).toContain("&lt;script&gt;");
    expect(renderToStaticMarkup(createElement(ModerateReviews))).toBe("");
    local.setItem("bandexe-tester", token); expect(renderToStaticMarkup(createElement(ModerateReviews))).toContain("Moderate reviews");
    const privacy = renderToStaticMarkup(createElement(Privacy, { active: true, prefs: DEFAULT_PREFS, setPrefs() {}, onReplayBoot() {} }));
    for (const text of ["bandexe-first-seen", "boolean events", "anonymous ratings", "moderator approves", "no names, IP addresses"]) expect(privacy).toContain(text);
  });
  it("runs migration and generated storage SQL against SQLite without rebuilding counters", async () => {
    const db = fakeD1();
    await count(db, "visits", "2026-10-01"); await countImpact(db, "browsers", "VN", "2026-10-02");
    await saveReview(db, review, "2026-10-02"); await saveReview(db, { ...review, public: false }, "2026-10-02");
    await moderateReview(db, 1, "approved"); await moderateReview(db, 2, "approved");
    await publicStats(db); await pendingReviews(db);
    const data = { migrations: ["0001_counters.sql", "0002_impact.sql"].map((name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8")), statements: db.statements };
    const actual = JSON.parse(execFileSync("python3", ["-c", `import sys,sqlite3,json
v=json.load(sys.stdin); db=sqlite3.connect(':memory:'); db.row_factory=sqlite3.Row
for m in v['migrations']: db.executescript(m)
# The additive migration is safe to run again and preserves existing counters.
db.executescript(v['migrations'][1])
results=[]
for s in v['statements']: results.append([dict(r) for r in db.execute(s['sql'],s['args']).fetchall()])
try:
 db.execute("INSERT INTO reviews(day,rating) VALUES ('2026-10-01',6)")
 raise AssertionError('rating constraint missing')
except sqlite3.IntegrityError: pass
try:
 db.execute("INSERT INTO metrics(name,day,n) VALUES ('invalid','2026-10-01',1)")
 raise AssertionError('metric constraint missing')
except sqlite3.IntegrityError: pass
print(json.dumps({'results':results,'reviews':[dict(r) for r in db.execute('SELECT * FROM reviews')],'visits':db.execute("SELECT n FROM counters WHERE name='visits'").fetchone()[0]}))`], { input: JSON.stringify(data), encoding: "utf8" }));
    expect(actual.visits).toBe(1); expect(actual.reviews.map((r) => r.status)).toEqual(["approved", "pending"]);
    expect(actual.results.find((rows) => rows[0]?.day === "2026-10-01")).toBeDefined();
    expect(actual.results.at(-1).map((r) => r.id)).toEqual([2]);
  });
});
