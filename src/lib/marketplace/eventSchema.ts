export const marketplaceEvents = ['page_failure', 'inventory_failure', 'inventory_success', 'submission_failure', 'submission_success', 'recovery_attempt'] as const;
export type MarketplaceEvent = typeof marketplaceEvents[number];
const routes = ['browse', 'sell', 'detail'] as const;
const categories = ['none', 'download', 'network', 'render', 'storage', 'request', 'unknown'] as const;
const browsers = ['android', 'ios', 'desktop', 'unknown'] as const;
const workers = ['controlled', 'none', 'unknown'] as const;
export interface MarketplaceEventPayload {
  event: MarketplaceEvent;
  route: typeof routes[number];
  category: typeof categories[number];
  browser: typeof browsers[number];
  worker: typeof workers[number];
  release: string;
}

/** Construct a new object from allowlisted values: no URLs, ids, messages or PII. */
export function sanitizeMarketplaceEvent(value: unknown): MarketplaceEventPayload | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (!marketplaceEvents.includes(item.event as MarketplaceEvent) || !routes.includes(item.route as typeof routes[number]) ||
      !categories.includes(item.category as typeof categories[number]) || !browsers.includes(item.browser as typeof browsers[number]) ||
      !workers.includes(item.worker as typeof workers[number])) return null;
  const release = typeof item.release === 'string' && /^(?:[a-f0-9]{7,40}|local)$/i.test(item.release) ? item.release.slice(0, 12) : 'unknown';
  return { event: item.event as MarketplaceEvent, route: item.route as typeof routes[number], category: item.category as typeof categories[number],
    browser: item.browser as typeof browsers[number], worker: item.worker as typeof workers[number], release };
}
