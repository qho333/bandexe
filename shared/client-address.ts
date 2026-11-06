// Group rotating IPv6 interface addresses by /64 before any identity hashing.
// WHATWG URL parsing validates and canonicalizes compressed/expanded IPv6,
// including dotted IPv4 tails. IPv4-mapped addresses share the IPv4 identity.
export function clientAddress(address: string | null): string | null {
  if (!address) return null;
  const ip = address.trim();
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip))
    return ip.split(".").every((part) => Number(part) <= 255) ? ip : null;
  try {
    const host = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
    const halves = host.split("::");
    const left = halves[0] ? halves[0].split(":") : [];
    const right = halves[1] ? halves[1].split(":") : [];
    const words = (halves.length === 2 ? [...left, ...Array(8 - left.length - right.length).fill("0"), ...right] : left)
      .map((word) => parseInt(word, 16));
    if (words.length !== 8 || words.some((word) => !Number.isInteger(word))) return null;
    if (words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff)
      return [words[6] >> 8, words[6] & 255, words[7] >> 8, words[7] & 255].join(".");
    return words.slice(0, 4).map((word) => word.toString(16).padStart(4, "0")).join(":") + "::/64";
  } catch { return null; }
}
