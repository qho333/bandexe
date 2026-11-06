// Scanning spider: a thin line-drawn spider scurries around the read-only essay mirror like a living creature
// (quick curvy bursts, natural pauses, random direction changes, a faint silk trail). Its roaming drifts down the
// page over time; it darts to each reviewed issue, taps it with a front leg (the caller draws the box), and once
// every issue is boxed it heads to the bottom. Only then is the scan "done".
// Look (owner's reference video): a small upright capsule body with a glowing tip and eight thin,
// straight two-segment legs (one knee each), amber dots at every knee and foot.
// Feet plant ON words: every step snaps the foot onto the nearest word rectangle (Range.getClientRects) that is
// in reach, so it walks across the words themselves. A foot (or the pointing front leg) landing on a word of a
// reviewed issue marks that phrase. Legs: two-bone IK (law of cosines); alternating tetrapod gait; a leg re-plants
// before it can over-stretch or swing into a neighbour. Canvas scaled for devicePixelRatio.
// Robustness: it keeps roaming (never freezes) while the marker is slow, hurries once results exist, can be told to
// wrap up (box the rest, dash to the bottom), re-measures on reflow without stale targets, and follows itself
// with the scan view and, gently, the page (pausing while the student scrolls).
import { mergeLines } from "./scan";

type P = { x: number; y: number };
export type Line = { left: number; right: number; top: number; bottom: number };
export type SpiderPhase = "reading" | "waiting" | "done";
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const angDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export interface SpiderCallbacks { onBox: (id: number) => void; onPhase: (p: SpiderPhase) => void; onProgress: (paragraph: number) => void; onFoot?: (x: number, width: number) => void; onWalk?: (walking: boolean) => void; onDash?: () => void }

/** True while an ancestor transform scales `el` (the screen draw-in): client rects measured now land off the words. */
export const isScaled = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return el.offsetWidth > 0 && (Math.abs(r.width - el.offsetWidth) > 1 || Math.abs(r.height - el.offsetHeight) > 1);
};

export const spiderScale = (lineHeight: number) => Math.min(1.6, Math.max(0.8, lineHeight * 1.45 / 36));
export type Box = { x0: number; x1: number; y0: number; y1: number };
export interface Resume { x: number; y: number; a: number; progress: number }

/**
 * Where the body stands to tap a phrase: beside its first line on the nearer side that fits inside `box`
 * (the area the body may walk), else on the line above it (below for the first line). Always reachable.
 */
export function stopSpot(l: Line, body: P, box: Box, gap: number) {
  const y = (l.top + l.bottom) / 2, h = l.bottom - l.top, ty = l.top + h * 0.3;
  const fits = (p: P) => p.x >= box.x0 && p.x <= box.x1;
  const opts: { near: P; tip: P }[] = [];
  const left = { x: l.left - gap, y }, right = { x: l.right + gap, y };
  if (fits(left)) opts.push({ near: left, tip: { x: Math.min(l.left + 10, l.right - 2), y: ty } });
  if (fits(right)) opts.push({ near: right, tip: { x: Math.max(l.right - 10, l.left + 2), y: ty } });
  if (!opts.length) { // the phrase fills the line: stand over its start, one line up (or down)
    const x = clamp(l.left + gap * 0.6, box.x0, box.x1), up = l.top - gap * 0.75;
    opts.push(up >= box.y0 ? { near: { x, y: up }, tip: { x: Math.min(l.left + 10, l.right - 2), y: ty } } : { near: { x, y: l.bottom + gap * 0.75 }, tip: { x: Math.min(l.left + 10, l.right - 2), y: l.top + h * 0.7 } });
  }
  const best = opts.reduce((m, o) => (dist(o.near, body) < dist(m.near, body) ? o : m));
  return { near: { x: clamp(best.near.x, box.x0, box.x1), y: clamp(best.near.y, box.y0, box.y1) }, tip: best.tip };
}

/** Once results are back, the roaming still to do lasts at most `maxLeft` seconds (returns the new roam time). */
export const hurriedRoam = (progress: number, roamT: number, maxLeft = 2.5) =>
  progress >= 1 || (1 - progress) * roamT <= maxLeft ? roamT : maxLeft / (1 - progress);

/** Many issues: taps get quicker (up to 3x) so the crawl after results stays short. */
export const crawlPace = (issues: number) => clamp(issues / 5, 1, 3);

/**
 * Page scroll (px) that keeps the spider's viewport y inside a comfortable band. Nothing while the essay view is
 * off screen (the student scrolled away on purpose) or the spider is already in the band.
 */
export function pageNudge(y: number, view: number, docTop: number, docBottom: number, dt: number) {
  if (docBottom < 0 || docTop > view) return 0;
  const top = view * 0.2, bottom = view * 0.72;
  const over = y > bottom ? y - bottom : y < top ? y - top : 0;
  return over * Math.min(1, dt * 3);
}

const STOP_GAP = 38; // body centre stands this far from the phrase edge it taps
const TRAIL = 80;
const USER_SCROLL = ["wheel", "touchmove", "keydown"] as const; // the student is scrolling: pause page follow

interface LegDef { hip: P; rest: P; L: number; side: 1 | -1; front: boolean; group: 0 | 1 }
const LEGS: LegDef[] = (() => {
  // right side (y > 0 is the spider's right when it faces +x); left side is mirrored
  // body ~36px long, leg reach ~58-65px (about 1.6-1.8x the body)
  const right = [
    { hip: { x: 9, y: 5.5 }, a: 48, d: 46, front: true },
    { hip: { x: 3, y: 6.5 }, a: 82, d: 52, front: true },
    { hip: { x: -3, y: 6.5 }, a: 106, d: 52, front: false },
    { hip: { x: -9, y: 5.5 }, a: 140, d: 48, front: false },
  ];
  const out: LegDef[] = [];
  for (const side of [1, -1] as const) {
    right.forEach((l, i) => {
      const r = (l.a * Math.PI) / 180;
      const hx = l.hip.x, hy = l.hip.y;
      out.push({
        hip: { x: hx, y: hy * side },
        rest: { x: hx + Math.cos(r) * l.d, y: (hy + Math.sin(r) * l.d) * side },
        L: l.d / 0.8 / 2, // foot at 80% of full reach on the ideal spot: a visible knee bend
        side, front: l.front,
        group: ((i + (side === 1 ? 0 : 1)) % 2) as 0 | 1,
      });
    });
  }
  return out;
})();

