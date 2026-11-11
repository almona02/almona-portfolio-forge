# Handoff — Next workflow: Ticket → Job → Visit → Report

**From:** Wonder (specification)
**To:** Cursor (implementation owner), Spark (independent verification)
**Date:** 2026-11-11

## Prior milestone (closed)

Machine-registration → linked-ticket journey is complete on **staging**:

- Spark independently passed the browser journey against commit `ca9f5067`.
- Type check passes (reported at handover).
- The stale alias token incident is classified as an **access-handoff failure, not an application failure**. No application change is requested for it.
- **Retained qualification:** signing-failure behavior is covered by unit tests only; it has **not** been browser-tested. Do not represent it as browser-verified in any later report.

Production remains untouched and unauthorized.

## Next specification (this handover)

**Specification:** `docs/service-workflow-spec.md` (v1.0) — Ticket → Service Job → Visit → Service Report.

Bounded scope, in order:

1. Multiple jobs per ticket; the initial interface creates Job 1 by default. Each job has multiple visits. Ticket closure is gated across **all** required jobs (completed or manager-waived); optional jobs never block.
2. Assignment with current roles only (`admin`/`support` assign; one accountable technician per job). Future squads are explicitly separate and must not be pre-built.
3. "One active visit per job" is an operational (service-enforced) rule, not a database assumption.
4. Technician findings, labour, evidence, verification outcome, and report submission. Findings are observations only — no diagnostic or repair instructions.
5. Manager review/issue with immutable report revisions; customer acknowledgment (accepted / refused / unavailable, per Journey A14–A15).
6. Closure prerequisites named per failure, plus exception handling (no-access, waiver, cancellation, unavailable customer).

Explicitly later: squads, contracts/billing, parts fulfillment, diagnostic content, parallel visits, reopening closed tickets.

Acceptance: 12 testable scenarios (S1–S12) and a dependency-ordered backlog (B1–B7) in the specification. B1 (data contract and state guards) is the highest-risk unit and carries the first tests.

## Gate

This handover delivers the specification for review. It does **not** grant implementation authorization. Implementation starts only on a recorded go-ahead against this specification, staging-first, with no production deploy implied.
