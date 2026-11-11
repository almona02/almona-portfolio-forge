# B1 implementation report — data contract & state guards

**Status:** Implemented on draft PR #156. **Local/disposable verification only.**  
**Base tip:** `ca9f5067` (#155 frozen). **No staging/production apply. No merge. No B2–B7.**  
**Migration:** `supabase/migrations/20261111210000_service_workflow_b1_data_contract.sql`  
**Frozen commit:** `c6b1e46a` (implementation `5eef3722`) on `feat/service-workflow-b1-planning`

## Naming agreement (Spark)

| Object | Decision |
|--------|----------|
| Existing `public.service_visits` | Contract PM visits — **untouched** |
| New `public.service_job_visits` | Job attendance visits — B1 authority |
| RPCs | `create_service_job_visit` (not `create_service_visit`) |

Contract file: `scripts/service-workflow/b1_contract.md`.

## Corrections incorporated

1. Distinct visit name; relationship documented.  
2. Real RLS + grants + impersonation denial + atomic workflow audit on every B1 RPC.  
3. No submit/review/ack success stubs (`I1`); job `completed` requires approved issued report.  
4. `workflow_activated_at` durable; legacy jobless resolve/close preserved (`X2`); activated tickets gated (`X3`/`X4`).  
5. `resolved→in_progress` validity extended; free govern blocked (`X5`); atomic job create + ticket audit (`X1`); `FOR UPDATE` locks.  
6. Spec contradictions resolved in helpers/docs (optional jobs; open visits block; latest **issued** revision; append-only acks; ordered revision refs; no per-job machine; no 7-day policy).  
7. Immutability via privileged fixtures (`R2`); concurrency `K1`–`K3` PASS.

## Disposable results (summary)

Harness: `python scripts/service-workflow/run_disposable_b1.py`

| Suite | Result |
|-------|--------|
| SQL battery | **37 PASS / 0 FAIL / 5 SKIP** |
| Concurrency | **K1 PASS, K2 PASS, K3 PASS** |

### Deferred SKIP (explicit)

| Check | Reason |
|-------|--------|
| V5 | B3 reschedule RPC |
| R3, R4, M4, M5 | B4/B5 submit/review behavior |
| (B6/B7) | Acknowledgment UX; full visibility regression matrix |

## PR hygiene

- #156 remains **draft**  
- #155 tip remains `ca9f506715567e1f2ea08fdcd4e2bb0d5e3d10da`
