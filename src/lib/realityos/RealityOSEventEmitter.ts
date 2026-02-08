/**
 * RealityOS Event Emitter
 * 
 * Emits events to RealityOS Event Ledger with constitutional guarantees.
 * 
 * Constitutional Compliance: AICS-001 §7.4 (Audit Trail Doctrine)
 * Constitutional Lock #3: No Retroactive Event Emission
 * 
 * @since Phase 3: Precision Upgrade Plan (January 2026)
 */

import type { WindowUnit } from '@/types/fabricator';
import { eventEmissionQueue } from './EventEmissionQueue';
import { EventLedger } from './EventLedger';
import { getEventMapping } from './EventMappings';
import type {
    EventEmissionOptions,
    EventEmissionResult,
    FaultEvent,
    ProofValidationResult,
    RealityOSEvent,
    RealityProof,
} from './types';

/**
 * RealityOS Event Emitter
 * 
 * Emits events at critical decision points with constitutional guarantees.
 */
export class RealityOSEventEmitter {
  private eventLedger: EventLedger;
  private readonly RETROACTIVE_TOLERANCE_MS = 5000; // 5 seconds for clock skew

  constructor() {
    this.eventLedger = new EventLedger();
  }

  /**
   * Emit event at critical decision points (real-time only)
   * 
   * Constitutional Lock #3: No retroactive event emission.
   * If an event is missed, emit a FAULT event instead.
   */
  async emitEvent(
    eventType: string,
    entity: any,
    proof: RealityProof,
    options: EventEmissionOptions = {}
  ): Promise<EventEmissionResult> {
    try {
      // Constitutional Lock #3: Check for retroactive emission
      if (!options.skipRetroactiveCheck) {
        const retroactiveCheck = this.checkRetroactiveEmission(proof.timestamp, options.timestamp);
        if (!retroactiveCheck.isValid) {
          // Emit FAULT event instead of retroactive event
          const faultEvent: FaultEvent = {
            faultType: 'MISSED_EVENT',
            originalEventType: eventType,
            entityId: entity.id || entity.unitId || 'unknown',
            detectedAt: new Date(),
            reason: retroactiveCheck.reason,
            requiresHumanInvestigation: true,
          };
          const faultResult = await this.emitFaultEvent(faultEvent);
          return {
            success: false,
            faultEvent: faultResult.event,
            error: retroactiveCheck.reason,
            constitutionalNote:
              'Retroactive event emission is forbidden. FAULT event emitted instead (AICS-001 §7.4, RealityOS Principle 2).',
          };
        }
      }

      // Validate proof requirements
      const validation = this.validateProof(proof, eventType);
      if (!validation.isValid) {
        // Emit FAULT event for invalid proof
        const faultEvent: FaultEvent = {
          faultType: 'PROOF_INVALID',
          originalEventType: eventType,
          entityId: entity.id || 'unknown',
          detectedAt: new Date(),
          reason: `Proof validation failed: ${validation.errors.join(', ')}`,
          requiresHumanInvestigation: true,
        };
        const faultResult = await this.emitFaultEvent(faultEvent);
        return {
          success: false,
          faultEvent: faultResult.event,
          error: validation.errors.join(', '),
          constitutionalNote: 'Proof validation failed. FAULT event emitted instead.',
        };
      }

      // Map to RealityOS event
      const mapping = getEventMapping(eventType);
      if (!mapping) {
        return {
          success: false,
          error: `No event mapping found for event type: ${eventType}`,
        };
      }

      const realityOSEvent = this.mapToRealityOSEvent(eventType, entity, proof, mapping);

      // Emit to RealityOS Event Ledger (via queue for performance)
      const recordedEvent = await eventEmissionQueue.enqueue(realityOSEvent);

      return {
        success: true,
        event: recordedEvent,
        constitutionalNote: 'Event emitted successfully to RealityOS Event Ledger.',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
        constitutionalNote: 'Event emission failed. See error for details.',
      };
    }
  }

  /**
   * Check for retroactive emission (Constitutional Lock #3)
   */
  private checkRetroactiveEmission(
    proofTimestamp: string,
    providedTimestamp?: Date
  ): { isValid: boolean; reason?: string } {
    const eventTime = providedTimestamp
      ? providedTimestamp.getTime()
      : new Date(proofTimestamp).getTime();
    const currentTime = Date.now();
    const timeDifference = currentTime - eventTime;

    // Allow tolerance for clock skew, but reject anything older
    if (timeDifference > this.RETROACTIVE_TOLERANCE_MS) {
      return {
        isValid: false,
        reason: `Event emission attempted ${timeDifference}ms after occurrence. Retroactive emission is forbidden (AICS-001 §7.4, RealityOS Principle 2).`,
      };
    }

    // Prevent future-dated events
    if (timeDifference < -this.RETROACTIVE_TOLERANCE_MS) {
      return {
        isValid: false,
        reason: `Event timestamp is in the future. Future-dated events are forbidden.`,
      };
    }

    return { isValid: true };
  }

