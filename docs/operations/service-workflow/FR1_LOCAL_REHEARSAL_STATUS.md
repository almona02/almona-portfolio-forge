# FR-1 local rehearsal status

**Freeze:** `e17858a59c64426af6067d1ec114e311673daad9`  
**#158:** draft · **#155:** unmerged · production **read-only** · no hosted deploy/pause/upgrade

---

## 1. Drop-slot path and access

| Field | Value |
|-------|--------|
| Cursor label | `User Context\slice0\fr1-rehearsal` |
| **Absolute path** | `C:\Users\bobbi\AppData\Local\Cursor\AgentStores\cursor_agent_stores\u294861541\files\slice0\fr1-rehearsal` |
| In git repo? | **No** |
| ACL | `bobbi` (F), `Administrators` (F), `SYSTEM` (F) — no Everyone/Users |
| `prod_db_url.txt` | **MISSING** |
| `prod_service_role.txt` | **MISSING** |

### Credential roles

| File | Purpose | Privilege model |
|------|---------|-----------------|
| `prod_db_url.txt` | **DB export only** (`fr1_rehearsal_local_export.py`) | Session **`default_transaction_read_only=on`**; `pg_dump` only; **no mutations**; credentials **never logged** |
| `prod_service_role.txt` | Storage **list/download only** (`fr1_rehearsal_storage_pull.py`) | **Privileged** service-role JWT — **not** read-only; script forbids upload/update/delete; JWT **never logged** |

---

## 2. Local outbound / integration isolation (pre-restore)

Verified on local `supabase start` stack:

| Control | Status |
|---------|--------|
| `[auth.email.smtp]` | **Commented / disabled** — no SendGrid; mail captured by local Mailpit only |
| Auth hooks (before_user_created / custom_access_token) | **Disabled** (commented) |
| SMS signup | **disabled** |
| Repo `.env` production secrets | **Absent** |
| Background webhooks to prod | **None configured** in local config |
| Edge against production | Not pointed at prod |

---

## 3. Bucket public exposure guard

| Check | Result |
|-------|--------|
| Local buckets `ticket-attachments`, `machine-photos`, `profile-thumbnails` | **`public = false`** |
| Post-restore force script | `scripts/service-workflow/fr1_rehearsal_force_private_buckets.sql` (must run after import so restored prod metadata cannot leave buckets public) |
| Intentional ≠ production | Prod currently `public: true` — local rehearsal keeps private |

---

## 4. Local recovery results (`e17858a5`)

| Step | Result |
|------|--------|
| Encrypted DB export | **NOT RUN** — drop-slot credentials missing |
| Restore to local DB | **NOT RUN** |
| Consistency verify | **NOT RUN** |
| **Verdict** | **BLOCKED** (await credentials) |

**Not** a complete hosted recovery test.

---

## 5. Storage completeness (separate)

| Step | Result |
|------|--------|
| Byte pull | **NOT RUN** — `prod_service_role.txt` missing |
| Verify counts/hashes | **NOT RUN** |
| **Verdict** | **MISSING** → production blocker under C3 |

---

## 6. Migration rehearsal results (`e17858a5`)

| Step | Result |
|------|--------|
| A→C→D→E→RLS→F7-04→F7-03 | **NOT RUN** (blocked on recovery) |
| **Verdict** | **BLOCKED** |

---

## 7. Hosted still unverified (gates)

Hosted Auth, hosted Storage/CDN, pooler, cloud Edge, platform backups, free-tier 3rd project.

---

## 8. Cleanup

**Operator:** Bobbi / almona02 · **Deadline:** 2026-11-29 23:59:59 UTC · `supabase stop` when done.
