const DEFAULT_API_URL = "https://school-erp-production-e3a5.up.railway.app/api/v1";

function normalizeBaseUrl(url: string | undefined): string {
  if (!url || url.trim() === "") return DEFAULT_API_URL;
  return url.trim().replace(/\/+$/, "");
}

/**
 * Base URL for every API request. Sourced from EXPO_PUBLIC_API_URL
 * (.env / .env.development / .env.production / EAS build env) with a
 * production Railway fallback so a stock build never points at a localhost.
 */
export const API_BASE_URL = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL);

/** Display intent of the current API target (surfaced on the Settings screen). */
export const ACTIVE_API_URL = API_BASE_URL;

export const IS_PRODUCTION = process.env.NODE_ENV === "production";