# B3 visit execution — freeze handoff

**Status:** Spark **CONDITIONAL PASS** — corrections frozen for re-review  
**Freeze commit:** `9882a256edb376de9ea726a510c96e40af69f845`  
**Correction commit:** `a8503d1416b62db97e5c28b4da45f350a65e5a01`  
**Safety-path final:** `742d1a98fccc34c5a28277cb2f8ea34587ae2b2e` / [`B3_SAFETY_PATH_FINAL.md`](./B3_SAFETY_PATH_FINAL.md) (`20261112194500_…`)  
**Corrections:** [`B3_CONDITIONAL_PASS_CORRECTIONS.md`](./B3_CONDITIONAL_PASS_CORRECTIONS.md) (`20261112190000_…`)  
**Branch:** `feat/service-workflow-b1-planning`  
**Depends on:** B1/B2 accepted at `49c78969` — see [`B1_B2_STAGING_ACCEPTANCE_CLOSEOUT.md`](./B1_B2_STAGING_ACCEPTANCE_CLOSEOUT.md)  
**Contract:** [`B3_VISIT_CONTRACT.md`](./B3_VISIT_CONTRACT.md)  
**Issues:** #155 frozen · #156 draft  
**Gates:** **No staging `apply_migration` · no merge · no production** until Spark B3 review PASS

## Deliverables

| Artifact | Path |
|----------|------|
| Migration (not applied) | `…180000` + `…190000` corrections + `…194500` safety-path final |
| Contract | `docs/operations/service-workflow/B3_VISIT_CONTRACT.md` |
| Disposable battery | `scripts/service-workflow/disposable_b3_battery.sql` |
| UI | `src/components/support/ServiceVisitPanel.tsx` (+ assignment panel / technician dashboard wiring) |
| API wrappers | `src/lib/ticketGovernanceApi.ts` (schedule/start/complete/abort/no-access) |
| Vitest | `ServiceVisitPanel.b3.test.tsx`, `ticketGovernanceApi.b3.test.ts` |

## Spark review focus

1. Schedule/reschedule append-only history; invalid windows rejected.
2. Start authority = current job assignee; reassignment repoints `scheduled` attending only; blocks when `in_progress`.
3. One active visit per job (RPC only); complete/abort/no-access do **not** complete the job.
4. **F-B3-01** auth before idempotent terminal return; **D-B3-01** first-start ticket `assigned→in_progress`; **D-B3-02** minimum safety gate.
5. B1 facades remain compatible; disposable B3 + B1/B2 regressions PASS locally.

## Explicitly out of scope

B4 report submit, manager review, job completion, ticket closure, routine editor/scheduler, staging apply, immutable Vercel rebinding for B2.
