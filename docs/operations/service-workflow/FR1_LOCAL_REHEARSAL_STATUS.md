# FR-1 local rehearsal status

**Freeze:** `e17858a59c64426af6067d1ec114e311673daad9`  
**Mode:** Local isolated stack preparation · production **read-only** · no hosted pause/delete/upgrade/branch/merge/deploy  
**#158:** draft · **#155:** unmerged

---

## A. Local infrastructure

| Item | Status |
|------|--------|
| Docker Desktop | **Started** · engine Server Version 28.3.0 |
| Isolated local Supabase (`supabase start`) | **Running** (API `127.0.0.1:54321`, DB `127.0.0.1:54322`) |
| PG17 fallback | Available if Docker had failed; **not needed** for stack bring-up |

Local Auth/Storage/API are available for post-restore checks; they are **not** a substitute for hosted Auth/Storage production gates.

---

## B. Secure credential drop-slot

**Exact path:**  
`C:\Users\bobbi\AppData\Local\Cursor\AgentStores\cursor_agent_stores\u294861541\files\slice0\fr1-rehearsal\`

| Required file | Present? |
|---------------|----------|
| `prod_db_url.txt` | **MISSING** |
| `prod_service_role.txt` | **MISSING** |

**Minimum export permissions:** SELECT on `public` / `auth` / `storage` / `supabase_migrations` (see drop-slot README).  
**Warning:** A Supabase dashboard DB connection string is typically **superuser and not read-only** — rehearsal must use it only for `pg_dump`, never interactive writes; dedicated RO role preferred but not created this run (would be a prod DDL change).

Credentials: **not** in chat/logs/Git · **not** reset.

Export helper (reads drop-slot only): `scripts/service-workflow/fr1_rehearsal_local_export.py`

---

## C. Local recovery results (bound to `e17858a5`)

| Step | Result |
|------|--------|
| Encrypted production logical export | **NOT RUN** — credentials not in drop-slot |
| Restore into local Supabase Postgres | **NOT RUN** — no dump |
| DB consistency vs pre-export counts | **NOT RUN** |
| Storage-byte backup | **NOT RUN** (tracked separately below) |
| Storage-byte verify | **NOT RUN** |
| **Local recovery verdict** | **BLOCKED** pending drop-slot credentials |

This is **local preparation evidence** only. It is **not** a complete hosted recovery test.

---

## D. Storage-byte backup / verification (separate)

| Step | Result |
|------|--------|
| Object sync from prod buckets | **NOT RUN** |
| Local bucket privacy before import | Planned: force private; intentional difference from prod (`public: true` today) |
| Byte/count verify | **NOT RUN** |
| **Storage verdict** | **MISSING COMPONENT** → remains production blocker under C3 |

---

## E. Migration rehearsal results (bound to `e17858a5`)

| Step | Result |
|------|--------|
| Sequence A→C→D→E→RLS→F7-04→F7-03 | **NOT RUN** — blocked on recovery |
| **Migration verdict** | **BLOCKED** |

---

## F. Hosted behavior still unverified (production gates)

- Hosted Auth (GoTrue cloud), hosted Storage/CDN, pooler/SSL, Edge on Deno Deploy  
- Platform backup/PITR / 3rd free project under $0 limit  
- Public→private bucket cutover on **production** (not performed; prod untouched)

---

## G. Cleanup

| Field | Value |
|-------|-------|
| Operator | Bobbi / almona02 |
| Deadline | 2026-11-29 23:59:59 UTC |
| Also | `supabase stop` when rehearsal ends; shred any future dumps in drop-slot |
