/**
 * P0.11 — Live Supabase integration tests for service ticketing production boundary.
 *
 * Acceptance bar: No live proof = no Production Ready = no Gold-Tier 7+.
 * Sequence: 078 → 080 → 081 → boundary probe → these tests → audit score.
 *
 * Set SUPABASE_INTEGRATION_TESTS=true (via npm run test:ticketing-boundary).
 * Requires SUPABASE_SERVICE_ROLE_KEY for DB FSM probes and cleanup.
 */
import { config } from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  buildGovernedTransitionPatch,
  computeSlaFields,
} from '@/lib/ticketing/TicketGovernanceService';

config();

const RUN_LIVE = process.env.SUPABASE_INTEGRATION_TESTS === 'true';
const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

function isServiceRoleKey(key: string): boolean {
  return Boolean(key) && (key.startsWith('eyJ') || key.startsWith('sb_secret'));
}

const describeLive = RUN_LIVE && url && anonKey ? describe : describe.skip;

async function countEventsForEntity(client: SupabaseClient, entityId: string): Promise<number> {
  const { count, error } = await client
    .from('reality_events')
    .select('event_hash', { count: 'exact', head: true })
    .eq('entity_id', entityId);
  if (error) return -1;
  return count ?? 0;
}

async function recordEventViaAdmin(
  client: SupabaseClient,
  entityId: string,
  eventType: 'ON' | 'VERIFICATION',
  payload: Record<string, unknown>,
): Promise<{ persisted: boolean; eventHash: string | null; error?: string }> {
  const timestamp = new Date().toISOString();
  const { data, error } = await client.rpc('realityos_record_event', {
    p_event_type: eventType,
    p_entity_id: entityId,
    p_vertical_id: 'almona_service',
    p_proof: { verified_by: 'p011-integration-test', timestamp },
    p_payload: payload,
    p_recorded_at: timestamp,
  });
  if (error) {
    return { persisted: false, eventHash: null, error: error.message };
  }
  const eventHash = data?.[0]?.event_hash ?? null;
  return { persisted: Boolean(eventHash), eventHash };
}

