# Lane A — bounded staging deployment packet (DO NOT APPLY YET)

| Field | Value |
|-------|-------|
| **Status** | Packet only · **no apply · no merge · no production · FR-1 preserved** |
| **Runtime to bind** | `e1345a0aef857e857fe5af50176c1fcb633aae70` |
| **Migration path** | `supabase/migrations/20261116180000_service_routines_lane_a_authoring.sql` |
| **Git blob (e1345a0a)** | `3ca6fb4165cd92c38fe18274d7869123fd834e45` |
| **SHA-256 of blob bytes** (`git show e1345a0a:… \| openssl dgst -sha256`) | `62255ac2329864f11aa19bf66eb72ff5a491935c8fd586820ea3c0cb9ccbbc1b` |
| **Byte length** | 39952 (git blob; working-tree CRLF may differ on Windows) |
| **Target DB (prior B-series)** | Supabase staging `apnmoevmvihfzcnttctx` (`almona02-staging`) — confirm identity before any future apply |
| **Authorization** | Explicit operator approval required before apply |

## 1. Prerequisites (staging)

Must already be present (B1–B7 program); **do not** re-apply B-series:

| Prerequisite | Why |
|--------------|-----|
| `public.profiles` with `role` | Actor resolution |
| `admin_private.caller_uid` / `caller_role` | RLS + RPCs |
| `admin_private.workflow_resolve_actor` | RPC actors |
| `admin_private.workflow_audit` + `public.service_workflow_audit` | Pinned audit ledger |
| Auth roles `anon`, `authenticated`, `service_role` | Grants |
| PG / hosted project ACTIVE_HEALTHY | Apply safety |

Lane A migration creates routines tables + RPCs only; it assumes the workflow helpers above.

## 2. Preflight checks (read-only against staging)

Run as operator with staging SQL access (**select/probe only** until authorized):

```sql
-- Identity
SELECT current_database(), current_user;

-- Migration not yet applied
SELECT to_regclass('public.service_routines') AS routines_table;
SELECT EXISTS (
  SELECT 1 FROM supabase_migrations.schema_migrations
  WHERE version LIKE '20261116180000%' OR name ILIKE '%lane_a%authoring%'
) AS lane_a_migration_recorded;

-- Helpers present
SELECT
  to_regprocedure('admin_private.workflow_resolve_actor(uuid)') IS NOT NULL AS resolve_actor,
  to_regprocedure('admin_private.workflow_audit(uuid,text,uuid,uuid,text,text,text,text,text,jsonb)') IS NOT NULL AS workflow_audit,
  to_regclass('public.service_workflow_audit') IS NOT NULL AS audit_table,
  to_regclass('public.profiles') IS NOT NULL AS profiles;

-- Hosted anonymous defaults (expect: no table privilege for anon on routines — tables absent pre-apply)
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name LIKE 'service_routine%'
ORDER BY 1,2,3;
```

**Go criteria:** helpers true; `routines_table` null; no unexpected anon grants on future names.  
**No-go:** missing helpers; Lane A already partially applied; wrong project.

## 3. Exact apply (future — not now)

```bash
# After written authorization only:
git checkout e1345a0aef857e857fe5af50176c1fcb633aae70
# Verify blob
git rev-parse HEAD:supabase/migrations/20261116180000_service_routines_lane_a_authoring.sql
# Expect: 3ca6fb4165cd92c38fe18274d7869123fd834e45

# Apply via approved staging channel (Supabase MCP/CLI/SQL editor) using THAT file only.
# Record schema_migrations version stamp returned by host.
```

Post-apply stamp the apply record with: operator, timestamp, project ref, migration version, blob SHA-256.

## 4. Effective grants / RLS (expected after apply)

### Tables

| Object | anon | authenticated | Notes |
|--------|------|---------------|-------|
| `service_routines` | **REVOKE ALL** | SELECT + RLS | Admin/Support all statuses; Technician published/retired only |
| `service_routine_versions` | **REVOKE ALL** | SELECT + RLS | Same |
| `service_routine_reviews` | **REVOKE ALL** | SELECT + RLS | Admin/Support only |
| `service_routine_applicability` | **REVOKE ALL** | SELECT + RLS | Admin/Support/Technician |

