# B4 report submission — Spark freeze handoff

**Status:** Frozen for independent Spark review  
**Freeze tip:** `e203b4387d56197847694bc60be387815e244d5c`  
**Branch:** `feat/service-workflow-b1-planning`  
**Depends on:** B3 staging-development acceptance at `4e0ddd22`  
**Contract:** [`B4_REPORT_CONTRACT.md`](./B4_REPORT_CONTRACT.md)  
**Findings vs prior tip:** [`B4_FINDINGS_DISPOSITION_6827c775.md`](./B4_FINDINGS_DISPOSITION_6827c775.md) (`6827c775` had OPEN F-B4-03/04, UI retry, compat; this freeze corrects them)  
**Gates:** **No B4 staging apply** until Spark PASS · no merge · no production · #155 frozen · #156 draft

## Deliverables

| Artifact | Path |
|----------|------|
| Migration (not applied) | `supabase/migrations/20261112210000_service_workflow_b4_report_submission.sql` |
| Contract | `docs/operations/service-workflow/B4_REPORT_CONTRACT.md` |
| Disposable battery | `scripts/service-workflow/disposable_b4_battery.sql` |
| UI | `src/components/support/ServiceReportPanel.tsx` (wired from completed visits in `ServiceVisitPanel`) |
| API | `src/lib/ticketGovernanceApi.ts` |
| Vitest | `src/components/support/ServiceReportPanel.b4.test.tsx` |

## Spark review focus

1. One report root / append-only revisions; attending-tech-only submit; historical `submitted_by` after reassignment.
2. Required fields, labour XOR no-labour, evidence private-read + existence, checklist pin contract.
3. Idempotent `client_submission_id`; concurrent same-key does not duplicate.
4. B2 report-family `REVOKE INSERT/UPDATE/DELETE` for `authenticated`/`anon`/`service_role` still hold; no self-issue / job complete / ticket close.
5. Job may enter `awaiting_review` only; B5/B6 untouched.
6. Minimal UI: recoverable upload/submit failures; truthful **submitted** status (no false success).

## Disposable / local verification

Apply B1→B4 migrations on throwaway PG17 (`disposable_b1_base` + prior batteries), then:

`python scripts/service-workflow/run_disposable_b4.py`

Expected (bound to this freeze tip):
- **B4 required:** R4-01..R4-10 + F-B4-04 **PASS**; R5/R6/draft **DEFER**
- **B3 under B4:** 39 PASS / 0 FAIL
- **B1/B2 under B4:** 72 PASS / 0 FAIL / 4 DEFER
- Migration applied **untouched** (F-B4-00). Evidence: `.artifacts/slice0/service-workflow/disposable_b4_results.json` (gitignored)

## Explicit non-actions

No staging apply · no production · no merge · no B5/B6 · no routine editor/scheduler · #155 frozen · #156 draft.
