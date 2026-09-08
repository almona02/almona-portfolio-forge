#!/usr/bin/env node
/**
 * Verify service ticketing production boundary on live Supabase.
 *
 * Sequence: prerequisite audit → 078/080/081 evidence → Tier-3 boundary proof
 *
 * Usage: npm run verify:ticketing-boundary
 * Requires: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env
 * Required for FSM proof: SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

function keyKind(key) {
  if (!key) return 'missing';
  if (key.startsWith('eyJ')) return 'jwt';
  if (key.startsWith('sb_secret')) return 'sb_secret';
  if (key.startsWith('sb_publishable')) return 'sb_publishable';
  return 'other';
}

if (!url || !anonKey) {
  console.error('FAIL: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY / PUBLISHABLE_KEY');
  process.exit(1);
}

const serviceKind = keyKind(serviceKey);
const hasServiceRole = serviceKind === 'jwt' || serviceKind === 'sb_secret';
const client = createClient(url, hasServiceRole ? serviceKey : anonKey);
const admin = hasServiceRole ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;

const results = [];

function report(phase, name, status, detail) {
  results.push({ phase, name, status, detail });
  const icon = status === 'VERIFIED' ? '✓' : status === 'BLOCKED' ? '⊘' : status === 'UNVERIFIED' ? '?' : '✗';
  console.log(`${icon} [${phase}] ${name}: ${status}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  console.log('=== Service Ticketing Production Boundary Verification ===');
  console.log('Sequence: prerequisites → 078 → 080 → 081 → Tier-3 boundary proof\n');

  // -------------------------------------------------------------------------
  // Phase A — Prerequisites (do NOT blindly apply 041)
  // -------------------------------------------------------------------------
  console.log('--- Phase A: Prerequisite audit ---\n');

  const { error: connErr } = await client.from('service_tickets').select('id').limit(1);
  if (connErr) {
    report('A', 'Supabase connectivity', 'FAILED', connErr.message);
    console.log('\nDatabase deployment state remains externally unverified (no connectivity).');
    process.exit(2);
  }
  report('A', 'service_tickets table', 'VERIFIED', 'reachable');

  const { error: eventsTableErr } = await client.from('reality_events').select('event_hash').limit(1);
  if (eventsTableErr) {
    report(
      'A',
      'reality_events table (041 prerequisite)',
      'BLOCKED',
      `${eventsTableErr.message} — inspect target env; apply 041 ONLY if ledger truly absent`,
    );
  } else {
    report('A', 'reality_events table (041 prerequisite)', 'VERIFIED', 'present — do NOT blindly re-run 041');
  }

  for (const file of [
    '078_realityos_record_event_function.sql',
    '080_service_ticketing_governance.sql',
    '081_ticket_production_boundary.sql',
  ]) {
    try {
      readFileSync(join(ROOT, 'migrations', file), 'utf8');
      report('A', `Repo migration ${file}`, 'VERIFIED', 'present');
    } catch {
      report('A', `Repo migration ${file}`, 'FAILED', 'missing from repo');
    }
  }

  // -------------------------------------------------------------------------
  // Phase B — Migration evidence (078, 080)
  // -------------------------------------------------------------------------
  console.log('\n--- Phase B: Migration evidence (078 → 080) ---\n');

  const ts = new Date().toISOString();
  const { data: rpcData, error: rpcErr } = await client.rpc('realityos_record_event', {
    p_event_type: 'ON',
    p_entity_id: `boundary-verify-${Date.now()}`,
    p_vertical_id: 'almona_service',
    p_proof: { verified_by: 'boundary-verify', timestamp: ts },
    p_payload: { kind: 'boundary_verify' },
    p_recorded_at: ts,
  });

  if (rpcErr) {
    report('B', 'Migration 078 realityos_record_event', 'UNVERIFIED', rpcErr.message);
  } else {
    const hash = rpcData?.[0]?.event_hash;
    report(
      'B',
      'Migration 078 realityos_record_event',
      hash ? 'VERIFIED' : 'UNVERIFIED',
      hash ? `hash ${hash.slice(0, 12)}…` : 'no hash returned',
    );
  }

  if (!admin) {
    const hint =
      serviceKind === 'sb_publishable' || serviceKind === 'missing'
        ? `set SUPABASE_SERVICE_ROLE_KEY to sb_secret_… or legacy service_role JWT (got ${serviceKind})`
        : `unsupported service key kind=${serviceKind}`;
    report('B', 'Migration 080 handle_new_ticket governance', 'UNVERIFIED', hint);
    report('C', 'Migration 081 Tier-3 FSM boundary', 'UNVERIFIED', hint);
  } else {
    // service_tickets.user_id is NOT NULL → resolve a real profile/auth user for probes
    let probeUserId = process.env.P011_PROBE_USER_ID || null;
    let profileErrMsg = '';
    if (!probeUserId) {
      const { data: profileRow, error: profileErr } = await admin
        .from('profiles')
        .select('id')
        .limit(1)
        .maybeSingle();
      profileErrMsg = profileErr?.message || '';
      probeUserId = profileRow?.id ?? null;
    }
    if (!probeUserId) {
      try {
        const { data: listed, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
        const uid = listed?.users?.[0]?.id ?? null;
        if (uid) {
          // Ensure profiles row exists for FK
          await admin.from('profiles').upsert({ id: uid }, { onConflict: 'id' });
          probeUserId = uid;
        } else if (listErr) {
          profileErrMsg = listErr.message;
        }
      } catch (e) {
        profileErrMsg = e instanceof Error ? e.message : String(e);
      }
    }

    if (!probeUserId) {
      report(
        'B',
        'Probe user_id',
        'UNVERIFIED',
        profileErrMsg || 'no profiles/auth user — set P011_PROBE_USER_ID',
      );
      report('C', 'Tier-3 FSM: open → resolved rejected', 'UNVERIFIED', 'blocked — no probe user_id');
    } else {
    report('B', 'Probe user_id', 'VERIFIED', `${String(probeUserId).slice(0, 8)}…`);

    const probeTitle = `P011-GOV-PROBE-${Date.now()}`;
    const { data: govInsert, error: govInsErr } = await admin
      .from('service_tickets')
      .insert({
        title: probeTitle,
        description: '080 governance probe — auto-deleted',
        type: 'general',
        priority: 'medium',
        status: 'open',
        user_id: probeUserId,
      })
      .select('id, status, assigned_to, sla_response_due, sla_resolution_due, ticket_number')
      .single();

    if (govInsErr) {
      report('B', 'Migration 080 handle_new_ticket governance', 'UNVERIFIED', govInsErr.message);
    } else {
      const stillOpen = govInsert.status === 'open';
      const noSqlAssign = govInsert.assigned_to == null;
      const hasTicketNumber = Boolean(govInsert.ticket_number);
      if (stillOpen && noSqlAssign && hasTicketNumber) {
        report('B', 'Migration 080 handle_new_ticket governance', 'VERIFIED', `insert stays open, ticket_number=${govInsert.ticket_number}, no SQL auto-assign`);
      } else {
        report(
          'B',
          'Migration 080 handle_new_ticket governance',
          'FAILED',
          `status=${govInsert.status} assigned_to=${govInsert.assigned_to ?? 'null'} ticket_number=${govInsert.ticket_number ?? 'null'}`,
        );
      }
      await admin.from('service_tickets').delete().eq('id', govInsert.id);
    }

    // -----------------------------------------------------------------------
    // Phase C — Tier-3 boundary proof (strongest test — NOT "trigger exists")
    // -----------------------------------------------------------------------
    console.log('\n--- Phase C: Tier-3 boundary proof (open → resolved) ---\n');

    const fsmTitle = `P011-FSM-PROBE-${Date.now()}`;
    const { data: inserted, error: insErr } = await admin
      .from('service_tickets')
      .insert({
        title: fsmTitle,
        description: 'FSM boundary probe — auto-deleted',
        type: 'general',
        priority: 'medium',
        status: 'open',
        user_id: probeUserId,
        sla_response_due: new Date(Date.now() + 86400000).toISOString(),
        sla_resolution_due: new Date(Date.now() + 259200000).toISOString(),
      })
      .select('id, status')
      .single();

    if (insErr) {
      report('C', 'Tier-3 FSM: open → resolved rejected', 'UNVERIFIED', insErr.message);
    } else {
      const beforeStatus = inserted.status;

      const { data: badRows, error: badTransition } = await admin
        .from('service_tickets')
        .update({ status: 'resolved' })
        .eq('id', inserted.id)
        .select('status');

      const { data: readBack, error: readErr } = await admin
        .from('service_tickets')
        .select('status')
        .eq('id', inserted.id)
        .single();

      const rejected = badTransition && /Invalid ticket status transition|check_violation/i.test(badTransition.message);
      const unchanged = !readErr && readBack?.status === beforeStatus;
      const noFalseSuccess = !badRows || badRows.length === 0;

      if (rejected && unchanged && noFalseSuccess) {
        report(
          'C',
          'Tier-3 FSM: open → resolved rejected',
          'VERIFIED',
          `PostgreSQL rejected; read-back status=${readBack.status} unchanged`,
        );
        report('C', 'Tier-3 FSM: no false success response', 'VERIFIED', 'update returned error, no row mutated');
      } else if (!badTransition) {
        report('C', 'Tier-3 FSM: open → resolved rejected', 'FAILED', 'open→resolved succeeded — boundary NOT enforced');
      } else {
        report(
          'C',
          'Tier-3 FSM: open → resolved rejected',
          'FAILED',
          `rejected=${rejected} unchanged=${unchanged} noFalseSuccess=${noFalseSuccess} msg=${badTransition?.message}`,
        );
      }

      await admin.from('service_tickets').delete().eq('id', inserted.id);
    }
    } // end probeUserId
  }

  // Summary
  const failed = results.filter((r) => r.status === 'FAILED').length;
  const unverified = results.filter((r) => r.status === 'UNVERIFIED').length;
  const blocked = results.filter((r) => r.status === 'BLOCKED').length;
  const verified = results.filter((r) => r.status === 'VERIFIED').length;

  console.log(`\nSummary: ${verified} verified, ${unverified} unverified, ${blocked} blocked, ${failed} failed`);

  if (failed > 0) {
    console.log('\nProduction boundary FAILED — Tier-3 not enforced at database.');
    process.exit(1);
  }
  if (blocked > 0 || unverified > 0) {
    console.log('\nDatabase deployment state partially unverified.');
    console.log('Sequence: prerequisite audit → 078 → 080 → 081 → re-run this probe.');
    process.exit(3);
  }
  console.log('\nProduction boundary VERIFIED on live Supabase.');
  console.log('Next: npm run test:ticketing-boundary');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
