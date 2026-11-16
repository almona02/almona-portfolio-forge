# FR-1 backup/restore rehearsal — execution sheet

**Status:** Hosted disposable **unavailable under $0 free limit** · both projects **preserved** · **local Supabase running** · export **blocked on drop-slot credentials**  
**Live local status:** [`FR1_LOCAL_REHEARSAL_STATUS.md`](./FR1_LOCAL_REHEARSAL_STATUS.md)  
**Artifact freeze:** `e17858a59c64426af6067d1ec114e311673daad9`  
**#158:** draft · **#155:** unmerged  
**Forbidden:** project pause/delete · plan upgrade · paid resource · production writes/bucket changes/write-pause/settings/merge/prod migration

---

## 1. Binding conditions

| # | Condition |
|---|-----------|
| **C1** | Production access read-only |
| **C2** | Rehearsal ≠ cutover (no prod write-pause/settings/merge/prod migration) |
| **C3** | Bound to `e17858a5`; missing backup component or failed restore = **production blocker** |

---

## 2. Hosted destination — create outcome

| Field | Value |
|-------|-------|
| Requested | `almona02-fr1-restore-rehearsal-20261115` · `eu-west-3` · org `iuhujuoejbfydldnbqac` |
| Quoted create cost | **`$0` / month** (re-verified) |
| Result | **FAILED** — free plan **2 active project limit** already used by `almona02` + `almona02-staging` |
| Preserved | **Both** hosted projects left **ACTIVE_HEALTHY** (no pause/delete) |

---

## 3. Available hosted options and exact costs (before any proceed)

| Option | What it enables | Exact cost (quoted / documented) | Authorized now? |
|--------|-----------------|----------------------------------|-----------------|
| **H0** Create 3rd free project while 2 active | New hosted disposable | **`$0`/mo** but **rejected by platform** until a free slot exists | **No path** without freeing a slot |
| **H1** Pause one existing project, then create disposable at $0 | Free slot (docs: *paused projects do not count toward free limit*) | Pause: **$0**; create: **`$0`/mo** | **Not authorized** (preserve both; no pause) |
| **H2** Supabase **branch** on an existing project | Hosted branch DB | **`$0.01344` / hour** (`get_cost` type=branch) | **Not authorized** (paid; ≠ $0/mo) |
| **H3** Upgrade org to **Pro** (then extra projects / daily backups) | Paid plan + quotas | **Pro from `$25`/month** (Supabase pricing docs); usage overages extra; **PITR add-on `$100`/month per 7-day retention** | **Not authorized** (plan upgrade) |
| **H4** Delete a free project to free a slot | Slot for $0 create | **$0** but destructive | **Not authorized** |

**Stop rule:** do not proceed on any option whose cost differs from the approved **`$0`/month create** without a new explicit cost authorization.

---

## 4. Local isolated environment assessment (alternative)

### 4.1 Candidates

| Local mode | Tooling on this workstation | Status |
|------------|-----------------------------|--------|
| **L1** `supabase start` (full local stack: API, Auth, Storage, Studio, Postgres) | Supabase CLI 3.0.0 + Docker Desktop | **Blocked now** — Docker engine pipe not available (`dockerDesktopLinuxEngine` missing). Feasible after operator starts Docker Desktop. |
| **L2** Ephemeral PostgreSQL 17 via `initdb`/`pg_ctl` (existing FR-1 harness pattern) | `C:\Program Files\PostgreSQL\17\bin` | **Available now** for SQL dump restore + migration apply + battery |

### 4.2 What local **can** usefully verify (recovery *evidence*, not hosted-complete)

- Logical SQL restore of schema/data into isolated Postgres  
- Authoritative migration sequence **A→C→D→E→RLS→F7-04→F7-03** from blobs at `e17858a5`  
- RLS/RPC behavior under `authenticated` role stubs (`auth.uid()` GUC pattern)  
- FR-1 disposable battery class checks (share audit, null-safe revoke, etc.)  

### 4.3 Explicit gaps — remain **production gates** (local ≠ complete hosted recovery)

