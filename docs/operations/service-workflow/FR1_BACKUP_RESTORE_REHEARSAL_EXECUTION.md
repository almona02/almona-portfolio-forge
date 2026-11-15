# FR-1 backup/restore rehearsal — execution sheet

**Status:** Execution sheet finalized · recovery & migration rehearsal **not complete** (blocked — see §8–§9)  
**Artifact freeze:** `e17858a59c64426af6067d1ec114e311673daad9`  
**Proposal:** [`FR1_BACKUP_RESTORE_REHEARSAL_PROPOSAL.md`](./FR1_BACKUP_RESTORE_REHEARSAL_PROPOSAL.md)  
**#158:** remain **draft** · **#155:** remain **unmerged**

---

## 1. Three binding conditions (this rehearsal)

| # | Condition | Enforcement |
|---|-----------|-------------|
| **C1** | **Production access is read-only** | Only `SELECT` / inventory / dump-from-replica-or-read credentials. No DML/DDL on `shfsebdncjnncqqnewfj`. |
| **C2** | **Rehearsal permissions ≠ cutover permissions** | During this rehearsal: **no** production write-pause, **no** Vercel/Railway/Supabase **settings** changes, **no** merge of #158/#155, **no** production migration apply. Disposable-only restore + disposable-only migration apply when unblocked. |
| **C3** | **Results bound to `e17858a5`; missing backup component or failed restore = production blocker** | Both recovery report (§8) and migration-rehearsal report (§9) cite `e17858a5`. Any incomplete dump/Storage sync or failed restore **blocks production authorization**. |

---

## 2. Disposable destination (exact)

| Field | Value |
|-------|-------|
| Planned name | `almona02-fr1-restore-rehearsal-20261115` |
| Organization | `iuhujuoejbfydldnbqac` (`almona02's Org`) |
| Region | `eu-west-3` (match production) |
| Project ref | **pending** — `create_project` requires `confirm_cost` after operator ack of cost (§3) |
| Not used | Production `shfsebdncjnncqqnewfj` · Staging `apnmoevmvihfzcnttctx` |

---

## 3. Cost

| Item | Quote (MCP `get_cost` type=project) |
|------|-------------------------------------|
| New Supabase project (monthly) | **`$0` / month** (`amount: 0`, `recurrence: monthly`) |
| PITR / paid backups | Not part of this rehearsal (org plan free; platform backups unavailable) |
| Storage egress for object sync | Variable; minimize via FR-1 sample sync (§5) |

**Gate:** Operator must agree to the quoted **$0/month** project create, then run `confirm_cost` → `create_project` with `confirm_cost_id`. Until then destination ref remains pending.

---

## 4. Secret-storage location

| Secret / artifact | Location | Notes |
|-------------------|----------|-------|
| Dump ciphertext + age/gpg key | Operator personal secure store: `C:\Users\bobbi\AppData\Local\Cursor\AgentStores\cursor_agent_stores\u294861541\files\slice0\fr1-rehearsal\` (create at run time; **gitignored / not committed**) | Plaintext dumps **never** in git or chat |
| Dump SHA-256 manifest (no secrets) | `.artifacts/fr1-rc/rehearsal/manifest.json` (repo-ignored `.artifacts/`) | Safe to keep locally |
| Disposable anon/service keys | Same agent-store folder `disposable_keys.json` · shred on cleanup | Not production keys |
| Production DB URL / password | **Not stored in workspace** (no `.env` present at sheet finalize); operator supplies out-of-band for dump only | Read-only dump session |

---

## 5. Export & Storage sync (when unblocked)

### 5.1 DB dump commands (operator machine; production **read-only**)

```bash
# From a host with network to db.shfsebdncjnncqqnewfj.supabase.co and dump credentials.
export REHEARSE_ROOT="$HOME/AppData/Local/Cursor/AgentStores/cursor_agent_stores/u294861541/files/slice0/fr1-rehearsal"
mkdir -p "$REHEARSE_ROOT" .artifacts/fr1-rc/rehearsal
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
DUMP="$REHEARSE_ROOT/prod-shfsebdncjnncqqnewfj-$STAMP.dump"

