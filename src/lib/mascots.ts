// Pure helpers for the mascot dock: lane geometry and the rules for rare, dismissible nudges.
// No DOM here so it can be unit tested.

export type NudgeKind = "synonyms-select" | "coach-priority" | "ideas-empty";

/** Minimum time between any two nudge bubbles. */
export const NUDGE_COOLDOWN_MS = 4 * 60_000;
/** A dismissed nudge kind stays quiet this long. */
export const NUDGE_DISMISS_MS = 7 * 24 * 60 * 60_000;
/** How long a bubble stays before it hides itself (not counted as a dismissal). */
export const NUDGE_SHOW_MS = 10_000;
/** Ideas waits this long on an empty essay before offering a starting point. */
export const IDEAS_EMPTY_MS = 45_000;

const KEY = "bandexe-nudges";

export interface NudgeStore { last: number; dismissed: Partial<Record<NudgeKind, number>> }
type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;

const store = (): Storage | null => { try { return globalThis.localStorage ?? null; } catch { return null; } };

export function loadNudges(s: Storage | null = store()): NudgeStore {
  try {
    const raw = JSON.parse(s?.getItem(KEY) || "{}");
    const last = typeof raw.last === "number" ? raw.last : 0;
    const dismissed: NudgeStore["dismissed"] = {};
    if (raw.dismissed && typeof raw.dismissed === "object") {
      for (const [k, v] of Object.entries(raw.dismissed)) if (typeof v === "number") dismissed[k as NudgeKind] = v;
    }
    return { last, dismissed };
  } catch { return { last: 0, dismissed: {} }; }
}

export function saveNudges(n: NudgeStore, s: Storage | null = store()) {
  try { s?.setItem(KEY, JSON.stringify(n)); } catch { /* storage blocked: nudges just are not remembered */ }
}

/** One bubble per kind per page session, a global cooldown, and remembered dismissals. */
export function canNudge(n: NudgeStore, kind: NudgeKind, now: number, shownThisSession: ReadonlySet<NudgeKind>) {
  if (shownThisSession.has(kind)) return false;
  if (now - n.last < NUDGE_COOLDOWN_MS) return false;
  const d = n.dismissed[kind];
  return !(d && now - d < NUDGE_DISMISS_MS);
}

export const markShown = (n: NudgeStore, now: number): NudgeStore => ({ ...n, last: now });
export const markDismissed = (n: NudgeStore, kind: NudgeKind, now: number): NudgeStore => ({ ...n, dismissed: { ...n.dismissed, [kind]: now } });

/** The selection if it is one word (letters, apostrophes, hyphens), else null. */
export function singleWord(text: string): string | null {
  const w = text.trim();
  return w.length > 0 && w.length <= 40 && /^[\p{L}][\p{L}'’-]*$/u.test(w) ? w : null;
}

/** Shorten a report priority for a speech bubble, cutting at a word boundary. */
export function shortText(s: string, max = 110): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:.-]+$/, "") + "…";
}

/** Movement range for runner i so it never overlaps its neighbours (order stays fixed). */
export function laneBounds(i: number, bots: readonly { x: number; target: number }[], w: number, laneW: number, gap: number): [number, number] {
  const lo = i > 0 ? Math.max(bots[i - 1].x, bots[i - 1].target) + w + gap : 0;
  const hi = i < bots.length - 1 ? Math.min(bots[i + 1].x, bots[i + 1].target) - w - gap : laneW - w;
  return [lo, Math.max(lo, hi)];
}

/** Clamp positions into the lane after a resize, keeping order and spacing. */
export function fitLane(xs: readonly number[], w: number, laneW: number, gap: number): number[] {
  const out = [...xs];
  const n = out.length;
  for (let i = n - 1; i >= 0; i--) out[i] = Math.min(out[i], laneW - w - (n - 1 - i) * (w + gap), i < n - 1 ? out[i + 1] - w - gap : Infinity);
  for (let i = 0; i < n; i++) out[i] = Math.max(out[i], i ? out[i - 1] + w + gap : 0);
  return out;
}
