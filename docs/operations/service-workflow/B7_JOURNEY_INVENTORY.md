# B7 journey inventory (verification kickoff)

**Authorized by:** `B7_PERMISSION_AUDIT_HARDENING_AUTHORIZATION.md`  
**After:** B6 closeout `da2132b6` · Spark `ecc9e7c0` · type-fix `2d6b35ae`  
**Status:** Inventory only — defects fixed in follow-on small commits when demonstrated.

## Journey map

| Stage | Primary RPCs | Tables | Frontend | Protections |
|-------|--------------|--------|----------|-------------|
| Machine | `register_machine_identity`, `link_ticket_machine` | machines / `service_tickets.machine_id` | `/machines/:id` → create ticket | identity migrations |
| Ticket | `govern_ticket_{transition,assign,set_priority,set_escalated,bulk_*}`; create = INSERT + link | `service_tickets`, governance audit | `/support/tickets/*` | `enforce_governed_ticket_columns`; activation immutable once set |
| Jobs | `create_service_job`, `ensure_default_service_job`, `assign_service_job`, `decline_service_job` (+ granted `waive_service_job`, `govern_job_transition`) | `service_jobs`, assignment history, workflow audit | `ServiceJobAssignmentPanel`, `/technician` | `trg_service_job_protected` |
| Visits | schedule/reschedule/start/complete/abort/no_access/safety (+ skeleton `create_service_job_visit`, `govern_visit_transition`) | visits, schedule history, safety checks | `ServiceVisitPanel` | visit protected; safety/schedule client UPDATE denied |
| Report | `submit_service_report_revision`; evidence via `ticket-attachments` | reports, revisions, storage | `ServiceReportPanel` | revision immutable |
| Review/issue | `review_service_report_revision` | reviews / revisions / jobs | `ServiceReportReviewPanel` | review immutable |
| Acknowledgment | `record_service_acknowledgment`, `_unavailable`, `record_acknowledgment_disposition` | acks, dispositions | customer + `TicketWorkflowClosurePanel` | ack/disposition immutable |
| Closure | `evaluate_ticket_workflow_prerequisites` → `govern_ticket_transition` | tickets + audits | `TicketWorkflowClosurePanel` | prereq when activated; **legacy jobless when `workflow_activated_at` NULL** |

FE surface: `src/lib/ticketGovernanceApi.ts`.

## Permission / matrix docs

- `B6_PERMISSION_MATRIX.md` (frozen ack/closure)
- `B6_ACKNOWLEDGMENT_CLOSURE_CONTRACT.md`, `docs/service-workflow-spec.md`
- Full cross-role matrix completion is a B7 deliverable (B1_TEST_DESIGN deferred note)

## Bypass candidates (verify next — do not treat as defects until proven)

1. `service_tickets_update_scoped` + `enforce_governed_ticket_columns` — client UPDATE path vs RPC-only
2. `govern_ticket_bulk_*` — must still hit B6 prereq assert
3. Legacy jobless resolve/close when workflow not activated
4. Python `update_ticket_fields` / `unified_ticket_service` direct UPDATEs (`python_backend/apis/v2/repositories/tickets.py`, `python_backend/services/unified_ticket_service.py`)
5. Skeleton RPCs still EXECUTE-granted: `create_service_job_visit`, `govern_visit_transition`, `govern_job_transition`, `waive_service_job`
6. Ticket create = direct INSERT (documented pattern)

## Storage

Bucket `ticket-attachments`; helpers `uploadReportEvidence` / `createReportEvidenceSignedUrl` in `ticketGovernanceApi.ts`; policies `admin_private.can_{insert,read}_ticket_attachment`.

## Orphan (from B6 — out of delete scope)

`e2000000-0000-4000-8000-000000000002` under `ticket-attachments` — tracked, not deleted.
