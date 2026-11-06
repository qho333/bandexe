export const GEMINI_BLOCKED_COUNTRIES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "IS", "LI", "NO", "CH", "GB",
];
export const REGION_MESSAGE = "Gemini checking isn't available in your region. Use the Free checker.";
export function geminiEligibility(country) {
  return GEMINI_BLOCKED_COUNTRIES.includes(String(country || "").toUpperCase())
    ? { allowed: false, reason: "region" } : { allowed: true };
}
