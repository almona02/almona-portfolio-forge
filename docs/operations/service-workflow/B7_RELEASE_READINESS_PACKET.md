# Service program — release-readiness packet (preparation only)

**Updated:** 2026-11-15 after staging operational closeout  
**Program status:** [`CORE_SERVICE_PROGRAM_STAGING_CLOSED.md`](./CORE_SERVICE_PROGRAM_STAGING_CLOSED.md)  
**Authority:** Read-only inspection + staging evidence. **Do not merge. Do not change production. Do not disable production auto-deploy settings.**  
**Production approval:** **Not proposed yet** — blockers below must close first.

---

## Disclosed change: B2-BR-MULTI visit-state (reassignment)

Synthetic journey ticket **`B2-BR-MULTI`** exercised multi-job + active-visit guidance. Spark/Cursor reconciliation (`B2_VERDICT_RECONCILIATION_8f2acc4e.md`) **disclosed and accepted** this behavioral rule (correcting an early test assumption):

| Visit state | Reassign / decline |
|-------------|--------------------|
| `scheduled` | **Allowed** — history records reassign; attendance stays consistent with the job |
| `in_progress` (**active**) | **Denied** — assignee and visit intact until visit workflow ends (B3) |

**Release impact:** Any production package that includes B2 assignment RPCs **must** ship this rule (not the early “any open visit blocks” assumption). Slice0+MI-only first release (no jobs/visits) is unaffected until B2 is included.

---

## 1. Issue heads, dependency order, required CI

| Issue | State | Head OID | Base | Role |
|------:|-------|----------|------|------|
| **#155** | OPEN · **frozen** | `ca9f506715567e1f2ea08fdcd4e2bb0d5e3d10da` | `main` | Slice 0 + MI — frozen tip |
| **#156** lineage | OPEN · draft | tip `f23b87e4…` (`feat/service-workflow-b1-planning`) | depends on #155 | B1–B7 staging program (closed operationally) |

```text
#155 (ca9f5067)  →  minimum production app+DB for Slice0/MI
Security backports (below) MUST ride with that first release
B1…B7 workflow     →  separate coordinated package after first release (or one reviewed megapackage)
```

**CI caveat:** Passing checks on frozen `#155` / `ca9f5067` **do not** cover later security commits. Any proposed release tip must show required checks on **that tip’s commits**.