interface Leg { foot: P; step: { from: P; to: P; t: number; dur: number; word: number } | null; bend: number }
interface Word { left: number; right: number; top: number; bottom: number; cx: number; cy: number; issue: number | null }
interface Stop { id: number; near: P; tip: P }
interface Target { p: P; kind: "wander" | "issue" | "bottom"; v: number; stop?: Stop }
interface Inspect { stop: Stop; t: number; leg: number; boxed: boolean; from: P }

export class Spider {
  private ctx: CanvasRenderingContext2D;
  private w = 0; private h = 0;
  private lines: Line[] = [];
  private area = { x0: 0, x1: 0, y0: 0, y1: 0 };
  private needsPlace = false; // last measure was squashed (mid screen transition): place on the next real one
  private walkBox: Box = { x0: 0, x1: 0, y0: 0, y1: 0 }; // where the body may go (text area +margin, inside the canvas)
  private paraTops: number[] = [];
  private roamT = 10; private progress = 0;
  private body = { x: 0, y: 0, a: 0 };
  private v = 0; private seed = Math.random() * 10;
  private legs: Leg[] = [];
  private defs = LEGS;
  private scale = 1;
  private paragraph = -1;
  private issues: number[] | null = null;
  private boxed = new Set<number>();
  private pace = 1;
  private sweep: { next: number } | null = null; // wrapping up: box the rest quickly and head for the bottom
  private mode: "pause" | "run" | "end" = "pause";
  private pauseLeft = 0.35; private look: number | null = null;
  private target: Target | null = null;
  private runT = 0; private runMax = 3; // a burst that overruns its time budget settles (never runs on the spot)
  private inspect: Inspect | null = null;
  private phase: SpiderPhase = "reading";
  private ripples: { p: P; t: number }[] = [];
  private words: Word[] = [];
  private flashes: { w: Word; t: number }[] = [];
  private trail: P[] = [];
  private walk = 0; private clock = 0; private last = 0; private raf = 0; private dt = 0; private speedNow = 0;
  private scrollY = 0; private userAt = -1e9;
  private colors = { leg: "", fill: "", dot: "", fg: "", edge: "" };
  private colorAt = -1;
  private ro: ResizeObserver | null = null;
  private dead = false;
  private retry = 0; private waits = 0;
  private frameAt = performance.now();

  constructor(private doc: HTMLElement, private canvas: HTMLCanvasElement, private text: HTMLElement, private cb: SpiderCallbacks, resume?: Resume) {
    this.ctx = canvas.getContext("2d")!;
    this.layout(true);
    if (resume && this.legs.length) { // back on the screen mid-scan: carry on from where it was, not from the top
      this.progress = clamp(resume.progress, 0, 1);
      this.body = { x: clamp(resume.x, this.walkBox.x0, this.walkBox.x1), y: clamp(resume.y, this.walkBox.y0, this.walkBox.y1), a: resume.a };
      this.restLegs();
    }
    this.scrollY = doc.scrollTop;
    this.ro = new ResizeObserver(this.relayout);
    this.ro.observe(doc);
    this.ro.observe(text);
    document.fonts?.addEventListener("loadingdone", this.relayout);
    window.addEventListener("resize", this.relayout);
    window.addEventListener("bandexe:layout", this.relayout); // a screen transition finished: measure the real layout
    for (const e of USER_SCROLL) window.addEventListener(e, this.onUser, { passive: true });
    this.raf = requestAnimationFrame(this.frame);
    if (import.meta.env.DEV) (window as unknown as { __spider?: Spider }).__spider = this; // dev inspection only
  }

  destroy() {
    this.dead = true;
    this.cb.onWalk?.(false);
    cancelAnimationFrame(this.raf);
    cancelAnimationFrame(this.retry);
    this.ro?.disconnect();
    this.ro = null;
    document.fonts?.removeEventListener("loadingdone", this.relayout);
    window.removeEventListener("resize", this.relayout);
    window.removeEventListener("bandexe:layout", this.relayout);
    for (const e of USER_SCROLL) window.removeEventListener(e, this.onUser);
    this.ctx.clearRect(0, 0, this.w, this.h);
    if (import.meta.env.DEV && (window as unknown as { __spider?: Spider }).__spider === this) delete (window as unknown as { __spider?: Spider }).__spider;
  }

  /** No animation frame for a while: the browser paused requestAnimationFrame (background tab, hidden pane or frame). */
  stalled(ms = 1500) {
    return performance.now() - this.frameAt > ms;
  }

  /** Position and roaming progress, so a new spider can resume after the screen was left. */
  snapshot(): Resume {
    return { x: this.body.x, y: this.body.y, a: this.body.a, progress: this.progress };
  }

  /**
   * Reviewed issues are known (ids of [data-issue] spans; empty = none); `already` were boxed before (a resumed scan).
   * From now on the remaining roam is short and taps speed up with the number of issues.
   */
  setIssues(ids: number[], already: number[] = []) {
    this.issues = ids;
    for (const id of already) this.boxed.add(id);
    this.pace = crawlPace(ids.length);
    this.roamT = hurriedRoam(this.progress, this.roamT);
    this.layout(false); // issue spans now exist in the mirror (and their borders may reflow the text)
    if (this.phase === "waiting") this.setPhase("reading");
    if (this.mode === "end" || this.target?.kind === "wander") { this.mode = "pause"; this.pauseLeft = 0.15; this.target = null; }
  }

