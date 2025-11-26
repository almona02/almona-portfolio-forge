import { Quote } from './QuotingEngine';

const STORAGE_KEY_PREFIX = 'fabricator_quote_';

export function loadQuoteForProject(projectId: string): Quote | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${projectId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    // Rehydrate dates
    return {
      ...parsed,
      createdAt: parsed.createdAt ? new Date(parsed.createdAt) : new Date(),
      validUntil: parsed.validUntil ? new Date(parsed.validUntil) : new Date(),
      deliveryDate: parsed.deliveryDate ? new Date(parsed.deliveryDate) : undefined,
    } as Quote;
  } catch {
    return null;
  }
}

export function saveQuoteForProject(projectId: string, quote: Quote): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${projectId}`,
      JSON.stringify(quote),
    );
  } catch {
    // ignore storage errors
  }
}


