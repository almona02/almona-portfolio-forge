# Service Ticketing — Production Boundary Deployment

**Acceptance bar:** No live proof = no Production Ready = no Gold-Tier 7+.

**Mandatory sequence:**

```
Prerequisite audit → 078 → 080 → 081 → 082 (runtime fixes) → boundary probe → live integration tests → audit score
```

Do **not** skip straight to migration files. Do **not** blindly execute `041`.

**Important:** SQL Editor “Success. No rows returned” ≠ production boundary verified. Always re-run `npm run verify:ticketing-boundary` after apply.

---

## Step 0 — Prerequisite audit (required before any migration)

Establish what the **target Supabase environment already contains**. Ticketing migrations depend on schema that may have arrived via earlier migrations, manual DDL, or a divergent history.

Run from a machine that can reach the target project:

```bash
npm run verify:ticketing-boundary
```

Phase A of the script probes prerequisites and reports **BLOCKED** / **READY** / **VERIFIED**. Interpret results:

| Probe | Meaning if missing | Action |
|-------|-------------------|--------|
| `service_tickets` reachable | Ticketing schema not deployed | Deploy base ticketing schema first (`service-ticketing-system.sql` or equivalent env history) — **stop** |
| `reality_events` table | 078 cannot run | **Only if confirmed absent** on this environment, apply `migrations/041_realityos_event_ledger.sql` (+ `077` partition if needed). **Do not blindly run 041** on an already-evolved DB — inspect Dashboard → Table Editor / SQL first |
| `realityos_record_event` RPC works | 078 not applied | Apply **078** |
| Insert probe: status stays `open`, no SQL auto-assign | 080 not applied | Apply **080** |
| `open → resolved` rejected + row unchanged | 081 not applied | Apply **081** |

### Do NOT blindly execute 041

`041_realityos_event_ledger.sql` creates `core_event_type`, `reality_events`, and partitions. Apply it **only when**:

1. Target environment has **no** `reality_events` table (or equivalent ledger), **and**
2. You have confirmed via Dashboard/SQL that no newer ledger migration already exists under a different name.

If `reality_events` already exists, skip 041 and proceed to **078**.

---

## Step 1 — Apply migrations (078 → 080 → 081 only)

### Preferred: project-linked Supabase CLI

This repo keeps service ticketing SQL in root `migrations/` (not auto-synced to `supabase/migrations/`). If the target project is linked:

```bash
supabase link --project-ref <your-project-ref>

# Apply each file explicitly — do not assume supabase/migrations/ contains these
supabase db execute -f migrations/078_realityos_record_event_function.sql
supabase db execute -f migrations/080_service_ticketing_governance.sql
supabase db execute -f migrations/081_ticket_production_boundary.sql
supabase db execute -f migrations/082_ticket_boundary_runtime_fixes.sql
```

If `supabase db execute` is unavailable in your CLI version, use Dashboard SQL Editor with the same files **in this order**.

### Fallback: Supabase Dashboard SQL Editor

1. `migrations/078_realityos_record_event_function.sql`
2. `migrations/080_service_ticketing_governance.sql`
3. `migrations/081_ticket_production_boundary.sql`
4. `migrations/082_ticket_boundary_runtime_fixes.sql` — **required if live probe shows `digest(...)` or `ticket_number` NOT NULL**
5. `migrations/083_ticket_fsm_enum_cast_fix.sql` — **required if FSM fails with `is_valid_ticket_status_transition(ticket_status, ticket_status) does not exist`**

**Never** paste 041 unless Step 0 confirmed it is required.

---

## Step 2 — Boundary probe (strongest negative proof)

```bash
npm run verify:ticketing-boundary
```

Requires `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

The probe must demonstrate on the **actual production database**:

```
attempt open → resolved
        ↓
PostgreSQL rejects it
        ↓
ticket remains unchanged (read-back)
        ↓
no false success response
```

Exit codes:

| Code | Meaning |
|------|---------|
| `0` | All checks verified — boundary real |
| `1` | Boundary check **failed** (e.g. open→resolved succeeded) |
| `2` | No connectivity |
| `3` | Partial — migrations not fully applied |

---

## Step 3 — Live integration tests (positive + negative path)

```bash
npm run test:ticketing-boundary
```

Must prove the **positive path**:

```
create
  ↓
canonical SLA
  ↓
deterministic assignment (when policy applies)
  ↓
Postgres persistence
  ↓
RealityOS event
  ↓
read-back verification
```

And the **negative path** (invalid transition emits no misleading success/event).

---

## Step 4 — Audit score recalculation

Only after Steps 2 and 3 pass on live Supabase. Paste both command outputs for evidence-based acceptance review.

| Migration | Effect |
|-----------|--------|
| 078 | `realityos_record_event` RPC |
| 080 | `handle_new_ticket` — ticket_number only (no SQL SLA/auto-assign) |
| 081 | FSM trigger, immutable SLA, RLS split (no staff FOR ALL), RPC grant to `authenticated` |
| 082 | pgcrypto search_path + BEFORE INSERT ticket_number trigger |
| 083 | Cast `ticket_status` enum → text in FSM validator call |

---

## Frozen audit status (until live proof)

| Gate | Status |
|------|--------|
| Phase 0 repository remediation | Complete |
| P0.11 | ✅ Accepted (2026-09-08) |
| Production Ready (ticketing boundary) | ✅ Yes |
| Gold-Tier Ready (full platform) | ❌ No — FP-012 gates remain |
| Defensible score | **~7.0/10** |
| Next | Gate 1 security/shipability (FP-013/014) |
