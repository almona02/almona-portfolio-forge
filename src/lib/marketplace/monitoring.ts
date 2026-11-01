import { sanitizeMarketplaceEvent, type MarketplaceEvent, type MarketplaceEventPayload } from './eventSchema';

const lastSent = new Map<string, number>();
export function reportMarketplaceEvent(event: MarketplaceEvent, category: MarketplaceEventPayload['category'] = 'none'): void {
  if (typeof window === 'undefined' || !/^\/(?:used-machines|usedmachines)(?:\/|$)/.test(window.location.pathname)) return;
  try {
    const route = window.location.pathname.endsWith('/sell') || new URLSearchParams(window.location.search).get('tab') === 'sell'
      ? 'sell' : /^\/(?:used-machines|usedmachines)\/?$/.test(window.location.pathname) ? 'browse' : 'detail';
    const ua = navigator.userAgent;
    const payload = sanitizeMarketplaceEvent({ event, route, category, release: import.meta.env.VITE_RELEASE_ID || 'local',
      browser: /android/i.test(ua) ? 'android' : /iphone|ipad/i.test(ua) ? 'ios' : 'desktop',
      worker: 'serviceWorker' in navigator && navigator.serviceWorker.controller ? 'controlled' : 'none' });
    const key = `${event}:${route}:${category}`;
    if (!payload || Date.now() - (lastSent.get(key) ?? 0) < 10000) return;
    lastSent.set(key, Date.now());
    void fetch('/api/marketplace-events', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'omit', keepalive: true, body: JSON.stringify(payload) }).catch(() => {});
  } catch { /* Reporting must never break browsing or publishing. */ }
}
