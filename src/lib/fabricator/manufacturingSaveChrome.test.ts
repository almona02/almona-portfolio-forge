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

  it('shows saved with revision when identity present and clean', () => {
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
    expect(chrome.tone).toBe('saved');
    expect(chrome.label).toBe('Saved · R3');
  });

  it('falls back to Not recorded without identity', () => {
    const chrome = getManufacturingSaveChrome({ draftDirty: false, workflowIdentity: null });
    expect(chrome.tone).toBe('unknown');
    expect(chrome.label).toBe(NOT_RECORDED);
  });
});
