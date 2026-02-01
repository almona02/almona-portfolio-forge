/**
 * RealityOS Module - Public API
 * 
 * Phase 3: Precision Upgrade Plan
 * 
 * @since Phase 3: Precision Upgrade Plan (January 2026)
 */

export * from './types';
export * from './EventMappings';
export * from './RealityOSEventEmitter';
export * from './EventLedger';
export * from './EventEmissionQueue';

// Re-export singleton instances for convenience
export { realityOSEventEmitter } from './RealityOSEventEmitter';
export { eventEmissionQueue } from './EventEmissionQueue';
export { getEventMapping, getAllEventMappings, EVENT_MAPPINGS } from './EventMappings';

