import { t as ui, translateUI } from "../lib/i18n";
// Issue marks drawn over an essay mirror: outlines for grammar, fill for word-choice upgrades,
// with first-line criterion tags. Shared by the spider scan and the report's marked essay,
// so the marks look identical in both places.
import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { CODE, mergeLines, type Issue } from "../lib/scan";
import { isScaled, type Line } from "../lib/spider";
import { groupTags } from "../lib/report";

/** Line rects of an element, in the container's content coordinates. */
export function measure(box: HTMLElement, el: Element): Line[] {
  const base = box.getBoundingClientRect();
  return mergeLines(Array.from(el.getClientRects())).map((r) => ({ left: r.left - base.left - box.clientLeft, right: r.right - base.left - box.clientLeft, top: r.top - base.top - box.clientTop + box.scrollTop, bottom: r.bottom - base.top - box.clientTop + box.scrollTop }));
}

/** Geometry of every [data-issue] span inside `text`, re-measured when deps change or the container resizes. */
export function useIssueGeo(box: RefObject<HTMLElement | null>, text: RefObject<HTMLElement | null>, deps: unknown[]) {
  const [geo, setGeo] = useState<Record<number, Line[]>>({});
  const [tick, setTick] = useState(0);
  useLayoutEffect(() => {
    if (!box.current || !text.current) return;
    // Measured mid screen-transition (scaled), boxes would sit off the words: measure again next frame.
    if (isScaled(box.current)) { const id = requestAnimationFrame(() => setTick((t) => t + 1)); return () => cancelAnimationFrame(id); }
    const g: Record<number, Line[]> = {};
    text.current.querySelectorAll<HTMLElement>("[data-issue]").forEach((el) => { g[Number(el.dataset.issue)] = measure(box.current!, el); });
    setGeo(g);
  }, [...deps, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const d = box.current;
    if (!d) return;
    const ro = new ResizeObserver(() => setTick((t) => t + 1));
    ro.observe(d);
    if (text.current) ro.observe(text.current);
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener("resize", refresh);
    window.addEventListener("bandexe:layout", refresh); // a screen transition finished: transforms do not trigger ResizeObserver
    document.fonts?.addEventListener("loadingdone", refresh);
    if (document.fonts) document.fonts.ready.then(() => setTick((t) => t + 1)).catch(() => {});
    return () => { ro.disconnect(); window.removeEventListener("resize", refresh); window.removeEventListener("bandexe:layout", refresh); document.fonts?.removeEventListener("loadingdone", refresh); };
  }, [box]);
  return geo;
}

/** Free space left and right of the text column, inside the container (where tags can sit without covering words). */
export function gutters(box: HTMLElement | null, text: HTMLElement | null) {
  if (!box || !text) return { left: 0, right: 0 };
  const b = box.getBoundingClientRect(), t = text.getBoundingClientRect(), cs = getComputedStyle(text);
  return { left: t.left - b.left + (parseFloat(cs.paddingLeft) || 0), right: b.right - t.right + (parseFloat(cs.paddingRight) || 0) };
}

/** Scan boxes follow every wrapped fragment; report marks use inline CSS and share these gutter tags. */
export function MarkLayer({ issues, geo, ids, instant, state, width, gutter, reveal, tagsOnly = false }: {
  issues: Issue[]; geo: Record<number, Line[]>; ids: number[]; instant: boolean; state?: (i: Issue) => string; width: number;
  gutter?: { left: number; right: number }; reveal?: number | null; tagsOnly?: boolean;
}) {
  const visible = ids.filter((id) => issues[id] && state?.(issues[id]) !== "accepted");
  const g = gutter ?? { left: 0, right: 0 };
  return (
    <div className="scan__boxes" aria-hidden="true">
      {!tagsOnly && visible.map((id) => (geo[id] || []).map((q, k) => {
        const is = issues[id], w = q.right - q.left + 6, h = q.bottom - q.top + 2;
        return (
          <div key={id + "-" + k} className={"scan-box" + (instant ? " is-instant" : "")}
            data-kind={is.kind} data-state={state?.(is) ?? "open"}
            style={{ left: q.left - 3, top: q.top - 1, width: w, height: h, ["--d" as string]: `${k * 0.04}s` }}>
            {is.kind === "grammar" && <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><path className="scan-box__line" d={`M0.5 0.5 H${w - 0.5} V${h - 0.5} H0.5 Z`} pathLength={1} /></svg>}
          </div>
        );
      }))}
      {groupTags(visible, geo).map((group) => {
        const id = reveal !== null && reveal !== undefined && group.ids.includes(reveal) ? reveal : group.ids[0];
        const code = CODE[issues[id].crit];
        const label = code + (group.ids.length > 1 ? ` +${group.ids.length - 1}` : "");
        const tw = label.length * 6 + 10;
        const left = g.left >= tw + 6 ? g.left - tw - 6 : width - g.right + 6;
        return <span key={group.ids[0]} className="scan-tag scan-tag--gutter" style={{ left, top: group.top }}><b>{translateUI(label)}</b></span>;
      })}
    </div>
  );
}

export function MarkLegend() {
  return (
    <div className="mark-legend" aria-label={ui("Legend")}>
      <span><span className="mark-key" data-kind="grammar" aria-hidden="true" />{ui("Grammar correction (outlined)")}</span>
      <span><span className="mark-key" data-kind="upgrade" aria-hidden="true" />{ui("Word-choice upgrade (highlighted)")}</span>
      <span className="muted">{ui("TR, CC, LR, GRA · + counts marks sharing a line. Hover or focus each mark for its criterion.")}</span>
    </div>
  );
}
