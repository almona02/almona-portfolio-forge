# Handoff — Ticket → Job → Visit → Report

**From:** Wonder (specification) → Cursor (implementation) → Spark (verification)  
**Date:** 2026-11-12

## Prior milestone (closed)

Machine-registration → linked-ticket journey complete on **staging** at `ca9f5067` (Spark browser PASS). Production untouched.

## B1 — CLOSED (accepted)

| Item | Value |
|------|-------|
| Freeze SHA | `7a8307395b79df677a96f77cd993a77351b5805c` |
| Spark result | **49 PASS / 0 FAIL / 0 required SKIP / 5 DEFER**; **K1–K4 PASS** |

## B2 — layered status (Spark)

| Layer | SHA | Result |
|-------|-----|--------|
| **Database** | `8f2acc4e` | **ACCEPTED / retained** — 71/0/0/5 SQL (B1 49 verbatim + S1–S22) + K1–K7; zero SKIP; 5 DEFER = B3–B7 only |
| **Opt-in UI** | `8f2acc4e` | **ACCEPTED** — U1–U6 |
| **Multi-job UI** | `c88468ae` | Panel/dashboard landed; mapper guidance was dead code until hyphen fix |
| **Mapper fix** | `5c8bfebe9a4e4675d973c73d1670770904caa32d` | `mapJobRpcError` matches server `in-progress` text; auth/unknown passthrough |
| **Browser** | — | **NOT TESTED** (no authorized B1/B2 staging apply) |

Reconciliation: [`B2_VERDICT_RECONCILIATION_8f2acc4e.md`](./B2_VERDICT_RECONCILIATION_8f2acc4e.md) · Alignment: [`B2_SPARK_ALIGNMENT.md`](./B2_SPARK_ALIGNMENT.md)

Settled facts: no required SKIPs; history attribution via `actor_id`/`created_at`; B1 read-model (not staff-only); S14 PASS (decline-only); scheduled visits do not block.

**#155** frozen at `ca9f5067`. **#156** draft. No staging/production apply, merge, or B3.

## Spec

`docs/service-workflow-spec.md` v1.0.
