# B2 — Cursor alignment vs Spark `b2_contract.md`

**DB freeze:** `8f2acc4e806e70e12e87a24dcbebaef78e63e085`  
**UI correction:** `c88468ae28060bc15e11c6af28da686535a74832`  
**Mapper fix:** see HANDOFF tip after this commit lands on `feat/service-workflow-b1-planning` (draft #156).

## RPC signatures (match)

| Spark proposal | Freeze implementation |
|----------------|----------------------|
| `assign_service_job(p_job_id, p_technician_id, p_rationale, p_actor_id=NULL)` | Exact match (assign + reassign) |
| `decline_service_job(p_job_id, p_reason, p_actor_id=NULL)` | Exact match |
| *(Job 1)* | Extra: `ensure_default_service_job(...)` — idempotent opt-in Job 1 |

## Reconciliation (Spark final DB — retained)

| Point | Status |
|-------|--------|
| Required SKIP | **None.** Early S1/S3/S11 “author cols” SKIPs were harness assumptions. |
| Assignment history | **S1/S3/S11 PASS** via `service_job_assignment_history.actor_id` / `created_at` (+ audit). |
| Read model | **S13 PASS** — B1 `can_read_ticket_workflow` (owner-own, assignee-tech, staff-all, cross-customer denied). **Not** staff-only SELECT. |
| S14 technician agency | **PASS** — decline only; techs denied job-FSM; staff control ok. |
| Scheduled visits | **Do not block** reassign/decline (S4/S22); only `in_progress` blocks. |
| Opt-in boundary | Two client RPCs; each DB-atomic; S21 proves partial + retry → one Job 1. |
| DB totals @ `8f2acc4e` | **71/0/0/5** SQL + K1–K7 PASS (B1 baseline 49 verbatim). |

## UI error mapping

Server text (migration): `Cannot reassign|decline job with an in-progress visit` (hyphen).  
`mapJobRpcError` must match `in-progress` (and existing underscore/space forms). Auth/unknown errors pass through unchanged.

## Verdict files

See `B2_VERDICT_RECONCILIATION_8f2acc4e.md`. Early BLOCKED vs final ACCEPTED preserved under distinct names.
