/**
 * Shared extension configuration.
 *
 * Single source of truth for the backend URL. Previously each of popup.ts,
 * scraper.ts, and auth.ts carried its own "http://localhost:3000" fallback,
 * so a stale one silently sent tweets to whatever else was on port 3000.
 */

export const DEFAULT_BACKEND_URL = 'http://localhost:3100';