describeLive('P0.11 — Live Supabase service ticketing boundary', () => {
  let admin: SupabaseClient;
  let connected = false;
  let probeUserId: string | null = null;
  let probeTicketId: string | null = null;
  let createEventHash: string | null = null;
  const probeMarker = `P011-LIVE-${Date.now()}`;

  beforeAll(async () => {
    if (!isServiceRoleKey(serviceKey)) {
      throw new Error(
        '[P0.11] SUPABASE_SERVICE_ROLE_KEY must be sb_secret_… or legacy service_role JWT (publishable keys cannot probe FSM).',
      );
    }
    admin = createClient(url!, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await admin.from('service_tickets').select('id').limit(1);
    connected = !error;
    if (!connected) {
      throw new Error(
        `Supabase unreachable: ${error?.message}. Database deployment state remains externally unverified.`,
      );
    }

    const { data: profile } = await admin.from('profiles').select('id').limit(1).maybeSingle();
    probeUserId = profile?.id ?? process.env.P011_PROBE_USER_ID ?? null;
    if (!probeUserId) {
      const { data: listed, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
      const uid = listed?.users?.[0]?.id ?? null;
      if (uid) {
        await admin.from('profiles').upsert({ id: uid }, { onConflict: 'id' });
        probeUserId = uid;
      } else if (listErr) {
        throw new Error(`[P0.11] Cannot resolve probe user: ${listErr.message}`);
      }
    }
    if (!probeUserId) {
      throw new Error(
        '[P0.11] No profiles/auth user for probe user_id — create a user or set P011_PROBE_USER_ID',
      );
    }
  });

  afterAll(async () => {
    if (probeTicketId) {
      await admin.from('service_tickets').delete().eq('id', probeTicketId);
    }
  });

  it('connects to live Supabase service_tickets', () => {
    expect(connected).toBe(true);
  });

  it('positive path: create → canonical SLA → Postgres persistence → read-back', async () => {
    const ticketType = 'technical';
    const ticketPriority = 'critical';
    const createdAt = new Date();
    const sla = computeSlaFields(ticketPriority, ticketType, createdAt);

    const { data, error } = await admin
      .from('service_tickets')
      .insert({
        title: probeMarker,
        description: 'P0.11 live boundary test — positive path',
        type: ticketType,
        priority: ticketPriority,
        status: 'open',
        user_id: probeUserId,
        sla_response_due: sla.sla_response_due,
        sla_resolution_due: sla.sla_resolution_due,
        sla_breached: false,
      })
      .select('id, sla_response_due, sla_resolution_due, status, ticket_number')
      .single();

    expect(error).toBeNull();
    expect(new Date(String(data?.sla_response_due)).getTime()).toBe(
      new Date(sla.sla_response_due).getTime(),
    );
    expect(new Date(String(data?.sla_resolution_due)).getTime()).toBe(
      new Date(sla.sla_resolution_due).getTime(),
    );
    expect(data?.status).toBe('open');
    expect(data?.ticket_number).toMatch(/^TKT-\d{4}-\d+$/);
    probeTicketId = data!.id;

    const { data: readBack, error: readErr } = await admin
      .from('service_tickets')
      .select('sla_response_due, sla_resolution_due, status')
      .eq('id', probeTicketId)
      .single();

    expect(readErr).toBeNull();
    expect(new Date(String(readBack?.sla_response_due)).getTime()).toBe(
      new Date(sla.sla_response_due).getTime(),
    );
    expect(new Date(String(readBack?.sla_resolution_due)).getTime()).toBe(
      new Date(sla.sla_resolution_due).getTime(),
    );
    expect(readBack?.status).toBe('open');
  });

  it('positive path: RealityOS create event → read-back from reality_events', async () => {
    if (!probeTicketId) throw new Error('probe ticket missing');

    const result = await recordEventViaAdmin(admin, probeTicketId, 'ON', {
      kind: 'ticket_created',
      test: 'P0.11-positive',
    });

    if (!result.persisted) {
      throw new Error(
        `Event NOT persisted (078 unverified or not granted): ${result.error ?? 'unknown'}`,
      );
    }
    expect(result.eventHash).toMatch(/^[a-f0-9]{64}$/);
    createEventHash = result.eventHash;

    const { data: ledgerRow, error: ledgerErr } = await admin
      .from('reality_events')
      .select('event_hash, entity_id, payload')
      .eq('event_hash', createEventHash)
      .single();

    expect(ledgerErr).toBeNull();
    expect(ledgerRow?.entity_id).toBe(probeTicketId);
  });

  it('negative path: open → resolved rejected, ticket unchanged, no false success', async () => {
    if (!probeTicketId) throw new Error('probe ticket missing');

    const { data: before } = await admin
      .from('service_tickets')
      .select('status')
      .eq('id', probeTicketId)
      .single();

    expect(before?.status).toBe('open');

    const eventsBefore = await countEventsForEntity(admin, probeTicketId);
    expect(eventsBefore).toBeGreaterThanOrEqual(0);

    const { data: badRows, error: badErr } = await admin
      .from('service_tickets')
      .update({ status: 'resolved' })
      .eq('id', probeTicketId)
      .select('status');

    expect(badErr).not.toBeNull();
    expect(badErr!.message).toMatch(/Invalid ticket status transition|check_violation/i);
    expect(badRows ?? []).toHaveLength(0);

    const { data: after } = await admin
      .from('service_tickets')
      .select('status')
      .eq('id', probeTicketId)
      .single();

    expect(after?.status).toBe('open');

    const eventsAfter = await countEventsForEntity(admin, probeTicketId);
    expect(eventsAfter).toBe(eventsBefore);
  });

  it('positive path: legal FSM transition open → assigned persists', async () => {
    if (!probeTicketId) throw new Error('probe ticket missing');

    const patch = buildGovernedTransitionPatch({
      ticketId: probeTicketId,
      currentStatus: 'open',
      targetStatus: 'assigned',
      actorId: 'p011-test',
    });

    const { data, error } = await admin
      .from('service_tickets')
      .update(patch)
      .eq('id', probeTicketId)
      .select('status')
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe('assigned');

    const transitionEvent = await recordEventViaAdmin(admin, probeTicketId, 'VERIFICATION', {
      kind: 'ticket_status_transition',
      from: 'open',
      to: 'assigned',
    });

    if (!transitionEvent.persisted) {
      throw new Error(`Transition event NOT persisted: ${transitionEvent.error ?? 'unknown'}`);
    }
  });

  it('positive path: assigned → in_progress persists with read-back', async () => {
    if (!probeTicketId) throw new Error('probe ticket missing');

    const patch = buildGovernedTransitionPatch({
      ticketId: probeTicketId,
      currentStatus: 'assigned',
      targetStatus: 'in_progress',
      actorId: 'p011-test',
    });

    const { error } = await admin
      .from('service_tickets')
      .update(patch)
      .eq('id', probeTicketId);

    expect(error).toBeNull();

    const { data: readBack } = await admin
      .from('service_tickets')
      .select('status')
      .eq('id', probeTicketId)
      .single();

    expect(readBack?.status).toBe('in_progress');
  });

  it('protected SLA fields reject mutation after create (migration 081)', async () => {
    if (!probeTicketId) throw new Error('probe ticket missing');

    const { error } = await admin
      .from('service_tickets')
      .update({ sla_response_due: new Date(Date.now() + 999999999).toISOString() })
      .eq('id', probeTicketId);

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/immutable|check_violation/i);
  });
});
