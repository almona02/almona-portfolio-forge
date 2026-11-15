# FR-1 backup-and-restore rehearsal proposal (review only)

**Status:** Proposal for review · **not** production cutover authorization · **not** an instruction to run against production beyond a bounded, supervised export if separately approved  
**Freeze tip (artifacts):** `e17858a59c64426af6067d1ec114e311673daad9`  
**Release vehicle:** draft **#158** — keep draft  
**#155:** remain **unmerged**; mark **superseded** only when the release plan is finalized (see §9)  
**No** production migration apply · **no** merge · **no** deployment-settings changes · **no** routines implementation

Parent packet: [`FR1_PRODUCTION_APPROVAL_PACKET.md`](./FR1_PRODUCTION_APPROVAL_PACKET.md)

---

## 1. Purpose and bounds

Prove that a **logical backup of production-shaped data can be restored** to a disposable project, that **FR-1 migrations apply cleanly in the reconciled order**, and that **application workflows work** with outbound side-effects disabled—before any production cutover is considered.

| In scope | Out of scope |
|----------|--------------|
| One supervised export from prod (if export window authorized) | Production schema apply |
| Disposable restore + FR-1 migration rehearsal | Merge of #158 / #155 |
| Proof-of-recovery checklist | Changing Vercel/Railway/Supabase settings |
| Write-pause **design** for future cutover | Executing production write-pause now |

---

## 2. Export scope

### 2.1 Database (required)

| Schema / objects | Include? | Rationale |
|------------------|----------|-----------|
| `public` tables used by tickets, shares, messages, machines, profiles, governance audit | **Yes** | FR-1 surface |
| `auth` (users, identities, refresh tokens as needed for JWT replay in disposable) | **Yes (sensitive)** | Workflow proof needs real role bindings; treat as secret |
| `storage` metadata (`buckets`, `objects` rows) | **Yes** | Path/policy proof; see §4 for **bytes** |
| `supabase_migrations.schema_migrations` (or project equivalent) | **Yes** | Migration-history proof |
| Roles, grants, default privileges (via dump flags / separate ACL dump) | **Yes** | RLS/RPC execute proof |
| Functions/triggers in `public` + `admin_private` | **Yes** (schema dump) | Slice0/FR-1 DEFINER chain |
| Extensions (`pgcrypto`, etc.) | **Yes** | Restore prerequisites |
| Unrelated product schemas (marketplace-heavy tables) | **Prefer yes for consistency**; if size-bound, document exclusions and accept weaker “full prod twin” claim | Consistency vs cost |
| Logs / realtime / vault secrets | **No** by default | Reconfigure in disposable; do not copy production secrets into chat/logs |

### 2.2 Consistency method (snapshot)

Because platform PITR/daily backups are **unverified/unavailable** on the free org plan, use a **single logical dump window**:

1. **Short application quiesce (rehearsal-grade)** — optional but preferred: enable maintenance banner; discourage writes for dump duration (see §7 for full cutover pause; rehearsal may use a quieter off-peak window without full pause if dump is brief and accepted as crash-consistent).  
2. **One `pg_dump` / `supabase db dump` invocation** capturing schema+data with:
   - `--format=custom` (or directory format) for parallel restore, **or** plain SQL if tooling requires  
   - Include roles if operator has privileges (`--roles` / equivalent)  
   - Record `pg_dump` / CLI version, UTC start/end, prod project ref `shfsebdncjnncqqnewfj`, operator ID  
3. **Checksum:** SHA-256 of dump artifact(s); store alongside manifest JSON (no secrets in manifest).

**Crash-consistent vs write-quiesced:** If dumps run without write-pause, document that as a known limitation of the rehearsal; cutover backup must use the write-pause in §7.

### 2.3 Encrypted storage and access

| Control | Requirement |
|---------|-------------|
| At rest | Encrypt dump with age/gpg or cloud KMS-managed envelope encryption |
| In transit | TLS only; no paste into tickets/chat |
| Access | Named operators only; least privilege IAM; access logged |
| Location | Offline/secure bucket **separate from** production app buckets; retention bound (e.g. 14 days) then destroy |
| Keys | Held outside the dump; dual-control for decrypt preferred |
| Working copies | Decrypt only onto disposable restore host; wipe after cleanup |

### 2.4 Sensitive-data handling

| Class | Handling |
|-------|----------|
| PII (profiles, emails, ticket bodies) | Minimize exposure; restore only into disposable; no screenshots with PII in public channels |
| Auth credentials / refresh tokens | Dump allowed for restore fidelity; **never** export into git or agent stores; rotate disposable passwords after rehearsal if fixtures created |
| Service role / anon keys | **Do not** copy production keys into disposable apps; mint disposable project keys |
| Share tokens | Present in `ticket_shares`; treat as secrets; do not publish |
| Attachment paths | OK in DB dump; object bytes per §4 |

---

## 3. Disposable restore destination and cleanup

### 3.1 Destination

