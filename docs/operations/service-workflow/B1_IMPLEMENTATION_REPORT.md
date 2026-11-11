# B1 implementation report — data contract & state guards

**Status:** Implemented on draft PR #156. **Local/disposable verification only.**  
**Base tip:** `ca9f5067` (#155 frozen). **No staging/production apply. No merge. No B2–B7.**  
**Migration:** `supabase/migrations/20261111210000_service_workflow_b1_data_contract.sql`  
**Frozen full commit (B1 acceptance):** `7a8307395b79df677a96f77cd993a77351b5805c`

## Commit relationship

| SHA | Role | Runtime? |
|-----|------|----------|
| `5eef37223941bee0e6b4f5dde53a13fb734db2cf` | Initial B1 schema/RLS/RPC/battery land | Yes |
| `c6b1e46aa385a4eadcb125ce7c42761732908867` | Docs-only: finalize freeze label | No |
| `4f64fd5f9480f1a57d0b84bfee955f79a2bf360c` | Docs-only: point freeze label at tip | No |
| `7a8307395b79df677a96f77cd993a77351b5805c` | **B1 acceptance freeze** (activation protect + expanded harness) | Yes |

Spark’s first expanded pass against `5eef3722` found: activation clearable via client UPDATE (`X4b`), M2 false-positive uniqueness probe, and required fixture SKIPs for R2/RV1/ACK1. Acceptance freeze includes activation-column protection + expanded harness fixes.

## Naming agreement (Spark)

| Object | Decision |
|--------|----------|
| Existing `public.service_visits` | Contract PM visits — **untouched** |
| New `public.service_job_visits` | Job attendance visits — B1 authority |
| RPCs | `create_service_job_visit` (not `create_service_visit`) |

Contract file: `scripts/service-workflow/b1_contract.md`.

## Eight Spark alignment answers (confirmed against implementation)

1. **State column:** `state` on `service_jobs` / `service_job_visits` (not `status`).
2. **Visit create:** `create_service_job_visit(p_job_id, p_rationale, p_actor_id)` — 3-arg; scheduled window is later-scope.
3. **Job create actor:** `create_service_job` uses `auth.uid()`; no actor param.
4. **Audit:** `service_workflow_audit` has `actor_id`, `created_at`, plus `action` / from/to / rationale facts.
5. **Revision/review/ack literals:** verification `verified_fixed|not_reproduced|further_work_required|not_verified`; review `approved_issued|returned`; ack `accepted|refused|unavailable`. Battery uses privileged inserts with those literals.
6. **Technician job transitions at B1:** denied for tech (staff admin/support only); B2 grants scoped tech agency.
7. **`cancelled → waived`:** via `waive_service_job` only (manager + reason).
8. **Resolve/close gate:** inside `govern_ticket_transition` for activated tickets (`workflow_activated_at IS NOT NULL`); jobless legacy path preserved.

## Durable activation

`workflow_activated_at` / `workflow_activated_by` set on first job create; included in `enforce_governed_ticket_columns` so ordinary authenticated client UPDATE cannot clear or alter them. Owner/DEFINER paths (create RPC) still set them.

## Corrections incorporated

1. Distinct visit name; relationship documented.  
2. Real RLS + grants + impersonation denial + atomic workflow audit on every B1 RPC.  
3. No submit/review/ack success stubs; job `completed` requires approved issued report.  
4. `workflow_activated_at` durable + client-protected; legacy jobless resolve/close preserved (`X2`); activated tickets gated (`X3`/`X4`/`X4b`).  
5. `resolved→in_progress` validity extended; free govern blocked; atomic job create + ticket audit (`X1`); `FOR UPDATE` locks.  
6. Spec contradictions resolved in helpers/docs.  
7. Immutability via privileged fixtures (`R2`/`RV1`/`ACK1`/`A5`); concurrency `K1`–`K4`.

## Disposable results (summary)

Harness: `python scripts/service-workflow/run_disposable_b1.py`  
Worktree for Spark: `/c/projects/almona-slice0-b1-verify` @ `7a8307395b79df677a96f77cd993a77351b5805c` (clean).  
Migration applied by harness only (disposable PG17).

| Suite | Result |
|-------|--------|
| SQL battery (expanded) | **44 PASS / 0 FAIL / 0 SKIP / 5 DEFER** |
| Concurrency | **K1 PASS, K2 PASS, K3 PASS, K4 PASS** |
| Gate | **B1 ACCEPTED** (zero FAIL, zero required-SKIP) |

Artifact: `.artifacts/slice0/service-workflow/disposable_b1_results.json` (`tested_sha` = freeze).

### Deferred (explicit; do not block B1)

| Check | Reason |
|-------|--------|
| V5 | B3 reschedule RPC |
| R3, R4, M4, M5 | B4/B5 submit/review behavior |

## PR hygiene

- #156 remains **draft**  
- #155 tip remains `ca9f506715567e1f2ea08fdcd4e2bb0d5e3d10da`
