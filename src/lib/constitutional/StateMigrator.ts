
import { PersistedState } from './PositionStateSyncService';

/**
 * State Migrator
 * 
 * Handles schema evolution and backward compatibility for persisted states.
 * @constitutional_compliance AICS-001 §9.3.I (Data Integrity)
 */
export class StateMigrator {
  private readonly CURRENT_VERSION = 1;

  /**
   * Migrate state to current version
   */
  migrate(state: PersistedState): PersistedState {
    let currentState = { ...state };
    
    // Default to version 0 if undefined
    if (typeof currentState.version === 'undefined') {
        currentState.version = 0;
    }
    
    // Apply migrations sequentially
    if (currentState.version < 1) {
        currentState = this.migrateV0toV1(currentState);
    }
    
    // Future migrations...
    // if (currentState.version < 2) { ... }
    
    return currentState;
  }

  /**
   * Migration V0 -> V1
   * Example: Ensure metadata has all required fields or normalize structure
   */
  private migrateV0toV1(state: PersistedState): PersistedState {
    console.log(`[Constitutional] Migrating state ${state.poseId} from v0 to v1`);
    
    // specific V1 changes
    // e.g. Ensure 'tier' is explicitly set in metadata if missing
    if (state.metadata && !state.metadata.tier) {
        state.metadata.tier = 'Tier 3';
    }
    
    return {
        ...state,
        version: 1
    };
  }
}
