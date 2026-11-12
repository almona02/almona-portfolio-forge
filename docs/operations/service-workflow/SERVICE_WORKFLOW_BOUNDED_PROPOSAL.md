# Bounded implementation proposal — Ticket → Job → Visit → Report

**Status:** B1 **accepted**; **B2 authorized** for disposable implementation/testing only.  
**Spec:** [`docs/service-workflow-spec.md`](../../service-workflow-spec.md) v1.0  
**Builds on:** Slice 0 + machine-identity tip `ca9f5067`  
**Hard dependency:** [PR #155](https://github.com/almona02/almona-portfolio-forge/pull/155) @ `ca9f5067` remains frozen; no merge ahead of #155; no production cutover.  
**Branch:** `feat/service-workflow-b1-planning` (draft #156)

## B1 closed

Accepted freeze: `7a8307395b79df677a96f77cd993a77351b5805c`  
Spark: **49 PASS / 0 FAIL / 0 required SKIP / 5 DEFER**, K1–K4 PASS.  
Report: [`B1_IMPLEMENTATION_REPORT.md`](./B1_IMPLEMENTATION_REPORT.md).

## B2 in scope (now)

See [`B2_ASSIGNMENT_CONTRACT.md`](./B2_ASSIGNMENT_CONTRACT.md).

1. Governed job assignment/reassignment (admin/support).  
2. Idempotent Job 1 on first **explicit** workflow assignment; additional jobs independent.  
3. Technician decline of own job (mandatory reason).  
4. Assignment history + atomic audit.  
5. No reassignment while a visit is in progress.  
6. Minimal assignment UI (existing components); no squads / visit / report / closure UI.

### Legacy

- Jobless tickets unchanged; no blanket activation or Job 1 backfill.  
- Activated tickets remain gated by B1; full lifecycle needs B3–B6.

### Explicitly out of B2

B3–B7 behaviors, staging/production apply, merge to main, squads.

## Follow-on order

`B3 → B4 → B5 → B6 → B7` after each prior unit is accepted.
