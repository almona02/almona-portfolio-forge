
import { describe, expect, it } from 'vitest';
import { PersistedState } from '../PositionStateSyncService';
import { StateMigrator } from '../StateMigrator';

describe('StateMigrator', () => {
    it('should migrate v0 state to v1', () => {
        const migrator = new StateMigrator();
        const v0State: PersistedState = {
            poseId: 'mig-test',
            mode: 'smartdraw',
            state: { foo: 'bar' },
            metadata: {
                hash: 'abc',
                timestamp: 'now',
                operation: 'test',
                tier: undefined as any, // Missing tier (v0)
                compliance: 'AICS',
                deterministic: true,
                requiresHumanValidation: false
            }
        };

        const migrated = migrator.migrate(v0State);
        
        expect(migrated.version).toBe(1);
        expect(migrated.metadata.tier).toBe('Tier 3');
    });

    it('should pass through v1 state', () => {
        const migrator = new StateMigrator();
        const v1State: PersistedState = {
            poseId: 'mig-test',
            mode: 'smartdraw',
            state: { foo: 'bar' },
            metadata: {
                hash: 'abc',
                timestamp: 'now',
                operation: 'test',
                tier: 'Tier 3',
                compliance: 'AICS',
                deterministic: true,
                requiresHumanValidation: false
            },
            version: 1
        };

        const migrated = migrator.migrate(v1State);
        expect(migrated).toEqual(v1State); // Should be identical
    });
});