  /** Out of time: box every remaining issue in quick succession and dash to the bottom. */
  wrapUp() {
    if (this.sweep || this.issues === null) return;
    this.sweep = { next: 0 };
    this.progress = 1;
    this.inspect = null;
    if (this.mode !== "end") { this.mode = "pause"; this.pauseLeft = 0; this.target = null; }
  }

  // ---------- layout ----------
  private toDoc(r: { left: number; right: number; top: number; bottom: number }): Line {
    const base = this.doc.getBoundingClientRect();
    return { left: r.left - base.left - this.doc.clientLeft, right: r.right - base.left - this.doc.clientLeft, top: r.top - base.top - this.doc.clientTop + this.doc.scrollTop, bottom: r.bottom - base.top - this.doc.clientTop + this.doc.scrollTop };
  }

  private onUser = () => { this.userAt = performance.now(); };
  private relayout = () => { if (!this.dead) this.layout(false); };

  /** Re-measure everything. The first call places the spider; later calls (reflow, resize, fonts, issues) keep its state. */
  private layout(first: boolean) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = this.doc.clientWidth, h = Math.max(this.text.offsetTop + this.text.offsetHeight, this.doc.clientHeight);
    if (!w || !h) return; // hidden (display: none): measure again when it shows
    this.scale = spiderScale(parseFloat(getComputedStyle(this.text).lineHeight) || 26);
    this.defs = LEGS.map((d) => ({ ...d, hip: { x: d.hip.x * this.scale, y: d.hip.y * this.scale }, rest: { x: d.rest.x * this.scale, y: d.rest.y * this.scale }, L: d.L * this.scale }));
    if (w !== this.w || h !== this.h || this.canvas.width !== Math.round(w * dpr)) {
      this.canvas.style.width = w + "px";
      this.canvas.style.height = h + "px";
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w; this.h = h;
    // Mid screen-transition the essay is scaled, so every rect would be off the words. Re-measure each frame until
    // it is full size (bounded, in case something keeps it scaled), then place the spider on the real layout.
    if (isScaled(this.doc) && this.waits++ < 60) {
      if (first || !this.legs.length) this.needsPlace = true;
      cancelAnimationFrame(this.retry);
      this.retry = requestAnimationFrame(this.relayout);
      return;
    }
    this.waits = 0;

    const lines: Line[] = [];
    this.paraTops = [];
    this.text.querySelectorAll("p").forEach((p) => {
      const r = document.createRange();
      r.selectNodeContents(p);
      const ls = mergeLines(Array.from(r.getClientRects())).filter((l) => l.right - l.left > 8).map((l) => this.toDoc(l));
      this.paraTops.push(ls.length ? ls[0].top : this.toDoc(p.getBoundingClientRect()).top);
      lines.push(...ls);
    });
    if (!lines.length) lines.push({ left: 32, right: Math.max(64, w - 32), top: 24, bottom: 50 });
    // Measured mid-transition (the screen scaled to a thin line): don't place anything on a squashed layout.
    // Wait for the real one (bandexe:layout / resize), then place the spider fresh.
    const squashed = lines.length > 1 && lines.every((l) => l.bottom - l.top < 6);
    if (squashed) { this.needsPlace = true; return; }
    const prevH = this.area.y1 - this.area.y0;
    this.lines = lines;
    const ax0 = Math.min(...lines.map((l) => l.left)) + 20, ax1 = Math.max(...lines.map((l) => l.right)) - 20;
    const ay0 = lines[0].top + 8, ay1 = lines[lines.length - 1].bottom - 8;
    // a one-word line or a single short line: keep the area non-empty
    this.area = { x0: Math.min(ax0, (ax0 + ax1) / 2), x1: Math.max(ax1, (ax0 + ax1) / 2), y0: Math.min(ay0, (ay0 + ay1) / 2), y1: Math.max(ay1, (ay0 + ay1) / 2) };
    // No margin above the first line (by0): up there the legs have no words to stand on and look stretched.
    const m = 18 * this.scale, a = this.area;
    const bx0 = Math.max(m, a.x0 - 40), bx1 = Math.min(w - m, a.x1 + 40), by0 = Math.max(m * 0.7, a.y0 + 4), by1 = Math.min(h - m * 0.7, a.y1 + 20);
    this.walkBox = { x0: Math.min(bx0, bx1), x1: Math.max(bx0, bx1), y0: Math.min(by0, by1), y1: Math.max(by0, by1) };
    this.measureWords();
    if (this.issues === null || first) this.roamT = clamp(lines.length * 0.45, 7, 11); // drift top to bottom over 7-11 s while the marker works

    const wb = this.walkBox;
    const newH = this.area.y1 - this.area.y0;
    const jumped = !first && prevH > 0 && Math.abs(newH - prevH) > Math.max(40, prevH * 0.3);
    const place = first || this.needsPlace || !this.legs.length || (jumped && this.progress < 0.15 && !this.boxed.size);
    this.needsPlace = false;
    if (place) { // (or the first measure that saw the real layout: it was hidden or squashed until now)
      this.body = { x: Math.min(a.x1, a.x0 + 55 * this.scale), y: Math.min(a.y1, a.y0 + 45 * this.scale), a: 0.25 };
      this.restLegs(); // feet start planted around the body: frame 1 already looks right
      this.trail = [];
      this.mode = "pause"; this.pauseLeft = 0.15;
    } else {
      this.body.x = clamp(this.body.x, wb.x0, wb.x1); this.body.y = clamp(this.body.y, wb.y0, wb.y1);
      this.trail = [];
      if (jumped) this.restLegs(); // the words moved a lot: re-plant every foot on the new words instead of stretching
      // targets measured before the reflow are stale: re-aim at the same issue (or the new bottom)
      if (this.inspect) { const st = this.stopFor(this.inspect.stop.id); if (st) this.inspect.stop = st; else this.inspect = null; }
      if (this.target?.stop) { const st = this.stopFor(this.target.stop.id); if (st) { this.target.stop = st; this.target.p = st.near; } else this.target = null; }
      else if (this.target?.kind === "bottom") this.target.p = this.bottomSpot();
      else if (this.target) this.target.p = { x: clamp(this.target.p.x, a.x0, a.x1), y: clamp(this.target.p.y, a.y0, a.y1) };
      if (!this.target && this.mode === "run") { this.mode = "pause"; this.pauseLeft = 0.1; }
    }
    this.flashes = []; this.ripples = [];
    this.draw();
  }

