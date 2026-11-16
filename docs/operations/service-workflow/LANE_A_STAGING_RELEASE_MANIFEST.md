# Lane A staging release manifest (for Spark)

| Binding | Full SHA / value |
|---------|------------------|
| **Packet documentation SHA (at apply)** | `45614cfbe71e76c4ca2fc11863e30276bcad4f5a` |
| Spark-reviewed packet tip | `0419455969db302ea9e4672c46fed4d49f2ad984` |
| Intervening delta | Docs/evidence only; no product `src/` / migration delta |
| **Database** | `e1345a0aef857e857fe5af50176c1fcb633aae70` |
| Migration blob | `3ca6fb4165cd92c38fe18274d7869123fd834e45` · **38958** bytes · SHA-256 `62255ac2329864f11aa19bf66eb72ff5a491935c8fd586820ea3c0cb9ccbbc1b` |
| Live stamp | `20261116192555` / `service_routines_lane_a_authoring` |
| Staging project | `apnmoevmvihfzcnttctx` (`almona02-staging`) — **not** `shfsebdncjnncqqnewfj` |
| **Frontend** | `ad9570bc22b30d649b9223a3b74fe2f836adb143` |
| Auth-routing | Spark **26/26** |
| Navigation browser | Spark **9/9** |
| Preview deployment | `dpl_3FSZWSy8o2K5qvNhWFoGedwpEHma` |
| Preview URL | `https://almona-portfolio-forge-6946zqx1g.vercel.app` |
| Preview bypass expires | **2026-11-23T19:32:10Z** (Unix `1795462330`) |
| Preview env | Branch `feat/service-routines-authoring` → staging Supabase only |
| Grant/RLS results | [`spark-probes/LANE_A_STAGING_GRANT_RLS_RESULTS.json`](./spark-probes/LANE_A_STAGING_GRANT_RLS_RESULTS.json) |

## Secure sessions + fixtures (absolute path)

```
C:\projects\_almona_handoff\lane-a-staging-verification\SPARK_LANE_A_STAGING_SECURE_HANDOFF.txt
```

| Fixture email | Role | UI |
|---------------|------|-----|
| `lanea.stg.admin.author@almona.invalid` | admin | `/admin?tab=service-routines` |
| `lanea.stg.support.reviewer@almona.invalid` | support | `/support/routines` |
| `lanea.stg.tech@almona.invalid` | technician | published preview only |
| `lanea.stg.customer@almona.invalid` | customer | deny staff routes |

Passwords + bypass secret: **only** in that absolute handoff file. Never production credentials.

## Cleanup ownership + Spark confirmation

| Role | Responsibility | Location |
|------|----------------|----------|
| **Spark** | Ack readability, staging identity, fixture auth, preview access | `C:\projects\_almona_handoff\lane-a-staging-verification\SPARK_CONFIRM.json` |
| **Cursor operator** | After verdict: `LA-STG-%` cleanup, Auth user removal, bypass revoke, shred, zero-confirm | `C:\projects\_almona_handoff\lane-a-staging-verification\CLEANUP_AFTER_RUN.md` |

Delivery brief: [`SPARK_LANE_A_STAGING_DELIVERY.md`](./SPARK_LANE_A_STAGING_DELIVERY.md).

## Out of scope

No production · no merge · no FR-1 · no assignment/pinning · no recurrence · no technician-result · no migration replay.
