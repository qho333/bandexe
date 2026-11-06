import { useLayoutEffect, useRef, type RefObject } from "react";
import gsap from "gsap";

/** A component owns its animation; never pause another component's or the boot timeline. */
export function followVisibility(animation: { paused(value: boolean): unknown }, doc: Pick<Document, "hidden" | "addEventListener" | "removeEventListener"> = document) {
  const update = () => { animation.paused(doc.hidden); };
  update(); doc.addEventListener("visibilitychange", update);
  return () => doc.removeEventListener("visibilitychange", update);
}

/** CSS and GSAP share the same visibility boundary. */
export function watchPageVisibility(doc: Document = document) {
  const update = () => doc.documentElement.toggleAttribute("data-page-hidden", doc.hidden);
  update(); doc.addEventListener("visibilitychange", update);
  return () => { doc.removeEventListener("visibilitychange", update); doc.documentElement.removeAttribute("data-page-hidden"); };
}

/** Navigation state and focus update immediately; the outgoing visual is inert during its 80ms collapse. */
export function useScreenMotion(root: RefObject<HTMLElement | null>, route: string, enabled: boolean) {
  const previous = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const next = root.current?.querySelector<HTMLElement>(".screen.is-active");
    const old = previous.current;
    previous.current = next ?? null;
    if (!enabled || !next || !old || old === next) return;
    const incoming = next.querySelector("main"), outgoing = old.querySelector("main");
    if (!incoming || !outgoing) return;
    old.classList.add("is-leaving"); old.inert = true;
    const ctx = gsap.context(() => {
      // Anything that measures layout (the scanning spider, mascots) must re-measure once the incoming screen is
      // full size: during the draw-in it is scaled to a thin line, and a measurement then squashes the whole essay.
      const settled = () => window.dispatchEvent(new Event("bandexe:layout"));
      const timeline = gsap.timeline({ onComplete: settled, onInterrupt: settled });
      timeline.to(outgoing, { scaleY: 0.004, opacity: 0.4, transformOrigin: "center center", duration: 0.08, ease: "power2.in",
        onComplete: () => old.classList.remove("is-leaving") });
      timeline.fromTo(incoming, { scaleY: 0.015, opacity: 0.35 }, { scaleY: 1, opacity: 1, transformOrigin: "center top", duration: 0.17, ease: "power2.out", clearProps: "transform,opacity,transformOrigin" });
      timeline.fromTo(incoming, { x: -1 }, { x: 0, duration: 0.06, repeat: 1, yoyo: true, ease: "steps(2)", clearProps: "transform" }, 0.12);
      const stop = followVisibility(timeline);
      return stop;
    });
    return () => { ctx.revert(); old.classList.remove("is-leaving"); old.inert = false; };
  }, [root, route, enabled]);
}

type RevealKind = "panel" | "slide" | "pop" | "bar" | "line" | "number" | "fade" | "unroll";
const selectors: [string, RevealKind][] = [
  [".frame", "panel"], [".crit, .ov-recur > li", "slide"], [".prio > li, .mk, .ov-day", "pop"],
  [".sub__fill", "bar"], [".ov-chart .line, .ov-spark__line", "line"],
  [".score-num, .crit__band, .ov-stat__v, .impact-count", "number"], [".band-area, .r-range", "fade"], [".model-compare", "unroll"],
];

