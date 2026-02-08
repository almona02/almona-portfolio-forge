/**
 * RealityOS Event Mappings
 * 
 * Maps ALMONA events to RealityOS events.
 * 
 * Constitutional Compliance: AICS-001 §7.4 (Audit Trail Doctrine)
 * 
 * @since Phase 3: Precision Upgrade Plan (January 2026)
 */

import type { WindowUnit } from '@/types/fabricator';
import type { AlmonaRealityOSEventMapping } from './types';

/**
 * Event Mappings
 * 
 * Maps ALMONA-specific events to RealityOS core event types.
 */
export const EVENT_MAPPINGS: AlmonaRealityOSEventMapping[] = [
  // ==========================================================================
  // Fabricator constitutional migration events (v1 -> v2 consolidation)
  // ==========================================================================
  {
    almonaEvent: 'FabricatorMigrationInitiated',
    realityOSEventType: 'ON',
    entityId: (payload: any) => `fabricator_migration_${payload.migrationId || payload.id || 'unknown'}`,
    humanVerificationRequired: true,
    proofRequirements: {
      timestamp: true,
      photo: false,
      gps: false,
      qr: false,
    },
  },
  {
    almonaEvent: 'FabricatorMigrationCompleted',
    realityOSEventType: 'ON',
    entityId: (payload: any) => {
      const head = String(payload.chainHeadHash || payload.migrationChainHead || '').slice(0, 16);
      return `fabricator_migration_complete_${head || payload.migrationId || 'unknown'}`;
    },
    humanVerificationRequired: true,
    proofRequirements: {
      timestamp: true,
      photo: true, // photo/screenshot proof of human verification of completion
      gps: false,
      qr: false,
    },
  },
  {
    almonaEvent: 'FabricatorRollbackInitiated',
    realityOSEventType: 'ON',
    entityId: (payload: any) => `fabricator_migration_rollback_${payload.migrationId || payload.id || 'unknown'}`,
    humanVerificationRequired: true,
    proofRequirements: {
      timestamp: true,
      photo: false,
      gps: false,
      qr: false,
    },
  },
  {
    almonaEvent: 'FabricatorRollbackCompleted',
    realityOSEventType: 'ON',
    entityId: (payload: any) => `fabricator_migration_rollback_complete_${payload.migrationId || payload.id || 'unknown'}`,
    humanVerificationRequired: true,
    proofRequirements: {
      timestamp: true,
      photo: true, // proof of verification for rollback completion
      gps: false,
      qr: false,
    },
  },
  {
    almonaEvent: 'FabricatorDualWriteDriftDetected',
    realityOSEventType: 'FAULT',
    entityId: (_payload: any) => `fabricator_dual_write_drift`,
    humanVerificationRequired: true,
    proofRequirements: {
      timestamp: true,
      photo: false,
      gps: false,
      qr: false,
    },
  },
  {
    almonaEvent: 'FabricatorCutoverExecuted',
    realityOSEventType: 'ON',
    entityId: (payload: any) => `fabricator_cutover_${payload.cutoverId || payload.timestamp || 'unknown'}`,
    humanVerificationRequired: false,
    proofRequirements: {
      timestamp: true,
      photo: false,
      gps: false,
      qr: false,
    },
  },
  {
    almonaEvent: 'FabricatorRollbackExecuted',
    realityOSEventType: 'ON',
    entityId: (payload: any) => `fabricator_rollback_${payload.rollbackId || payload.timestamp || 'unknown'}`,
    humanVerificationRequired: true,
    proofRequirements: {
      timestamp: true,
      photo: false,
      gps: false,
      qr: false,
    },
  },
  {
    almonaEvent: 'FabricationIntentCreated',
    realityOSEventType: 'ON',
    entityId: (entity: WindowUnit) => `fabrication_intent_${entity.id}`,
    humanVerificationRequired: true,
    proofRequirements: {
      timestamp: true,
      photo: false, // Design intent, no physical proof needed
      gps: false,
      qr: false,
    },
  },
  {
    almonaEvent: 'CutListAuthorized',
    realityOSEventType: 'VERIFICATION',
    entityId: (entity: any) => `cutlist_${entity.id || entity.cutListId || 'unknown'}`,
    humanVerificationRequired: true,
    proofRequirements: {
      timestamp: true,
      photo: true, // Screenshot of authorized cut list
      gps: false,
      qr: false,
    },
  },
  {
    almonaEvent: 'CNCFileReleased',
    realityOSEventType: 'VERIFICATION',
    entityId: (entity: any) => `cnc_file_${entity.id || entity.fileId || 'unknown'}`,
    humanVerificationRequired: true,
    proofRequirements: {
      timestamp: true,
      photo: true, // File hash proof
      gps: false,
      qr: true, // QR code on CNC file
    },
  },
  {
    almonaEvent: 'ProductionStarted',
    realityOSEventType: 'ON',
    entityId: (entity: any) => `production_${entity.id || entity.productionId || 'unknown'}`,
    humanVerificationRequired: true,
    proofRequirements: {
      timestamp: true,
      photo: true, // Machine setup photo
      gps: true, // Workshop location
      qr: true, // Machine QR code
    },
  },
  {
    almonaEvent: 'ProductionCompleted',
    realityOSEventType: 'VERIFICATION',
    entityId: (entity: any) => `production_${entity.id || entity.productionId || 'unknown'}`,
    humanVerificationRequired: true,
    proofRequirements: {
      timestamp: true,
      photo: true, // Completed product photo
      gps: true, // Workshop location
      qr: true, // Product QR code
    },
  },
  {
    almonaEvent: 'QualityPassed',
    realityOSEventType: 'VERIFICATION',
    entityId: (entity: any) => `quality_${entity.id || entity.unitId || 'unknown'}`,
    humanVerificationRequired: true,
    proofRequirements: {
      timestamp: true,
      photo: true, // Photo proof of quality approval
      gps: false,
      qr: true, // Product QR code
    },
  },
  {
    almonaEvent: 'QualityFailed',
    realityOSEventType: 'FAULT',
    entityId: (entity: any) => `quality_${entity.id || entity.unitId || 'unknown'}`,
    humanVerificationRequired: true,
    proofRequirements: {
      timestamp: true,
      photo: true, // Photo proof of defects
      gps: false,
      qr: true, // Product QR code
    },
  },
  {
    almonaEvent: 'ProductDelivered',
    realityOSEventType: 'OFF',
    entityId: (entity: any) => `delivery_${entity.id || entity.unitId || 'unknown'}`,
    humanVerificationRequired: true,
    proofRequirements: {
      timestamp: true,
      photo: true, // Delivery photo proof
      gps: true, // Delivery location (customer site)
      qr: true, // Product QR code
    },
  },
  {
    almonaEvent: 'RemnantCreated',
    realityOSEventType: 'ON',
    entityId: (entity: any) => `remnant_${entity.id || entity.remnantId || 'unknown'}`,
    humanVerificationRequired: true,
    proofRequirements: {
      timestamp: true,
      photo: true, // Photo of remnant with measurements
      qr: false, // QR code optional for remnants
    },
  },
];

/**
 * Get event mapping by ALMONA event type
 */
export function getEventMapping(almonaEvent: string): AlmonaRealityOSEventMapping | undefined {
  return EVENT_MAPPINGS.find((mapping) => mapping.almonaEvent === almonaEvent);
}

/**
 * Get all event mappings
 */
export function getAllEventMappings(): AlmonaRealityOSEventMapping[] {
  return EVENT_MAPPINGS;
}