- **New** Supabase project in the same org (or isolated org), region preferably `eu-west-3`, named e.g. `almona02-fr1-restore-rehearsal-YYYYMMDD`.  
- **Not** staging `apnmoevmvihfzcnttctx` (preserve staging evidence).  
- **Not** production `shfsebdncjnncqqnewfj`.  
- Postgres 17-compatible with dump.

### 3.2 Restore steps (high level)

1. Create empty disposable project.  
2. Restore logical dump (schema → data → ACL as tooling allows).  
3. Re-link Storage per §4 (metadata already in DB; objects synced or stubbed with recorded gaps).  
4. Configure disposable Auth URL / JWT secret as project defaults (do **not** overwrite with production JWT secret in shared tooling).  
5. Point a **local or preview** app build @ `e17858a5` at disposable URL/keys only.  
6. Disable outbound integrations (§5.3).  
7. Run proof checklist (§5).  
8. Apply FR-1 migration sequence (§6) on this restored DB.  
9. Re-run proof + FR-1 battery subset.  
10. **Cleanup:** pause disposable project or delete project; shred local decrypts; schedule encrypted dump deletion after retention.

### 3.3 Cleanup acceptance

- [ ] Disposable project deleted or irrevocably paused  
- [ ] Local dump plaintext wiped  
- [ ] Ciphertext retention timer set or destroyed  
- [ ] No production env vars left in rehearsal shells/CI secrets

---

## 4. Storage objects and auth/config (separate from SQL dump)

### 4.1 Storage objects (`ticket-attachments`, `machine-photos`, …)

| Item | Approach |
|------|----------|
| **Metadata** | Included in DB dump (`storage.objects` / `storage.buckets`) |
| **Bytes** | **Not** guaranteed by `pg_dump`. Separate sync: `supabase storage` CLI / S3-compatible copy from prod buckets → disposable buckets **or** sample subset of FR-1-relevant prefixes |
| **Rehearsal minimum** | Sync representative objects referenced by sample tickets/shares used in proof; record **unsynced** count as intentional gap |
| **Cutover later** | Full bucket sync or accept signed-URL proof only after prod apply (rehearsal must state which) |
| **Privacy** | Keep buckets **private** in disposable; never set `public=true` as a “fix” |

### 4.2 Authentication / configuration recovery

| Item | Preserve / recover how |
|------|------------------------|
| Auth users / roles in DB | Via `auth` schema in dump |
| JWT secret / project URL / anon / service keys | **Disposable project’s own** keys; map in local `.env.rehearsal` (gitignored) |
| Edge function secrets | Redeploy `ticket-share-attachment` @ `e17858a5` into disposable; set disposable secrets only |
| Railway / Vercel production env | **Do not** point production at disposable; use local/preview only |
| Google/Stripe/SendGrid/etc. | **Disabled** (§5.3); stub or omit keys |
| RLS relying on `auth.uid()` | Works once disposable Auth sessions minted for restored user UUIDs (password reset flow or magic link in disposable) |

---

## 5. Proof of recovery

All must be recorded with operator, UTC time, disposable project ref.

### 5.1 Restore succeeds

- [ ] `pg_restore` / import completes without fatal error  
- [ ] Database accepts connections; `SELECT 1`  
- [ ] Extension list includes required extensions  

### 5.2 Representative counts and relationships

Capture **pre-export** counts on production (read-only) and **post-restore** on disposable for the same queries, e.g.:

- `service_tickets`, `ticket_messages`, `ticket_shares`, `machines`, `profiles` row counts  
- Orphans: messages without tickets; shares without tickets; tickets with `machine_id` not in `machines`  
- Sample FK walk: one owner ticket → messages → share → attachment path exists in `storage.objects` (and byte present if synced)

Mismatch → **FAIL** rehearsal (or document accepted exclusion).

### 5.3 Roles, grants, RLS, functions, migration history

- [ ] Critical roles exist (`anon`, `authenticated`, `service_role`)  
- [ ] Table privileges: anon cannot UPDATE `service_tickets` (as expected for current prod posture)  
- [ ] RLS enabled flags on `service_tickets` / `ticket_messages` / `ticket_shares` match pre-export inventory  
- [ ] Key functions present: `govern_ticket_transition`, `revoke_ticket_share`, `st_assigned_or_staff`, MI RPCs as currently in prod  
- [ ] `schema_migrations` (or equivalent) lists versions present in prod pre-export  

### 5.4 Restored application workflows (outbound disabled)

Run against disposable with app @ `e17858a5` (or freeze tip + docs-only):

| Workflow | Expect |
|----------|--------|
| Owner login (disposable session) | Success |
| Owner read own ticket; unrelated denied | Pass |
| Share create/revoke (post-FR-1 apply) | Pass per FR-1 |
| Attachment signed download via edge | Pass for synced objects |
| Staff govern transition (if present) | Pass |

**Outbound kill switch (mandatory during rehearsal):**

- Unset/stub: SendGrid, SMS, Stripe live, webhooks, analytics write keys  
- Confirm no email/SMS/payment calls in logs during proof  
- Prefer `DRY_RUN` / feature flags if present; otherwise omit secrets

---

## 6. Migration-order reconciliation (Spark) and FR-1 sequence rehearsal

### 6.1 Reconciliation note for Spark

