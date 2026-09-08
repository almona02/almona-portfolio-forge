/**
 * Service lifecycle events via RealityOS RPC.
 *
 * CONSISTENCY MODEL: Option C — best effort (non-atomic with ticket mutations).
 * Ticket state may commit even if event RPC fails. Callers must inspect
 * EventPersistenceResult.persisted — do NOT treat silent null as durable audit.
 */

import { supabase } from '@/lib/supabase';
import type { CoreEventType } from '@/lib/realityos/types';

const SERVICE_VERTICAL_ID = 'almona_service';

/** Documented consistency model — not atomic with ticket DB writes */
export const SERVICE_EVENT_CONSISTENCY_MODEL = 'best_effort' as const;

export type ServiceEventConsistencyModel = typeof SERVICE_EVENT_CONSISTENCY_MODEL;

export interface ServiceEventInput {
  eventType: CoreEventType;
  entityId: string;
  payload: Record<string, unknown>;
  verifiedBy: string;
  recordedAt?: string;
  correlationId?: string;
}

export interface EventPersistenceResult {
  persisted: boolean;
  eventHash: string | null;
  consistencyModel: ServiceEventConsistencyModel;
  error?: string;
}

export async function recordServiceEvent(input: ServiceEventInput): Promise<EventPersistenceResult> {
  const timestamp = input.recordedAt ?? new Date().toISOString();
  const proof = {
    verified_by: input.verifiedBy,
    timestamp,
  };
  const payload = {
    ...input.payload,
    correlationId: input.correlationId ?? `${input.entityId}-${input.payload.kind ?? 'event'}-${timestamp}`,
  };

  try {
    const { data, error } = await supabase.rpc('realityos_record_event', {
      p_event_type: input.eventType,
      p_entity_id: input.entityId,
      p_vertical_id: SERVICE_VERTICAL_ID,
      p_proof: proof,
      p_payload: payload,
      p_recorded_at: timestamp,
    });

    if (error) {
      return {
        persisted: false,
        eventHash: null,
        consistencyModel: SERVICE_EVENT_CONSISTENCY_MODEL,
        error: error.message,
      };
    }

    const row = Array.isArray(data) ? data[0] : data;
    const eventHash = (row as { event_hash?: string })?.event_hash ?? null;
    return {
      persisted: Boolean(eventHash),
      eventHash,
      consistencyModel: SERVICE_EVENT_CONSISTENCY_MODEL,
    };
  } catch (err) {
    return {
      persisted: false,
      eventHash: null,
      consistencyModel: SERVICE_EVENT_CONSISTENCY_MODEL,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
