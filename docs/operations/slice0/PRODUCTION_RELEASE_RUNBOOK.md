# Coordinated production release runbook — Slice 0 + machine identity

**Status:** Reviewable plan only. **Do not merge PR #155 and do not apply or change production / deployment settings under this document.**  
**Accepted staging tip:** `ca9f506715567e1f2ea08fdcd4e2bb0d5e3d10da`  
**PR (frozen for review):** https://github.com/almona02/almona-portfolio-forge/pull/155  
**Why #155 must not merge yet:** merge to `main` auto-deploys production frontend (Vercel) and backend (Railway) while required production database migrations are **not** applied — that yields incompatible old/new writers.

**Environments**

| Env | Project / service | Notes |
|-----|-------------------|-------|
| Staging DB | Supabase `apnmoevmvihfzcnttctx` | Slice 0 + MI applied (chunked version stamps) |
| Production DB | Supabase `shfsebdncjnncqqnewfj` | **None** of the Slice 0 / MI migration versions present (read-only check 2026-11-11) |
| Staging API | Railway `slice0-api` @ branch `feat/service-slice0-security` | Not the production cutover path |
| Production API | Railway `almona-portfolio-forge` @ **`main`** | Auto-deploys on merge |
| Production web | Vercel `almona-portfolio-forge` domains `almona02.com` / `www.almona02.com` | Auto-deploys on `main` |

---

## 1. Required migration inventory (ALL — not only identity follow-ups)

Repo files are the production packaging source of truth. Staging applied some under **different version stamps**; never re-apply by filename alone if content is already present.

| Order | Repo path | Staging-applied version(s) / name | Purpose |
|------:|-----------|-------------------------------------|---------|
| A | `supabase/migrations/20261111010000_service_slice0_security_boundary.sql` | Staging chunks `20261110233314`…`20261110233433` (`service_slice0_security_boundary_p*`) | Share minimize/revoke; private `ticket-attachments`; `admin_private` helpers; `govern_ticket_*` RPCs; protected-column trigger (blocks direct status/assignee/priority writes) |
| B | `docs/operations/slice0/staging_service_tickets_rls.sql` (ops package; applied on staging as `20261110233441` / `service_slice0_staging_rls_enablement`) | Same | Owner/assignee/admin\|support RLS policies for tickets/messages. **Mandatory companion** wherever policies are missing or over-broad. Prod already has RLS **enabled** on tickets — still verify/align **policy text** to this package before cutover. |
| C | `supabase/migrations/20261111180000_machine_identity_pr1.sql` | `20261111165835` (`machine_identity_pr1_schema_atomic`); abandoned stamp `20261111165001` — do not re-apply | Additive identity columns; relax `machines.serial_number` UNIQUE/NOT NULL; `register_machine_identity` / identity events / duplicate cases; hosted-auth stubs gated |
| D | `supabase/migrations/20261111190000_machine_identity_missing_serial_plate_evidence.sql` | `20261111180711` | Missing-serial registration requires persisted plate photo URLs |
| E | `supabase/migrations/20261111200000_staging_machine_photos_and_ticket_number.sql` | `20261111193746` | Private `machine-photos` + `profile-thumbnails` + owner storage policies; `service_tickets` BEFORE INSERT `ticket_number` allocator |

**Application revision that must ship with A–E:** tip `ca9f5067` (frontend + Python writers that call `govern_*`, signed private evidence only, Select fix, soft machine-link).

**Not a substitute for A–E:** GitHub `supabase-migrations.yml` on `main` only runs version-format + disposable replay — it does **not** apply to production.

---

## 2. Production schema drift (read-only inspection, 2026-11-11)

Observed on `shfsebdncjnncqqnewfj` (no writes performed):

| Area | Production observation | Implication |
|------|------------------------|-------------|
| Slice 0 / MI migrations | **Zero** matching `schema_migrations` rows | Full ordered apply required |
| `govern_ticket_*`, `register_machine_identity`, `link_ticket_machine`, ticket_number assign fn | **Missing** | New app cannot run against current prod DB |
| `machine_identity_events` / `machine_duplicate_cases` | **Absent** | Need migration C |
| `machines` columns | Legacy shape + `photo_urls` only; **no** identity lifecycle / serial_canonical / provisional_asset_ref | Need C (+ D for evidence gate) |
| `machines.serial_number` | UNIQUE present; **0** NULL serials (12 machines) | C drops UNIQUE/NOT NULL — irreversible without remediation plan; safe on current null count |
| `service_tickets.ticket_number` | NOT NULL; **no** Slice 0 assign trigger | E required for UI creates that omit `ticket_number` |
| `admin_private` schema | **Exists** | Expect CREATE OR REPLACE / grants to converge; do not assume Slice 0 helpers already present |
| Storage buckets `ticket-attachments`, `machine-photos`, `profile-thumbnails` | **Present and `public = true`** | A + E flip to private + scoped policies. Staging already `public = false` for all three |
| RLS | Enabled on `service_tickets`, `ticket_shares`, `ticket_messages`, `machines` | Still run package B policy alignment check |
| Approx. volume | ~14 tickets, ~12 machines, 0 shares | Small blast radius; still require backup |

**Writer incompatibility (why synchronized cutover is mandatory)**

```text
Old app + new DB (A installed)  → direct status/assign UPDATEs blocked by trigger → ticket ops break
New app + old DB                → govern_* / register_* / private signed paths missing → ticket + identity ops break
```

There is **no** safe long window with mixed old writers and Slice 0 DB, or new writers and pre-Slice 0 DB, without an intermediate bridge packaging that this PR does not contain. Treat cutover as one change window.

---

## 3. Coordination plan (app deploy ↔ database)

### 3.1 Preconditions (authorization gates)

