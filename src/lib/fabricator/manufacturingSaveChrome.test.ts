import { describe, expect, it } from 'vitest';
import { getManufacturingSaveChrome } from './manufacturingSaveChrome';
import { NOT_RECORDED } from './studioWorkflow';

describe('getManufacturingSaveChrome (UP-14)', () => {
  it('shows unsaved draft when dirty', () => {
    const chrome = getManufacturingSaveChrome({
      draftDirty: true,
      workflowIdentity: {
        ownerUserId: 'u',
        projectId: 'p',
        positionId: 'pos',
        source: 'v2',
        revision: 2,
      },
    });
    expect(chrome.tone).toBe('dirty');
    expect(chrome.label).toBe('Unsaved draft');
    expect(chrome.revisionLabel).toBe('R2');
  });

  it('does not invent Saved from identity alone (FUA-19)', () => {
    const chrome = getManufacturingSaveChrome({
      draftDirty: false,
      workflowIdentity: {
        ownerUserId: 'u',
        projectId: 'p',
        positionId: 'pos',
        source: 'v2',
        revision: 3,
      },
    });
    expect(chrome.tone).toBe('local');
    expect(chrome.label).toBe('Revision loaded · R3');
    expect(chrome.label).not.toMatch(/^Saved/);
  });

  it('shows acknowledged only with explicit server ack', () => {
    const chrome = getManufacturingSaveChrome({
      draftDirty: false,
      serverAcknowledged: true,
      workflowIdentity: {
        ownerUserId: 'u',
        projectId: 'p',
        positionId: 'pos',
        source: 'v2',
        revision: 3,
      },
    });
    expect(chrome.tone).toBe('acknowledged');
    expect(chrome.label).toBe('Acknowledged · R3');
  });

  it('falls back to Not recorded without identity', () => {
    const chrome = getManufacturingSaveChrome({ draftDirty: false, workflowIdentity: null });
    expect(chrome.tone).toBe('unknown');
    expect(chrome.label).toBe(NOT_RECORDED);
  });
});
