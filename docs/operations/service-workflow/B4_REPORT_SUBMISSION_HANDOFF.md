# B4 report submission — Spark freeze handoff

**Status:** Frozen for independent Spark review (F-B4-05 correction)  
**Freeze tip:** `6a64a01e` (implementation; docs stamp may trail)  
**Branch:** `feat/service-workflow-b1-planning`  
**Depends on:** B3 staging-development acceptance at `4e0ddd22`  
**Contract:** [`B4_REPORT_CONTRACT.md`](./B4_REPORT_CONTRACT.md)  
**Prior tip:** `e203b4387d56197847694bc60be387815e244d5c` — **BLOCKED on F-B4-05** (soft table labour CHECK). Privacy / auth-order / UI recovery / delegation evidence from that review is retained but does not cover labour XOR. See [`B4_FINDINGS_DISPOSITION_e203b438.md`](./B4_FINDINGS_DISPOSITION_e203b438.md).  
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

## Spark review focus (narrow — F-B4-05)

1. Table CHECK enforces full labour XOR: `no_labour=true` ⇒ `[]`; `no_labour=false` ⇒ nonempty labour.
2. RPC validation preserved; invalid table inserts rejected at the boundary.
3. Migration preflight: clean success for compatible rows; incompatible empty-labour / bad shape stops with actionable counts — **no** invented `no_labour`.
4. B1 fixtures supply explicit labour/no_labour (production rules not weakened).
5. Retain accepted evidence for F-B4-03/04, UI retry, service-role delegation, R4-05, audit — no full audit restart.

## Disposable / local verification

`python scripts/service-workflow/run_disposable_b4.py`

Expected (bound to this freeze tip):
- **B4 required:** R4-01..R4-10 + F-B4-04 + **F-B4-05** **PASS**; R5/R6/draft **DEFER**
- **B3 under B4:** 39 PASS / 0 FAIL
- **B1/B2 under B4:** 72 PASS / 0 FAIL / 4 DEFER
- Migration applied **untouched** (F-B4-00).

## Explicit non-actions

No staging apply · no production · no merge · no B5/B6 · no routine editor/scheduler · #155 frozen · #156 draft.