# Prefer custom format; include auth + storage metadata + public.
pg_dump "postgresql://postgres.<PROD_REF>:<PASSWORD>@aws-0-eu-west-3.pooler.supabase.com:5432/postgres" \
  --format=custom --no-owner --no-acl \
  --schema=public --schema=auth --schema=storage --schema=supabase_migrations \
  --file="$DUMP"

sha256sum "$DUMP" | tee .artifacts/fr1-rc/rehearsal/manifest-sha256.txt
# Encrypt: age -r <recipient> -o "$DUMP.age" "$DUMP" && shred -u "$DUMP"
```

### 5.2 Storage bytes (separate component)

```bash
# Sample or full sync into disposable buckets AFTER disposable project exists.
# Minimum: objects referenced by rehearsal ticket/message rows.
# Record unsynced counts in .artifacts/fr1-rc/rehearsal/storage-sync-gaps.json
```

**Missing Storage byte sync = missing backup component = production blocker (C3)** even if SQL restore PASS.

---

## 6. Verification commands (bound to freeze `e17858a5`)

### 6.1 Pre-export baseline (production read-only) — captured 2026-11-15

```sql
-- counts
SELECT 'service_tickets' AS rel, count(*)::bigint AS n FROM public.service_tickets
UNION ALL SELECT 'ticket_messages', count(*) FROM public.ticket_messages
UNION ALL SELECT 'ticket_shares', count(*) FROM public.ticket_shares
UNION ALL SELECT 'profiles', count(*) FROM public.profiles
UNION ALL SELECT 'machines', count(*) FROM public.machines;

-- FR-1 objects (expect false on current prod — pre-Slice0 stamps)
SELECT to_regclass('public.ticket_share_access_events') IS NOT NULL AS has_access_events,
       to_regprocedure('public.create_ticket_share(uuid,timestamptz)') IS NOT NULL AS has_create_share;

-- migration history slice
SELECT version FROM supabase_migrations.schema_migrations
WHERE version LIKE '20261111%' OR version LIKE '20261115%' ORDER BY 1;
```

**Observed baseline (read-only):**

| Metric | Value |
|--------|------:|
| service_tickets | 14 |
| ticket_messages | 1 |
| ticket_shares | 0 |
| profiles | 19 |
| machines | 12 |
| storage.objects (profile-thumbnails) | 12 |
| storage.objects (ticket-attachments / machine-photos) | 0 rows counted |
| ticket_share_access_events / create_ticket_share / govern_ticket_transition / register_machine_identity | **absent** |
| schema_migrations `20261111*` / `20261115*` | **none** (latest catalog stamp ends `20261106000000`) |
| buckets ticket-attachments, machine-photos, profile-thumbnails | **`public: true`** (pre-Slice0 posture) |
| RLS enabled on tickets/messages/shares/machines | true (forced=false) |

### 6.2 Post-restore (disposable)

```sql
-- Must match §6.1 counts (or documented exclusions)
-- Same count query as above on disposable project_id

-- ACL / RLS smoke
SELECT c.relname, c.relrowsecurity FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('service_tickets','ticket_messages','ticket_shares');
```

### 6.3 Migration rehearsal (disposable only; blobs from `e17858a5`)

```bash
git checkout e17858a5 -- \
  supabase/migrations/20261111010000_service_slice0_security_boundary.sql \
  supabase/migrations/20261111180000_machine_identity_pr1.sql \
  supabase/migrations/20261111190000_machine_identity_missing_serial_plate_evidence.sql \
  supabase/migrations/20261111200000_staging_machine_photos_and_ticket_number.sql \
  supabase/migrations/20261111201000_service_tickets_rls_enablement.sql \
  supabase/migrations/20261115190000_fr1_f_b7_04_null_auth.sql \
  supabase/migrations/20261115190100_fr1_f_b7_03_share_audit.sql

