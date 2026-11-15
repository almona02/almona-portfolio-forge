# Spark targeted review — F-B7-03 share audit (staging only)

**Branch tip (at publish):** `c5b7ae3d`  
**Share-audit commit:** `b974ab0f`  
**Python scope/privacy:** `96f1d833`  
**DB:** staging `apnmoevmvihfzcnttctx` only  
**Gates:** #155 frozen · #156 draft · **no production** · no merge

## Ask

Review and approve **one** staging migration before apply:

`supabase/migrations/20261115180000_service_workflow_b7_share_audit.sql`  
(byte-identical copy: `docs/operations/service-workflow/applied-sql/b7-staging/01_20261115180000_service_workflow_b7_share_audit.sql`)

Semantics: `docs/operations/service-workflow/B7_SHARE_AUDIT.md`

## What changes

1. `create_ticket_share` — atomic insert + `ticket_governance_audit.share_created` (token-free details)
2. `revoke_ticket_share` — atomic revoke + `share_revoked`
3. `ticket_share_access_events` — fail-closed access accounting for `get_shared_ticket` + attachment edge
4. Revoke client INSERT/UPDATE/DELETE on `ticket_shares` (SELECT-only policy)

## Non-goals

No parts fulfillment · no further-work linkage · no production · no #155 thaw

## After Spark approve

Access-holder applies under established staging-only workflow, then FE/BE staging deploy + B7 fixture handoff.
