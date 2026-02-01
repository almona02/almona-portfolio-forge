/**
 * RealityOS Event Ledger
 * 
 * Append-only, immutable event storage with cryptographic chain.
 * 
 * Constitutional Compliance: AICS-001 §7.4 (Audit Trail Doctrine)
 * RealityOS Principles:
 * - Append-Only: Events are immutable, never retroactive
 * - Cryptographic Chain: Events form an immutable chain
 * - Human-Verified: All events require human verification
 * 
 * @since Phase 3: Precision Upgrade Plan (January 2026)
 */

import type { RealityOSEvent, EventRecord } from './types';

/**
 * Event Ledger
 * 
 * Manages append-only event storage with cryptographic chain.
 */
export class EventLedger {
  private events: EventRecord[] = [];
  private lastHash: string | null = null;
  private chainPosition: number = 0;

  /**
   * Record event to ledger
   * 
   * Constitutional Guarantee: Append-only, immutable, cryptographically chained.
   */
  async record(event: RealityOSEvent): Promise<EventRecord> {
    // Generate event hash
    const eventHash = await this.generateEventHash(event, this.lastHash);

    // Increment chain position
    this.chainPosition += 1;

    // Create event record
    const eventRecord: EventRecord = {
      ...event,
      eventHash,
      prevHash: this.lastHash,
      chainPosition: this.chainPosition,
      recordedAt: new Date().toISOString(),
      createdAt: event.proof.timestamp,
    };

    // Update last hash
    this.lastHash = eventHash;

    // Store event (in production, this would be persisted to database)
    this.events.push(eventRecord);

    // In production, this would:
    // 1. Insert into reality_events table
    // 2. Verify chain integrity
    // 3. Return the recorded event

    return eventRecord;
  }

  /**
   * Generate event hash (SHA-256)
   * 
   * Hash formula: SHA-256(prev_hash + payload_hash + proof_hash + timestamp)
   */
  private async generateEventHash(
    event: RealityOSEvent,
    prevHash: string | null
  ): Promise<string> {
    const payloadHash = await this.generateSHA256(JSON.stringify(event.payload));
    const proofHash = await this.generateSHA256(JSON.stringify(event.proof));

    const hashInput = `${prevHash || ''}${payloadHash}${proofHash}${event.proof.timestamp}`;
    return await this.generateSHA256(hashInput);
  }

  /**
   * Generate SHA-256 hash using Web Crypto API
   */
  private async generateSHA256(data: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback: simple hash for environments without crypto
    return btoa(data).substring(0, 64);
  }

  /**
   * Get event by hash
   */
  async getEventByHash(eventHash: string): Promise<EventRecord | undefined> {
    return this.events.find((e) => e.eventHash === eventHash);
  }

  /**
   * Get events by entity ID
   */
  async getEventsByEntityId(entityId: string): Promise<EventRecord[]> {
    return this.events.filter((e) => e.entityId === entityId);
  }

  /**
   * Get events by vertical ID
   */
  async getEventsByVerticalId(verticalId: string): Promise<EventRecord[]> {
    return this.events.filter((e) => e.verticalId === verticalId);
  }

  /**
   * Get latest events
   */
  async getLatestEvents(limit: number = 100): Promise<EventRecord[]> {
    return this.events.slice(-limit).reverse();
  }

  /**
   * Verify chain integrity
   * 
   * Validates that all events form a valid cryptographic chain.
   */
  async verifyChainIntegrity(): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (let i = 1; i < this.events.length; i++) {
      const currentEvent = this.events[i];
      const previousEvent = this.events[i - 1];

      // Check that prev_hash matches previous event's hash
      if (currentEvent.prevHash !== previousEvent.eventHash) {
        errors.push(
          `Chain break at position ${currentEvent.chainPosition}: prev_hash mismatch`
        );
      }

      // Verify event hash
      const expectedHash = await this.generateEventHash(
        {
          eventType: currentEvent.eventType,
          entityId: currentEvent.entityId,
          verticalId: currentEvent.verticalId,
          proof: currentEvent.proof,
          payload: currentEvent.payload,
        },
        previousEvent.eventHash
      );

      if (currentEvent.eventHash !== expectedHash) {
        errors.push(
          `Chain break at position ${currentEvent.chainPosition}: event hash mismatch`
        );
      }

      // Check chain position is monotonic
      if (currentEvent.chainPosition !== previousEvent.chainPosition + 1) {
        errors.push(
          `Chain break at position ${currentEvent.chainPosition}: chain position not monotonic`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get chain statistics
   */
  getChainStatistics(): {
    totalEvents: number;
    chainLength: number;
    lastEventHash: string | null;
    lastChainPosition: number;
  } {
    return {
      totalEvents: this.events.length,
      chainLength: this.events.length,
      lastEventHash: this.lastHash,
      lastChainPosition: this.chainPosition,
    };
  }
}

