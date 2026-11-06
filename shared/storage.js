import { timedCall } from "./free-traffic.js";
export const utcDay = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
const bounded = (run) => timedCall(run, 3000);

// A single conditional UPSERT reserves globally, with no read/modify/write race.
// Null RETURNING means the limit was reached; storage outages return null so callers can refuse admission.
export async function dailyAllowance(db, key, day, limit, reserve = false) {
  if (!db) return null;
  try {
    if (!reserve) {
      const row = await bounded(() => db.prepare("SELECT n FROM daily_allowance WHERE key = ? AND day = ?").bind(key, day).first());
      return { used: row?.n || 0, admitted: true };
    }
    const row = await bounded(() => db.prepare(`INSERT INTO daily_allowance (key, day, n) VALUES (?, ?, 1)
      ON CONFLICT(key, day) DO UPDATE SET n = n + 1 WHERE n < ? RETURNING n`).bind(key, day, limit).first());
    return { used: row?.n ?? limit, admitted: Boolean(row) };
  } catch { return null; }
}
export async function count(db, name, day = utcDay()) {
  if (!db || !["visits", "essays"].includes(name)) return;
  try { await bounded(() => db.prepare(`INSERT INTO counters (name, day, n) VALUES (?, ?, 1)
    ON CONFLICT(name, day) DO UPDATE SET n = n + 1`).bind(name, day).run()); }
  catch { /* Optional aggregate counts never block a check. */ }
}
// Delete old pseudonymous allowance identities; public aggregate counters retain no identities.
export async function pruneAllowances(db, now = Date.now()) {
  if (!db) return;
  try { await bounded(() => db.prepare("DELETE FROM daily_allowance WHERE day < ?").bind(utcDay(now - 86400000)).run()); }
  catch { /* Optional cleanup, retried on the next visit. */ }
}
const metric = (db, name, day, key = "") => db.prepare(`INSERT INTO metrics (name, day, key, n) VALUES (?, ?, ?, 1)
  ON CONFLICT(name, day, key) DO UPDATE SET n = n + 1`).bind(name, day, key);