# Apply in order via supabase db push / migration tool against DISPOSABLE only:
# A → C → D → E → RLS → F7-04 → F7-03
python scripts/service-workflow/run_disposable_fr1.py
# or Spark probes; expect 14/0 class PASS on FR-1 battery after apply
```

### 6.4 App workflow (outbound disabled)

```bash
# Point local app at disposable URL/keys only; unset SendGrid/SMS/Stripe live keys
npx vitest run src/lib/ticketMessageApi.test.ts
PYTHONPATH=python_backend python -m pytest \
  python_backend/tests/test_ticket_access_scope.py \
  python_backend/tests/test_fr1_missing_workflow_tables.py -q
```

---

## 7. Cleanup owner

| Role | Owner | Duties |
|------|-------|--------|
| **Cleanup owner** | Release captain (primary: repo admin **almona02** / operator running rehearsal) | Delete disposable project; shred plaintext dumps; destroy or time-box ciphertext; wipe `disposable_keys.json`; confirm no prod env leakage |
| Witness | Second operator (optional) | Confirm cleanup checklist signed |

Cleanup checklist:

- [ ] Disposable project deleted  
- [ ] Plaintext dump shredded  
- [ ] Ciphertext retention ≤ 14 days or destroyed  
- [ ] Agent-store rehearsal folder emptied  
- [ ] #158 still draft; #155 still unmerged; no settings changed  

---

## 8. Recovery results (bound to `e17858a5`)

| Field | Result |
|-------|--------|
| Freeze binding | `e17858a59c64426af6067d1ec114e311673daad9` |
| Logical dump artifact | **MISSING** — no production DB credentials in workspace; dump not captured |
| Dump checksum | n/a |
| Encrypted store populated | **NO** |
| Disposable project | **NOT CREATED** — awaiting operator ack of $0/mo + `confirm_cost` |
| SQL restore | **NOT RUN** |
| Storage byte sync | **MISSING** (component absent) |
| Count/relationship match | **NOT PROVEN** (baseline inventory only on production) |
| Roles/grants/RLS/functions/history check post-restore | **NOT RUN** |
| App workflows on restore | **NOT RUN** |
| **Verdict** | **FAIL / BLOCKED** |

**Production impact (C3):** Recovery incomplete → **production authorization remains BLOCKED.**

---

## 9. Migration-rehearsal results (bound to `e17858a5`)

| Field | Result |
|-------|--------|
| Freeze binding | `e17858a59c64426af6067d1ec114e311673daad9` |
| Prerequisite | Successful §8 restore — **not met** |
| Order used | Authoritative A→C→D→E→RLS→F7-04→F7-03 (not executed) |
| Versions applied on disposable | **none** |
| FR-1 battery / Spark probes | **NOT RUN** |
| Edge deploy on disposable | **NOT RUN** |
| **Verdict** | **NOT STARTED / BLOCKED** (depends on §8) |

**Production impact (C3):** Migration rehearsal not proven → **production authorization remains BLOCKED.**

---

## 10. Permissions matrix (reminder)

| Action | Rehearsal (now) | Cutover (later, separate auth) |
|--------|-----------------|--------------------------------|
| Prod SELECT / inventory | Allowed (C1) | Allowed |
| Prod dump (read) | Allowed when credentials supplied | Required |
| Prod write-pause | **Forbidden** | Cutover-only |
| Prod migration apply | **Forbidden** | Cutover-only |
| Merge #158 / #155 | **Forbidden** | Cutover-only (#158 only) |
| Deployment settings change | **Forbidden** | Cutover-only if required for auto-deploy hold |
| Disposable create/restore/migrate | Allowed after cost ack | n/a |

---

## 11. Next actions to unblock (still not cutover)

1. Operator ack **$0/month** disposable project cost → `confirm_cost` → create `almona02-fr1-restore-rehearsal-20261115`.  
2. Supply read-only dump credentials out-of-band → encrypted dump to agent-store path (§4).  
3. Restore + Storage sync → complete §8.  
4. Apply FR-1 sequence from `e17858a5` on disposable → complete §9.  
5. Only then revisit production approval packet backup gate.
