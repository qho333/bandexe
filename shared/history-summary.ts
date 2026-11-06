// Shared summary schema: never add writing or identity fields here.
export interface HistorySummary {
  id: string; day: string; task: "t2" | "gt1" | "ac1"; overall: number | null;
  bands: Record<"tr" | "cc" | "lr" | "gra", number | null>; priorities: string[];
}
const object = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const exact = (v: Record<string, unknown>, fields: string[]) => Object.keys(v).length === fields.length && fields.every((key) => Object.hasOwn(v, key));
export function validateHistory(value: unknown): value is HistorySummary {
  if (!object(value) || !exact(value, ["id", "day", "task", "overall", "bands", "priorities"])) return false;
  const band = (n: unknown) => n === null || typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 9 && Number.isInteger(n * 2);
  return typeof value.id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value.id)
    && typeof value.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.day)
    && Number.isFinite(Date.parse(value.day)) && new Date(value.day).toISOString().slice(0, 10) === value.day
    && value.day <= new Date().toISOString().slice(0, 10)
    && ["t2", "gt1", "ac1"].includes(value.task as string) && band(value.overall)
    && object(value.bands) && exact(value.bands, ["tr", "cc", "lr", "gra"]) && Object.values(value.bands).every(band)
    && Array.isArray(value.priorities) && value.priorities.length <= 3 && value.priorities.every((p) => typeof p === "string"
      && p.trim().length > 0 && p.length <= 120 && !/[\p{Cc}\p{Cf}]|[^\s@]+@[^\s@]+/u.test(p));
}
