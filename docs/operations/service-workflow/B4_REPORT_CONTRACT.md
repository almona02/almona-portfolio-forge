# B4 report submission contract

**Status:** Implementation freeze for Spark review (not staging-applied)  
**Depends on:** B3 accepted at `4e0ddd22` — [`B3_STAGING_DEVELOPMENT_ACCEPTANCE.md`](./B3_STAGING_DEVELOPMENT_ACCEPTANCE.md)  
**Gates:** No B4 staging apply until Spark PASS · no merge · no production · #155 frozen · #156 draft  
**Out of scope:** B5 manager review/issue · B6 acknowledgment/closure · admin routine editor / contract scheduler

## Domain rules

1. **One report root per visit** (`service_reports.visit_id` UNIQUE).
2. **Append-only submitted revisions** (`service_report_revisions`). No draft rows on the server; clients may keep local recoverable drafts.
3. **Submitter** = current `service_job_visits.attending_technician_id` with role `technician`. Staff cannot substitute. `submitted_by` is historical and survives later reassignment.
4. **Visit must be `completed`** before submit.
5. **Payload (required):** findings, work performed, labour entries **or** explicit `no_labour`, verification outcome (+ reason when not `verified_fixed`), supporting evidence paths (≥1), technician declaration.
6. **Labour:** JSON array of `{hours: number>0, description: non-empty}` XOR `no_labour=true` with `[]`.
7. **Evidence:** private `ticket-attachments` object names, readable by the submitter, under the ticket folder or submitter folder; object must exist.
8. **Idempotency:** `client_submission_id` unique per report; retries return the same revision; concurrent same-key inserts converge.
9. **Immutability:** submitted rows cannot be edited/deleted via ordinary client or `service_role` direct writes (B2 revocations retained). SECURITY DEFINER submit RPC is the write path.
10. **Job effect:** may move `in_progress → awaiting_review`. Must **not** create reviews/issues, complete the job, or close/resolve the ticket.
11. **Atomic audit:** submit (+ optional job transition) write `service_workflow_audit` in the same transaction.

## Configurable routines (integration only)

Visit columns (from B3, unused until pinned):

| Column | Meaning |
|--------|---------|
| `pinned_routine_version_id` | Opaque UUID of a published routine **version** (not a live-editable draft). |
| `checklist_results` | Structured results snapshot for that pin. |

When `pinned_routine_version_id` is set, submit requires `checklist_results` JSON object:

```json
{
  "routine_version_id": "<same uuid as pin>",
  "items": [ { "id": "<item_id>", "result": "<opaque>" } ]
}
```

Rules:

- Do **not** hardcode machine-model checks or invent tolerances in B4.
- Do **not** implement the admin routine editor or contract scheduler in B4.
- Item schemas, pass/fail semantics, and numeric tolerances live with the routine version publisher (future). B4 only enforces pin presence, version id match, and `items` array shape.
- When no pin is set, `checklist_results` must be NULL.

## RPCs

| RPC | Role |
|-----|------|
| `submit_service_report_revision(...)` | Attending technician |
| `get_service_report_for_visit(visit_id)` | Workflow-readable actors |

## Migration / tests / UI

| Artifact | Path |
|----------|------|
| Migration | `supabase/migrations/20261112210000_service_workflow_b4_report_submission.sql` |
| Disposable battery | `scripts/service-workflow/disposable_b4_battery.sql` |
| UI | `src/components/support/ServiceReportPanel.tsx` |
| API | `src/lib/ticketGovernanceApi.ts` (`submitServiceReportRevision`, upload helper) |
| Vitest | `src/components/support/ServiceReportPanel.b4.test.tsx` |
| Handoff | [`B4_REPORT_SUBMISSION_HANDOFF.md`](./B4_REPORT_SUBMISSION_HANDOFF.md) |
