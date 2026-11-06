export const GEMINI_BLOCKED_COUNTRIES: string[];
export const REGION_MESSAGE: string;
export function geminiEligibility(country?: string): { allowed: boolean; reason?: "region" };