export async function countImpact(db, name, country, day = utcDay()) {
  if (!db || !["browsers", "students"].includes(name)) return;
  try {
    const statements = [metric(db, name, day)];
    if (name === "browsers" && /^[A-Z]{2}$/.test(country || "")) statements.push(metric(db, "country", day, country));
    await bounded(() => db.batch(statements));
  } catch { /* Optional aggregates fail quietly, like count(). */ }
}
export function validateReview(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Choose a rating from 1 to 5." };
  const { rating, task = null, public: visible = false } = body;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Choose a rating from 1 to 5." };
  if (typeof (body.text ?? "") !== "string" || typeof visible !== "boolean" || (task !== null && !["t2", "gt1", "ac1"].includes(task)))
    return { error: "Please check your comment and task." };
  // Strip controls (including bidi/zero-width controls) before checking for contact details.
  const text = (body.text ?? "").replace(/[\p{Cc}\p{Cf}]/gu, "").trim();
  if (text.length > 280) return { error: "Keep your comment to 280 characters." };
  if (/[^\s@]+@[^\s@]+/u.test(text) || /(?:[a-z][a-z0-9+.-]*:\/\/|www\.|\b[\p{L}\d](?:[\p{L}\d-]*\.)+[\p{L}]{2,}(?:\b|\/))/iu.test(text)
    || /\p{Nd}(?:[\s().+\-]*\p{Nd}){6}/u.test(text)) return { error: "Please remove email addresses, links and phone numbers, and leave out personal details." };
  return { value: { rating, text, public: visible, task } };
}
const reviewPrunes = new WeakMap();
export async function pruneReviews(db, now = Date.now()) {
  if (!db) return;
  const day = utcDay(now), previous = reviewPrunes.get(db);
  if (previous?.day === day) return previous.promise;
  // Reserve before yielding, and share completion with concurrent submissions/list requests.
  // Keep the daily guard even on failure so outages cannot cause a DELETE on every request.
  const state = { day, promise: null };
  reviewPrunes.set(db, state);
  state.promise = (async () => {
    try {
      await bounded(() => db.prepare("DELETE FROM reviews WHERE status IN ('pending', 'hidden') AND day < ?")
        .bind(utcDay(now - 30 * 86400000)).run());
    } catch { /* Best-effort retention must never prevent a review from being saved or listed. */ }
  })();
  return state.promise;
}
export async function saveReview(db, review, day = utcDay()) {
  if (!db) return false;
  await pruneReviews(db);
  try {
    // D1 batch is transactional: the comment and rating bucket are saved together.
    const results = await bounded(() => db.batch([
      db.prepare("INSERT INTO reviews (day, rating, text, task, public) VALUES (?, ?, ?, ?, ?)")
        .bind(day, review.rating, review.text, review.task, review.public ? 1 : 0),
      metric(db, "rating", day, String(review.rating)),
    ]));
    return results.every((r) => r.success !== false);
  } catch { return false; }
}
export async function pendingReviews(db) {
  if (!db) return null;
  await pruneReviews(db);
  try {
    const [result] = await bounded(() => db.batch([db.prepare("SELECT id, day, rating, text, task, public FROM reviews WHERE status = 'pending' AND text <> '' ORDER BY id DESC LIMIT 50")]));
    return result.success === false ? null : result.results || [];
  } catch { return null; }
}
export async function moderateReview(db, id, status) {
  if (!db) return null;
  try {
    // Consent is checked in the write itself; a private comment cannot be published.
    const row = await bounded(() => db.prepare("UPDATE reviews SET status = ? WHERE id = ? AND (? = 'hidden' OR public = 1) RETURNING id")
      .bind(status, id, status).first());
    return Boolean(row);
  } catch { return null; }
}
const cache = new WeakMap();
export async function publicStats(db, now = Date.now()) {
  const days = Array.from({ length: 30 }, (_, i) => ({ day: utcDay(now - (29 - i) * 86400000), visits: 0, essays: 0, visitors: 0 }));
  const empty = { available: false, visits: 0, essays: 0, days, since: null, browsers: 0, students: 0,
    countries: 0, topCountries: [], ratings: { count: 0, average: 0, fourPlus: 0 }, reviews: [] };
  if (!db) return empty;
  const cached = cache.get(db);
  if (cached && cached.until > now) return cached.value;
  try {
    const [totals, daily] = await bounded(() => db.batch([
      db.prepare("SELECT name, SUM(n) AS n FROM counters GROUP BY name"),
      db.prepare("SELECT name, day, n FROM counters WHERE day >= ? AND day <= ?").bind(days[0].day, days[29].day),
    ]));
    if (totals.success === false || daily.success === false) return empty;
    const value = { ...empty, available: true };
    for (const row of totals.results || []) if (["visits", "essays"].includes(row.name)) value[row.name] = Number(row.n) || 0;
    for (const row of daily.results || []) {
      const day = days.find((item) => item.day === row.day);
      if (day && ["visits", "essays"].includes(row.name)) day[row.name] = Number(row.n) || 0;
    }
    for (const day of days) day.visitors = day.visits;
    try {
      const results = await bounded(() => db.batch([
        db.prepare("SELECT MIN(day) AS day FROM (SELECT day FROM counters UNION ALL SELECT day FROM metrics)"),
        db.prepare("SELECT name, key, SUM(n) AS n FROM metrics GROUP BY name, key"),
        db.prepare("SELECT text, rating, day, task FROM reviews WHERE status = 'approved' AND public = 1 AND text <> '' ORDER BY id DESC LIMIT 6"),
      ]));
      if (results.some((r) => r.success === false)) throw new Error("stats");
      value.since = results[0].results?.[0]?.day || null;
      const countries = [];
      let weighted = 0, fourPlus = 0;
      for (const row of results[1].results || []) {
        const n = Number(row.n) || 0;
        if (["browsers", "students"].includes(row.name)) value[row.name] += n;
        if (row.name === "country" && /^[A-Z]{2}$/.test(row.key)) countries.push({ code: row.key, n });
        if (row.name === "rating" && /^[1-5]$/.test(row.key)) {
          value.ratings.count += n; weighted += Number(row.key) * n;
          if (Number(row.key) >= 4) fourPlus += n;
        }
      }
      value.countries = countries.length;
      value.topCountries = countries.sort((a, b) => b.n - a.n || a.code.localeCompare(b.code)).slice(0, 10);
      if (value.ratings.count) {
        value.ratings.average = Math.round(weighted / value.ratings.count * 10) / 10;
        value.ratings.fourPlus = Math.round(fourPlus / value.ratings.count * 100);
      }
      value.reviews = results[2].results || [];
    } catch { /* Old deployments can still serve the original counters before migration. */ }
    cache.set(db, { until: now + 300000, value });
    return value;
  } catch { return empty; }
}
