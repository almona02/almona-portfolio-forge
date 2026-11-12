# Spark review — B1/B2 staging security remediation

**Status:** B1/B2 staging acceptance **BLOCKED**. Browser testing **paused**.  
**Containment:** ACTIVE (do not lift until corrective is applied).  
**Corrective:** committed for Spark review — **do not apply until Spark ACK**.  
**#155** frozen · **#156** draft · production unauthorized · no B3 · no merge.

---

## Cursor deliverable (this handoff)

| Item | Path / value |
|------|----------------|
| Corrective migration | `supabase/migrations/20261112150000_service_workflow_security_remediation.sql` |
| Security battery (7 defs) | `scripts/service-workflow/disposable_security_battery.sql` |
| Battery runner | `scripts/service-workflow/run_disposable_security.py` |
| This review handoff | `docs/operations/service-workflow/SPARK_SECURITY_REMEDIATION_REVIEW.md` |
| Parent handoff | `docs/operations/service-workflow/HANDOFF.md` |
| **Remediation package SHA** | `72e2e2f55e1b1211a7c9996e0fdbfc0f182b7041` |

---

## Containment (staging `apnmoevmvihfzcnttctx`)

| Field | Value |
|-------|--------|
| **Applied at** | `2026-11-12T12:55:00+02:00` (Cursor emergency containment; not a schema_migrations row) |
| **Method** | Ad-hoc SQL via Supabase MCP `execute_sql` (stubs + REVOKE anon). Corrective migration will restore intentional bodies. |
| **Stub message** | `B2 temporarily disabled pending security remediation` / `Workflow RPC temporarily disabled pending security remediation` (`42501`) |

### Contained functions (stubbed + anon EXECUTE revoked)

`assign_service_job`, `decline_service_job`, `ensure_default_service_job`, `govern_job_transition`, `waive_service_job`, `create_service_job_visit`, `govern_visit_transition`, `create_service_job`

Also revoked anon EXECUTE on: `evaluate_ticket_workflow_prerequisites`, `govern_ticket_transition` (both overloads). Authenticated + service_role retain EXECUTE so clients see clear `42501`, not missing-RPC.

### Post-containment effective privilege probe (Cursor, re-check for Spark)

Queried on staging after containment (use `has_function_privilege`, not ACL text alone):

| Function | Stubbed | `anon` EXECUTE | `authenticated` EXECUTE |
|----------|---------|----------------|-------------------------|
| `assign_service_job` | yes | **false** | true |
| `decline_service_job` | yes | **false** | true |
| `ensure_default_service_job` | yes | **false** | true |
| `govern_job_transition` | yes | **false** | true |
| `waive_service_job` | yes | **false** | true |
| `create_service_job_visit` | yes | **false** | true |
| `govern_visit_transition` | yes | **false** | true |
| `create_service_job` | yes | **false** | true |
| `evaluate_ticket_workflow_prerequisites` | no (not stubbed) | **false** | true |

Spark must independently confirm the same effective privileges and that stubbed calls raise `42501`.

Applied B1/B2 migration stamps (unchanged; corrective **not** applied):

| version | name |
|---------|------|
| `20261111222941` | `service_workflow_b1_data_contract` |
| `20261111223057` | `service_workflow_b2_assignment` |

---

## Pre-containment deployed evidence (hashes / grants)

Captured before stubs. Body MD5 of `prosrc`:

| Object | body_md5 |
|--------|----------|
| `admin_private.workflow_resolve_actor` | `126b77ef4da646acd73b528813f0529c` |
| `public.enforce_governed_ticket_columns` | `74ccdcc81955c0b99b37f357d6b5a033` |
| `public.assign_service_job` | `f7df932c231e22cdedac180e833a829a` |
| `public.ensure_default_service_job` | `7cf6a61b09d3ccbbff6bbeba94a52bdd` |
| `public.create_service_job` | `737eeb565d5b3b1f1d1f52045c2a24c6` |
| `public.decline_service_job` | `1cc5788a23250911a681667c3e1768d5` |
| `public.govern_job_transition` | `53309f0eddff43fba3130abb83354519` |
| `public.waive_service_job` | `5c3c68db79be63372b5eb9735c669739` |
| `public.create_service_job_visit` | `0a09888aa56990e2d05aaa5cfa8772c4` |
| `public.govern_visit_transition` | `d9e1955ab7cfdc8f8391eb1cac79a2c8` |