| Gap | Why local cannot faithfully verify |
|-----|------------------------------------|
| **Hosted Auth** (GoTrue) | JWT issuance, email/SMS recovery, identity providers, hosted rate limits, refresh-token store semantics differ from stub/`supabase start` vs cloud Auth |
| **Hosted Storage** | S3-backed buckets, CDN, RLS-on-storage with hosted signer, **public→private cutover**, multipart/image transforms; local Storage (even with `supabase start`) ≠ production object ACL/CDN |
| **Extensions / managed roles** | Hosted `supabase_admin` / authenticator role graph, some cloud-only extensions and privilege defaults |
| **Connection pooler / SSL** | Supavisor/pgbouncer transaction pooling quirks vs local direct Postgres |
| **Edge Functions runtime** | Deno Deploy secrets, regional cold starts, production `ticket-share-attachment` against hosted Storage signing |
| **Dashboard backups / PITR UI** | Cannot prove platform restore points on free org |
| **Network IAM / SSO dashboard access** | Hosted project ACL not exercised |
| **Real outbound integration wiring** | Intentionally disabled in rehearsal; hosted secret injection paths differ |

**Reporting rule:** A successful **L1/L2** run may be reported as **local recovery / migration evidence** bound to `e17858a5`. It **must not** be labeled a **complete hosted recovery test**. Hosted gaps above remain **production blockers** until closed on a real hosted disposable (options §3) or equivalent hosted proof.

---

## 5. Secure export-credential path (continued)

| Step | Result |
|------|--------|
| Drop-slot | `…/u294861541/files/slice0/fr1-rehearsal/` (outside git) |
| Vercel CLI | Logged in as `almona02`; `vercel env pull` → `vercel_production.env` |
| Secret values | Production **Secret** types (`POSTGRES_*`, `SUPABASE_SERVICE_ROLE_KEY`, etc.) pulled as **`[SENSITIVE]` placeholders only** (13-byte files) — **not usable for dump** |
| Railway CLI | Unauthorized (not logged in) — not used |
| Supabase CLI token | Not present — not used |
| Credential reset | **Not performed** |
| Next secure step | Operator deposits real read-only URI / service role into drop-slot files **manually** (dashboard copy → file), or runs `vercel env pull` after granting Secret pull, **without chat/Git** |

---

## 6. Cleanup operator and retention

| Field | Value |
|-------|-------|
| Cleanup operator | **Bobbi** (local release captain) / **almona02** (org admin) |
| Retention / deletion deadline | **2026-11-29 23:59:59 UTC** |
| Scope | Any future dump ciphertext, local restore clusters, drop-slot secrets; delete hosted disposable **if/when** one is later authorized and created |

---

## 7. Recovery results (bound to `e17858a5`)

| Item | Result |
|------|--------|
| Hosted disposable restore | **NOT RUN** — project not created (free limit); both projects preserved |
| Encrypted production dump | **MISSING** — usable DB credentials not yet in secure channel |
| Storage-byte copy | **MISSING** |
| Local SQL restore | **NOT RUN** this turn (awaiting credentials + optional Docker for L1) |
| **Verdict** | **BLOCKED** |
| Classification | **Not** a complete hosted recovery test; **not** yet local recovery evidence either |

**Production blocker (C3):** **YES**

---

## 8. Migration-rehearsal results (bound to `e17858a5`)

| Item | Result |
|------|--------|
| Sequence A→C→D→E→RLS→F7-04→F7-03 | **NOT RUN** (blocked on recovery prerequisite) |
| **Verdict** | **BLOCKED** |

**Production blocker (C3):** **YES**

---

## 9. Recommended next step (still within current authorization)

1. Operator places usable read-only `prod_db_url.txt` (+ Storage key if syncing) into the secure drop-slot.  
2. Start **Docker Desktop**, then either:  
   - **L1** `supabase start` + restore + migrate, **or**  
   - **L2** ephemeral PG17 restore + migrate (SQL-focused).  
3. Report again as **local evidence only**, with §4.3 gaps listed as open hosted production gates.  
4. Hosted disposable remains blocked until a **new** authorization chooses an option from §3 (with cost ack if not $0).
