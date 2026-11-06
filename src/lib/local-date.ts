import { dayKey } from "./progress";

/** Subscribe while a screen is active. Refresh immediately, at local midnight and on return.
 * The one-minute cap also detects local clock/time-zone changes while the page stays visible.
 */
export function watchLocalDate(refresh: (now: Date) => void) {
  let key = "";
  let timer: ReturnType<typeof setTimeout>;
  const update = (force = false) => {
    clearTimeout(timer);
    const now = new Date();
    const nextKey = dayKey(now);
    if (force || key !== nextKey) { key = nextKey; refresh(now); }
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    timer = setTimeout(update, Math.min(60_000, Math.max(1, midnight.getTime() - now.getTime())));
  };
  const onVisible = () => { if (!document.hidden) update(true); };
  document.addEventListener("visibilitychange", onVisible);
  update(true);
  return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); };
}
