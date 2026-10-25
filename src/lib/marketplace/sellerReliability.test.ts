import { beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { clearSellerDraft, DRAFT_KEY, emptySellerDraft, readSellerDraft, saveSellerDraft } from './sellerDraft';
import { submissionIdentity } from './submissionIdentity';
import { sanitizeMarketplaceEvent } from './eventSchema';

beforeEach(() => { localStorage.clear(); vi.stubGlobal('crypto', webcrypto); });
const photo = (text: string) => ({ type: 'image/jpeg', size: text.length, arrayBuffer: () => Promise.resolve(new TextEncoder().encode(text).buffer) }) as File;

describe('seller recovery', () => {
  it('restores machine details while excluding contacts unless explicitly enabled', () => {
    const draft = { ...emptySellerDraft, title: 'Cutting machine', contactName: 'Private contact', contactPhone: '01012345678' };
    expect(saveSellerDraft(draft, false)).toBe(true);
    expect(localStorage.getItem(DRAFT_KEY)).not.toContain('Private contact');
    expect(readSellerDraft().draft).toEqual({ ...emptySellerDraft, title: 'Cutting machine' });
    saveSellerDraft(draft, true);
    expect(readSellerDraft().draft.contactPhone).toBe('01012345678');
    saveSellerDraft(draft, false);
    expect(localStorage.getItem(DRAFT_KEY)).not.toContain('01012345678');
  });
  it('expires old drafts and supports discarding them', () => {
    saveSellerDraft({ ...emptySellerDraft, title: 'Saw' }, false);
    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY)!);
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...saved, savedAt: Date.now() - 8 * 86400000 }));
    expect(readSellerDraft().restored).toBe(false);
    saveSellerDraft({ ...emptySellerDraft, title: 'New saw' }, false);
    clearSellerDraft();
    expect(readSellerDraft().restored).toBe(false);
  });
  it('ignores corrupt drafts and unknown saved fields', () => {
    localStorage.setItem(DRAFT_KEY, '{broken');
    expect(readSellerDraft().restored).toBe(false);
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), title: 'Saw', injected: 'value', contactName: 'not consented' }));
    expect(readSellerDraft().draft).toEqual({ ...emptySellerDraft, title: 'Saw' });
  });
  it('reuses a submission id for identical retries and changes it when the payload changes', async () => {
    const fields = { title: 'Machine', contactPhone: 'private phone' };
    const first = await submissionIdentity(fields, [photo('image')]);
    const retry = await submissionIdentity(fields, [photo('image')]);
    expect(retry).toEqual(first);
    expect(await submissionIdentity(fields, [photo('different image')])).not.toEqual(first);
    expect(localStorage.getItem('almona.marketplace.submission.v1')).not.toContain('private phone');
  });
});

it('drops PII and untrusted fields from monitoring payloads', () => {
  const event = sanitizeMarketplaceEvent({ event: 'inventory_failure', route: 'browse', category: 'request', browser: 'android', worker: 'controlled',
    release: 'abcdef1234567890', phone: 'secret', message: 'token=private', url: '/used-machines?seller=private' });
  expect(event).toEqual({ event: 'inventory_failure', route: 'browse', category: 'request', browser: 'android', worker: 'controlled', release: 'abcdef123456' });
  expect(sanitizeMarketplaceEvent({ ...event, category: 'secret error message' })).toBeNull();
});
