# Handoff — Ticket → Job → Visit → Report

**From:** Wonder → Cursor → Spark  
**Date:** 2026-11-12

## Prior milestone (closed)

Machine-registration → linked-ticket on staging at `ca9f5067` (Spark browser PASS). Production untouched.

## B1 — CLOSED (accepted locally)

Freeze `7a830739` — Spark 49 PASS / 0 FAIL / 0 required SKIP / 5 DEFER + K1–K4.

## B2 — staging acceptance BLOCKED (security; corrective applied)

Browser testing **paused** until Spark live verification. Staging corrective **applied** under Spark FULL ACK (`d4cfc8ce`).

| Layer | Result |
|-------|--------|
| **Deploy SHA (app)** | `849d6d7806100ae718f063b576d9786a53a6f6be` |
| **Database (disposable B1/B2)** | ACCEPTED retained @ `8f2acc4e` |
| **Staging migrations applied** | B1 → B2 → corrective (`20261112141845` / `20261112142222` / `20261112142617`) |
| **Containment** | Cleared (secured bodies live) |
| **Corrective** | `20261112150000_service_workflow_security_remediation.sql` @ `d4cfc8ce` |
| **Cursor disposable pre-run** | SEC 8/0 PASS (Cursor evidence only) |
| **Spark independent (cited)** | SEC 8/8 + probes 15/15 PASS — Spark’s report; not Cursor pre-recording |
| **Fresh sessions** | Agent store `sessions_b2_security_20261112/` |

**Canonical security handoff:**  
`docs/operations/service-workflow/SPARK_SECURITY_REMEDIATION_REVIEW.md`  
**Apply record:**  
`docs/operations/service-workflow/STAGING_SECURITY_REMEDIATION_APPLY_RECORD.md`

### Clarified findings

1. **Activation:** Ordinary authenticated clear already denied; privileged SQL ≠ client exploit.  
2. **Direct job INSERT:** Ordinary authenticated admin/support already blocked; service_role was the bypass.  
3. **Forged review → completion (Spark blocking amendment):** service_role direct writes on report/revision/review unlocked `completed` without governed report RPCs. Corrective revokes that DML; SEC8 is the durable regression.

### Spark live sequence (now)

1. Confirm apply record (defs/grants incl. report family).  
2. Live actor / activation / INSERT / forgery / legit checks with fresh sessions.  
3. Browser resumes only after step 2 is green.

**#155** frozen `ca9f5067`. **#156** draft. No production apply, merge, or B3.
