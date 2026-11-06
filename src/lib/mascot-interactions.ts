/** Explicit expansion wins over a still-shrinking phone viewport until the next text focus. */
export function dockTucking(keyboard: () => boolean, handleFocused: () => boolean, render: (tucked: boolean) => void) {
  let field = false, expanded = false;
  const update = () => render(!expanded && (field || keyboard() || handleFocused()));
  return {
    update,
    focusField: () => { expanded = false; field = true; update(); },
    releaseField: () => { field = false; update(); },
    expand: () => { expanded = true; field = false; update(); },
  };
}

/** Call after rendering so the chosen focus target is visible and no longer inert. */
export function restoreHelperFocus(tucked: boolean, handle: HTMLElement | null, opener: HTMLElement | null) {
  (tucked ? handle : opener)?.focus({ preventScroll: true });
}

/** A tip gets a fresh reading interval after focus leaves; focus within it always suspends expiry. */
export function dismissAfterFocusLeaves(el: HTMLElement, dismiss: () => void, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  const pause = () => clearTimeout(timer);
  const schedule = (leaving = false) => {
    pause();
    if (!leaving && el.contains(document.activeElement)) return;
    timer = setTimeout(() => { if (!el.contains(document.activeElement)) dismiss(); }, delay);
  };
  const onBlur = (e: FocusEvent) => { if (!el.contains(e.relatedTarget as Node | null)) schedule(true); };
  el.addEventListener("focusin", pause);
  el.addEventListener("focusout", onBlur);
  schedule();
  return () => { pause(); el.removeEventListener("focusin", pause); el.removeEventListener("focusout", onBlur); };
}
