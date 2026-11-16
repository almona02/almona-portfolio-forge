# Spark — Lane A staging paths (non-secret)

Paste this file into the Spark session if paths were not supplied in-chat.

## 1. Absolute handoff file (item 1 — must be readable)

```
C:\projects\_almona_handoff\lane-a-staging-verification\SPARK_LANE_A_STAGING_SECURE_HANDOFF.txt
```

Staging credentials, fixtures, expiries, and preview bypass live **only** in that file (and AgentStore copies under `files/lane-a/`). Not in git.

## 2. Where to write `SPARK_CONFIRM.json`

**Preferred (operator tooling):**

```
C:\projects\_almona_handoff\lane-a-staging-verification\SPARK_CONFIRM.json
```

**Accepted alternate (Spark default):**

```
C:\projects\almona-routines-authoring\.artifacts\SPARK_CONFIRM.json
```

Booleans + non-secret identifiers only — no passwords, keys, or bypass tokens.

## Expected staging identity

`apnmoevmvihfzcnttctx` (`almona02-staging`). Production `shfsebdncjnncqqnewfj` is forbidden.

## Bindings (unchanged runtime)

| Item | SHA / stamp |
|------|-------------|
| DB baseline | `e1345a0aef857e857fe5af50176c1fcb633aae70` |
| Frontend | `ad9570bc22b30d649b9223a3b74fe2f836adb143` |
| Delivery docs | `856aecc80c992c4ab65566a3f97cb8978aac5153` |
| Live stamp | `20261116192555` / `service_routines_lane_a_authoring` |

Related: [`SPARK_LANE_A_STAGING_DELIVERY.md`](./SPARK_LANE_A_STAGING_DELIVERY.md)
