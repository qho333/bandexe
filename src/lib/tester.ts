const TESTER_KEY = "bandexe-tester";
const listeners = new Set<() => void>();

function getToken(): string {
  try { return localStorage.getItem(TESTER_KEY) || ""; }
  catch { return ""; }
}

export const getTesterMode = () => Boolean(getToken());
export function testerHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { "X-Tester-Token": token } : {};
}

// Run before routing/network effects, including when a fragment changes in an open tab.
export function captureTesterToken() {
  if (!location.hash.startsWith("#tester=")) return;
  const token = new URLSearchParams(location.hash.slice(1)).get("tester");
  // Clear even an empty/invalid token, and even when browser storage is unavailable.
  window.history.replaceState(window.history.state, "", location.pathname + location.search);
  try {
    if (token) localStorage.setItem(TESTER_KEY, token);
  } catch { /* Storage is optional; never log credentials. */ }
  listeners.forEach((fn) => fn());
}

export function leaveTesterMode() {
  try { localStorage.removeItem(TESTER_KEY); } catch { /* Storage unavailable. */ }
  listeners.forEach((fn) => fn());
}

export function onTesterMode(fn: () => void) {
  listeners.add(fn);
  const onStorage = (event: StorageEvent) => {
    if (event.key === TESTER_KEY || event.key === null) fn();
  };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(fn); window.removeEventListener("storage", onStorage); };
}
