export const DRAFT_KEY = 'almona.marketplace.seller-draft.v1';
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
export const emptySellerDraft = {
  title: '', category: '', price: '', currency: 'EGP', location: '', condition: '',
  year: '', hours: '', description: '', contactName: '', contactPhone: '', contactWhatsapp: '',
};
export type SellerDraft = typeof emptySellerDraft;
const publicFields = ['title', 'category', 'price', 'currency', 'location', 'condition', 'year', 'hours', 'description'] as const;
const contactFields = ['contactName', 'contactPhone', 'contactWhatsapp'] as const;

export function readSellerDraft(): { draft: SellerDraft; rememberContact: boolean; restored: boolean } {
  const fallback = { draft: { ...emptySellerDraft }, rememberContact: false, restored: false };
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return fallback;
    const saved = raw as Record<string, unknown>;
    if (typeof saved.savedAt !== 'number' || Date.now() - saved.savedAt > MAX_AGE || saved.savedAt > Date.now()) {
      localStorage.removeItem(DRAFT_KEY);
      return fallback;
    }
    const draft = { ...emptySellerDraft };
    const fields = saved.rememberContact === true ? [...publicFields, ...contactFields] : publicFields;
    for (const key of fields) {
      const value = saved[key];
      if (typeof value === 'string') draft[key] = value.slice(0, key === 'description' ? 2000 : 160);
    }
    return { draft, rememberContact: saved.rememberContact === true, restored: true };
  } catch { return fallback; }
}

export function saveSellerDraft(draft: SellerDraft, rememberContact: boolean): boolean {
  try {
    if (!Object.entries(draft).some(([key, value]) => key !== 'currency' && value)) {
      localStorage.removeItem(DRAFT_KEY);
      return true;
    }
    const saved: Record<string, unknown> = { savedAt: Date.now(), rememberContact };
    for (const key of publicFields) saved[key] = draft[key];
    if (rememberContact) for (const key of contactFields) saved[key] = draft[key];
    localStorage.setItem(DRAFT_KEY, JSON.stringify(saved));
    return true;
  } catch { return false; }
}

export function clearSellerDraft(): void {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* Publishing does not require storage. */ }
}