- [ ] Explicit **production** authorization recorded (separate from staging acceptance / PR review).
- [ ] PR #155 reviewed and merge **held** until this runbook’s cutover window starts.
- [ ] On-call + rollback owner named; customer-comms plan for short ticket-mutation pause if needed.
- [ ] Edge function secrets for signed ticket-share attachments verified in prod (no public-bucket fallback).
- [ ] Railway + Vercel production deploy credentials healthy; no concurrent unrelated `main` deploys.

### 3.2 Backup / recovery readiness (before any apply)

1. **Supabase production backup / PITR snapshot** immediately before step 3.3; record backup id + timestamp in the release ticket.  
2. Export logical counts: tickets, machines, shares, storage object counts for the three buckets.  
3. Confirm Railway previous successful production deploy id and Vercel previous production deployment id (rollback targets for **apps only**).  
4. Confirm restore drill understanding: DB restore is the only full undo for trigger/RPC/bucket-privacy changes; app rollback alone is insufficient once A is live.

### 3.3 Cutover sequence (single window)

```text
T0  Freeze writes (optional soft banner / maintenance): pause staff ticket status/assign UI if traffic warrants
T1  DB apply in order: A → B (policy verify/apply) → C → D → E
    Record each version stamp actually inserted into schema_migrations on prod
T2  Merge #155 to main OR promote tip ca9f5067 via controlled prod deploys
    → Vercel production frontend
    → Railway production backend
    (Expect both to move; that is intentional in this window)
T3  Post-apply validation (§4) — go/no-go
T4  Lift write freeze; monitor error budgets 30–60 min
```

**Ordering rule:** Database A–E **before or immediately preceding** app traffic on `ca9f5067`. Never leave production serving `main` tip without A–E after those migrations land, and never serve `ca9f5067` without A–E.

**Filename vs version:** Prefer recording prod versions as the **repo timestamps** (`20261111010000`, `20261111180000`, `20261111190000`, `20261111200000`) plus an explicit ops entry for package B. If MCP/CLI stamps differ, map them in the release ticket the same way staging did.

### 3.4 Secure rollback / forward-repair

| Failure | Action | Forbidden |
|---------|--------|-----------|
| Validation fails **before** app deploy, after DB apply | Prefer **forward-repair** of SQL; if unsafe, **restore DB backup** and abort merge | Do not set any bucket `public = true` to “fix” downloads |
| App deploy fails / bad build after DB apply | Rollback Vercel + Railway to prior prod deploys **and** restore DB to pre-A snapshot (old app cannot run on Slice 0 DB) | Do not leave old app on new DB |
| Govern RPC / trigger defects after go-live | Forward-repair RPC/trigger; feature-flag mutation UI if needed | Do not drop protected-column trigger to reopen direct UPDATEs |
| Signed URL / attachment break | Fix edge secrets, policies, signing path | Do not re-enable public bucket reads |
| Serial UNIQUE drop regret after C | Human remediation plan only; no invented serials / silent deletes | Do not silently re-UNIQUE with duplicates/nulls |

---

## 4. Validation (production, post-cutover)

Minimum go/no-go (adapt staging Spark/Cursor suites; no secrets in tickets):

1. `schema_migrations` contains A–E (and B ops stamp); digest/object checks for `govern_ticket_transition`, `govern_ticket_assign`, `register_machine_identity`, `link_ticket_machine`, ticket_number trigger, private buckets.  
2. Authenticated direct `UPDATE service_tickets SET status/assigned_to/priority` → denied; row unchanged.  
3. Staff path via `govern_*` succeeds with audit row.  
4. Customer ticket create without client `ticket_number` succeeds (`TKT-YYYY-######`).  
5. Owner machine register (serial) + missing-serial with photos; photos stored private; URLs signed (`/object/sign/`).  
6. Ticket create with machine link; reopen shows machine UUID/serial.  
7. Share attachment: membership signed download works; cross-ticket/internal denied.  
8. Buckets `ticket-attachments`, `machine-photos`, `profile-thumbnails` remain **`public = false`**.  
9. Railway `/health` and Vercel production homepage/login healthy; error rate within budget.

---

## 5. Retained staging fixtures — `SLICE0-*` (5 rows)

These remain on **staging only** after journey synthetic cleanup. They are **not** production data and must never be copied to prod.

| ticket_number | Purpose | Cleanup owner |
|---------------|---------|---------------|
| `SLICE0-STG-001` | Baseline staging fixture (serial `SN-SLICE0-1`) for RLS / share / governance probes | **Cursor (ops)** after supervisor sign-off that Slice 0 + MI staging regression no longer needs fixed IDs; Spark consulted if a live suite still references them |
| `SLICE0-STG-002` | Second-ticket / cross-ticket isolation fixture (“Other ticket”) | Same |
| `SLICE0-LIVE-UP1` | Live upload / signed attachment browser fixture used in staging closeout | Same |
| `SLICE0-LIVE7-f6c00341` | P011 live-7 create path evidence | Same |
| `SLICE0-API-DUP-3dd960e9` | Assignment-failure / no-duplicate probe | Same |

**Cleanup rule:** cancel or delete only after (1) production cutover accepted **or** staging suites rewritten off these IDs, and (2) short note in staging closeout. Owner of record: **Cursor**. Spark may request retain/extend for an active verification; Spark does not unilaterally delete.

---

## 6. Explicit non-actions under this plan

- Do not merge #155 until a scheduled cutover that includes A–E.  
- Do not change Vercel/Railway production branch settings or disable auto-deploy as a substitute for coordination (settings changes are out of scope here).  
- Do not apply migrations to production without the authorization checklist in §3.1.  
- Do not treat CI migration replay as a production apply.
