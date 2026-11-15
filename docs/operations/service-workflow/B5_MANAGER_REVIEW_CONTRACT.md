# B5 — Manager review / issue contract

**Status:** Implementation + disposable/local testing authorized. **No staging apply** until Spark PASS on a separate freeze.  
**Depends on:** B4 accepted tip `f63c9145`  
**Gates:** #155 frozen · #156 draft · no merge · no production · no B6

## In scope

1. Admin/support reviews an exact submitted revision; authors cannot review their own work (including after role change).
2. Return requires comments; resubmission appends a new immutable revision (B4 submit).
3. Approve/issue is atomic with review row, issuance visibility, and audit; eligible jobs may complete in the same transaction.
4. Customers see only their own issued revisions; a newer unissued correction must not replace the last issued version.
5. Getter and table SELECT visibility aligned (workflow-readable non-staff → `revision_is_customer_visible`).
6. Job completion requires approved completing revision, no outstanding visits, and verification ≠ `further_work_required`.
7. Approval is **not** return-to-service; verification outcomes preserved truthfully.
8. Concurrent reviews / repeats yield one coherent deciding review (unique revision_id; idempotent same actor/decision).
9. Manager review UI + customer issued-report view with authorized evidence downloads.
10. Acknowledgment and ticket closure remain **B6**.

## Artifacts

| Kind | Path |
|------|------|
| Migration | `supabase/migrations/20261115120000_service_workflow_b5_manager_review.sql` |
| RPC | `review_service_report_revision` |
| UI | `ServiceReportReviewPanel`, `CustomerIssuedReportView` |
| API | `reviewServiceReportRevision`, `createReportEvidenceSignedUrl` |
| Disposable | `scripts/service-workflow/disposable_b5_battery.sql` + `run_disposable_b5.py` |

## Explicit non-actions

No staging apply · no production · no merge · no B6 · no premature ticket closure.