  /** All feet planted on their rest spots around the body (snapped onto words). */
  private restLegs() {
    this.legs = this.defs.map((d) => ({ foot: this.plantOn(this.toWorld(d.rest), this.toWorld(d.hip), 2 * d.L, true).p, step: null, bend: d.side * (d.front ? -1 : 1) }));
  }

  /** Every word of the mirror as a rectangle (doc coords), tagged with its issue id when inside an issue span. */
  private measureWords() {
    const out: Word[] = [];
    const walker = document.createTreeWalker(this.text, NodeFilter.SHOW_TEXT);
    const r = document.createRange();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const host = (n.parentElement?.closest("[data-issue]") as HTMLElement | null)?.dataset.issue;
      const issue = host !== undefined ? Number(host) : null;
      for (const m of (n.textContent || "").matchAll(/\S+/g)) {
        r.setStart(n, m.index!);
        r.setEnd(n, m.index! + m[0].length);
        const q = r.getClientRects()[0];
        if (!q || q.width < 2) continue;
        const d = this.toDoc(q);
        out.push({ ...d, cx: (d.left + d.right) / 2, cy: (d.top + d.bottom) / 2, issue });
      }
    }
    this.words = out;
  }

  /** Snap a foot target to the word nearest the desired spot that the leg can reach from where its hip will be. */
  private plantOn(want: P, hip: P, reach: number, resting = false): { p: P; word: number } {
    // Look near the wanted spot first; if a paragraph gap or margin leaves no word there, widen the search
    // (still within the leg's reach) before ever planting on blank space. Measured on real essays: ~1 in 10
    // planted feet landed off words with only the tight window.
    const near = this.plantSearch(want, hip, reach, resting, 30, 34);
    if (near.word >= 0 || resting) return near;
    const wide = this.plantSearch(want, hip, reach, resting, reach, reach);
    if (wide.word >= 0) return wide;
    // Running fast, the stride rules above can reject every word; any word the leg can actually reach beats blank
    // space (measured: nearly all off-word plants happened while running).
    let best = -1, score = Infinity;
    for (let i = 0; i < this.words.length; i++) {
      const w = this.words[i];
      const p = { x: clamp(want.x, w.left + 3, w.right - 3), y: w.cy };
      if (dist(p, hip) > reach * 0.97) continue;
      const sc = dist(p, want);
      if (sc < score) { score = sc; best = i; }
    }
    if (best < 0) return wide;
    const w = this.words[best];
    return { p: { x: clamp(want.x, w.left + 3, w.right - 3), y: w.cy }, word: best };
  }

  private plantSearch(want: P, hip: P, reach: number, resting: boolean, dyMax: number, dxMax: number): { p: P; word: number } {
    let best = -1, score = Infinity;
    const pend = new Set(this.pending());
    for (let i = 0; i < this.words.length; i++) {
      const w = this.words[i];
      if (Math.abs(w.cy - want.y) > dyMax || w.right < want.x - dxMax || w.left > want.x + dxMax) continue;
      const p = { x: clamp(want.x, w.left + 3, w.right - 3), y: w.cy };
      const dh = dist(p, hip);
      if (resting && Math.abs(angDiff(Math.atan2(p.y - hip.y, p.x - hip.x), Math.atan2(want.y - hip.y, want.x - hip.x))) > 0.35) continue;
      if (dh > reach * 0.93 || dh < reach * 0.5) continue;
      const sc = dist(p, want) - (w.issue !== null && pend.has(w.issue) && !resting ? 26 : 0);
      if (sc < score) { score = sc; best = i; }
    }
    if (best < 0) return { p: want, word: -1 };
    const w = this.words[best];
    return { p: { x: clamp(want.x, w.left + 3, w.right - 3), y: w.cy }, word: best };
  }

  /** A foot touched a word: brief flash, and an issue word marks its phrase. */
  private touch(word: number, at: P) {
    const w = this.words[word];
    if (!w) return;
    this.flashes.push({ w, t: 0 });
    if (w.issue !== null && this.issues?.includes(w.issue) && !this.boxed.has(w.issue)) this.mark(w.issue, at);
  }

  private mark(id: number, at: P) {
    if (this.boxed.has(id)) return;
    this.boxed.add(id);
    this.cb.onBox(id);
    this.ripples.push({ p: { ...at }, t: 0 });
  }

  private stopFor(id: number): Stop | null {
    const el = this.text.querySelector(`[data-issue="${id}"]`);
    if (!el) return null;
    const ls = mergeLines(Array.from(el.getClientRects()));
    if (!ls.length) return null;
    return { id, ...stopSpot(this.toDoc(ls[0]), this.body, this.walkBox, STOP_GAP * this.scale) };
  }

  private bottomSpot(): P {
    const last = this.lines[this.lines.length - 1], a = this.area;
    return { x: clamp(last.right - 40, a.x0, a.x1), y: clamp((last.top + last.bottom) / 2 + 4, this.walkBox.y0, this.walkBox.y1) };
  }

  // ---------- behaviour ----------
  private toWorld(l: P, b = this.body): P {
    const c = Math.cos(b.a), s = Math.sin(b.a);
    return { x: b.x + l.x * c - l.y * s, y: b.y + l.x * s + l.y * c };
  }

  private setPhase(p: SpiderPhase) {
    if (this.phase !== p) { this.phase = p; this.cb.onPhase(p); }
  }

  private pending() {
    return (this.issues || []).filter((id) => !this.boxed.has(id));
  }

  private go(target: Target) {
    if (target.kind === "bottom" && this.target?.kind !== "bottom") this.cb.onDash?.();
    this.target = target;
    this.runT = 0;
    this.runMax = 1.5 + (2.2 * dist(target.p, this.body)) / target.v;
    this.mode = "run";
  }

  /** Pick the next burst: dart to an issue the roaming has reached, wander, wait (still roaming), or head for the bottom. */
  private choose() {
    const a = this.area, focus = a.y0 + this.progress * (a.y1 - a.y0);
    const ids = this.pending(), pend: Stop[] = [];
    for (const id of ids) { const s = this.stopFor(id); if (s) pend.push(s); else this.mark(id, this.body); } // unmeasurable span: box it anyway
    const nearest = (list: Stop[]) => list.reduce((m, s) => (dist(s.near, this.body) < dist(m.near, this.body) ? s : m));
    if (this.sweep) return this.go({ p: this.bottomSpot(), kind: "bottom", v: 460 });
    const reached = pend.filter((s) => s.near.y < focus + 70);
    const overdue = reached.some((s) => s.near.y < focus - 50);
    const fast = 1 + (this.pace - 1) * 0.3;
    if (reached.length && (overdue || Math.random() < 0.6)) {
      const s = nearest(reached);
      return this.go({ p: s.near, kind: "issue", v: 300 * fast, stop: s });
    }
    if (this.progress >= 1 && this.issues !== null) {
      if (pend.length) { const s = nearest(pend); return this.go({ p: s.near, kind: "issue", v: 300 * fast, stop: s }); }
      const end = this.bottomSpot(); // a long way down: run faster, so the last stretch takes about two seconds at most
      return this.go({ p: end, kind: "bottom", v: Math.max(280 * fast, dist(end, this.body) / 2) });
    }
    // roaming; once the whole essay is read and the marker is still busy, it keeps wandering anywhere
    const waiting = this.progress >= 1;
    if (waiting) this.setPhase("waiting");
    let p: P = { x: this.body.x, y: this.body.y };
    // Aim at real words, not random points in the text's bounding box: short last lines, paragraph gaps and ragged
    // right edges are blank, and a body over blank space leaves its legs stretched over nothing (seen during slow
    // marker replies, when the waiting roam runs for 30-50 s).
    const near = waiting ? this.words : this.words.filter((w) => Math.abs(w.cy - focus) < 110);
    const pool = near.length ? near : this.words;
    for (let i = 0; i < 8; i++) {
      if (pool.length) {
        const w = pool[Math.floor(Math.random() * pool.length)];
        p = { x: clamp(rnd(w.left, w.right), a.x0, a.x1), y: clamp(w.cy, a.y0, a.y1) };
      } else p = { x: rnd(a.x0, a.x1), y: waiting ? rnd(a.y0, a.y1) : clamp(focus + rnd(-70, 90), a.y0, a.y1) };
      const d = dist(p, this.body);
      if (d > 90 && d < 340) break;
    }
    this.go({ p, kind: "wander", v: waiting ? rnd(150, 220) : rnd(190, 270) });
  }

  private frame = (t: number) => {
    if (this.dead) return;
    if (!this.legs.length) { this.frameAt = performance.now(); this.raf = requestAnimationFrame(this.frame); return; } // not measured yet (view hidden)
    // Low frame rates (throttled pane, slow phone): catch up in small sub-steps so time on screen stays real.
    let left = Math.min(0.5, (t - (this.last || t)) / 1000);
    this.last = t;
    this.dt = left; // ripples and flashes age by the whole frame
    do {
      const dt = Math.min(0.05, left);
      left -= dt;
      this.tick(dt);
    } while (left > 1e-3);
    let reached = 0;
    this.paraTops.forEach((top, i) => { if (top <= this.body.y) reached = i; });
    if (reached > this.paragraph) { this.paragraph = reached; this.cb.onProgress(reached); }
    this.follow(this.dt);
    this.draw();
    this.frameAt = performance.now();
    cancelAnimationFrame(this.raf); // exactly one loop, whoever called
    this.raf = requestAnimationFrame(this.frame);
  };

  private tick(dt: number) {
    this.clock += dt;
    const prev = { x: this.body.x, y: this.body.y };
    this.move(dt);
    const moved = Math.hypot(this.body.x - prev.x, this.body.y - prev.y);
    const vel = { x: (this.body.x - prev.x) / Math.max(dt, 1e-3), y: (this.body.y - prev.y) / Math.max(dt, 1e-3) };
    this.speedNow = Math.hypot(vel.x, vel.y);
    this.cb.onWalk?.(this.speedNow > 5);
    this.walk += moved;
    if (moved > 0) {
      const tail = this.toWorld({ x: -18, y: 0 });
      const lastT = this.trail[this.trail.length - 1];
      if (!lastT || dist(lastT, tail) > 3) { this.trail.push(tail); if (this.trail.length > TRAIL) this.trail.shift(); }
    }
    this.stepLegs(dt, vel);
  }

  private turnTo(want: number, rate: number, dt: number) {
    const d = angDiff(want, this.body.a);
    this.body.a += Math.sign(d) * Math.min(Math.abs(d), rate * dt, Math.abs(d) * Math.min(1, dt * 10));
  }

  private move(dt: number) {
    const b = this.body;
    if (this.sweep) this.sweepStep(dt);
    if (this.inspect) return this.runInspect(dt);
    if (this.mode !== "end") this.progress = Math.min(1, this.progress + dt / this.roamT);

    if (this.mode === "pause") {
      this.v = 0;
      if (this.look !== null) this.turnTo(this.look, 3, dt);
      this.pauseLeft -= dt;
      if (this.pauseLeft <= 0) { this.look = null; this.choose(); }
      return;
    }

    if (this.mode === "run" && this.target?.kind === "issue" && this.target.stop && this.boxed.has(this.target.stop.id)) this.choose(); // a foot already marked it
    if (this.mode === "run" && this.target) {
      const tg = this.target, dx = tg.p.x - b.x, dy = tg.p.y - b.y, d = Math.hypot(dx, dy);
      const settle = tg.kind === "issue" ? 2.5 : 6;
      this.runT += dt;
      if (d < settle || this.runT > this.runMax) return this.arrive();
      // curvy path: steer at the target with a slow wobble that fades near arrival
      const wobble = Math.sin(this.clock * 2.1 + this.seed) * 0.6 * Math.min(1, d / 140);
      const want = Math.atan2(dy, dx) + (d > 20 ? wobble : 0), err = Math.abs(angDiff(want, b.a));
      if (d > 16) this.turnTo(want, 7.5, dt);
      const goal = tg.v * clamp(d / 75, 0.22, 1) * Math.max(0.15, Math.cos(Math.min(err, Math.PI / 2)));
      this.v += (goal - this.v) * Math.min(1, dt * 9);
      const s = Math.min(d, this.v * dt);
      if (d <= 16) { b.x += (dx / d) * s; b.y += (dy / d) * s; } // settle onto the spot
      else { b.x += Math.cos(b.a) * s; b.y += Math.sin(b.a) * s; }
      const wb = this.walkBox;
      b.x = clamp(b.x, wb.x0, wb.x1);
      b.y = clamp(b.y, wb.y0, wb.y1);
      return;
    }

    // end: at the bottom. Done only when the result is in and every issue is boxed.
    this.v = 0;
    if (this.issues === null) { this.mode = "pause"; this.pauseLeft = 0.3; } // (not expected) keep roaming while waiting
    else if (this.pending().length) { if (!this.sweep) { this.mode = "pause"; this.pauseLeft = 0.2; } }
    else this.setPhase("done");
  }

  /** Wrap-up: one remaining issue boxed every few frames (ripple on its words), whatever the body is doing. */
  private sweepStep(dt: number) {
    const sw = this.sweep!, ids = this.pending();
    if (!ids.length || (sw.next -= dt) > 0) return;
    sw.next = Math.min(0.07, 1.2 / ids.length);
    const st = this.stopFor(ids[0]);
    this.mark(ids[0], st ? st.tip : this.body);
  }

  private arrive() {
    const tg = this.target!;
    this.target = null;
    this.v = 0;
    if (tg.kind === "issue" && tg.stop) {
      if (!this.boxed.has(tg.stop.id)) return this.beginInspect(tg.stop); // after an overrun it taps from where it stands
      this.mode = "pause"; this.pauseLeft = 0.15; return;
    }
    if (tg.kind === "bottom") { this.mode = "end"; return; }
    this.mode = "pause";
    this.pauseLeft = Math.random() < 0.25 ? rnd(0.7, 1.1) : rnd(0.15, 0.5);
    this.look = Math.random() < 0.35 ? this.body.a + rnd(-0.7, 0.7) : null;
  }

  private beginInspect(stop: Stop) {
    const b = this.body;
    const leg = angDiff(Math.atan2(stop.tip.y - b.y, stop.tip.x - b.x), b.a) >= 0 ? 0 : 4; // right front leg (0) or left (4)
    const L = this.legs[leg];
    if (L.step) { L.foot = L.step.to; L.step = null; }
    this.inspect = { stop, t: 0, leg, boxed: false, from: { ...L.foot } };
  }

  private runInspect(dt: number) {
    const step = dt * 1000 * this.pace, ins = this.inspect!, b = this.body, ms = (ins.t += step);
    if (ms < 260) this.turnTo(Math.atan2(ins.stop.tip.y - b.y, ins.stop.tip.x - b.x), 5, dt);
    if (!ins.boxed && ms >= 470) {
      ins.boxed = true;
      this.cb.onFoot?.(this.pointFoot(ins).x, this.w);
      if (!this.boxed.has(ins.stop.id)) this.mark(ins.stop.id, ins.stop.tip); else this.ripples.push({ p: { ...ins.stop.tip }, t: 0 });
    }
    if (ms >= 760 && ms - step < 760) {
      this.cb.onFoot?.(this.pointFoot(ins).x, this.w);
      this.ripples.push({ p: { ...ins.stop.tip }, t: 0 });
    }
    if (ms >= 1250) {
      const L = this.legs[ins.leg];
      const d = this.defs[ins.leg], pl = this.plantOn(this.toWorld(d.rest), this.toWorld(d.hip), 2 * d.L);
      L.step = { from: this.pointFoot(ins), to: pl.p, t: 0, dur: 160, word: pl.word };
      this.inspect = null;
      this.mode = "pause";
      this.pauseLeft = 0.2;
    }
  }

  /** Foot of the pointing leg: reach out, tap, lift a little, tap again, hold. Clamped to the leg's reach. */
  private pointFoot(ins: Inspect): P {
    const ms = ins.t, d = this.defs[ins.leg];
    const hip = this.toWorld(d.hip);
    const reach = 2 * d.L * 0.95;
    let tip = ins.stop.tip;
    const dd = dist(hip, tip);
    if (dd > reach) tip = { x: hip.x + ((tip.x - hip.x) * reach) / dd, y: hip.y + ((tip.y - hip.y) * reach) / dd };
    let k = ease((ms - 260) / 210);
    if (ms > 560 && ms < 760) k = 1 - 0.18 * Math.sin(((ms - 560) / 200) * Math.PI);
    return { x: ins.from.x + (tip.x - ins.from.x) * k, y: ins.from.y + (tip.y - ins.from.y) * k };
  }

  private stepLegs(dt: number, vel: P) {
    const sp = Math.hypot(vel.x, vel.y);
    const dir = sp > 5 ? { x: vel.x / sp, y: vel.y / sp } : { x: 0, y: 0 };
    const T = 14 + Math.min(10, sp * 0.035); // longer strides when running
    const dur = sp > 5 ? clamp(((T * 1.45) / sp) * 0.46 * 1000, 55, 140) : 130;
    const busy = [false, false];
    const pointing = this.inspect?.leg ?? -1;
    this.legs.forEach((l, i) => {
      const d = this.defs[i];
      const target = (i === pointing ? -1 : 1) * d.side * (d.front ? -1 : 1);
      l.bend += Math.sign(target - l.bend) * Math.min(Math.abs(target - l.bend), dt * 9);
      if (l.step) {
        l.step.t += (dt * 1000) / l.step.dur;
        if (l.step.t >= 1) { l.foot = l.step.to; this.cb.onFoot?.(l.foot.x, this.w); if (l.step.word >= 0) this.touch(l.step.word, l.foot); l.step = null; }
        else if (i !== pointing) busy[d.group] = true;
      }
    });
    const need = [0, 0], urgent = [false, false];
    this.legs.forEach((l, i) => {
      if (l.step || i === pointing) return;
      const d = this.defs[i], ideal = this.toWorld(d.rest), hip = this.toWorld(d.hip);
      const reach = dist(l.foot, hip);
      if (reach > 2 * d.L * 1.6) { l.foot = ideal; return; } // after a relayout jump
      need[d.group] = Math.max(need[d.group], dist(l.foot, ideal));
      if (reach > 2 * d.L * 0.96 || reach < 2 * d.L * 0.45) urgent[d.group] = true;
      // a foot swinging too far round its hip (body turning) would cross a neighbour: re-plant it
      const restA = Math.atan2(d.rest.y - d.hip.y, d.rest.x - d.hip.x) + this.body.a;
      if (Math.abs(angDiff(Math.atan2(l.foot.y - hip.y, l.foot.x - hip.x), restA)) > 0.42) urgent[d.group] = true;
    });
    for (const g of need[0] >= need[1] ? [0, 1] : [1, 0]) {
      if (busy[g] || (busy[1 - g] && !urgent[g])) continue;
      if (need[g] < T && !urgent[g]) continue;
      const ahead = { x: vel.x * (dur / 1000), y: vel.y * (dur / 1000) };
      this.legs.forEach((l, i) => {
        const d = this.defs[i];
        if (d.group !== g || l.step || i === pointing) return;
        const ideal = this.toWorld(d.rest), hipL = this.toWorld(d.hip);
        const want = { x: ideal.x + ahead.x + dir.x * T * 0.45, y: ideal.y + ahead.y + dir.y * T * 0.45 };
        const pl = this.plantOn(want, { x: hipL.x + ahead.x, y: hipL.y + ahead.y }, 2 * d.L);
        if (dist(l.foot, pl.p) > 3) l.step = { from: { ...l.foot }, to: pl.p, t: 0, dur, word: pl.word };
      });
      break;
    }
  }

  /** Keep the spider in view: the scan view scrolls with it, and the page nudges along when the view is taller than the window. */
  private follow(dt: number) {
    const d = this.doc;
    if (d.scrollHeight > d.clientHeight + 2) {
      const want = clamp(this.body.y - d.clientHeight * 0.45, 0, d.scrollHeight - d.clientHeight);
      if (Math.abs(d.scrollTop - this.scrollY) > 2) this.scrollY = d.scrollTop; // someone else scrolled it (focus, find in page)
      this.scrollY += (want - this.scrollY) * Math.min(1, dt * 3); // float state: scrollTop rounds tiny steps away
      d.scrollTop = this.scrollY;
    }
    if (performance.now() - this.userAt < 2500) return; // the student is scrolling the page: do not fight them
    const r = d.getBoundingClientRect();
    const y = r.top + d.clientTop + this.body.y - d.scrollTop;
    const by = pageNudge(y, window.innerHeight, r.top, r.bottom, dt);
    if (Math.abs(by) >= 0.5) window.scrollBy({ top: by, behavior: "instant" });
  }

  // ---------- drawing ----------
  private readColors() {
    if (this.colorAt >= 0 && this.clock - this.colorAt < 0.5) return;
    this.colorAt = this.clock;
    const cs = getComputedStyle(this.doc);
    const v = (n: string) => cs.getPropertyValue(n).trim();
    this.colors = { leg: v("--spider-leg"), fill: v("--editor-bg"), dot: v("--spider-dot"), fg: v("--editor-fg"), edge: v("--spider-dot-edge") };
  }

  private legPoints(i: number) {
    const d = this.defs[i], l = this.legs[i];
    const hip = this.toWorld(d.hip);
    let foot = l.foot, lift = 0;
    if (this.inspect?.leg === i) { foot = this.pointFoot(this.inspect); lift = 0.3; }
    else if (l.step) {
      const e = 1 - Math.pow(1 - l.step.t, 3);
      foot = { x: l.step.from.x + (l.step.to.x - l.step.from.x) * e, y: l.step.from.y + (l.step.to.y - l.step.from.y) * e };
      lift = Math.sin(l.step.t * Math.PI);
      foot = { x: foot.x + (hip.x - foot.x) * 0.08 * lift, y: foot.y + (hip.y - foot.y) * 0.08 * lift }; // lifted foot draws in
    } else if (this.phase === "waiting" && d.front && d.hip.x > 6) {
      const k = Math.max(0, Math.sin(this.clock * 2.4 + (d.side > 0 ? 0 : Math.PI)));
      foot = { x: foot.x + (hip.x - foot.x) * 0.1 * k * k, y: foot.y + (hip.y - foot.y) * 0.1 * k * k };
    }
    const reach = 2 * d.L * 0.98, distance = dist(hip, foot);
    if (distance > reach) foot = { x: hip.x + (foot.x - hip.x) * reach / distance, y: hip.y + (foot.y - hip.y) * reach / distance };
    const fx = foot.x - hip.x, fy = foot.y - hip.y;
    const L = d.L, da = clamp(Math.hypot(fx, fy), 2, 2 * L - 0.01);
    const phi = Math.atan2(fy, fx) + l.bend * Math.acos(Math.min(1, da / (2 * L)));
    const knee = { x: hip.x + Math.cos(phi) * L, y: hip.y + Math.sin(phi) * L };
    return { hip, knee, foot, lift };
  }

  private draw() {
    if (!this.legs.length) return;
    this.readColors();
    const c = this.ctx, b = this.body, { leg, fill, dot } = this.colors;
    c.clearRect(0, 0, this.w, this.h);
    c.lineCap = "round"; c.lineJoin = "round";

    // very faint neutral underline flash (~250 ms) on words a foot touches; unlike the issue marks
    this.flashes = this.flashes.filter((f) => (f.t += this.dt) < 0.25);
    c.fillStyle = this.colors.fg;
    for (const f of this.flashes) {
      c.globalAlpha = 0.12 * (1 - f.t / 0.25);
      c.fillRect(f.w.left, f.w.bottom - 3, f.w.right - f.w.left, 1.5);
    }
    c.globalAlpha = 1;

    // faint silk trail, fading towards its old end
    const n = this.trail.length;
    if (n > 2) {
      c.strokeStyle = leg; c.lineWidth = 0.8;
      for (let i = 1; i < n; i++) {
        c.globalAlpha = (i / n) * 0.3;
        c.beginPath(); c.moveTo(this.trail[i - 1].x, this.trail[i - 1].y); c.lineTo(this.trail[i].x, this.trail[i].y); c.stroke();
      }
      c.globalAlpha = 1;
    }

    // tap ripples
    this.ripples = this.ripples.filter((r) => (r.t += this.dt) < 0.5);
    for (const r of this.ripples) {
      const k = r.t / 0.5;
      c.globalAlpha = 1 - k;
      c.strokeStyle = dot; c.lineWidth = 1;
      c.beginPath(); c.arc(r.p.x, r.p.y, 2 + k * 11, 0, Math.PI * 2); c.stroke();
    }
    c.globalAlpha = 1;

    // legs: long thin straight segments, one knee each
    const pts = this.defs.map((_, i) => this.legPoints(i));
    c.strokeStyle = leg; c.lineWidth = 1.2;
    c.beginPath();
    for (const p of pts) { c.moveTo(p.hip.x, p.hip.y); c.lineTo(p.knee.x, p.knee.y); c.lineTo(p.foot.x, p.foot.y); }
    c.stroke();
    c.fillStyle = dot;
    const edge = this.colors.edge && this.colors.edge !== "transparent" ? this.colors.edge : ""; // light themes ring the yellow dots
    if (edge) { c.strokeStyle = edge; c.lineWidth = 0.9; }
    for (const p of pts) {
      c.beginPath(); c.arc(p.knee.x, p.knee.y, 2.2, 0, Math.PI * 2); c.fill(); if (edge) c.stroke();
      c.beginPath(); c.arc(p.foot.x, p.foot.y, p.lift > 0.1 ? 1.6 : 2.2, 0, Math.PI * 2); c.fill(); if (edge) c.stroke();
    }

    // body: small upright capsule with a glowing tip; sways while it runs
    const run = clamp(this.speedNow / 300, 0, 1);
    const sway = Math.sin(this.walk / 13) * 0.06 * run;
    const bob = Math.sin(this.walk / 10) * 0.7 * run;
    const breathe = 1 + Math.sin(this.clock * (this.phase === "waiting" ? 1.6 : 2.6)) * 0.03;
    c.save();
    c.translate(b.x, b.y);
    c.rotate(b.a + sway);
    c.scale(this.scale, this.scale);
    c.translate(0, bob);
    const hl = 18, hw = 6.8 * breathe;
    c.fillStyle = fill; c.strokeStyle = leg; c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(-hl + hw, -hw); c.lineTo(hl - hw, -hw); c.arc(hl - hw, 0, hw, -Math.PI / 2, Math.PI / 2);
    c.lineTo(-hl + hw, hw); c.arc(-hl + hw, 0, hw, Math.PI / 2, (3 * Math.PI) / 2);
    c.closePath(); c.fill(); c.stroke();
    c.globalAlpha = 0.45; c.lineWidth = 0.8; // blueprint detail: spine and two segment lines
    c.beginPath(); c.moveTo(-hl + 5, 0); c.lineTo(hl - 7, 0); c.moveTo(-4, -hw + 2); c.lineTo(-4, hw - 2); c.moveTo(-10, -hw + 2.5); c.lineTo(-10, hw - 2.5); c.stroke();
    c.globalAlpha = this.phase === "waiting" ? 0.55 + 0.45 * Math.sin(this.clock * 3) : 1;
    c.fillStyle = leg; c.shadowColor = leg; c.shadowBlur = 8; // glowing tip
    c.beginPath(); c.arc(hl - 3.2, 0, 2.4, 0, Math.PI * 2); c.fill();
    c.fillStyle = this.colors.fg; c.shadowBlur = 0; c.globalAlpha *= 0.85;
    c.beginPath(); c.arc(hl - 3.2, 0, 0.9, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
    c.restore();
  }
}
