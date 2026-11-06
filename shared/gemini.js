// Credentials belong only in the header, for both server and browser callers.
export function geminiRequest(model, key, body, timeout = 30_000) {
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    init: {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    },
  };
}

export async function testKey(key, fetchFn = fetch) {
  const { url, init } = geminiRequest("gemini-3.1-flash-lite", key, {
    contents: [{ role: "user", parts: [{ text: "Reply OK." }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 8 },
  });
  let res;
  try { res = await fetchFn(url, init); }
  catch { throw new Error("Cannot reach Google. Check your connection and try again."); }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.error?.message || `Google returned an error (${res.status}).`;
    throw new Error(String(message).split(key).join("[key removed]"));
  }
  if (!data?.candidates?.[0]?.content?.parts?.some((p) => p.text)) throw new Error("Google returned no answer. Try again.");
  return "OK: Google accepted this key.";
}
