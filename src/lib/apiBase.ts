/**
 * Central API base URL helper.
 *
 * RULE: Never call /api/* directly from frontend.
 * - Backend APIs MUST use VITE_API_URL (Railway/Render/etc.)
 * - Vercel serverless functions would live under /api/* in repo (we don't have any)
 *
 * In dev, Vite proxy forwards /api -> localhost:8000, but that does NOT work on Vercel.
 * So all backend calls must use this helper.
 */
export function getApiBase(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string') {
    return envUrl.replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:8000';
  }
  if (typeof window !== 'undefined') {
    console.warn(
      '[apiBase] VITE_API_URL not set in production. API calls will fail. ' +
      'Set VITE_API_URL in Vercel environment variables.'
    );
  }
  return typeof window !== 'undefined' ? window.location.origin : '';
}

/**
 * Whether backend API is available (VITE_API_URL set in production).
 */
export function isApiAvailable(): boolean {
  if (import.meta.env.DEV) return true;
  return Boolean(import.meta.env.VITE_API_URL);
}
