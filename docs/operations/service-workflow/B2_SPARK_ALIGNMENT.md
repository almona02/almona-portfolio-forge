# B2 — Cursor alignment vs Spark `b2_contract.md`

**Freeze under test:** `8f2acc4e806e70e12e87a24dcbebaef78e63e085`  
**Branch/ref:** `origin/feat/service-workflow-b1-planning` (draft #156).  
**Reachability:** commit is an ancestor of the remote branch tip; `git fetch origin` then `git show 8f2acc4e806e70e12e87a24dcbebaef78e63e085`.

## RPC signatures (match)

| Spark proposal | Freeze implementation |
|----------------|----------------------|
| `assign_service_job(p_job_id, p_technician_id, p_rationale, p_actor_id=NULL)` | Exact match (assign + reassign) |
| `decline_service_job(p_job_id, p_reason, p_actor_id=NULL)` | Exact match |
| *(Job 1)* | Extra: `ensure_default_service_job(p_ticket_id, p_technician_id=NULL, p_title='Job 1', p_rationale, p_actor_id=NULL)` — idempotent opt-in Job 1 |

No `reassign_service_job` split.

## Supervisor resolutions

1. **Active-visit decline:** DENY while visit `in_progress`. Ending/aborting visits is B3. Scheduled visits do not block decline/reassign by themselves.
2. **Assignment concurrency:** Same-tech retry = idempotent no-op (no duplicate history). Competing different-tech assigns serialize on job `FOR UPDATE`; last writer wins with truthful reassign history (K5/K6).
3. **Technician agency:** B2 = own-job **decline only**. Visit execution = B3.
4. **Opt-in workflow entry:** UI is two RPCs (ticket assign, then `ensure_default_service_job`). Partial after A is recoverable; B is DB-atomic and retry-safe (see `B2_OPTIN_TRANSACTION_BOUNDARY.md`).
5. **UI:** Opt-in checkbox path accepted at freeze (U1–U6). **Full** additional-job / decline UI is completed in a separate correction commit after harness reconciliation — not part of `8f2acc4e`.

## Spark interpretation deltas (resolved by harness/policy, not freeze code change)

| Point | Resolution |
|-------|------------|
| Author cols | Map to `service_job_assignment_history.actor_id` / `created_at` — not a freeze defect |
| Reassign vs scheduled visit | Allowed; only `in_progress` blocks |
| Tech job SELECT | B1 `can_read_ticket_workflow` boundaries hold post-B2 (S13 final PASS) |
| Column name | `assigned_technician_id` |

## Verdict reconciliation

See `B2_VERDICT_RECONCILIATION_8f2acc4e.md`. Early BLOCKED run preserved separately from final ACCEPTED.
