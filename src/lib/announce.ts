import { translateUI } from "./i18n";
/** Polite screen-reader announcement via the #live region. */
export function announce(msg: string) {
  const l = document.getElementById("live");
  if (!l) return;
  l.textContent = "";
  setTimeout(() => { l.textContent = translateUI(msg); }, 30);
}