/** Reveal only visible panels, once per screen appearance. Late reports/replies are observed too. */
export function useTerminalReveals(root: RefObject<HTMLElement | null>, enabled: boolean, active: boolean, revision: unknown = "") {
  useLayoutEffect(() => {
    const scope = root.current;
    if (!scope || !enabled || !active || typeof IntersectionObserver === "undefined") return;
    const seen = new WeakMap<Element, RevealKind[]>(), pending = new Map<Element, RevealKind[]>();
    const decorations: HTMLElement[] = [], restore: (() => void)[] = [], visibility: (() => void)[] = [];
    const ctx = gsap.context(() => {});
    // CSS runs the simple reveals: dozens of GSAP tweens in one frame each forced a style recalc (about 180 ms on Results).
    const css: Partial<Record<RevealKind, string>> = { slide: "rv-slide", pop: "rv-pop", bar: "rv-bar", fade: "rv-fade", unroll: "rv-unroll" };
    const animateClass = (el: HTMLElement, cls: string, delay = 0) => {
      if (delay) el.style.setProperty("--rd", delay + "s");
      const done = () => { el.classList.remove(cls); el.style.removeProperty("--rd"); el.removeEventListener("animationend", end); };
      const end = (e: AnimationEvent) => { if (e.target === el) done(); };
      el.addEventListener("animationend", end); el.classList.add(cls); restore.push(done);
    };
    const reveal = (el: Element, kinds: RevealKind[]) => ctx.add(() => {
      if (!scope.contains(el)) return;
      for (const kind of kinds) {
        const cls = css[kind];
        if (cls) { animateClass(el as HTMLElement, cls, kind === "slide" ? siblingDelay(el, 0.035) : kind === "pop" ? siblingDelay(el, 0.012) : 0); continue; }
        if (kind === "panel") {
          for (const edge of ["top", "right", "bottom", "left"]) {
            const line = document.createElement("i"); line.className = "frame-trace frame-trace--" + edge; line.ariaHidden = "true";
            el.append(line); decorations.push(line);
          }
          const heading = el.querySelector<HTMLElement>(":scope > .frame-head > h2, :scope > .frame-head > h3");
          if (heading) animateClass(heading, "rv-head"); // React keeps its translated text nodes
          continue;
        }
        const timeline = gsap.timeline();
        if (kind === "line") {
          const length = (el as SVGGeometryElement).getTotalLength();
          timeline.fromTo(el, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: 0.38, ease: "power2.out", clearProps: "strokeDasharray,strokeDashoffset" });
        }
        if (kind === "number") {
          const final = el.textContent || "", value = Number(final.replaceAll(",", ""));
          if (!Number.isFinite(value)) continue;
          // Reserve the final inline width so shorter intermediate numbers cannot move adjacent labels.
          const oldMin = (el as HTMLElement).style.minInlineSize;
          (el as HTMLElement).style.minInlineSize = el.getBoundingClientRect().width + "px";
          restore.push(() => { (el as HTMLElement).style.minInlineSize = oldMin; });
          const counter = { n: 0 };
          const previousLabel = el.getAttribute("aria-label");
          el.setAttribute("aria-label", final);
          restore.push(() => { if (previousLabel === null) el.removeAttribute("aria-label"); else el.setAttribute("aria-label", previousLabel); });
          timeline.to(counter, { n: value, duration: 0.38, ease: "power2.out", onUpdate: () => { el.textContent = counter.n.toFixed(final.includes(".") ? 1 : 0); }, onComplete: () => { el.textContent = final; } });
          restore.push(() => { el.textContent = final; });
        }
        visibility.push(followVisibility(timeline));
      }
    });
    const observer = new IntersectionObserver((entries) => {
      const ready: [Element, RevealKind[]][] = [];
      for (const entry of entries) if (entry.isIntersecting) {
        const kinds = pending.get(entry.target);
        if (kinds) { pending.delete(entry.target); ready.push([entry.target, kinds]); }
        observer.unobserve(entry.target);
      }
      // Writes first, then the few GSAP reveals that measure layout, so the browser lays out once.
      const measured = (k: RevealKind) => k === "number" || k === "line";
      for (const [el, kinds] of ready) reveal(el, kinds.filter((k) => !measured(k)));
      for (const [el, kinds] of ready) if (kinds.some(measured)) reveal(el, kinds.filter(measured));
    }, { threshold: 0.08 });
    const discover = () => {
      const visibleScope = scope.querySelector(".screen.is-active") ?? scope;
      for (const [selector, kind] of selectors) for (const el of visibleScope.querySelectorAll(selector)) {
        const done = seen.get(el) ?? [];
        if (done.includes(kind)) continue;
        seen.set(el, [...done, kind]); pending.set(el, [...(pending.get(el) ?? []), kind]); observer.observe(el);
      }
    };
    discover();
    // Band counters mutate text nodes every frame. Only added content elements need discovery.
    const mutations = new MutationObserver((records) => {
      if (records.some((record) => Array.from(record.addedNodes).some((node) => node.nodeType === 1 && !(node as Element).matches(".frame-trace, .header-glyph")))) discover();
    });
    mutations.observe(scope, { childList: true, subtree: true });
    return () => {
      mutations.disconnect(); observer.disconnect(); visibility.forEach((stop) => stop());
      ctx.revert(); restore.forEach((reset) => reset()); decorations.forEach((el) => el.remove());
    };
  }, [root, enabled, active, revision]);
}

/** Bounded staggering keeps each sequence below 400 ms, even for long histories. */
export function siblingDelay(el: Element, step: number) {
  const siblings = Array.from(el.parentElement?.children ?? []);
  const interval = Math.min(step, 0.1 / Math.max(1, siblings.length - 1));
  return Math.min(0.1, Math.max(0, siblings.indexOf(el)) * interval);
}
