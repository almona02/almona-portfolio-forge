# Bounded implementation proposal — Ticket → Job → Visit → Report

**Status:** Planning only. **No implementation authorization.**  
**Spec:** [`docs/service-workflow-spec.md`](../../service-workflow-spec.md) v1.0 (Wonder — complete)  
**Builds on:** Slice 0 ticket governance + machine-identity PR1 tip `ca9f5067`  
**Hard dependency:** [PR #155](https://github.com/almona02/almona-portfolio-forge/pull/155) (`feat/service-slice0-security` @ `ca9f5067`) must remain the base; this slice does **not** merge ahead of #155 and does **not** authorize production cutover.  
**Author:** Cursor (proposal for supervisor review)  
**Branch for planning / test design:** `feat/service-workflow-b1-planning` (forked from `ca9f5067`; keeps #155 frozen)

## Spec summary (Wonder completed)

Canonical flow:

`Ticket → Service Job → Visit → Service Report (revisions) → Manager Review/Issue → Customer Acknowledgment → Ticket Closure`

Normative constraints preserved in any first slice:

- Ticket FSM unchanged (`open → assigned → in_progress → … → resolved → closed`).
- Multi-job per ticket (UI defaults Job 1 on first assign); multi-visit per job.
- Immutable report revisions; manager approve/return; customer ack `accepted` / `refused` / `unavailable`.
- Closure gated across **all required** jobs with **named** prerequisite failures.
- Roles: only current set; no squads / parts / billing / diagnostics in this slice.
- Backlog B1→B7 is dependency-ordered; B1 is highest risk.

Acceptance scenarios S1–S12 and backlog B1–B7 in the spec are the review contract. Wonder handoff: [`HANDOFF.md`](./HANDOFF.md).

## Proposed next slice (bounded): **B1 only — data contract + state guards**

### In scope

1. **Schema** for: `service_jobs`, `service_visits`, `service_reports` (or visit-bound report root), `service_report_revisions`, `service_report_reviews`, `service_report_acknowledgments`, plus append-only audit rows (reuse Slice 0 audit patterns where possible).
2. **State machines** per Section 5 with **SECURITY DEFINER** transition RPCs (governed pattern from Slice 0) — no direct client UPDATEs of state columns.
3. **Disposable-database battery** proving:
   - legal/illegal transitions
   - multiple jobs per ticket
   - revision immutability (edit-after-submit denied)
   - adding a required job to a `resolved` ticket returns ticket to `in_progress` via governed FSM
   - mixed required / optional / waived jobs do not corrupt closure predicate helpers (helpers may stub acknowledgment until B6)

### Explicitly out of this first PR

- B2 assignment UX / Job-1 auto-create UI
- B3 visit scheduling UI
- B4–B5 report authoring / manager review UI
- B6 acknowledgment + live closure gate UI
- B7 full visibility matrix hardening beyond RLS stubs needed for B1
- Production / staging apply (disposable-only until authorized)
- Squads, parts SKUs, e-sign, offline capture

### Non-goals / risks to call out in review

| Risk | Mitigation |
|------|------------|
| Job state drift vs ticket FSM | Single source of transition RPCs; battery includes cross-entity illegal paths |
| Premature UI | No portal surfaces in B1 beyond what tests need |
| Staging/prod schema drift | Disposable first; filename↔version map discipline from machine-identity / Slice 0 rollout |
| Over-building parallel visits | Enforce one-active-visit in service logic only; no unique DB constraint |
| Landing before #155 | Base branch `ca9f5067`; PR body states `Depends on #155`; no merge to `main` until #155’s coordinated prod plan completes or supervisor redirects |

### Deliverables for B1 review package (after implementation approval)

- Migration file(s) under `supabase/migrations/` (version-format compliant)
- Governed RPC stubs with role checks matching Section 4 matrix for transitions that exist in B1
- `tests/` disposable SQL battery + Vitest/unit for client types if generated
- Short handoff: freeze SHA, disposable results JSON, **no** production claim

### Suggested follow-on order after B1 acceptance

`B2 → B3 → B4 → B5 → B6 → B7` exactly as Section 11; do not start B2 until B1 battery is accepted.

### Effort sketch (planning)

- B1: 1 reviewable PR (schema + RPCs + disposable battery)
- Full S1–S12 happy path across B2–B7: separate PRs, each with its DoD from the spec table

## Decision requested

Approve **B1-only** implementation authorization (disposable verification first), or adjust slice boundary before any code lands. Until then: planning + test design only (see [`B1_TEST_DESIGN.md`](./B1_TEST_DESIGN.md)).
