export interface Statement {
  bind(...values: unknown[]): Statement;
  first<T = { n: number }>(): Promise<T | null>;
  run(): Promise<unknown>;
}
export interface Database {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<{ success?: boolean; results?: Record<string, unknown>[] }[]>;
}
export interface Review { rating: number; text: string; task: "t2" | "gt1" | "ac1" | null; public: boolean }
export interface PendingReview extends Omit<Review, "public"> { id: number; day: string; public: number }
export interface Stats { since: string | null; browsers: number; students: number; countries: number; topCountries: { code: string; n: number }[];
  ratings: { count: number; average: number; fourPlus: number }; reviews: Omit<PendingReview, "id" | "public">[]; available: boolean; visits: number; essays: number; days: { day: string; visits: number; essays: number; visitors: number }[] }
export function utcDay(now?: number): string;
export function dailyAllowance(db: Database | undefined, key: string, day: string, limit: number, reserve?: boolean): Promise<{ used: number; admitted: boolean } | null>;
export function count(db: Database | undefined, name: string, day?: string): Promise<void>;
export function pruneAllowances(db: Database | undefined, now?: number): Promise<void>;
export function pruneReviews(db: Database | undefined, now?: number): Promise<void>;
export function publicStats(db?: Database, now?: number): Promise<Stats>;
export function countImpact(db: Database | undefined, name: string, country?: string, day?: string): Promise<void>;
export function validateReview(body: unknown): { value: Review; error?: never } | { error: string; value?: never };
export function saveReview(db: Database | undefined, review: Review, day?: string): Promise<boolean>;
export function pendingReviews(db?: Database): Promise<PendingReview[] | null>;
export function moderateReview(db: Database | undefined, id: number, status: "approved" | "hidden"): Promise<boolean | null>;
