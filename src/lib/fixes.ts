/** Replace the first exact occurrence of `from` with `to`. ok=false when `from` is no longer in the text. */
export function replaceFirst(text: string, from: string, to: string): { text: string; ok: boolean } {
  const i = from ? text.indexOf(from) : -1;
  if (i < 0) return { text, ok: false };
  return { text: text.slice(0, i) + to + text.slice(i + from.length), ok: true };
}

export function countWords(t: string): number {
  const m = t.trim().match(/[A-Za-z0-9À-ɏ'’-]+/g);
  return m ? m.length : 0;
}

export const paragraphs = (t: string) => t.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean);