Writes are **RPC-only** (no INSERT/UPDATE/DELETE grants to `anon`/`authenticated`).

### RPCs

All Lane A `public.*service_routine*` functions: **REVOKE from PUBLIC/anon**; **GRANT EXECUTE to authenticated, service_role**.

### Hosted anonymous defaults

Confirm after apply:

```sql
-- anon must not EXECUTE mutate/preview RPCs
SELECT p.proname,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE '%service_routine%';

-- anon table privileges must be empty
SELECT * FROM information_schema.role_table_grants
WHERE grantee = 'anon' AND table_name LIKE 'service_routine%';
```

Expect: `anon_exec = false` for all; zero anon table grants.

## 5. Protected preview + runtime binding

| Step | Requirement |
|------|-------------|
| Preview deploy | Vercel preview from commit **`e1345a0a`** (or authorized tip that contains identical migration blob) |
| Protection | SSO / Vercel Authentication on; no public production alias |
| Env | Preview `VITE_SUPABASE_*` → **staging** project only (not production, not local demo keys) |
| Scoped access | Fresh preview bypass / share token for Spark + operator; **retire after** verification |
| Binding record | Store deployment id, URL, git SHA, staging project ref in apply record |

## 6. Synthetic-fixture plan (staging)

| Fixture | Role | Purpose |
|---------|------|---------|
| `lanea.stg.admin.author@…` | admin | Author / submit / publish / retire |
| `lanea.stg.support.reviewer@…` | support | `/support/routines` review only |
| `lanea.stg.tech@…` | technician | Published preview only; deny draft |
| `lanea.stg.customer@…` | customer | Deny staff routes + draft |

Prefix all routine codes `LA-STG-%`. No real customer/machine data. Passwords in gitignored handoff file only.

## 7. Targeted live / browser checks (after authorized apply)

1. Anon: REST select routines → deny; RPC create → deny  
2. Admin: create draft → submit  
3. Support: `/support/routines` record review (not `/admin`)  
4. Admin: publish → preview → retire; code reuse denied  
5. Measurement missing source → `22023`; no publish audit  
6. Second in-flight draft → `22023` (constraint)  
7. Deep-link note: prefer nav click or apply tab-nav fix before relying on `?tab=` (see finding doc)

## 8. Cleanup + credential retirement

| Action | Detail |
|--------|--------|
| Delete `LA-STG-%` routines/versions/reviews/applicability | SQL inventory then delete |
| Remove synthetic Auth users | Staging Auth admin API |
| Rotate fixture passwords | If retained briefly for Spark zero-confirm |
| Revoke preview bypass / share | After Spark closeout |
| Shred local session/credential files | Overwrite + unlink |

## 9. Recovery if apply or deployment fails

| Failure | Recovery |
|---------|----------|
| Preflight no-go | **Stop** — do not apply |
| Migration error mid-file | Do not hand-patch staging; restore from staging backup / point-in-time if available; open incident; FR-1/prod untouched |
| Partial objects created | Inventory `service_routine%`; drop only Lane A objects if safe and authorized; never touch B1–B7 tables |
| Preview wrong SHA / wrong env | Unpublish preview; redeploy correct SHA; rotate leaked bypass |
| Anon EXECUTE true post-apply | Immediate REVOKE; treat as severity-1; re-run grant probes |

**Rollback SQL sketch** (authorized emergency only):

```sql
-- ONLY if Lane A apply is the sole change and approved:
-- DROP FUNCTION ... (all Lane A RPCs by signature);
-- DROP TABLE service_routine_applicability, service_routine_reviews,
--            service_routine_versions, service_routines CASCADE;
-- DELETE FROM supabase_migrations.schema_migrations WHERE version = '<stamp>';
```

## 10. Explicit non-goals

- No production apply  
- No FR-1 branch / recovery env changes  
- No merge to main  
- No apply in this packet’s publication commit  