| Candidate tip | CI observation (read-only) |
|---------------|----------------------------|
| `ca9f5067` (#155) | Required rollup historically SUCCESS (smoke/preview SKIPPED) |
| `f23b87e4` (branch tip) | Partial PR #156 checks: typecheck/acceptance/regression/migration-format SUCCESS; Full Pipeline / audit may still be in flight — **not** a green production-gate claim until complete rollup on the **chosen** release commit |

---

## 2. Accepted staging revisions (reference)

| Layer | Revision | Notes |
|-------|----------|-------|
| #155 frozen | `ca9f5067` | Prod app tip **candidate base** |
| FE B7 preview | `78372312` · `dpl_46faneJn…` | Share **revoked** |
| BE Railway staging | `96f1d833` | F-B7-01/02 |
| DB B7 | `20261115184700` → `20261115185008` | F-B7-04 then F-B7-03 |
| Edge | `ticket-share-attachment` v2 | Access events before sign |
| Digests | `lf_sha256` F-B7-04 `21c7352c…` · F-B7-03 `5bd81592…` | |

---

## 3. #155 vs later security corrections (must not ship vulnerable intermediate)

### 3.1 Fixes that affect functionality **already present** in #155

| Fix | SHA(s) | #155 surface | Defect if omitted |
|-----|--------|--------------|-------------------|
| **F-B7-01/02** Python ticket read scope + internal-note privacy | `96f1d833` (+ tests) | Railway/Python ticket & message APIs | Staff-role over-read of tickets; owners can see internal notes via service-key paths |
| **F-B7-04** null-safe `revoke_ticket_share` + `govern_ticket_set_escalated` | `6c501536` (SQL) | Share revoke + escalate in `20261111010000…` | `IF NOT (a OR col = uid)` NULL-poison → unassigned tickets / null creator open revoke or escalate |
| **F-B7-03** audited share create/revoke/access; revoke client DML; `create_ticket_share` RPC | `b974ab0f` (SQL+FE) · edge v2 | `#155` `createShare` **direct `ticket_shares` INSERT**; `get_shared_ticket`; attachment edge | Unaffected create/audit; no access events; clients can INSERT shares; edge may sign without recording |
| FE `createShare` → RPC | part of `b974ab0f` lineage | Same | Required with F-B7-03 (INSERT revoked) |

### 3.2 Later fixes **not** required for a Slice0+MI-only first release

B1–B6 workflow/auth corrections (jobs, visits, reports, ack, etc.), B2 profile/SELECT staff routing for job UI, B2-BR-MULTI visit-state rule — **required when that surface ships**, not for #155-only.

Security remediation `d4cfc8ce` (service_role DML on report chain) applies once report tables exist (B4+).

### 3.3 Proposed **dependency-complete first release** (preferred)

**Do not** merge/release bare `ca9f5067` while production will serve Python ticket APIs and ticket shares.

**Package FR-1 — Slice0 + MI + share/privacy hardening** (backport / thin reviewed branch):

| Layer | Contents |
|-------|----------|
| App tip | `ca9f5067` **plus** cherry-picks (or equivalent reviewed commit): `96f1d833` (Python), FE share RPC client + edge v2 wiring from B7, any minimal type fixes required for CI |
| DB order | **A→E** (#155) + ops **B** (`docs/operations/slice0/staging_service_tickets_rls.sql`) → **F-B7-04** → **F-B7-03** (repo files `…181000` then `…180000`; staging live stamps were `84700`/`85008`) |
| Edge | `ticket-share-attachment` with access-event record (v2 behavior) |
| Explicitly **out** | B1–B6 workflow schema/RPCs; routines product |

**Alternative FR-2 — Coordinated reviewed megapackage:** single tip containing #155 + B1…B7 (staging tip lineage). Larger blast radius; must pass CI on **that** tip; includes B2-BR-MULTI visit-state rule. Only if product wants workflow live in the same window.

**Forbidden:** Ship #155 app+DB **without** F-B7-01/02/03/04 while shares/Python are live → **knowingly vulnerable intermediate**.

---

## 4. Production migration dependencies (incl. SQL outside `supabase/migrations/`)

### 4.1 FR-1 order (prod packaging)

| Step | Source of truth | Staging stamp map (do not re-apply blindly) |
|-----:|-----------------|-----------------------------------------------|
| A | `supabase/migrations/20261111010000_service_slice0_security_boundary.sql` | Chunked `20261110233314`…`33433` |
| B | **`docs/operations/slice0/staging_service_tickets_rls.sql`** (ops package — **not** in migrations dir) | `20261110233441` |
| C | `…/20261111180000_machine_identity_pr1.sql` | `20261111165835` (ignore abandoned `…165001`) |
| D | `…/20261111190000_machine_identity_missing_serial_plate_evidence.sql` | `20261111180711` |
| E | `…/20261111200000_staging_machine_photos_and_ticket_number.sql` | `20261111193746` |
| F7-04 | `…/20261115181000_service_workflow_b7_f_b7_04_null_auth.sql` | staging `20261115184700` |
| F7-03 | `…/20261115180000_service_workflow_b7_share_audit.sql` | staging `20261115185008` |

**Also review before prod (applied-sql archive, not auto-migrated):**  
`docs/operations/service-workflow/applied-sql/01*.sql` … `05*.sql` (security remediation / profile SELECT) — **not** in FR-1 unless FR-2 or an explicit staff-SELECT gap is in scope. Promote into `supabase/migrations/` (or a reviewed ops apply record) before production use; do not rely on transcript-only SQL.

### 4.2 Prod drift (read-only `shfsebdncjnncqqnewfj`)

No Slice0 / MI / B1–B7 migration versions present (catalog ends ~`20261106000000`). Full FR-1 apply required.

---

## 5. Maintenance pause, deploy sequence, backup, recovery

### 5.1 Write-pause procedure (planned)

1. Announce short maintenance (staff ticket mutate + customer share create).  
2. Soft-block: feature flag or banner disabling status/assign UI and share create (prefer app flag over disabling platform auto-deploy).  
3. Confirm no in-flight governed transitions; drain previews.  
4. Hold pause through DB apply + app promote + validation (§ go/no-go).  
5. Lift pause only after validation PASS.

### 5.2 Exact deployment sequence (FR-1)

```text
T0  Write-pause
T1  Verify backup/PITR (§5.3) — ABORT if unavailable
T2  DB apply A → B → C → D → E → F7-04 → F7-03
    Record prod schema_migrations versions + lf_sha256
T3  Deploy edge ticket-share-attachment (v2 semantics)
T4  Merge/promote FR-1 app tip (Vercel + Railway auto on main)
T5  Validation (runbook §4 + share audit/revoke null-safe + Python privacy probes)
T6  Lift write-pause; monitor 30–60 min
```

### 5.3 Backup / PITR — **prerequisite, not proven**

| Check | Result (this inspection) |
|-------|--------------------------|
| Supabase MCP `get_project` prod/staging | `ACTIVE_HEALTHY` only — **no PITR/backup inventory returned** |
| Documented “PITR required” | **Not proof** a restore point exists |
| **Gate before T2** | Operator must **verify in Supabase dashboard** (or CLI): PITR enabled **or** a fresh logical/physical backup id + timestamp recorded in the release ticket. **If neither → do not apply.** |

### 5.4 Recovery that preserves security

| Failure | Action | Forbidden |
|---------|--------|-----------|
| DB apply fails mid-way | Restore to pre-T2 backup; abort app merge | Leave half-applied Slice0 triggers |
| App bad after DB | Rollback Vercel+Railway **and** restore DB (old app cannot run on Slice0 DB) | Old writers on new DB |
| Share/privacy defect | Forward-repair F7 SQL/app; keep buckets private | Re-open public buckets / direct share INSERT |
| Need to undo A | DB restore only full undo | Drop protected-column trigger to “unblock” staff |

---

## 6. CI on the **actual** proposed release commits

| If release tip is… | Required before approval |
|--------------------|--------------------------|
| FR-1 backport branch / PR | Full required check rollup **on that PR head** (build, backend, typecheck delta, migrations format/replay, security, constitutional/hardening as required by repo gates). `#155` green is insufficient alone. |
| FR-2 megapackage (`f23b87e4` or successor) | Same rollup **on that SHA**; confirm Full Pipeline + audit complete — currently **not** claimed green end-to-end from this read-only snapshot. |

Spark staging PASS on B7 does **not** substitute for CI on the production release tip.

---

## 7. Remaining limitations / deferred scope

- No production authorization yet.  
- Backup/PITR **unverified** via available tooling.  
- G-01 legacy serial path vs canonical UUID (documented).  
- Service-role live branches / multi-session races: disposable only.  
- B1–B7 workflow, routines product, parts fulfillment: deferred from FR-1.  
- B2-BR-MULTI visit-state rule: mandatory with B2; N/A to FR-1 Slice0+MI-only.

---

## 8. Next product (separate)

[`SERVICE_ROUTINES_FIRST_SLICE_PROPOSAL.md`](./SERVICE_ROUTINES_FIRST_SLICE_PROPOSAL.md) — admin versioned routines + pinned checklist results; contracts/recurrence/squad deferred.
