# Spark — Lane B staging delivery (paths only)

## Secure handoff (credentials outside git)

```
C:\projects\_almona_handoff\lane-b-staging-verification\SPARK_LANE_B_STAGING_SECURE_HANDOFF.txt
```

Also: `MANIFEST.json`, `CLEANUP_AFTER_RUN.md`, `FIXTURE_SETUP.md`, `SPARK_CONFIRM.json` (Spark writes).

## Staging identity (forbidden production)

| | Staging (authorized) | Production (forbidden) |
|--|----------------------|------------------------|
| Ref | `apnmoevmvihfzcnttctx` | `shfsebdncjnncqqnewfj` |
| Name | `almona02-staging` | `almona02` |

## Bindings

| Item | Value |
|------|-------|
| Implementation | `d0c311c9cfc9a65bf67f85ee95b14946224d0a7b` |
| Migration stamp | `20261117193033` / `service_routines_lane_b_job_pins` |
| Payload lf_sha256 | `3d39d6a2741a3519bbb5e144c1d4ff201048b224d1877b138f4b3c1423b223a0` |
| Local Spark evidence | `5dc324e2` integrated (runtime unchanged) |
| Apply record | [`LANE_B_STAGING_APPLY_RECORD.md`](./LANE_B_STAGING_APPLY_RECORD.md) |

## Cleanup owner

**Cursor operator** after Spark verdict — see handoff `CLEANUP_AFTER_RUN.md`. Synthetic prefix **`LB-STG-%`**.
