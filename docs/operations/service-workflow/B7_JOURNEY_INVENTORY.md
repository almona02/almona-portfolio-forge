# B7 journey inventory

**Authorized by:** `B7_PERMISSION_AUDIT_HARDENING_AUTHORIZATION.md`  
**After:** B6 closeout `da2132b6` · Spark `ecc9e7c0` · type-fix `2d6b35ae`  
**Status:** Active verification/correction — see F-B7-01…03 commits.

## Journey map

| Stage | Primary RPCs | Tables | Frontend | Protections |
|-------|--------------|--------|----------|-------------|
| Machine | `register_machine_identity`, `link_ticket_machine` | machines / `service_tickets.machine_id` | `/machines/:id` → create ticket | identity migrations |
| Ticket | `govern_ticket_{transition,assign,set_priority,set_escalated,bulk_*}`; create = INSERT + link | `service_tickets`, governance audit | `/support/tickets/*` | `enforce_governed_ticket_columns`; activation immutable once set |
| Jobs | `create_service_job`, `ensure_default_service_job`, `assign_service_job`, `decline_service_job`, **`waive_service_job`**, **`govern_job_transition`** | `service_jobs`, assignment history, workflow audit | `ServiceJobAssignmentPanel`, `/technician` | `trg_service_job_protected` |
| Visits | schedule/reschedule/start/complete/abort/no_access/safety, **`create_service_job_visit`**, **`govern_visit_transition`** | visits, schedule history, safety checks | `ServiceVisitPanel` | visit protected; safety/schedule client UPDATE denied |
| Report | `submit_service_report_revision`; evidence via `ticket-attachments` | reports, revisions, storage | `ServiceReportPanel` | revision immutable |
| Review/issue | `review_service_report_revision` | reviews / revisions / jobs | `ServiceReportReviewPanel` | review immutable |
| Acknowledgment | `record_service_acknowledgment`, `_unavailable`, `record_acknowledgment_disposition` | acks, dispositions | customer + `TicketWorkflowClosurePanel` | ack/disposition immutable |
| Closure | `evaluate_ticket_workflow_prerequisites` → `govern_ticket_transition` | tickets + audits | `TicketWorkflowClosurePanel` | prereq when activated; **legacy jobless when `workflow_activated_at` NULL** |
| Share | `create_ticket_share`, `revoke_ticket_share`, `get_shared_ticket` | `ticket_shares`, access events, governance audit | `ticketMessageApi` | F-B7-03 audited lifecycle |

FE surface: `src/lib/ticketGovernanceApi.ts`, `src/lib/ticketMessageApi.ts`.

## Job / visit RPCs (correction)

`waive_service_job`, `govern_job_transition`, `create_service_job_visit`, and `govern_visit_transition` are **governed implementations** (security remediation / B3 tip bodies), not skeletons. Absence of a FE wrapper is not evidence they are stubs.

## Dead code note

`TicketsRepository.update_ticket_fields` was unused (removed). Dead update helpers are **not** evidence of a live mutation bypass. Live Python direct UPDATEs that remain (`UnifiedTicketService.link_related_ticket`, `add_maintenance_metadata`) are separate from F-B7-01…03 and outside deferred parts/further-work scope.

## Demonstrated corrections in flight

| ID | Finding | Fix surface |
|----|---------|-------------|
| F-B7-01 | Service-key ticket reads treated tech/sales as “all tickets” | Both Python ticket services — scoped list/detail/dependent gates |
| F-B7-02 | Owners received internal notes via Python message paths | Both message list paths — payload + count visibility |
| F-B7-03 | Share create/revoke/access unaudited; direct insert bypass | Migration + FE RPC + edge access event |

## Deferred (explicit)

- Parts-consumption handover → parts fulfillment
- Automatic further-work follow-up linkage — unresolved required work must still block inappropriate completion/closure

## Bypass candidates still under verification

1. `service_tickets_update_scoped` + `enforce_governed_ticket_columns` — client UPDATE path vs RPC-only  
2. `govern_ticket_bulk_*` — must still hit B6 prereq assert  
3. Legacy jobless resolve/close when workflow not activated  
4. Ticket create = direct INSERT (documented pattern)

## Storage

Bucket `ticket-attachments`; helpers `uploadReportEvidence` / `createReportEvidenceSignedUrl`; share attachment edge + `record_ticket_share_attachment_access`.

## Orphan (from B6 — out of delete scope)

`e2000000-0000-4000-8000-000000000002` under `ticket-attachments` — tracked, not deleted.
