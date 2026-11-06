/** Publish the occupied border-box height, including padding/safe areas, or zero when hidden. */
export function observeElementHeight(el: HTMLElement, property: string, visible = true) {
  const root = document.documentElement;
  const measure = () => root.style.setProperty(property, `${visible && !el.hidden ? el.getBoundingClientRect().height : 0}px`);
  measure();
  const observer = new ResizeObserver(measure);
  observer.observe(el, { box: "border-box" });
  return () => { observer.disconnect(); root.style.setProperty(property, "0px"); };
}
