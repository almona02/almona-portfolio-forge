# B2 verdict reconciliation — freeze `8f2acc4e`

**Freeze SHA:** `8f2acc4e806e70e12e87a24dcbebaef78e63e085`  
**Branch/ref:** `origin/feat/service-workflow-b1-planning` (draft #156)  
**Hygiene:** #155 frozen at `ca9f5067`; no staging/production apply; no merge; no B3.

## Preserved verdict files (distinct)

| File | Meaning |
|------|---------|
| `.artifacts/slice0/service-workflow/SPARK_B2_VERDICT_8f2acc4e_run1_BLOCKED.md` | Early independent report: B2 **BLOCKED** (FAIL S4/S13/S15; required SKIP S1/S3/S11). Freeze untouched. |
| `.artifacts/slice0/service-workflow/SPARK_B2_RUN1_BLOCKED_8f2acc4e.log` | Raw run-1 battery log / counts. |
| `.artifacts/slice0/service-workflow/SPARK_B2_VERDICT_8f2acc4e_final_ACCEPTED.md` | Final independent Spark report after harness/assumption corrections: **DB ACCEPTED** + **opt-in UI U1–U6 ACCEPTED**. |
| `.artifacts/slice0/service-workflow/SPARK_B2_VERDICT_8f2acc4e.md` | Canonical pointer copy of the final ACCEPTED verdict. |
| `.artifacts/slice0/service-workflow/disposable_b1b2_results_8f2acc4e_on_7a830739.json` | Final green evidence (69 PASS / 0 FAIL / 0 SKIP / 5 DEFER + K5–K7). |

Implementation at `8f2acc4e` was **not** modified between run-1 and final. Only Spark harness expectations / disposable auth grants changed.

## Cursor summary (from Spark final independent report)

- **B1 regression:** GREEN — 49 PASS / 0 FAIL / 0 required SKIP / 5 DEFER + K1–K4 PASS.
- **B2 database:** ACCEPTED — S1–S20 PASS + K5–K7 PASS; zero required SKIP.
- **B2 UI (opt-in checkbox only):** ACCEPTED for U1–U6 on the freeze dialog.
- **Full B2 UI (additional-job assign/reassign/decline surfaces):** incomplete at freeze; authorized correction follows in a **separate** commit after this reconciliation/harness commit.
- Cursor’s earlier narrower disposable subset remains supporting evidence only.

## Which early FAILs/SKIPs were assumption or setup errors

| Check | Early result | Classification | Evidence |
|-------|--------------|----------------|----------|
| **S4** | FAIL “open-visit reassign guard” expecting scheduled visits to block | **Test assumption error** | Supervisor: scheduled visits must **not** prohibit reassignment; only `in_progress` blocks. Final S4 expects `sched-allowed=true active-denied=true` and PASSes on the same freeze. |
| **S1 / S3 / S11** | Required SKIP “needs column map: author cols” (`assigned_by`/`assigned_at`) | **Test assumption error** | Attribution is preserved in `service_job_assignment_history.actor_id` + `created_at` (and workflow audit). Exact job-row field names are not mandatory. Final harness asserts history actors/times → PASS. |
| **S13** | FAIL “tech-own visible, others hidden” / `own=1 other=0 cust=1 sup=2` | **Test assumption error** | B1 `can_read_ticket_workflow` already grants owner-own + assignee-tech + staff; customer-on-own-ticket is intentional. Harness rewritten to own/other/owner-own/cross-customer/staff → PASS. |
| **S15** | FAIL “failures traceless” (coupled to wrong open-visit / author expectations in early suite) | **Test assumption / probe coupling** | Final S15/S17 assert failed assign/decline/ensure leave no job/history/audit residue → PASS on unchanged freeze. |
| **S20** (later Spark run before green) | FAIL `42501 permission denied for schema auth` | **Harness setup error** | History SELECT → `caller_uid()` → `auth.uid()`; disposable `b1_auth` lacked `GRANT USAGE ON SCHEMA auth` (hosted Supabase grants it). Base grant added → PASS. |
| **S14** | Early DEFER (misread as tech job-FSM acceptance) | **Final PASS** | Techs denied all `govern_job_transition` (incl. own jobs); staff control ok. B2 agency = decline only. Visit execution remains B3 (V5 DEFER). |

## Required SKIP vs later DEFER (final)

- **Required SKIP:** none. Early S1/S3/S11 “author cols” SKIPs were harness assumptions — assignment history already carries `actor_id` / `created_at`.
- **Read model:** B1 `can_read_ticket_workflow` remains authoritative post-B2 (owner-own, assignee-tech, staff-all, cross-customer denied). Not a staff-only SELECT gap.
- **Later DEFER (explicitly untested):** M4, M5 (B4), R3, R4 (B5), V5 (B3 visit execution).

## Two-RPC recoverable partial vs atomic opt-in

See `B2_OPTIN_TRANSACTION_BOUNDARY.md`.

## Actor / time attribution map

| Required attribution | Actual storage |
|----------------------|----------------|
| Who assigned/reassigned/declined | `service_job_assignment_history.actor_id` |
| When | `service_job_assignment_history.created_at` |
| Action + from/to technicians | `action`, `from_technician_id`, `to_technician_id` |
| Parallel workflow audit | `service_workflow_audit` via `admin_private.record_job_assignment` |
| Current job technician | `service_jobs.assigned_technician_id` (state, not author) |

No `assigned_by` / `assigned_at` columns on `service_jobs` are required while history remains append-only and complete.

## Scheduled vs active visit reassignment

- **Scheduled** visit: reassignment **allowed**; history records reassign; attendance rows remain consistent with the job.
- **Active** (`in_progress`) visit: reassignment **and** decline **denied**; assignee and visit stay intact until the visit workflow ends (B3).
