import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StatePersistenceManager } from './statePersistence';

const managers: StatePersistenceManager[] = [];

function manager(storageScope: string): StatePersistenceManager {
  const instance = new StatePersistenceManager({
    storageScope,
    autoSaveInterval: 0,
    debounceDelay: 0,
    maxWait: 0,
  });
  managers.push(instance);
  return instance;
}

describe('drafting persistence identity isolation', () => {
  beforeEach(() => localStorage.clear());

  afterEach(() => {
    managers.splice(0).forEach(instance => instance.destroy());
    localStorage.clear();
  });

  it('does not expose drafts, versions, or recovery across identities', () => {
    const ownerA = manager('owner-a/project/position/database/3');
    const ownerB = manager('owner-b/project/position/database/3');

    ownerA.createCheckpoint({ geometry: { rectangles: [{ id: 'a' }] } }, 'saved');

    expect(ownerB.loadCurrentDraft()).toBeNull();
    expect(ownerB.getVersions()).toEqual([]);
    expect(ownerB.hasRecoveryPoint()).toBe(false);
    expect(ownerA.hasRecoveryPoint()).toBe(true);
  });

  it('rejects recovery data whose embedded scope does not match its key', () => {
    const scope = 'owner-a/project/position/database/3';
    localStorage.setItem(
      `almona-draft-draft:${scope}:draft-recovery`,
      JSON.stringify({ state: { geometry: {} }, storageScope: 'owner-b/project/position/database/3' }),
    );

    const scopedManager = manager(scope);
    expect(scopedManager.hasRecoveryPoint()).toBe(false);
    expect(scopedManager.restoreFromRecovery()).toBeNull();
  });

  it('isolates a new authoritative revision from the previous draft', () => {
    const revisionThree = manager('owner/project/position/database/3');
    revisionThree.createCheckpoint({ revision: 3 }, 'revision 3');

    const revisionFour = manager('owner/project/position/database/4');
    expect(revisionFour.loadCurrentDraft()).toBeNull();
    expect(revisionFour.hasRecoveryPoint()).toBe(false);
  });
});
