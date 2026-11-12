# B3 visit execution — freeze handoff

**Status:** Implementation frozen for Spark review  
**Freeze commit:** `9882a256edb376de9ea726a510c96e40af69f845`  
**Branch:** `feat/service-workflow-b1-planning`  
**Depends on:** B1/B2 accepted at `49c78969` — see [`B1_B2_STAGING_ACCEPTANCE_CLOSEOUT.md`](./B1_B2_STAGING_ACCEPTANCE_CLOSEOUT.md)  
**Contract:** [`B3_VISIT_CONTRACT.md`](./B3_VISIT_CONTRACT.md)  
**Issues:** #155 frozen · #156 draft  
**Gates:** **No staging `apply_migration` · no merge · no production** until Spark B3 review PASS

## Deliverables

| Artifact | Path |
|----------|------|
| Migration (not applied) | `supabase/migrations/20261112180000_service_workflow_b3_visit_execution.sql` |
| Contract | `docs/operations/service-workflow/B3_VISIT_CONTRACT.md` |
| Disposable battery | `scripts/service-workflow/disposable_b3_battery.sql` |
| UI | `src/components/support/ServiceVisitPanel.tsx` (+ assignment panel / technician dashboard wiring) |
| API wrappers | `src/lib/ticketGovernanceApi.ts` (schedule/start/complete/abort/no-access) |
| Vitest | `ServiceVisitPanel.b3.test.tsx`, `ticketGovernanceApi.b3.test.ts` |

## Spark review focus

1. Schedule/reschedule append-only history; invalid windows rejected.
2. Start authority = current job assignee; reassignment repoints `scheduled` attending only; blocks when `in_progress`.
3. One active visit per job (RPC only); complete/abort/no-access do **not** complete the job.
4. B1 facades (`create_service_job_visit`, `govern_visit_transition`) remain compatible.
5. Disposable B3 battery + B1/B2 batteries still PASS locally; UI reason gates + error mapping.

## Explicitly out of scope

B4 report submit, manager review, job completion, ticket closure, routine editor/scheduler, staging apply, immutable Vercel rebinding for B2.
