# Lane A STG-01 staging apply record

| Field | Value |
|-------|-------|
| Project | `apnmoevmvihfzcnttctx` (staging only) |
| Tip / FE commit | `f9df057803141e645e68dc6a4274627e40144b66` |
| Migration | `20261116213000_service_routines_lane_a_stg01_stale_conflict.sql` |
| Payload SHA-256 | `9ac82cd81a818874ec76f54a77cea0589941019afde2e310da8e04256093f13e` |
| Payload bytes | 3933 |
| Live stamp | `20261116210024` / `service_routines_lane_a_stg01_stale_conflict` |
| Prior Lane A stamp (preserved) | `20261116192555` / `service_routines_lane_a_authoring` |
| DB baseline (preserved) | `e1345a0aef857e857fe5af50176c1fcb633aae70` |
| Applied at (UTC) | 2026-11-16T21:06:43Z |
| Session recheck before apply | `update_service_routine_draft` backends **0**; authenticator open/aborted xacts **0** |
| Deployed raise | `PT409` + DETAIL `routine_draft_stale_revision` (`ERRCODE 40001` **absent**) |
| EXECUTE grants | `authenticated`, `service_role` (+ `postgres`); **anon** none |
| Preview deployment | `dpl_HnNK7KriYgnMPNi1qTGS5h55hBnp` |
| Preview URL | `https://almona-portfolio-forge-ahkm13ow4.vercel.app` |
| Preview commit | `f9df057803141e645e68dc6a4274627e40144b66` |
| Protection | ON |
| Bypass expiry (UTC) | `2026-11-23T21:04:47Z` |
| Fresh-context Almona | PASS (title + root; staging ref in main; prod ref 0) |
| Fixture auth | 4/4 password-grant OK (admin/support/technician/customer) |
| Original migration replay | **No** |
| Production / merge / FR-1 | **No** |

## Deployed conflict raise (excerpt)

```sql
RAISE SQLSTATE 'PT409'
  USING MESSAGE = 'Stale draft revision',
        DETAIL = 'routine_draft_stale_revision',
        HINT = 'Reload draft_revision then retry save';
```

## Secure channel

Absolute handoff (secrets):  
`C:\projects\_almona_handoff\lane-a-staging-verification\SPARK_LANE_A_STAGING_SECURE_HANDOFF.txt`

Spark confirmation:  
`C:\projects\_almona_handoff\lane-a-staging-verification\SPARK_CONFIRM.json`

## Spark: targeted re-verify

STG-01 stale path only → prompt HTTP 409 / `PT409` / DETAIL `routine_draft_stale_revision`; content+revision unchanged on deny; fresh save OK.
