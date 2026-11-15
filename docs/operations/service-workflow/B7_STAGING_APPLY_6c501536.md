# B7 staging apply record — tip `6c501536`

**Evidence (Spark approve):** `1dc28279` (21/21 disposable; F-B7-04 verified; F-B7-03 apply approved)  
**Source tip:** `6c501536dbc644a8e77ab2ebfda824bfb1f2a3ee`  
**DB:** `apnmoevmvihfzcnttctx` (staging only)  
**Gates:** #155 frozen · #156 draft · **no production**

## Apply order (as approved)

| Order | Filename / chunk | Live stamp | Name |
|------:|------------------|------------|------|
| 1 | `20261115181000_service_workflow_b7_f_b7_04_null_auth.sql` | `20261115184700` | `service_workflow_b7_f_b7_04_null_auth` |
| 2 | `20261115180000_service_workflow_b7_share_audit.sql` | `20261115185008` | `service_workflow_b7_share_audit` |

Chunk hashes (tip files / `applied-sql/b7-staging/`):

| File | sha256 |
|------|--------|
| F-B7-04 | `3bd4b699a51a70aa8097deaf36a7c77c3250bafa2e35331a69de45caecfd5b7f` |
| F-B7-03 | `35869b5fac198173775381b91c216dbd46e33772206b34d1e62b7cdf4288462f` |

No other SQL beyond these two migrations’ bodies. No production.

## Post-apply verification (access-holder)

| Check | Result |
|-------|--------|
| `revoke_ticket_share` null-safe + `share_revoked` | true / true |
| `govern_ticket_set_escalated` (3-arg) null-safe | true |
| `ticket_share_access_events` | present |
| `ticket_shares` policy | `ticket_shares_select_scoped` only |
| `create_ticket_share` / `get_shared_ticket` | present |

## Edge

| Function | Version | Change |
|----------|--------:|--------|
| `ticket-share-attachment` | **2** | Fail-closed `record_ticket_share_attachment_access` before sign; `verify_jwt=false` preserved |

## Next (Spark)

G-01 full single-ticket browser journey · G-04 anonymous share view · remaining bypass candidates · release-readiness verdict (not production approval).