**Effective grants (hosted, pre-containment):** workflow SECURITY DEFINER RPCs had ACL shape  
`{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}`  
despite migrations using `REVOKE … FROM PUBLIC` then `GRANT … TO authenticated, service_role`.  
**Cause:** Supabase default privileges grant `EXECUTE` to role `anon` on new functions; that is a **role grant**, not `PUBLIC`, so `REVOKE FROM PUBLIC` alone does not remove it. Spark must verify **effective** `has_function_privilege('anon', …)` after apply, not only PUBLIC.

**Trigger:** `enforce_governed_ticket_columns_trigger` BEFORE UPDATE ON `service_tickets` — body included `workflow_activated_at/by` (aligned with `7a830739`).

**Live exploit (rolled back):** as `SET ROLE anon` + JWT role `anon` + empty sub,  
`assign_service_job(job2, tech, …, support_actor)` **succeeded** on ticket `B2-BR-MULTI` job `84eaad0c-657d-4819-9c82-34f31f88228e`.  
`create_service_job(…)` without actor → `Authentication required` (uses `resolve_actor(NULL)`).

---

## Finding resolution (two differences)

### A) Activation — ordinary client vs privileged SQL

| Boundary | Pre-fix result | API-accessible ordinary exploit? |
|----------|-----------------|----------------------------------|
| **Ordinary ticket owner / assignee / staff via `authenticated` JWT** updating `workflow_activated_*` | **Denied** by `enforce_governed_ticket_columns` (7a830739 list). Disposable W1/W2 and SEC4 client legs: clear/rewrite denied. | **No.** No PostgREST/authenticated path found that clears activation. |
| **Table owner / `postgres` / `supabase_admin` / SECURITY DEFINER running as owner** | **Allowed** by early owner bypass in the same trigger; privileged `UPDATE … activated_at = NULL` succeeds; gate then treats ticket as legacy/jobless. | **Not an ordinary-client exploit.** Disposable SEC4 `priv=f` / SEC7 fail-open used **trusted DB-owner SQL**, equivalent to fixture/MCP/`service_role` only if that role is table owner — **do not equate with owner/assignee UI clients**. |

**Corrective intent:** make activation **immutable once set for all roles** (defense-in-depth for DEFINER mistakes and privileged SQL), while first-time set remains via governed `create_service_job` (DEFINER). This is hardening, not a fix for an authenticated UI bypass that was already closed at `7a830739`.

### B) Direct INSERT — authenticated admin/support vs service_role

| Boundary | Pre-fix staging | Bypass activation/sequence/audit? |
|----------|------------------|-----------------------------------|
| **Ordinary `authenticated` admin/support** (app JWT) | Table privilege: **no INSERT** on `service_jobs` (only SELECT). RLS policy `service_jobs_staff_insert` existed but was **unreachable** without INSERT grant. SEC5 `auth=t` (denied). | **No** via direct INSERT. App must call governed RPCs. |
| **`service_role`** | Table **INSERT/UPDATE/DELETE** + hosted **BYPASSRLS**. Raw INSERT creates jobs without activation, sequence discipline from RPC, or workflow audit. SEC5 `svc=f` (allowed before fix). | **Yes**, for service-role key holders / backends using raw inserts — **not** the ordinary staff browser session. |

**Corrective intent:** `WITH CHECK (false)` insert policy + `REVOKE INSERT/UPDATE/DELETE FROM authenticated, anon, service_role` so only table-owner DEFINER RPCs write jobs/visits/history/audit. Application-facing creation remains `create_service_job` / `ensure_default_service_job` (restored by corrective).

---

## Seven test definitions (preserve; not counts only)

