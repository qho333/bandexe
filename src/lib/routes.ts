import type { Screen } from "./types";
import { isReportAnchor } from "./report";

export type AppScreen = Screen | "privacy" | "about" | "stats" | "collection";

export function screenFromHash(hash: string): AppScreen {
  if (isReportAnchor(hash)) return "results";
  if (hash === "#privacy-accuracy") return "privacy";
  const screen = hash.slice(1);
  return ["login", "write", "results", "overview", "privacy", "about", "stats", "collection"].includes(screen) ? screen as AppScreen : "write";
}

export const WELCOMED_KEY = "bandexe-welcomed";
/** First visit with no screen in the address: open on the login page once the intro ends. Later visits open Write. */
export function startScreen(hash: string, storage: Pick<Storage, "getItem" | "setItem"> | undefined): AppScreen {
  const screen = screenFromHash(hash);
  if (hash && hash !== "#") return screen;
  try {
    if (!storage || storage.getItem(WELCOMED_KEY)) return screen;
    storage.setItem(WELCOMED_KEY, "1");
    return "login";
  } catch { return screen; }
}
