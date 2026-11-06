// In-memory abuse limits that protect the shared Gemini quota. Keyed by the socket address only: client-supplied
// headers (X-Forwarded-For, X-Session) can be forged, so they are never trusted for these limits.
const HOUR = 3600_000;

/** Sliding-window limiter: allows `max` hits per `windowMs` per id, plus an optional global cap across all ids. */
export function makeQuota({ perId, global, windowMs = HOUR } = {}) {
  const seen = new Map();
  let all = [];
  return (id, now = Date.now()) => {
    all = all.filter((t) => now - t < windowMs);
    const list = (seen.get(id) || []).filter((t) => now - t < windowMs);
    if (list.length >= perId || all.length >= global) { seen.set(id, list); return false; }
    list.push(now);
    all.push(now);
    seen.set(id, list);
    if (seen.size > 5000) seen.delete(seen.keys().next().value);
    return true;
  };
}

/** Caps simultaneous upstream calls. acquire() returns a release function, or null when full. */
export function makeSlots(max) {
  let n = 0;
  return () => {
    if (n >= max) return null;
    n++;
    let done = false;
    return () => { if (!done) { done = true; n--; } };
  };
}

export const LIMIT_MESSAGE = "Daily free limit reached on this server, try later.";
