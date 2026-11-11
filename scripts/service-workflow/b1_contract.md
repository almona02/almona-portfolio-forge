# B1 acceptance battery — contract and inventory (Spark-aligned, Cursor implemented)

Spec: `docs/service-workflow-spec.md` §2/§5/§7–§8 + §11 unit B1 + supervisor corrections.
Status: **B1 implementation on `feat/service-workflow-b1-planning` (#156).** Local/disposable only.

## Agreed B1 contract (ALIGNMENT BLOCK)

### Entity naming — existing `service_visits` inspected

| Name | Authority | Role |
|------|-----------|------|
| `public.service_visits` | **Existing** (`20261018183000_service_contracts.sql`) | Contract preventive-maintenance schedule rows (`contract_id`, `scheduled_at` date, status `scheduled\|completed\|cancelled`). **Untouched by B1.** |
| `public.service_job_visits` | **New (B1)** | Field **attendance** under a `service_jobs` row. Explicitly distinct so contract visits are not overwritten or dual-authoritied. |

Spark battery gates use `service_job_visits` + `create_service_job_visit` (not `service_visits` / `create_service_visit`).

### Tables

`service_jobs`, `service_job_visits`, `service_reports`, `service_report_revisions`,
`service_report_reviews`, `service_acknowledgments` (append-only events),
`service_workflow_audit`.

Ticket columns: `workflow_activated_at` / `workflow_activated_by` — set once on first job create; **never cleared** by cancel/waive (prevents silent bypass restore).

No per-job machine override in B1 (inherits ticket machine context).

### RPCs (SECURITY DEFINER)

| RPC | B1 behavior |
|-----|-------------|
| `create_service_job(ticket, title, required, rationale)` | Staff-only; activates workflow; required job on `resolved` atomically → `in_progress` + ticket audit |
| `govern_job_transition(job, to, rationale, actor)` | Staff-only; **`completed` requires approved issued report** (ordered by visit_sequence + revision_number) |
| `waive_service_job(job, reason, actor)` | Manager+reason; also converts `cancelled → waived` |
| `create_service_job_visit(job, rationale, actor)` | Staff-only attendance visit |
| `govern_visit_transition(visit, to, rationale, actor)` | Abort/no_access reason mandatory; start denied if job `unassigned` |
| `evaluate_ticket_workflow_prerequisites(ticket)` | Named codes; **never** stubs acknowledgment as satisfied |

**Absent in B1 (not stubbed success):** `submit_service_report`, `review_service_report`, `record_acknowledgment`, `reschedule_service_visit`.

### States

Job: `unassigned\|planned\|in_progress\|awaiting_review\|completed\|cancelled\|waived`  
Visit: `scheduled\|in_progress\|completed\|aborted\|no_access`  
Review decision: `approved_issued\|returned`  
Verification: `verified_fixed\|not_reproduced\|further_work_required\|not_verified`

### FSM note (tickets)

Slice 0 FSM lacked `resolved → in_progress`. B1 documents a **narrow governed extension**: that edge is legal in `is_valid_ticket_status_transition` but **only performed inside `create_service_job`** when adding a required job (not via free `govern_ticket_transition`). Closed reopen remains prohibited.

### Closure / legacy

- Jobless tickets (`workflow_activated_at IS NULL`): resolve/close unchanged (X2).
- Activated tickets: resolve/close must pass prerequisites (required jobs completed/waived; no open visits/pending reviews; issued revisions → `acknowledgment_not_implemented` until B6 — never treated as OK).
- Optional jobs do not block by incompleteness; their **open visits / pending reviews still block**.

### Error shape

Authz `42501`; illegal transitions `check_violation` (23514); missing mandatory reason `22023`.

## Check inventory

- `C1–C10` legacy ticket governance — must PASS (C7 includes documented `resolved>in_progress` validity bit).
- `J*`, `V*`, `M*`, `X*`, `A*`, `I*` (immutability fixtures), `K*` concurrency.
- Deferred SKIP: `V5` reschedule (B3), `R3/R4/M4/M5` submit/review behavior (B4/B5), acknowledgment UX (B6), full visibility matrix (B7).

## How to run

`python scripts/service-workflow/run_disposable_b1.py` — disposable PG17, real Slice 0 + ticket_number section + B1 migration, SQL battery + concurrency, writes `.artifacts/slice0/service-workflow/disposable_b1_results.json`.
