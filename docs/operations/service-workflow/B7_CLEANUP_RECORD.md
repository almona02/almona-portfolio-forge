# B7 cleanup record

**DB:** `apnmoevmvihfzcnttctx`  
**Inventory:** `B7_FIXTURE_INVENTORY_PRE_CLEANUP.md`  
**Gates:** #155 frozen · #156 draft · **no merge / production**

## Procedure (authorized — B6 pattern)

1. Inventory exact B7 ticket / machine / share / storage IDs.
2. Temporary storage DELETE policy `tmp_b7_stg_cleanup_delete` — admin-only, six B7 ticket prefixes under `ticket-attachments`.
3. Storage API DELETE (`prefixes`) — **6/6** objects removed.
4. One transaction:
   - DISABLE (then ENABLE) immutable triggers:  
     `trg_ack_disposition_immutable`, `trg_ack_immutable`, `trg_review_immutable`,  
     `trg_revision_immutable`, `trg_workflow_audit_immutable`,  
     **`trg_ticket_share_access_immutable`** (B7-new; required for access-event purge).
   - Null `service_jobs.completing_revision_id` for B7 jobs.
   - Delete B7 report-family → workflow audit → share access events → shares → governance audit → messages → visits/jobs → tickets → `B7J1-%` / `B7STG-%` machines.
   - DROP `tmp_b7_stg_cleanup_delete`.

## Post-cleanup verify

| Check | Result |
|-------|--------|
| B7 tickets (predicate) | **0** |
| B7 machines | **0** |
| Real tickets retained | **24** |
| B7 storage prefixes | **0** |
| `tmp_b7_stg_cleanup_delete` | **absent** |
| Six immutable triggers | **enabled (`O`)** including share-access |

Sanitized evidence retained in git docs / Spark commits. No production. No unidentified storage deleted.
