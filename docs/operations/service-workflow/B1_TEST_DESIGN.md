# B1 test design — data contract & state guards

**Status:** Test design only. **No implementation authorization.**  
**Depends on:** [PR #155](https://github.com/almona02/almona-portfolio-forge/pull/155) / tip `ca9f5067` (Slice 0 governed ticket FSM + machine identity).  
**Spec:** [`docs/service-workflow-spec.md`](../../service-workflow-spec.md) Sections 5, 7, 10–11.  
**Proposal:** [`SERVICE_WORKFLOW_BOUNDED_PROPOSAL.md`](./SERVICE_WORKFLOW_BOUNDED_PROPOSAL.md)

## Environment

| Layer | B1 expectation |
|-------|----------------|
| Disposable Postgres | Required — primary acceptance battery |
| Staging Supabase | Not applied until separate authorization after B1 code review |
| Production | Forbidden |

Base schema for the disposable battery **includes** Slice 0 + machine-identity migrations as applied on tip `ca9f5067` (or equivalent replay), so job/visit RPCs compose with `govern_ticket_*` rather than inventing a parallel ticket FSM.

## Battery structure (disposable SQL)

Implemented harness (Spark-aligned):

- `scripts/service-workflow/disposable_b1_base.sql` + `disposable_b1_battery.sql` + `run_disposable_b1.py`
- Applies real Slice 0 boundary + ticket_number section + `20261111210000_service_workflow_b1_data_contract.sql`
- Visit table under test: **`service_job_visits`** (contract `service_visits` coexist stub in base)

### Transition matrix (must assert)

| Entity | Legal examples | Illegal examples (must deny, no partial write) |
|--------|----------------|------------------------------------------------|
| Job | `unassigned→planned→in_progress→awaiting_review→completed`; `→cancelled` with reason; manager `→waived` with reason | Skip to `completed` without issued report; technician self-waive; edit terminal job in place |
| Visit | `scheduled→in_progress→completed`; `→aborted`/`→no_access` with reason | Reschedule a terminal visit; complete without report when policy requires one |
| Report revision | Submit R1; on return submit R2; prior revision bytes unchanged | UPDATE findings on submitted revision; author self-`approved_issued` |
| Review | Manager `approved_issued` / `returned` on exact revision | Customer review; author review |
| Ticket FSM interaction | Required job added on `resolved` → governed return to `in_progress` | Silent reopen of `closed`; closure helper true with required job `in_progress` |

### Cardinality / immutability

- Multi-job per ticket (S1 data half): Job 1 + Job 2 coexist; no UNIQUE(ticket_id) on jobs.  
- Multi-visit per job (S5 data half): Visit 1 `no_access` + Visit 2 completed both retained.  
- Revision immutability (S4 data half): R1 digest unchanged after R2 insert.  
- One-active-visit: enforced in RPC/service tests as **logic** assertion; prove absence of a DB UNIQUE that would block later parallel visits.

### Closure predicate helpers (stub-friendly)

Even without full B6 UI, B1 SHOULD expose SQL/RPC helpers that name failures:

- required job unsatisfied  
- active/scheduled visit open  
- revision awaiting review  
- (optional stub) acknowledgment unsettled  

Map to S3 / S11 data halves.

### Permissions smoke (subset of S9)

Deny: non-assignee submit; customer SELECT draft revision; technician `approved_issued`; author self-review. Full matrix remains B7.

## Out of scope for B1 tests

Browser journeys, Vercel preview, Railway deploy, production apply, S2 full happy-path UI, live acknowledgment flows.

## Pass criteria for later implementation PR

Disposable battery exit 0; each illegal case returns a stable error code/message; no submitted revision row mutates; ticket `closed` never appears without helper-satisfied required jobs (or explicit cancel path tested separately).
