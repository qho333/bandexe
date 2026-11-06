// A random ID for this browser, so guests on a shared school or phone network each get their own daily checks.
export function browserId() {
  try {
    let id = localStorage.getItem("bandexe-browser");
    if (!id && typeof crypto.randomUUID === "function") localStorage.setItem("bandexe-browser", id = crypto.randomUUID());
    return id;
  } catch { return null; } // storage blocked: the server falls back to the per-connection allowance
}

// One logical operation keeps the same idempotency key across its one transport retry.
// HTTP errors (including 429/503), aborts and malformed responses are never retried.
export async function cloudRequest(url: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("X-Requested-With", "bandexe");
  const browser = browserId();
  if (browser) headers.set("X-Browser", browser);
  headers.set("Content-Type", "application/json");
  headers.set("Idempotency-Key", (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("")));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 195000);
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await fetch(url, { ...init, credentials: "same-origin", headers: Object.fromEntries(headers), signal: controller.signal });
        // Keep the deadline through body delivery too. Parsing errors remain terminal.
        const bytes = await response.arrayBuffer();
        return new Response([204, 205, 304].includes(response.status) ? null : bytes, { status: response.status, headers: response.headers });
      }
      catch (error) {
        if (attempt || controller.signal.aborted || !(error instanceof TypeError)) throw error;
        await new Promise((resolve) => setTimeout(resolve, 200 + Math.floor(Math.random() * 301)));
      }
    }
  } finally { clearTimeout(timer); }
}
