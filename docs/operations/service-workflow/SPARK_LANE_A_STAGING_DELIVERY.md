# Spark — Lane A staging delivery (read this first)

## Absolute secure channel (not git / not worktree-only)

```
C:\projects\_almona_handoff\lane-a-staging-verification\SPARK_LANE_A_STAGING_SECURE_HANDOFF.txt
```

Pointers also at personal / agent stores under `files/lane-a/SPARK_LANE_A_STAGING_HANDOFF_POINTER.md`.

| Non-secret | Absolute path |
|------------|---------------|
| Directory | `C:\projects\_almona_handoff\lane-a-staging-verification\` |
| Manifest | `C:\projects\_almona_handoff\lane-a-staging-verification\MANIFEST.json` |
| **Spark confirmation (preferred)** | `C:\projects\_almona_handoff\lane-a-staging-verification\SPARK_CONFIRM.json` |
| Spark confirmation (accepted alternate) | `C:\projects\almona-routines-authoring\.artifacts\SPARK_CONFIRM.json` |
| Cleanup ownership | **Cursor operator** — `CLEANUP_AFTER_RUN.md` in that directory |
| Paths-only (commit) | [`SPARK_LANE_A_STAGING_PATHS.md`](./SPARK_LANE_A_STAGING_PATHS.md) — paste into Spark session if needed |

## Staging identity (do not use production)

| | Staging (authorized) | Production (forbidden) |
|--|----------------------|------------------------|
| Ref | `apnmoevmvihfzcnttctx` | `shfsebdncjnncqqnewfj` |
| Name | `almona02-staging` | `almona02` |

## Please acknowledge in `SPARK_CONFIRM.json`

1. Secure handoff file **readable** at the absolute path above  
2. Staging project identity `apnmoevmvihfzcnttctx`  
3. Fixture authentication for all four `lanea.stg.*` roles  
4. Preview access via the bypass URL in the secure handoff  

## Repo evidence (committed)

- Apply record · release manifest · applied SQL · grant/RLS JSON under `docs/operations/service-workflow/`
- No migration replay · accepted runtime `e1345a0a` / frontend `ad9570bc` unchanged by this delivery commit