Earlier narrative labeled packages **A / B(RLS) / C / D / E** (conceptual). Filename timestamps do **not** place RLS immediately after A:

| Label | Filename | Lexicographic rank |
|-------|----------|--------------------|
| A Slice0 boundary | `20261111010000_…` | 1 |
| C MI PR1 | `20261111180000_…` | 2 |
| D MI plate evidence | `20261111190000_…` | 3 |
| E photos + ticket_number | `20261111200000_…` | 4 |
| **B RLS package** | `20261111201000_…` | **5** |
| F7-04 null-safe | `20261115190000_…` | 6 |
| F7-03 share audit | `20261115190100_…` | 7 |

**Authoritative apply order (Spark + cutover + rehearsal):**

```text
20261111010000  →  20261111180000  →  20261111190000  →  20261111200000
  →  20261111201000 (RLS)  →  20261115190000 (F7-04)  →  20261115190100 (F7-03)
```

**Do not** apply RLS before MI C/D/E on a greenfield DB. **Do not** apply F7-03 before F7-04.  
Conceptual “Package B = RLS” remains correct; only the **sequence relative to C/D/E** follows filenames.

Spark content PASS on `d3ef35d4` is unchanged by this clarification; confirm Spark acknowledges this order before cutover.

### 6.2 Rehearsal against restored production-shaped DB

After §5 baseline proof on the **restored** DB (pre-FR-1 delta):

1. Inspect which of the seven versions are **already** in migration history (production may already have none, some, or all of A–E depending on live state—**do not assume**).  
2. Apply **only missing** versions in the authoritative order from freeze tip `e17858a5` blobs.  
3. If a version is present but objects diverge, **STOP** and escalate (do not force re-apply).  
4. Deploy disposable edge `ticket-share-attachment` @ `e17858a5`.  
5. Run `scripts/service-workflow/disposable_fr1_battery.sql` adapted to restored roles **or** Spark equivalent probes (M1–S10 class).  
6. Record PASS/FAIL; any FAIL blocks production authorization.

---

## 7. Write-pause enforcement (cutover design; not executed now)

For a future authorized cutover (and for a **strict** dump window if ordered):

### 7.1 Surfaces

| Surface | Enforcement |
|---------|-------------|
| Existing browser clients | Maintenance banner + optional remote config / feature flag `fr1_write_pause=true` forcing ticket create/message/share UI read-only |
| Direct Supabase API (PostgREST) | Prefer DB-side: temporary REVOKE of INSERT/UPDATE on `service_tickets`, `ticket_messages`, `ticket_shares` from `authenticated`/`anon` **or** gateway allowlist — **only under change control**; rehearse revoke/restore on disposable first |
| Share links | Maintenance page for `/support/tickets*?share=`; edge function returns 503 under pause flag/secret |
| Python backend writers | Env `FR1_WRITE_PAUSE=1` → 503 on ticket mutate routes; health remains 200 |
| Background writers | Disable/pause cron, queues, Trigger jobs, Railway cron touching tickets/shares; confirm no Locust/CI against prod |
| Service role jobs | Inventory and halt; service_role bypasses RLS — highest risk |

### 7.2 Exit criteria

Pause lifts only after DB+edge+app validation (§3.4 of approval packet) PASS.

---

## 8. Vercel / Railway automatic deployment coordination

Observed (read-only): both **Vercel production** and **Railway** `almona-portfolio-forge` track **`main`**.

| Phase | Action |
|-------|--------|
| Before any merge of #158 | Keep #158 draft; no settings changes in this proposal |
| When cutover is later authorized | Prefer **disable auto-deploy** or require manual promote on Vercel + Railway for the window; apply DB+edge; then deploy/promote apps @ `e17858a5`; re-enable auto-deploy |
| If auto-deploy cannot be disabled | Reject merge until a simultaneous write-pause cutover is staffed — F7-03 and FE `create_ticket_share` are **not** safely staggered |

Rehearsal itself uses **disposable/local** apps only — no production deploy.

---

## 9. PR posture

| PR | Now | When release plan finalized |
|----|-----|-------------------------------|
| **#158** | **Remain draft** | Undraft only with explicit production authorization |
| **#155** | **Remain open, unmerged** | Comment + close as **superseded by #158** (do not merge #155) |

Supersession comment (ready text, **do not post until finalized**):

> Superseded by draft #158 (`release/fr1-slice0-share-privacy`), which contains tip `ca9f5067` as ancestor plus FR-1 RLS/share-privacy packaging. Closing without merge to avoid a second deployment wave.

---

## 10. Review asks

1. Approve or amend export scope / encryption / retention.  
2. Spark: confirm §6.1 authoritative migration order.  
3. Approve disposable restore destination policy and Storage sync minimum.  
4. Approve proof checklist (§5) as the backup gate.  
5. **Do not** treat acceptance of this proposal as production cutover authorization.

---

## 11. Spark handoff (rehearsal)

See [`SPARK_FR1_BACKUP_RESTORE_REHEARSAL.md`](./SPARK_FR1_BACKUP_RESTORE_REHEARSAL.md).
