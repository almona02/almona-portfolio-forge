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
| **Database (disposable B1/B2)** | ACCEPTED retained @ `8f2acc4e` — 71/0/0/5 + K1–K7 |
| **Staging migrations applied** | `20261111222941` B1 → `20261111223057` B2 only |
| **Containment** | ACTIVE since `2026-11-12T12:55:00+02:00` — stubs + anon EXECUTE revoked |
| **Corrective** | `20261112150000_service_workflow_security_remediation.sql` — review only |
| **Security battery** | before FAIL SEC1/SEC4/SEC5/SEC7 → after 7/7 PASS (disposable) |

**Canonical security handoff (Spark starts here):**  
`docs/operations/service-workflow/SPARK_SECURITY_REMEDIATION_REVIEW.md`

**Also:**  
- Migration: `supabase/migrations/20261112150000_service_workflow_security_remediation.sql`  
- Tests: `scripts/service-workflow/disposable_security_battery.sql`  
- Runner: `scripts/service-workflow/run_disposable_security.py`

### Clarified findings (do not conflate)

1. **Activation:** Ordinary authenticated owner/assignee clear was already denied (`7a830739`). Remaining clear was **trusted DB-owner / SECURITY DEFINER SQL**, not an ordinary API client path. Corrective still makes activation immutable once set.
2. **Direct INSERT:** Ordinary authenticated admin/support **already lacked** table INSERT. Bypass was **service_role** INSERT + BYPASSRLS. Corrective revokes service_role DML; app creation stays governed RPCs.

### Spark → Cursor sequence

1. Spark confirms containment + reviews corrective disposably.  
2. Spark ACK → Cursor applies corrective on staging only, verifies deployed defs/effective grants, issues fresh scoped sessions.  
3. Spark live security checks → then browser may resume.

**#155** frozen `ca9f5067`. **#156** draft. No production apply, merge, or B3.
