# B6 — Acknowledgment & closure gate contract

**Status:** Freeze tip `ec00b692af10629ed5ee506bbb35762ea5ea00a8` · disposable/local only · **no staging apply**  
**Depends on:** B5 accepted tip `2a4042ad44d9234739f514720c3d413ea0ca42e8`  
**Gates:** #155 frozen · #156 draft · no merge · no production

## In scope

1. Customer acknowledgment of an exact issued revision: `accepted` or `refused` (refusal requires comment).
2. Append-only responses with derived effective response; repeats idempotent; later responses preserve history.
3. Admin/support `unavailable` only with attributable contact-attempt evidence under `B6_ACKNOWLEDGMENT_CONTACT_POLICY.md` (no hardcoded seven-day SQL rule).
4. Refusal requires audited manager disposition before closure; never convert refusal/unavailable into acceptance.
5. Closure checks every required job, completing issued reports, outstanding visits/reviews, effective acknowledgment/disposition, resolution summary, and permitted ticket state.
6. Optional jobs need not be completed; active attendance and pending reviews must be explicitly settled.
7. Named prerequisite failures via `evaluate_ticket_workflow_prerequisites` (trusted backend).
8. Enforce through every existing close/resolve entry point; retain legacy jobless bypass; activated tickets cannot revert.
9. Acknowledgment, disposition, resolution, closure, and audit concurrency-safe and atomic where they form one operation.
10. Customer acknowledgment UI + manager prerequisite/closure UI.

## Explicit non-actions

No auto-closure · no closed-ticket reopening · no contract scheduling · no routine-editor work · **no B6 staging apply** · no merge · no production.

## Artifacts

| Kind | Path |
|------|------|
| Permission matrix | `B6_PERMISSION_MATRIX.md` |
| Contact policy | `B6_ACKNOWLEDGMENT_CONTACT_POLICY.md` |
| Migration | `supabase/migrations/20261115160000_service_workflow_b6_acknowledgment_closure.sql` |
| Correction | `supabase/migrations/20261115170000_service_workflow_b6_f_b6_03_05_correction.sql` (F-B6-03/04/05 + UI) — see `B6_F_B6_03_05_CORRECTION.md` |
| Disposable | `scripts/service-workflow/disposable_b6_battery.sql` + `run_disposable_b6.py` |
| UI | `CustomerReportAcknowledgmentPanel`, `TicketWorkflowClosurePanel` |
| API | `recordServiceAcknowledgment`, `recordServiceAcknowledgmentUnavailable`, `recordAcknowledgmentDisposition`, `evaluateTicketWorkflowPrerequisites` |
| Vitest | `CustomerReportAcknowledgmentPanel.b6.test.tsx`, `TicketWorkflowClosurePanel.b6.test.tsx` |

## Policy reminders

- Acknowledgment attaches to the issued revision; new corrections do not inherit prior acceptance.
- Late acknowledgment after unavailable/closure appends history without auto-reopening.
- Acknowledgment/closure do not clear safety restrictions or imply return-to-service.
- Sales-role-owner: API ownership path vs UI customer-role-only — see matrix.