  /**
   * Validate proof requirements
   */
  private validateProof(proof: RealityProof, eventType: string): ProofValidationResult {
    const mapping = getEventMapping(eventType);
    if (!mapping) {
      return {
        isValid: false,
        errors: [`No event mapping found for event type: ${eventType}`],
        missing: [],
      };
    }

    const errors: string[] = [];
    const missing: string[] = [];

    // Check required fields
    if (!proof.verifiedBy) {
      errors.push('verified_by is required');
      missing.push('verified_by');
    }

    if (!proof.timestamp) {
      errors.push('timestamp is required');
      missing.push('timestamp');
    }

    // Check proof requirements
    if (mapping.proofRequirements.qr && !proof.qrData) {
      errors.push('QR code is required for this event type');
      missing.push('qr');
    }

    if (mapping.proofRequirements.photo && (!proof.photoHashes || proof.photoHashes.length === 0)) {
      errors.push('Photo hash is required for this event type');
      missing.push('photo');
    }

    if (mapping.proofRequirements.gps && !proof.location) {
      errors.push('GPS location is required for this event type');
      missing.push('gps');
    }

    // Validate photo hashes (if provided)
    if (proof.photoHashes) {
      if (proof.photoHashes.length > 2) {
        errors.push('Maximum 2 photo hashes allowed');
      }
      for (const hash of proof.photoHashes) {
        if (!/^[a-f0-9]{64}$/i.test(hash)) {
          errors.push(`Invalid SHA-256 hash: ${hash}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      missing,
    };
  }

  /**
   * Map ALMONA event to RealityOS event
   */
  private mapToRealityOSEvent(
    eventType: string,
    entity: any,
    proof: RealityProof,
    mapping: ReturnType<typeof getEventMapping>
  ): RealityOSEvent {
    if (!mapping) {
      throw new Error(`No event mapping found for event type: ${eventType}`);
    }

    const entityId = mapping.entityId(entity);

    return {
      eventType: mapping.realityOSEventType,
      entityId,
      verticalId: 'almona_vertical',
      proof,
      payload: {
        almona_event_type: eventType,
        entity_data: entity,
        human_verification_required: mapping.humanVerificationRequired,
        constitutional_note:
          'This event was emitted to RealityOS Event Ledger. It is immutable and append-only (AICS-001 §7.4, RealityOS Principle 2).',
      },
    };
  }

  /**
   * Emit FAULT event when original event was missed
   * 
   * Constitutional Lock #3: Never recreate the past.
   */
  private async emitFaultEvent(fault: FaultEvent): Promise<EventEmissionResult> {
    const faultProof: RealityProof = {
      verifiedBy: 'system',
      timestamp: fault.detectedAt.toISOString(),
      location: null,
      photoHashes: [],
    };

    const faultEvent: RealityOSEvent = {
      eventType: 'FAULT',
      entityId: `fault_${fault.entityId}`,
      verticalId: 'almona_vertical',
      proof: faultProof,
      payload: {
        fault_type: fault.faultType,
        original_event_type: fault.originalEventType,
        entity_id: fault.entityId,
        reason: fault.reason,
        requires_human_investigation: fault.requiresHumanInvestigation,
        constitutional_note:
          'Retroactive event emission is forbidden. FAULT event emitted instead (AICS-001 §7.4, RealityOS Principle 2).',
      },
    };

    // FAULT events are emitted immediately (not queued) for criticality
    const recordedEvent = await this.eventLedger.record(faultEvent);

    return {
      success: true,
      event: recordedEvent,
      constitutionalNote: 'FAULT event emitted for missed original event.',
    };
  }

  /**
   * Emit FabricatorCutoverExecuted event (one-time cutover to studio-only routes / v2 source).
   * Call on first navigation into /fabricator for append-only governance.
   */
  async emitFabricatorCutoverExecuted(
    payload: { cutoverId?: string; timestamp?: string; [key: string]: any } = {}
  ): Promise<EventEmissionResult> {
    const proof: RealityProof = {
      verifiedBy: 'system',
      timestamp: new Date().toISOString(),
      location: null,
      photoHashes: [],
      metadata: { constitutional_role: 'cutover_anchor' },
    };
    const p = { ...payload, cutoverId: payload.cutoverId ?? `cutover_${Date.now()}`, timestamp: proof.timestamp };
    return this.emitEvent('FabricatorCutoverExecuted', p, proof, { skipRetroactiveCheck: true });
  }

  /**
   * Emit FabricatorRollbackExecuted event (when flipping read source back to v1 within 30-day window).
   */
  async emitFabricatorRollbackExecuted(
    payload: { rollbackId?: string; reason?: string; [key: string]: any },
    operatorId: string
  ): Promise<EventEmissionResult> {
    const proof: RealityProof = {
      verifiedBy: operatorId,
      timestamp: new Date().toISOString(),
      location: null,
      photoHashes: [],
      metadata: { constitutional_role: 'rollback_executed' },
    };
    return this.emitEvent('FabricatorRollbackExecuted', payload, proof);
  }

  /**
   * Emit FabricatorMigrationInitiated event
   *
   * Constitutional guidance:
   * - Emits in real-time only (no retroactive emission)
   * - Serves as the governance anchor for event-derived migration mode
   */
  async emitFabricatorMigrationInitiated(
    payload: { migrationId: string; note?: string; [key: string]: any },
    operatorId: string
  ): Promise<EventEmissionResult> {
    const proof: RealityProof = {
      verifiedBy: operatorId,
      timestamp: new Date().toISOString(),
      location: null,
      photoHashes: [],
      metadata: {
        constitutional_role: 'migration_initiation',
      },
    };

    return this.emitEvent('FabricatorMigrationInitiated', payload, proof);
  }

  /**
   * Emit FabricatorMigrationCompleted event
   *
   * Includes chain head hash + certificate hash (optional) to bind migration
   * evidence to the append-only RealityOS ledger.
   */
  async emitFabricatorMigrationCompleted(
    payload: { migrationId: string; chainHeadHash: string; certificateHash?: string; [key: string]: any },
    operatorId: string,
    completionProofPhotoHash: string
  ): Promise<EventEmissionResult> {
    const proof: RealityProof = {
      verifiedBy: operatorId,
      timestamp: new Date().toISOString(),
      location: null,
      photoHashes: [completionProofPhotoHash],
      metadata: {
        migrationId: payload.migrationId,
        chainHeadHash: payload.chainHeadHash,
        certificateHash: payload.certificateHash,
        constitutional_role: 'migration_completion',
      },
    };

    return this.emitEvent('FabricatorMigrationCompleted', payload, proof);
  }

  /**
   * Emit FabricatorRollbackInitiated event
   */
  async emitFabricatorRollbackInitiated(
    payload: { migrationId: string; reason?: string; [key: string]: any },
    operatorId: string
  ): Promise<EventEmissionResult> {
    const proof: RealityProof = {
      verifiedBy: operatorId,
      timestamp: new Date().toISOString(),
      location: null,
      photoHashes: [],
      metadata: {
        constitutional_role: 'rollback_initiation',
      },
    };

    return this.emitEvent('FabricatorRollbackInitiated', payload, proof);
  }

  /**
   * Emit FabricatorRollbackCompleted event
   */
  async emitFabricatorRollbackCompleted(
    payload: { migrationId: string; chainHeadHash?: string; certificateHash?: string; [key: string]: any },
    operatorId: string,
    completionProofPhotoHash: string
  ): Promise<EventEmissionResult> {
    const proof: RealityProof = {
      verifiedBy: operatorId,
      timestamp: new Date().toISOString(),
      location: null,
      photoHashes: [completionProofPhotoHash],
      metadata: {
        migrationId: payload.migrationId,
        chainHeadHash: payload.chainHeadHash,
        certificateHash: payload.certificateHash,
        constitutional_role: 'rollback_completion',
      },
    };

    return this.emitEvent('FabricatorRollbackCompleted', payload, proof);
  }

  /**
   * Emit FabricationIntentCreated event
   */
  async emitFabricationIntentCreated(
    windowUnit: WindowUnit,
    operatorId: string
  ): Promise<EventEmissionResult> {
    const proof: RealityProof = {
      verifiedBy: operatorId,
      timestamp: new Date().toISOString(),
      location: null, // Design intent, no location
      photoHashes: [],
    };

    return this.emitEvent('FabricationIntentCreated', windowUnit, proof);
  }

  /**
   * Emit CutListAuthorized event
   */
  async emitCutListAuthorized(
    cutList: any,
    operatorId: string,
    screenshotHash?: string
  ): Promise<EventEmissionResult> {
    const proof: RealityProof = {
      verifiedBy: operatorId,
      timestamp: new Date().toISOString(),
      location: null,
      photoHashes: screenshotHash ? [screenshotHash] : [],
    };

    return this.emitEvent('CutListAuthorized', cutList, proof);
  }

  /**
   * Emit CNCFileReleased event
   */
  async emitCNCFileReleased(
    cncFile: any,
    operatorId: string,
    fileHash: string,
    qrCode?: string
  ): Promise<EventEmissionResult> {
    const proof: RealityProof = {
      verifiedBy: operatorId,
      timestamp: new Date().toISOString(),
      location: null,
      photoHashes: [fileHash],
      qrData: qrCode,
    };

    return this.emitEvent('CNCFileReleased', cncFile, proof);
  }

  /**
   * Emit ProductionStarted event
   */
  async emitProductionStarted(
    production: any,
    operatorId: string,
    machineQR: string,
    workshopGPS?: { latitude: number; longitude: number; accuracyMeters?: number }
  ): Promise<EventEmissionResult> {
    const proof: RealityProof = {
      verifiedBy: operatorId,
      timestamp: new Date().toISOString(),
      location: workshopGPS || null,
      photoHashes: [],
      qrData: machineQR,
    };

    return this.emitEvent('ProductionStarted', production, proof);
  }

  /**
   * Emit ProductionCompleted event
   */
  async emitProductionCompleted(
    production: any,
    operatorId: string,
    productPhotoHash: string,
    productQR: string,
    workshopGPS?: { latitude: number; longitude: number; accuracyMeters?: number }
  ): Promise<EventEmissionResult> {
    const proof: RealityProof = {
      verifiedBy: operatorId,
      timestamp: new Date().toISOString(),
      location: workshopGPS || null,
      photoHashes: [productPhotoHash],
      qrData: productQR,
    };

    return this.emitEvent('ProductionCompleted', production, proof);
  }

  /**
   * Emit QualityPassed event
   */
  async emitQualityPassed(
    qualityResult: any,
    operatorId: string,
    productPhotoHash: string,
    productQR: string
  ): Promise<EventEmissionResult> {
    const proof: RealityProof = {
      verifiedBy: operatorId,
      timestamp: new Date().toISOString(),
      location: null,
      photoHashes: [productPhotoHash],
      qrData: productQR,
    };

    return this.emitEvent('QualityPassed', qualityResult, proof);
  }

  /**
   * Emit QualityFailed event
   */
  async emitQualityFailed(
    qualityResult: any,
    operatorId: string,
    defectPhotoHashes: string[],
    productQR: string
  ): Promise<EventEmissionResult> {
    const proof: RealityProof = {
      verifiedBy: operatorId,
      timestamp: new Date().toISOString(),
      location: null,
      photoHashes: defectPhotoHashes.slice(0, 2), // Max 2 photos
      qrData: productQR,
    };

    return this.emitEvent('QualityFailed', qualityResult, proof);
  }

  /**
   * Emit ProductDelivered event
   */
  async emitProductDelivered(
    delivery: any,
    operatorId: string,
    deliveryPhotoHash: string,
    productQR: string,
    gpsLocation: { latitude: number; longitude: number; accuracy?: number },
    customerSignatureHash?: string
  ): Promise<EventEmissionResult> {
    const proof: RealityProof = {
      verifiedBy: operatorId,
      timestamp: new Date().toISOString(),
      location: {
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
        accuracy: gpsLocation.accuracy,
      },
      photoHashes: customerSignatureHash
        ? [deliveryPhotoHash, customerSignatureHash]
        : [deliveryPhotoHash],
      qrData: productQR,
    };

    return this.emitEvent('ProductDelivered', delivery, proof);
  }

  /**
   * Emit RemnantCreated event
   * Binds remnant to original BOM + cut list with cryptographic provenance
   */
  async emitRemnantCreated(
    remnant: any,
    operatorId: string,
    remnantPhotoHash: string,
    sourceProjectId?: string,
    sourceCutId?: string,
    sourceBOMHash?: string
  ): Promise<EventEmissionResult> {
    const proof: RealityProof = {
      verifiedBy: operatorId,
      timestamp: new Date().toISOString(),
      photoHashes: [remnantPhotoHash],
      // Cryptographic provenance: bind to source BOM and cut list
      metadata: {
        sourceProjectId,
        sourceCutId,
        sourceBOMHash, // SHA-256 hash of original BOM
      },
    };

    return this.emitEvent('RemnantCreated', remnant, proof);
  }
}

/**
 * Singleton instance
 */
export const realityOSEventEmitter = new RealityOSEventEmitter();

