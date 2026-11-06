/** Pure rules for the dock playground. All distances are CSS pixels; clocks are milliseconds. */
export const SLEEP_AFTER_MS = 120_000;
export const DOUBLE_POKE_MS = 320;
export const DRAG_THRESHOLD = 7;
export const BOT_GAP = 8;
export type PlayKind = "tag" | "leapfrog" | "ball" | "high-five" | "dance" | "climb";
export const PLAYS: readonly PlayKind[] = ["tag", "leapfrog", "ball", "high-five", "dance", "climb"];
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(n, Math.max(lo, hi)));
const unit = (n: number) => clamp(Number.isFinite(n) ? n : 0, 0, 0.999999);

/** No back-to-back repeat; long quiet gaps after every short scene. Inject randomness for tests. */
export function nextPlay(previous: PlayKind | null, random: number): PlayKind {
  const options = PLAYS.filter((kind) => kind !== previous);
  return options[Math.floor(unit(random) * options.length)];
}
export const playGap = (random: number) => 9_000 + unit(random) * 11_000;
export const isSleepTime = (now: number, lastActivity: number) => now - lastActivity >= SLEEP_AFTER_MS;
export const idleRemaining = (now: number, lastActivity: number) => Math.max(0, SLEEP_AFTER_MS - (now - lastActivity));
export const isDoublePoke = (now: number, previous: number | null) => previous !== null && now >= previous && now - previous <= DOUBLE_POKE_MS;
export const isDrag = (dx: number, dy: number) => Math.hypot(dx, dy) >= DRAG_THRESHOLD;

export function dragBounds(x: number, y: number, width: number, laneWidth: number, headroom: number) {
  return { x: clamp(x, 0, laneWidth - width), y: clamp(y, -Math.max(0, headroom), 0) || 0 };
}

/** Keep the drop point when space allows; otherwise use the nearest safe slot and shift its friends. */
export function settleDrop(xs: readonly number[], dragged: number, x: number, width: number, laneWidth: number, gap = BOT_GAP): number[] {
  const edge = Math.max(0, laneWidth - width);
  const stride = Math.min(width + gap, edge / Math.max(1, xs.length - 1));
  const desired = clamp(x, 0, edge);
  const desiredRank = xs.filter((other, i) => i !== dragged && other < desired).length;
  const ranks = xs.map((_, rank) => {
    const anchor = clamp(desired, rank * stride, edge - (xs.length - 1 - rank) * stride);
    return { rank, anchor, distance: Math.abs(anchor - desired) };
  }).sort((a, b) => a.distance - b.distance || Math.abs(a.rank - desiredRank) - Math.abs(b.rank - desiredRank));
  const { rank, anchor } = ranks[0];
  const order = xs.map((_, i) => i).filter((i) => i !== dragged).sort((a, b) => xs[a] - xs[b]);
  order.splice(rank, 0, dragged);
  const out = [...xs];
  out[dragged] = anchor;
  for (let j = rank - 1; j >= 0; j--) out[order[j]] = clamp(xs[order[j]], j * stride, out[order[j + 1]] - stride);
  for (let j = rank + 1; j < order.length; j++) out[order[j]] = clamp(xs[order[j]], out[order[j - 1]] + stride, edge - (order.length - 1 - j) * stride);
  return out;
}

/** Meeting is distinct from a collision: neighbours leave a small gap for the high-five. */
export function areMeeting(a: { x: number; y: number }, b: { x: number; y: number }, width: number, reach = 14) {
  return Math.abs(Math.abs(a.x - b.x) - width) <= reach && Math.abs(a.y - b.y) < 12;
}
export const overlaps = (a: number, b: number, width: number, gap = BOT_GAP) => Math.abs(a - b) < width + gap;

export interface Rect { left: number; right: number; top: number; bottom: number }
/** Require the entire climb corridor to be empty, with a margin around content and controls. */
export function gutterClimb(viewWidth: number, dockTop: number, width: number, obstacles: readonly Rect[]) {
  const height = Math.min(180, dockTop * 0.3);
  if (height < 80 || viewWidth < 900) return null;
  for (const side of ["left", "right"] as const) {
    const left = side === "left" ? 8 : viewWidth - width - 8;
    const corridor = { left: left - 6, right: left + width + 6, top: dockTop - height - 12, bottom: dockTop };
    if (!obstacles.some((r) => r.right > corridor.left && r.left < corridor.right && r.bottom > corridor.top && r.top < corridor.bottom)) {
      return { x: left, height, side };
    }
  }
  return null;
}

export interface PlayConditions { held: boolean; occupied: boolean; scanning: boolean; sleeping: boolean; dragging: boolean }
export const canPlay = (c: PlayConditions) => !Object.values(c).some(Boolean);

/** DOM fallback signals and dispatched events share one transition gate, avoiding double cheers. */
export type AppReaction = "scan-start" | "scan-end" | "report-open";
export function reactionTransition(state: { scanning: boolean; report: boolean }, event: AppReaction) {
  if (event === "scan-start") return { scanning: true, report: false, cheer: false };
  if (event === "scan-end") return { ...state, scanning: false, cheer: false };
  return { scanning: false, report: true, cheer: !state.report };
}
