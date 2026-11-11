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

## Supervisor resolutions (override Spark interpretations 2 / 5 where noted)

1. **Active-visit decline:** DENY while visit `in_progress` (freeze does this). Ending/aborting visits is B3. **Spark S8 must expect DENY**, not liberate-with-active-visit.
2. **Assignment concurrency:** Same-tech retry = idempotent no-op (no duplicate history). Competing different-tech assigns serialize on job `FOR UPDATE`; last writer wins with truthful reassign history. Documented policy for Spark K5/K6.
3. **Technician agency:** B2 = own-job **decline only**. No unrestricted `govern_job_transition` for technicians. Visit execution = B3. **Spark S14 → DEFER** (not FAIL against freeze).
4. **Opt-in workflow entry:** UI is two RPCs (ticket assign, then `ensure_default_service_job`). Partial is recoverable: retry `ensure_default` does not create a second Job 1. Ticket-only assign never activates.
5. **UI:** Job 1 checkbox + legacy unchecked + auth failures + repeated submit are in scope for UI acceptance; **additional-job assign/reassign/decline UI is deferred** (API-covered only).

## Spark interpretation deltas vs freeze (gaps if unfixed)

| Point | Spark `b2_contract` | Freeze `8f2acc4e` |
|-------|---------------------|-------------------|
| Assign state | Unchanged (`unassigned`) | First assign may set `planned` |
| Author cols | `assigned_by` / `assigned_at` | Absent (history table + audit only) → S1/S11 SKIP |
| Reassign open visit | Deny scheduled **and** in_progress | Deny **in_progress** only |
| Tech RLS SELECT own jobs | Required (S13) | B1 staff-only SELECT remains |
| `assigned_technician` name | Used in Spark SQL | Column is `assigned_technician_id` |

## Deferred B2 UI (authorized scope not demonstrated in UI)

- Assign/reassign an **additional** job (Job 2+)
- Decline UI for technicians
- Dedicated job-assignment panel / history viewer

The Job 1 checkbox alone does **not** cover those surfaces; disposable SQL covers the RPCs.
