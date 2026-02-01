/**
 * RealityOS Event Types - TypeScript Definitions
 * 
 * Type definitions for RealityOS event system (Phase 3: Precision Upgrade Plan).
 * RealityOS is a constitutional truth platform for reality-verified operations.
 * 
 * Constitutional Compliance: AICS-001 §7.4 (Audit Trail Doctrine)
 * RealityOS Principles:
 * 1. Human-Verified: All events require human verification
 * 2. Append-Only: Events are immutable, never retroactive
 * 3. Cryptographic Chain: Events form an immutable chain
 * 4. ERP as Consumer: ERP systems consume events, not create them
 * 5. Vertical Agnostic: Platform supports multiple verticals
 * 6. No Admin Correction: No admin override flags
 * 
 * @since Phase 3: Precision Upgrade Plan (January 2026)
 */

/**
 * Core Event Types
 * 
 * RealityOS understands these core event types.
 */
export type CoreEventType = 'ON' | 'OFF' | 'FAULT' | 'INSPECTION' | 'VERIFICATION';

/**
 * GPS Point
 */
export interface GPSPoint {
  latitude: number; // -90 to 90
  longitude: number; // -180 to 180
  accuracy?: number; // GPS accuracy in meters (optional)
}

/**
 * Reality Proof Bundle
 * 
 * Proof bundle for human verification (RealityOS Principle 1).
 * All events require human verification.
 */
export interface RealityProof {
  /** Who verified (user ID, operator ID, etc.) */
  verifiedBy: string;
  /** When verified (ISO 8601 timestamp) */
  timestamp: string; // ISO 8601
  /** QR code scanned (optional) */
  qrData?: string;
  /** Photo hashes (SHA-256, max 2 photos) */
  photoHashes?: string[];
  /** GPS coordinates (optional) */
  location?: GPSPoint;
  /** Additional metadata for cryptographic provenance (optional) */
  metadata?: Record<string, any>;
}

/**
 * RealityOS Event
 * 
 * Base event structure for RealityOS.
 */
export interface RealityOSEvent {
  /** Core event type */
  eventType: CoreEventType;
  /** Entity ID (what this event is about) */
  entityId: string;
  /** Vertical ID (which vertical owns this event) */
  verticalId: string;
  /** Proof bundle (human verification) */
  proof: RealityProof;
  /** Payload (vertical-specific data) */
  payload: Record<string, any>;
}

/**
 * Event Record
 * 
 * Event as stored in the ledger (includes system fields).
 */
export interface EventRecord extends RealityOSEvent {
  /** Event hash (SHA-256) */
  eventHash: string;
  /** Previous event hash (cryptographic chain) */
  prevHash: string | null;
  /** Chain position (monotonic sequence) */
  chainPosition: number;
  /** When event was recorded */
  recordedAt: string; // ISO 8601
  /** When event was created */
  createdAt: string; // ISO 8601
}

/**
 * ALMONA Event Mapping
 * 
 * Maps ALMONA events to RealityOS events.
 */
export interface AlmonaRealityOSEventMapping {
  /** ALMONA event type */
  almonaEvent: string;
  /** RealityOS event type */
  realityOSEventType: CoreEventType;
  /** Entity ID generator function */
  entityId: (entity: any) => string;
  /** Human verification required */
  humanVerificationRequired: boolean;
  /** Proof requirements */
  proofRequirements: {
    qr?: boolean;
    photo?: boolean;
    gps?: boolean;
    timestamp: boolean;
  };
}

/**
 * Proof Validation Result
 */
export interface ProofValidationResult {
  /** Is valid */
  isValid: boolean;
  /** Validation errors */
  errors: string[];
  /** Missing required proof components */
  missing: string[];
}

/**
 * Fault Event
 * 
 * Emitted when an original event was missed (Constitutional Lock #3).
 */
export interface FaultEvent {
  /** Fault type */
  faultType: 'MISSED_EVENT' | 'PROOF_INVALID' | 'VALIDATION_FAILED';
  /** Original event type that was missed */
  originalEventType?: string;
  /** Entity ID */
  entityId: string;
  /** When fault was detected */
  detectedAt: Date;
  /** Reason for fault */
  reason: string;
  /** Requires human investigation */
  requiresHumanInvestigation: boolean;
}

/**
 * Event Emission Options
 */
export interface EventEmissionOptions {
  /** Timestamp (defaults to current time) */
  timestamp?: Date;
  /** Skip retroactive check (for testing only) */
  skipRetroactiveCheck?: boolean;
  /** Bypass human verification (for testing only) */
  bypassHumanVerification?: boolean;
}

/**
 * Event Emission Result
 */
export interface EventEmissionResult {
  /** Success */
  success: boolean;
  /** Emitted event (if successful) */
  event?: EventRecord;
  /** Fault event (if fault occurred) */
  faultEvent?: EventRecord;
  /** Error message (if failed) */
  error?: string;
  /** Constitutional note */
  constitutionalNote?: string;
}

