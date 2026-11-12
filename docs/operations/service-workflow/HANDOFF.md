# Handoff — Ticket → Job → Visit → Report

**From:** Wonder → Cursor → Spark  
**Date:** 2026-11-12

## Prior milestone (closed)

Machine-registration → linked-ticket on staging at `ca9f5067` (Spark browser PASS). Production untouched.

## B1 — CLOSED (accepted locally)

Freeze `7a830739` — Spark 49 PASS / 0 FAIL / 0 required SKIP / 5 DEFER + K1–K4.

## B2 — staging acceptance BLOCKED (security)

Browser testing **paused**. Corrective **not applied** until Spark ACK.

| Layer | Result |
|-------|--------|
| **Deploy SHA (app)** | `849d6d7806100ae718f063b576d9786a53a6f6be` |
| **Database (disposable B1/B2)** | ACCEPTED retained @ `8f2acc4e` |
| **Staging migrations applied** | `20261111222941` B1 → `20261111223057` B2 only |
| **Containment** | ACTIVE since `2026-11-12T12:55:00+02:00` |
| **Corrective** | `20261112150000_service_workflow_security_remediation.sql` — includes Spark amendment (report/revision/review/ack service_role DML revoke) |
| **Security battery** | SEC1–SEC8: before fail-open incl. forged-review → completion; after 8/0 PASS |

**Canonical security handoff:**  
`docs/operations/service-workflow/SPARK_SECURITY_REMEDIATION_REVIEW.md`

### Clarified findings

1. **Activation:** Ordinary authenticated clear already denied; privileged SQL ≠ client exploit.  
2. **Direct job INSERT:** Ordinary authenticated admin/support already blocked; service_role was the bypass.  
3. **Forged review → completion (Spark blocking amendment):** service_role direct writes on report/revision/review unlocked `completed` without governed report RPCs. Corrective revokes that DML; SEC8 is the durable regression.

### Spark → Cursor sequence

1. Spark confirms containment + **reruns** disposable correction/legitimate-flow tests on amended SHA.  
2. Spark ACK → Cursor applies corrective on staging only, verifies defs/grants (incl. four report tables), issues fixtures.  
3. Spark live checks → then browser may resume.

**#155** frozen `ca9f5067`. **#156** draft. No production apply, merge, or B3.
