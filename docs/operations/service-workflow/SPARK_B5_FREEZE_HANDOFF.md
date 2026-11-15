# Spark — B5 freeze handoff (no staging apply)

**Freeze tip:** `f8fb9358e976050089cd199579a99bc0a098e0c2`  
**Depends on:** B4 accepted `f63c91454df69a0146404200d10c4058465b38fc`  
**Gates:** #155 frozen · #156 draft · **no staging apply** · no merge · no production · no B6

## Ask

Independent review of B5 manager review/issue only. Do **not** apply the B5 migration to staging. Disposable/local verification is sufficient for this freeze.

## Scope checklist

1. Admin/support reviews exact submitted revision; authors cannot self-review (including after role change).
2. Return requires comments; resubmission appends a new immutable revision.
3. Approve/issue atomic with review row, issuance visibility, audit; eligible jobs may complete in-transaction.
4. Customers see only issued revisions; unissued corrections must not replace last issued.
5. Getter + table SELECT aligned for workflow-readable non-staff (not hard-coded `role = customer`).
6. Job completion needs approved completing revision, no outstanding visits, verification ≠ `further_work_required`.
7. Approval ≠ return-to-service; verification outcomes preserved.
8. Concurrent/repeat reviews → one deciding review (unique `revision_id`; idempotent same actor/decision).
9. Manager review UI + customer issued-report view with authorized evidence downloads.
10. Acknowledgment / ticket closure remain B6.

## Artifacts

| Kind | Path |
|------|------|
| Contract | `docs/operations/service-workflow/B5_MANAGER_REVIEW_CONTRACT.md` |
| Migration | `supabase/migrations/20261115120000_service_workflow_b5_manager_review.sql` |
| Disposable | `scripts/service-workflow/disposable_b5_battery.sql` + `run_disposable_b5.py` |
| UI | `ServiceReportReviewPanel`, `CustomerIssuedReportView` (wired in `ServiceVisitPanel`) |
| API | `reviewServiceReportRevision`, `createReportEvidenceSignedUrl` |
| Vitest | `ServiceReportReviewPanel.b5.test.tsx` |

## Local proof (access-holder)

- Disposable B5 battery: see `.artifacts/slice0/service-workflow/disposable_b5_results.json`
- Vitest: `ServiceReportReviewPanel.b5.test.tsx` + `ServiceReportPanel.b4.test.tsx`

## Explicit non-actions

No staging apply · no preview redeploy for B5 · no production · no merge · no B6.
