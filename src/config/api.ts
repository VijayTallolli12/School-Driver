const DEFAULT_API_URL = "https://paleturquoise-monkey-126256.hostingersite.com/";

/**
 * Laravel API version prefix. The backend registers every app endpoint
 * under /api/v1 (verified with `php artisan route:list` against the school
 * backend), so the API client joins this prefix onto the host centrally.
 * Keep env values HOST-ONLY — never bake /api/v1 into EXPO_PUBLIC_API_URL.
 */
const API_PREFIX = "/api/v1";

function normalizeBaseUrl(url: string | undefined): string {
  if (!url || url.trim() === "") return DEFAULT_API_URL;
  return url.trim().replace(/\/+$/, "");
}

/**
 * Host-only base URL for every API request. Sourced from EXPO_PUBLIC_API_URL
 * (.env / .env.development / .env.production / EAS build env) with a
 * production Hostinger fallback so a stock build never points at a localhost.
 */
export const API_BASE_URL = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL);

/**
 * Full base URL every request is joined against: host + /api/v1 prefix.
 * Dedupes the prefix in case an env value already includes it (dev/local).
 */
export const API_BASE_URL_FULL = API_BASE_URL.endsWith(API_PREFIX)
  ? API_BASE_URL
  : `${API_BASE_URL}${API_PREFIX}`;

/** Display intent of the current API target (surfaced on the Settings screen). */
export const ACTIVE_API_URL = API_BASE_URL_FULL;

export const IS_PRODUCTION = process.env.NODE_ENV === "production";
