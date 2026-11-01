import type { RuntimeCaching } from 'workbox-build';

// Workbox tests pathname + search against the navigation fallback denylist.
export const marketplaceNavigationPattern = /^\/(?:used-machines|usedmachines)(?:\/|\?|$)/;

// Both fields are valid browser fetch options; the variable also supports Node's
// narrower RequestInit typing when Vite checks its build configuration.
const freshDocumentRequest = { cache: 'no-store' as const, credentials: 'same-origin' as const };

// Keep this callback self-contained: Workbox serializes it into sw.js.
export const marketplaceNavigationRule: RuntimeCaching = {
  urlPattern: ({ request, url, sameOrigin }) =>
    sameOrigin && request.mode === 'navigate' && /^\/(?:used-machines|usedmachines)(?:\/|$)/.test(url.pathname),
  handler: 'NetworkOnly',
  options: { fetchOptions: freshDocumentRequest },
};
