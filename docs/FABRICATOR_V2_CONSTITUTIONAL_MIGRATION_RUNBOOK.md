## Fabricator v2 Constitutional Migration Runbook

This runbook documents the **constitutional v1 → v2 cutover** for Fabricator Pro consolidation.

It covers:
- **Schema** (v2 canonical tables)
- **Cryptographic migration chain** (row-level chain-of-custody)
- **Migration certificates** (30-day validity proof)
- **Dual-write window** (v2 → v1 mirroring for rollback safety)
- **Consistency monitoring + drift alerts**
- **RealityOS governance events** (human-verified cutover evidence)

---

## Goals (AICS-001 aligned)

- **Principle I (Human-Verified)**: migration activation is anchored by **human-verified RealityOS events**.
- **Principle II (Append-only)**: no retroactive edits to ledger or chain; v2 deletes become v1 archives.
- **Principle III (Cryptographic chain-of-custody)**: v1→v2 migration produces an append-only hash chain.
- **Principle VI (No admin override flags)**: runtime read/write mode is derived from RealityOS events (no silent toggles).

---

## Files added/used by the migration

### Schema + chain + dual-write + monitoring tables

- **v2 schema**: `migrations/070_fabricator_v2_schema.sql`
  - `public.fabricator_projects_v2`
  - `public.fabricator_positions_v2`
- **row-level migration chain**: `migrations/073_fabricator_v2_constitutional_chain.sql`
  - `public.fabricator_migration_chain`
- **backfill (v1 → v2 + chain entries)**: `migrations/074_fabricator_v2_backfill_constitutional.sql`
- **dual-write triggers (v2 → v1)**: `migrations/075_fabricator_v2_dual_write_triggers.sql`
- **migration certificates**: `migrations/076_fabricator_migration_certificates.sql`
  - `public.fabricator_migration_certificates`
- **dual-write drift reports**: `migrations/079_fabricator_dual_write_consistency_reports.sql`
  - `public.fabricator_dual_write_consistency_reports`

### RealityOS reliability hardening (recommended)

- **default partition safety net**: `migrations/077_realityos_event_default_partition.sql`
  - creates `public.reality_events_default` so ledger inserts don’t fail outside `2025-02`.
- **DB-native event recorder**: `migrations/078_realityos_record_event_function.sql`
  - function: `public.realityos_record_event(...)`

### App runtime governance + dashboards

- **event mappings**: `src/lib/realityos/EventMappings.ts`
  - adds: `FabricatorMigrationInitiated`, `FabricatorMigrationCompleted`, `FabricatorRollbackInitiated`, `FabricatorRollbackCompleted`, `FabricatorDualWriteDriftDetected`
- **emitter helpers**: `src/lib/realityos/RealityOSEventEmitter.ts`
- **event-derived mode**: `src/lib/fabricator/migration/MigrationModeService.ts`
  - supports environments where `reality_events_readonly` is either:
    - a **view** (see `migrations/043_fix_security_linter_issues.sql`), or
    - an **RPC function** (see `migrations/049_convert_views_to_functions.sql`)
- **dashboards**:
  - `src/components/constitutional/ConstitutionalHealthDashboard.tsx`
  - `src/components/fabricator/panels/ConstitutionalHealthDashboard.tsx`

### Service-side operational tooling

- **human-verified migration completion script**: `scripts/emit-fabricator-migration-event.ts`
- **consistency monitor** (cron/edge worker): `src/lib/fabricator/migration/DualWriteConsistencyMonitor.ts`

---

## Database prerequisites

- `pgcrypto` is enabled by existing migrations (`migrations/001_initial_schema.sql`).
- v1 Fabricator tables exist:
  - `migrations/009_fabricator_projects_and_team.sql` (+ `migrations/059_add_fabricator_positions_columns.sql`)
  - `migrations/008_workspace_snapshots.sql` (workspace snapshots are `workspace_data`, not `snapshot_data`)

---

## Execution order (recommended)

### Step 1: Apply migrations

Apply in lexical order with your repo migration runner:

```bash
DATABASE_URL="postgres://..." node scripts/migrate.ts
```

At minimum, the Fabricator v2 cutover requires:
- `070`, `073`, `074`, `075`, `076`, `079`

RealityOS reliability is strongly recommended:
- `077`, `078`

### Step 1.5 (recommended): Dual-write smoke test (staging)

Before emitting any migration governance events, validate that v2→v1 mirroring works:

- Script: `scripts/smoke-fabricator-dual-write.ts`

```bash
DATABASE_URL="postgres://..." \
OWNER_USER_ID="<uuid-of-existing-public.profiles-row>" \
ALLOW_DUAL_WRITE_SMOKE=true \
ts-node scripts/smoke-fabricator-dual-write.ts
```

