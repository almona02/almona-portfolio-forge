# Lane A staging release manifest (for Spark)

| Binding | Full SHA / value |
|---------|------------------|
| **Packet documentation SHA** | `45614cfbe71e76c4ca2fc11863e30276bcad4f5a` |
| Spark-reviewed packet tip | `0419455969db302ea9e4672c46fed4d49f2ad984` |
| Intervening delta | Docs/evidence only (byte-length explanation, nav runner/results, bootstrap issues). No product `src/` / migration delta. |
| **Database** | `e1345a0aef857e857fe5af50176c1fcb633aae70` |
| Migration blob | `3ca6fb4165cd92c38fe18274d7869123fd834e45` · **38958** bytes · SHA-256 `62255ac2329864f11aa19bf66eb72ff5a491935c8fd586820ea3c0cb9ccbbc1b` |
| Live stamp | `20261116192555` / `service_routines_lane_a_authoring` |
| Staging project | `apnmoevmvihfzcnttctx` (`almona02-staging`) |
| **Frontend** | `ad9570bc22b30d649b9223a3b74fe2f836adb143` |
| Auth-routing | Spark **26/26** |
| Navigation browser | Spark **9/9** |
| Preview deployment | `dpl_3FSZWSy8o2K5qvNhWFoGedwpEHma` |
| Preview URL | `https://almona-portfolio-forge-6946zqx1g.vercel.app` |
| Preview alias | `https://almona-portfolio-f-git-2939ea-mohamed-hassans-projects-0ca04921.vercel.app` |
| Preview env | Branch `feat/service-routines-authoring` → staging Supabase only |
| Protection | Vercel Authentication / SSO on; scoped shareable bypass issued (TTL 7d) |

## Secure sessions + fixtures

Operator delivers passwords + bypass secret via **gitignored** file only:

`.artifacts/lane-a-staging/SPARK_LANE_A_STAGING_SECURE_HANDOFF.txt`

| Fixture email | Role | UI |
|---------------|------|-----|
| `lanea.stg.admin.author@almona.invalid` | admin | `/admin?tab=service-routines` |
| `lanea.stg.support.reviewer@almona.invalid` | support | `/support/routines` |
| `lanea.stg.tech@almona.invalid` | technician | published preview only |
| `lanea.stg.customer@almona.invalid` | customer | deny staff routes |

Routine codes: `LA-STG-%` only. No real customer/machine data.

## Evidence / apply records

- [`LANE_A_STAGING_APPLY_RECORD.md`](./LANE_A_STAGING_APPLY_RECORD.md)
- [`LANE_A_STAGING_DEPLOYMENT_PACKET.md`](./LANE_A_STAGING_DEPLOYMENT_PACKET.md)
- [`applied-sql/lane-a-staging/`](./applied-sql/lane-a-staging/)
- Locale packaging: local-dev only — [`LANE_A_LOCAL_BOOTSTRAP_ISSUES.md`](./LANE_A_LOCAL_BOOTSTRAP_ISSUES.md)

## Out of scope

No production · no merge · no FR-1 · no assignment/pinning · no recurrence · no technician-result.

## After Spark verdict

Scoped cleanup + credential/share retirement + independent zero-confirmation (separate operator step).
