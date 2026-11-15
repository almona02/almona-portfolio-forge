# Spark targeted review — F-B7-03 share audit (staging only)

**Prerequisite:** F-B7-04 null-auth correction must land and re-verify first  
(`B7_F_B7_04_NULL_AUTH.md`, migration `20261115181000_…f_b7_04_null_auth.sql`).  
F-B7-03 tip revoke gate is null-safe (same deny-by-default arms).

**Share-audit commit (original):** `b974ab0f` · **null-safe revoke amend:** see F-B7-04 tip  
**Python scope/privacy:** `96f1d833`  
**DB:** staging `apnmoevmvihfzcnttctx` only  
**Gates:** #155 frozen · #156 draft · **no production** · no merge

## Ask

1. Re-verify F-B7-04 (Q7-10 / Q7-15 / Q7-16) after Cursor tip lands.  
2. Then approve **F-B7-03** staging apply:

`supabase/migrations/20261115180000_service_workflow_b7_share_audit.sql`  
(copy: `docs/operations/service-workflow/applied-sql/b7-staging/01_…`)

Semantics: `docs/operations/service-workflow/B7_SHARE_AUDIT.md`

## What changes (F-B7-03)

1. `create_ticket_share` — atomic insert + `ticket_governance_audit.share_created` (token-free details)
2. `revoke_ticket_share` — atomic revoke + `share_revoked` (**null-safe** auth)
3. `ticket_share_access_events` — fail-closed access accounting for `get_shared_ticket` + attachment edge
4. Revoke client INSERT/UPDATE/DELETE on `ticket_shares` (SELECT-only policy)

## Apply order

F-B7-04 → Spark re-verify → **this** F-B7-03 on Spark approval → G-01 / G-04.

## Non-goals

No parts fulfillment · no further-work linkage · no production · no #155 thaw
