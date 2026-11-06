export * from "../../shared/helper.js";

/** Per-session limiter: `perWindow` requests per `windowMs`, plus a daily cap. Returns true when allowed. */
export function makeLimiter({ perWindow = 6, windowMs = 10 * 60_000, perDay = 30 } = {}) {
  const seen = new Map();
  return (id, now = Date.now()) => {
    const day = 24 * 3600_000;
    const list = (seen.get(id) || []).filter((t) => now - t < day);
    const recent = list.filter((t) => now - t < windowMs).length;
    if (recent >= perWindow || list.length >= perDay) { seen.set(id, list); return false; }
    list.push(now);
    seen.set(id, list);
    if (seen.size > 5000) seen.delete(seen.keys().next().value);
    return true;
  };
}

export const fixtureHelperReply = (v) =>
  v.role === "ideas"
    ? "Fixture reply (not AI): try a pattern such as \"One reason ... is that ...; for instance, ...\". Ask yourself who benefits most and give one specific example."
    : "Fixture reply (not AI): each of the four criteria counts for a quarter of your Writing band. Plan for about 5 minutes before you write.";
