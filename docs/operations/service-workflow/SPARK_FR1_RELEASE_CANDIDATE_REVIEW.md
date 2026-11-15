# Spark — independent FR-1 release-candidate review

**Branch:** `release/fr1-slice0-share-privacy`  
**Base:** `ca9f5067` (#155 frozen)  
**Do not merge. Do not apply to production. Do not change deployment settings.**  
**Staging tip / B7 evidence:** leave `feat/service-workflow-b1-planning` intact.

## Mission

Independently verify the FR-1 candidate is a **dependency-complete** Slice0+MI+share/privacy package **without** incomplete B1–B7 workflow features, and that disposable production-shaped tests PASS.

## Inventory to confirm (read git tree on the candidate HEAD)

1. Migrations present **only** as FR-1 additions beyond #155:
   - `20261111201000_service_tickets_rls_enablement.sql`
   - `20261115190000_fr1_f_b7_04_null_auth.sql`
   - `20261115190100_fr1_f_b7_03_share_audit.sql`
2. **Absent:** B1–B6 `service_workflow_b*` migrations, B7 staging-only docs not required for apply.
3. FE: `createShare` uses `create_ticket_share` (no `ticket_shares` insert).
4. Edge: `record_ticket_share_attachment_access` before sign.
5. Python: scoped reads + internal-note filter; missing `service_jobs` does not 500.

## Disposable battery

Apply #155 A–E + FR-1 three migrations on a **fresh disposable** DB shaped like production (no job/visit tables). Then run:

`scripts/service-workflow/disposable_fr1_battery.sql`

Expect PASS on: object presence, no B1 tables, share create/audit/access event, direct insert denied, unrelated revoke denied (including **unassigned** ticket — null-safe), owner revoke+audit, escalate null-safe, RLS unrelated deny, Slice0/MI RPC preservation.

Also exercise (Spark tooling as available):

- Existing machine + ticket + attachment-shaped message survive migrate.
- Authorized legacy: owner/assignee/admin|support ticket SELECT; govern transition still callable for staff.
- Privacy: unrelated customer cannot read owner ticket; share payload excludes internal notes.
- Share lifecycle: create → access event → revoke → revoked read fails; no new access event after revoke (if probe available).
- **Rollback/forward-recovery assumptions (document, do not destroy prod):**
  - Forward-repair of F7 SQL is preferred for post-apply defects.
  - Full undo of Slice0 A requires DB restore; app-only rollback is unsafe once A is live.
  - Re-opening `ticket_shares` INSERT or public buckets is **forbidden** recovery.

## CI

Confirm required GitHub checks on the **exact candidate HEAD** (not `ca9f5067` alone, not staging tip).

## Verdict format

```text
FR-1 Spark: PASS | BLOCKED
HEAD: <sha>
Disposable: <pass/fail counts>
CI: <pass/fail on HEAD>
B1–B7 leakage: none | <list>
Backup/PITR: still unresolved production prerequisite (do not claim verified)
Production proposal: NOT AUTHORIZED by this review alone
```
