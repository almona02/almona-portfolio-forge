# B7 staging release binding

**Gates:** #155 frozen · #156 draft · no merge · no production  
**Secure handoff:** `C:\projects\_almona_handoff\slice0-b7-permission-audit\` (`RELEASE_MANIFEST.json`)

| Layer | Binding | Status |
|-------|---------|--------|
| Frontend SHA | `78372312d73f79a78605a8f31d14df5b1b827c93` | Deployed `dpl_46faneJn7bnf6oE9rzxZm6Cfa6dn` — preview unlock verified HTTP 200 via `_vercel_share` |
| Railway backend SHA | `96f1d833` (F-B7-01/02) | Deploy `64673eff-c8aa-46a6-ad15-48a5f6cf754c` · `https://slice0-api-staging.up.railway.app` · health 200 |
| DB migrations | F-B7-04 `…15181000…null_auth` then F-B7-03 `…15180000…share_audit` | F-B7-04 tip for live null-auth; F-B7-03 still **frozen** until Spark re-verify + approval |
| Edge | `ticket-share-attachment` + `record_ticket_share_attachment_access` | Code on tip `b974ab0f`; staging function deploy with F-B7-03 apply |

## Correction commits

| ID | SHA |
|----|-----|
| F-B7-01/02 | `96f1d833` |
| F-B7-03 | `b974ab0f` |
| Inventory correction | `c5b7ae3d` |
| Spark review request | `78372312` |

## Note

Until Spark approves and staging applies F-B7-03, frontend `createShare` calls `create_ticket_share` and will fail closed on staging. Backend F-B7-01/02 are live on Railway at `96f1d833`.
