# Handoff — Ticket → Job → Visit → Report

**From:** Wonder (specification) → Cursor (implementation) → Spark (verification)  
**Date:** 2026-11-11

## Prior milestone (closed)

Machine-registration → linked-ticket journey complete on **staging** at `ca9f5067` (Spark browser PASS). Production untouched. Signing-failure remains unit-only (not browser-verified).

## B1 — CLOSED (accepted)

| Item | Value |
|------|-------|
| Freeze SHA | `7a8307395b79df677a96f77cd993a77351b5805c` |
| Spark result | **49 PASS / 0 FAIL / 0 required SKIP / 5 DEFER**; **K1–K4 PASS** |
| Verdict | `.artifacts/slice0/service-workflow/SPARK_B1_VERDICT_7a830739.md` |
| BLOCKED archive | `SPARK_B1_VERDICT_c6b1e46a.md` (retained; do not overwrite) |
| Migration | `20261111210000_service_workflow_b1_data_contract.sql` |

Full Spark battery retained (including **W2–W4**, **X5/X6**, positive **J1** completion). Cursor’s narrower harness is supporting only. Do not cite placeholder SHAs (`2bb20cb1`) as the freeze.

## B2 — AUTHORIZED (disposable only)

Contract: [`B2_ASSIGNMENT_CONTRACT.md`](./B2_ASSIGNMENT_CONTRACT.md).

In scope: governed job assign/reassign; idempotent Job 1 on explicit workflow entry; tech decline with reason; assignment history + atomic audit; no reassign during in-progress visit; minimal assignment UI.

Out of scope: squads, visit execution, reports, closure UI, staging/production apply, merge.

**#155** remains frozen at `ca9f5067`. **#156** stays draft.

## Spec

`docs/service-workflow-spec.md` v1.0. Backlog B3–B7 not authorized by this handoff.
