import type { Line } from "./spider";

/** One gutter chip per first-line row; every underlying mark keeps its own focus target. */
export function groupTags(ids: number[], geo: Record<number, Line[]>) {
  const groups: { ids: number[]; top: number; bottom: number }[] = [];
  const rows = ids.filter((id) => geo[id]?.length).sort((a, b) => geo[a][0].top - geo[b][0].top || a - b);
  for (const id of rows) {
    const q = geo[id][0], top = (q.top + q.bottom - 16) / 2;
    const last = groups.at(-1);
    if (last && top < last.bottom + 2) last.ids.push(id);
    else groups.push({ ids: [id], top, bottom: top + 16 });
  }
  return groups;
}

/** Place a popup wholly above or below the mark, limiting its scrollable height to the free space. */
export function placePopover(mark: Line, size: { width: number; height: number }, viewport: Line) {
  const gap = 8, left = Math.max(viewport.left + gap, Math.min(mark.left, viewport.right - size.width - gap));
  const above = Math.max(0, Math.min(mark.top, viewport.bottom) - viewport.top - gap * 2);
  const below = Math.max(0, viewport.bottom - Math.max(mark.bottom, viewport.top) - gap * 2);
  const side = below >= size.height || below >= above ? "below" : "above";
  const maxHeight = side === "below" ? below : above;
  const height = Math.min(size.height, maxHeight);
  const top = side === "below" ? Math.max(mark.bottom, viewport.top + gap) + gap : Math.min(mark.top, viewport.bottom - gap) - gap - height;
  return { left, top, maxHeight, side };
}

/** Report fragments are in-page links, so the app router must not treat them as a login route. */
export const isReportAnchor = (hash: string) => /^#r-(score|essay|criteria|grammar|words|paras|next|model|chat|crit-(tr|cc|lr|gra))$/.test(hash);