Source of truth: `scripts/service-workflow/disposable_security_battery.sql`  
Runner: `python scripts/service-workflow/run_disposable_security.py`  
(before = B1@`7a830739` + B2@`8f2acc4e` + staging posture grants; after = same + corrective worktree file)

| ID | Definition | Before fix | After fix |
|----|------------|------------|-----------|
| **SEC1** | Anonymous JWT + real staff `p_actor_id` on `assign_service_job` must be rejected | **FAIL** FAIL-OPEN: anon impersonated staff via `p_actor_id` | **PASS** anon+staff actor rejected |
| **SEC2** | Authenticated caller with mismatched `p_actor_id` must be rejected | **PASS** mismatched actor denied | **PASS** |
| **SEC3** | Verified service-role + actor succeeds; service-role missing actor denied | **PASS** service-role actor ok; missing denied | **PASS** |
| **SEC4** | Client clear/rewrite denied; privileged clear denied after remediation; activation still set | **FAIL** `clear=t rewrite=t priv=f still=f` (client OK; privileged clear succeeded) | **PASS** activation clear/rewrite blocked (client+privileged) |
| **SEC5** | Direct INSERT: authenticated denied **and** service_role denied; no job/activation/audit | **FAIL** `auth=t svc=f jobs=0→1 act=f` (auth OK; service_role inserted) | **PASS** direct INSERT blocked; no activation/audit |
| **SEC6** | Legitimate `ensure_default` + assign + second `create_service_job`; activation, sequence, history, audit present | **PASS** | **PASS** |
| **SEC7** | If activation were cleared, resolve must not bypass; with immutability, clear fails and resolve stays gated | **FAIL** FAIL-OPEN: clear enabled resolve bypass (privileged clear) | **PASS** no clear; no resolve bypass |

Artifact (gitignored local run): `.artifacts/slice0/service-workflow/disposable_security_results.json` — verdict `reproduced: true`, `fixed: true` on the run that stamped this package.

---

## Corrective migration requirements (checklist for Spark)

`20261112150000_service_workflow_security_remediation.sql` must:

- [x] Reject anonymous actor injection even when `p_actor_id` supplied  
- [x] Reject authenticated actor mismatch  
- [x] Permit actor override only when `admin_private.is_service_role_request()`  
- [x] Preserve legitimate governed create/assign/decline/transitions + atomic audit  
- [x] Keep activation durable after first activation (immutable once set)  
- [x] Restore every temporarily stubbed legitimate operation (full bodies, not stubs)  
- [x] Strip **effective** anon grants (`REVOKE … FROM PUBLIC, anon`), not only PUBLIC  

Does **not** rewrite applied history `20261111222941` / `20261111223057`.

---

## Local vs staging cause (summary)

1. Hosted default privileges → **anon EXECUTE** on new functions; disposable never granted that posture.  
2. `workflow_resolve_actor` treated null uid + `p_actor_id` as service path without verifying service_role.  
3. Activation “regression” narrative vs `7a830739`: protection **present**; remaining clear was **privileged SQL**, not ordinary owner/assignee API.  
4. Direct INSERT risk was **service_role**, not ordinary authenticated admin/support.

---

## Spark procedure

1. **Independently confirm containment** on staging: stubbed calls → `42501`; `has_function_privilege('anon', …) = false` for listed RPCs.  
2. **Review correction locally/disposably** (`run_disposable_security.py`) — fresh staging sessions **not** required for this review.  
3. **ACK** → Cursor applies corrective under existing staging-only authorization, verifies deployed definition hashes + effective grants, provisions fresh scoped fixture sessions.  
4. Spark runs **live** security checks on staging **before** browser journey resumes.

## Cursor after Spark ACK (not before)

- Apply `service_workflow_security_remediation` only.  
- One deployed-definition record (hashes + effective anon/authenticated/service_role EXECUTE).  
- Fresh scoped fixture sessions.  
- Browser remains paused until Spark live checks pass.

## Out of scope

Production, B3, merge, rewriting applied B1/B2 migration rows, lifting containment before apply.
