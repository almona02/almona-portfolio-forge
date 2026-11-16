# Lane A staging apply record

| Field | Value |
|-------|-------|
| **Status** | Applied on staging · awaiting Spark ack + verdict · **no production / merge / FR-1** |
| **Packet documentation SHA (at apply)** | `45614cfbe71e76c4ca2fc11863e30276bcad4f5a` |
| **Spark-reviewed packet ancestor** | `0419455969db302ea9e4672c46fed4d49f2ad984` |
| **Intervening 04194559→45614cfb** | Documentation / evidence only. **No** `src/` or `supabase/migrations/` product delta. |
| **Database implementation** | `e1345a0aef857e857fe5af50176c1fcb633aae70` |
| **Frontend** | `ad9570bc22b30d649b9223a3b74fe2f836adb143` |
| **Auth-routing / nav (Spark)** | 26/26 · 9/9 |
| **Target DB** | `apnmoevmvihfzcnttctx` (`almona02-staging`, eu-west-3, ACTIVE_HEALTHY) |
| **Operator apply time (UTC)** | 2026-11-16T19:25Z class (stamp `20261116192555`) |

## Payload verification (no PowerShell text pipe)

```bash
git cat-file -s e1345a0a:supabase/migrations/20261116180000_service_routines_lane_a_authoring.sql
# 38958
git rev-parse e1345a0a:supabase/migrations/20261116180000_service_routines_lane_a_authoring.sql
# 3ca6fb4165cd92c38fe18274d7869123fd834e45
git cat-file blob 3ca6fb4165cd92c38fe18274d7869123fd834e45 | openssl dgst -sha256
# 62255ac2329864f11aa19bf66eb72ff5a491935c8fd586820ea3c0cb9ccbbc1b
```

Earlier **39952** was PowerShell text-pipe LF→CRLF inflation (38958 + 994 newlines).

## Preflight

| Check | Result |
|-------|--------|
| Project identity | `almona02-staging` / `apnmoevmvihfzcnttctx` |
| Helpers (`workflow_resolve_actor`, `workflow_audit`, `caller_uid/role`, `profiles`, audit table) | present |
| `service_routines*` pre-apply | absent |
| Lane A migration stamp pre-apply | absent |
| Unexpected anon grants on `service_routine%` | none |

## Live stamp + grant/RLS results

| Check | Result |
|-------|--------|
| `schema_migrations` | `20261116192555` / `service_routines_lane_a_authoring` |
| Tables + RLS | 4 tables; one SELECT policy each |
| Public `%service_routine%` RPCs | 10 |
| anon table grants | **0** |
| anon EXECUTE | **false** (all 10) |
| authenticated EXECUTE | **true** (all 10) |
| authenticated table privileges | **SELECT only** (no INSERT/UPDATE/DELETE) |

Sanitized probe dump: [`spark-probes/LANE_A_STAGING_GRANT_RLS_RESULTS.json`](./spark-probes/LANE_A_STAGING_GRANT_RLS_RESULTS.json).  
Applied payloads: [`applied-sql/lane-a-staging/`](./applied-sql/lane-a-staging/).

## Frontend preview

| Field | Value |
|-------|-------|
| Deployment id | `dpl_3FSZWSy8o2K5qvNhWFoGedwpEHma` |
| Commit | `ad9570bc22b30d649b9223a3b74fe2f836adb143` |
| Branch | `feat/service-routines-authoring` |
| Preview URL | `https://almona-portfolio-forge-6946zqx1g.vercel.app` (**READY**) |
| Alias | `https://almona-portfolio-f-git-2939ea-mohamed-hassans-projects-0ca04921.vercel.app` |
| Env binding | Branch-scoped preview `VITE_SUPABASE_*` → staging `apnmoevmvihfzcnttctx` |
| Protection | SSO on; shareable bypass TTL to **2026-11-23T19:32:10Z** (Unix `1795462330`) |
| Release manifest | [`LANE_A_STAGING_RELEASE_MANIFEST.md`](./LANE_A_STAGING_RELEASE_MANIFEST.md) |

## Secure delivery to Spark (absolute path)

Credentials are **not** in git. Spark must read:

`C:\projects\_almona_handoff\lane-a-staging-verification\SPARK_LANE_A_STAGING_SECURE_HANDOFF.txt`

Delivery guide: [`SPARK_LANE_A_STAGING_DELIVERY.md`](./SPARK_LANE_A_STAGING_DELIVERY.md).

| Item | Absolute path |
|------|----------------|
| Secure handoff | `C:\projects\_almona_handoff\lane-a-staging-verification\SPARK_LANE_A_STAGING_SECURE_HANDOFF.txt` |
| Non-secret manifest | `C:\projects\_almona_handoff\lane-a-staging-verification\MANIFEST.json` |
| **Spark confirmation** | `C:\projects\_almona_handoff\lane-a-staging-verification\SPARK_CONFIRM.json` |
| Cleanup checklist | `C:\projects\_almona_handoff\lane-a-staging-verification\CLEANUP_AFTER_RUN.md` |
| Cleanup owner | **Cursor operator** (after Spark verdict) |

## Explicit non-goals

No production changes · no merge · no FR-1 · no assignment/pinning · no recurrence · no technician-result · no migration replay · accepted runtime unchanged.