This inserts `status='test'` rows into v2 tables and verifies the v1 mirror rows exist.

### Step 2: Verify migration chain integrity (before cutover event)

The script `scripts/emit-fabricator-migration-event.ts` recomputes and verifies:
- chain linkage (`previous_hash` equals prior `migration_hash`)
- hash determinism (recomputed hash equals stored hash)

If integrity fails, **do not cut over**.

### Step 3: Emit human-verified migration completion event (activates event-derived mode)

Run the script with a **human verification proof photo hash**:

```bash
DATABASE_URL="postgres://..." \
OPERATOR_ID="operator_001" \
COMPLETION_PHOTO_HASH="<64-hex-sha256>" \
ts-node scripts/emit-fabricator-migration-event.ts
```

This does:
- emits a RealityOS `ON` event with `almona_event_type = FabricatorMigrationCompleted`
- writes a `fabricator_migration_certificates` row referencing:
  - `chain_head_hash` (from `fabricator_migration_chain`)
  - RealityOS anchor (`reality_os_event_hash`, `reality_os_recorded_at`)

### Step 4: Run the dual-write monitor (cron)

The monitor is service-side (requires service role key):

- File: `src/lib/fabricator/migration/DualWriteConsistencyMonitor.ts`
- Writes: `public.fabricator_dual_write_consistency_reports`
- Emits: RealityOS `FAULT` when drift exceeds threshold (`FabricatorDualWriteDriftDetected`)

---

## Dual-write operations (30-day rollback window)

### What dual-write does

When enabled, v2 changes are mirrored to v1:
- `fabricator_projects_v2` → `fabricator_projects`
- `fabricator_positions_v2` → `fabricator_positions`

### Enable/disable dual-write safely

Dual-write is controlled by a DB setting:
- `app.fabricator_dual_write_active`

Default behavior:
- if unset: **active** (treated as `true`)

Disable for a session:

```sql
select set_config('app.fabricator_dual_write_active', 'false', false);
```

### Conflict handling

If a legacy v1 write path updates a row “more recently” than v2 (based on `updated_at`), the trigger still mirrors v2 (v2 wins) but logs an append-only conflict evidence row into:
- `public.fabricator_migration_chain`

---

## Dashboards (what to expect)

Both dashboards now display:
- **Migration mode** (from RealityOS, via `MigrationModeService`)
- **Latest drift report** (from `fabricator_dual_write_consistency_reports`)

If drift reports aren’t appearing, the monitor is not running or lacks DB permissions.

---

## Known schema nuance: RealityOS “readonly” accessor

Depending on which migrations were applied, `reality_events_readonly` may be:
- a **view** (`migrations/043_fix_security_linter_issues.sql`), queried as `FROM reality_events_readonly`, or
- a **function** (`migrations/049_convert_views_to_functions.sql`), queried via `supabase.rpc('reality_events_readonly')`.

`MigrationModeService` supports both automatically.

---

## Operational checklist (before production)

- **Chain integrity**: verify linkage + recompute hashes (script performs this).
- **Dual-write**: insert/update a v2 row and confirm v1 row mirrors.
- **Drift monitor**: run once manually and confirm a report row appears.
- **Dashboard visibility**: confirm migration mode + drift appears in both dashboards.
- **RealityOS ledger**: confirm ledger inserts succeed (ensure default partition exists or monthly partitions are created).

---

## 30-day deprecation steps (after cutover window)

After the 30-day dual-write window, execute in order:

1. **Disable dual-write triggers**  
   Set DB flag so v2→v1 mirroring stops:  
   `ALTER DATABASE your_db SET app.fabricator_dual_write_active = 'false';`  
   (Or set per-session if preferred.)  
   Verify: insert/update on v2 no longer writes to v1.

2. **Remove v1 write paths from the app**  
   - Ensure all Fabricator reads/writes use v2 (React Query hooks + `fabricatorClientV2`).  
   - Remove or gate any remaining writes to `fabricator_projects` / `fabricator_positions` (e.g. in `jobsStore`, legacy persistence).  
   - Keep `FeatureFlags.FABRICATOR_READ_V2` default `true`; rollback = set to `false` and re-enable dual-write only if needed.

3. **Emit RealityOS “rollback executed” if reverting**  
   If rolling back within the window: flip read source to v1, then emit `FabricatorRollbackExecuted` via `realityOSEventEmitter.emitFabricatorRollbackExecuted(...)` for append-only governance. Do not attempt retroactive edits to the ledger.

4. **Optional cleanup (after audits confirm)**  
   Once audits confirm no reliance on v1 for new writes:  
   - Optionally run a cleanup migration (e.g. drop legacy columns or archive v1 tables).  
   - Document in this runbook when cleanup was applied.

