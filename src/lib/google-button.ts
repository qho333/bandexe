import type { GoogleIdentity } from "./auth";
import type { Theme } from "./prefs";
import type { UILanguage } from "./ui-language";
import { createDebounce } from "./debounce";

// GSI supports widths up to 400px. The card uses the same bound for both actions.
export function googleButtonOptions(theme: Theme, locale: UILanguage, width: number): Parameters<GoogleIdentity["renderButton"]>[1] {
  return { theme: theme === "paper" ? "outline" : "filled_black", text: "signin_with", size: "large", shape: "rectangular", width: Math.min(400, Math.max(1, Math.floor(Number.isFinite(width) ? width : 1))), locale };
}

/** A resize owns one debounced render; disconnecting also cancels any queued iframe replacement. */
export function watchGoogleButton(host: HTMLElement, google: GoogleIdentity, theme: Theme, locale: UILanguage, onRendered: () => void, onError: () => void) {
  let disposed = false, lastWidth = 0;
  const render = () => {
    if (disposed) return;
    const width = host.getBoundingClientRect().width;
    if (width <= 0) return; // A hidden screen is measured again when it becomes visible.
    lastWidth = width;
    try {
      host.replaceChildren();
      google.renderButton(host, googleButtonOptions(theme, locale, width));
      onRendered();
    } catch { onError(); }
  };
  const repaint = createDebounce(render, 120);
  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
    if (Math.abs(host.getBoundingClientRect().width - lastWidth) >= 1) repaint.schedule();
  });
  observer?.observe(host);
  const resize = () => repaint.schedule();
  window.addEventListener("resize", resize);
  render();
  return () => { disposed = true; repaint.cancel(); observer?.disconnect(); window.removeEventListener("resize", resize); host.replaceChildren(); };
}
