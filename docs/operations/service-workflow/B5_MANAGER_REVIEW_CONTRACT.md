# B5 — Manager review / issue contract

**Status:** Staging apply authorized for correction tip `d2743078` (docs stamp `0896551e`). Spark independent @ `f8fb9358` remains **BLOCKED** on F-B5-01/02; staging journey is the verification.  
**Depends on:** B4 accepted tip `f63c9145` · B5 impl `f8fb9358` · correction `d2743078`  
**Gates:** #155 frozen · #156 draft · staging only · no merge · no production · no B6

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
| Correction | `supabase/migrations/20261115140000_service_workflow_b5_f_b5_01_02_correction.sql` |
| RPC | `review_service_report_revision` (+ issued-evidence Storage read helper) |
| UI | `ServiceReportReviewPanel`, `CustomerIssuedReportView` |
| API | `reviewServiceReportRevision`, `createReportEvidenceSignedUrl` |
| Disposable | `scripts/service-workflow/disposable_b5_battery.sql` + `run_disposable_b5.py` |
| Spark | `spark_b5_battery.sql` + `run_spark_b5.py` · see `B5_F_B5_01_02_CORRECTION.md` |

## Explicit non-actions

No production · no merge · no B6 · no premature ticket closure. Staging apply/verification only — see `B5_STAGING_APPLY_RECORD.md`.
