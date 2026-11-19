# Spark — Coverage staging delivery (paths only)

## Status

| Field | Value |
|-------|-------|
| Spark verdict | **`STAGING PASS`** (targeted · 49/49) — preserved; do not overwrite |
| Operational closeout | **COMPLETE** — [`COVERAGE_STAGING_CLOSEOUT.md`](./COVERAGE_STAGING_CLOSEOUT.md) · Spark `SPARK_ZERO_CONFIRM.json` |
| Operator cleanup | **`CLEANUP_EXECUTED`** · zero-confirm COMPLETE |
| Staging ref | `apnmoevmvihfzcnttctx` (`almona02-staging`) |
| Forbidden production | `shfsebdncjnncqqnewfj` |
| Acceptance | [`COVERAGE_STAGING_ACCEPTANCE.md`](./COVERAGE_STAGING_ACCEPTANCE.md) |
| Apply record | [`COVERAGE_STAGING_APPLY_RECORD.md`](./COVERAGE_STAGING_APPLY_RECORD.md) |
| Local acceptance | [`COVERAGE_LOCAL_ACCEPTANCE_b65c4cd4.md`](./COVERAGE_LOCAL_ACCEPTANCE_b65c4cd4.md) |
| Limitations | **L1–L4** travel with the PASS |

## Secure handoff (credentials outside git)

```
C:\projects\_almona_handoff\coverage-staging-verification\
```

| File | Purpose |
|------|---------|
| `SPARK_COVERAGE_STAGING_SECURE_HANDOFF.txt` | Preview share + binding summary |
| `FIXTURE_CREDENTIALS.txt` / `credentials/` | Scoped user passwords |
| `USERS_AND_FIXTURES_MANIFEST.json` | Users, fixture IDs, stamps, hashes |
| `preview_access.json` | Deployment + share metadata |
| `CLEANUP_AFTER_RUN.md` | Cleanup ownership (Cursor operator) |
| `APPLY_VERIFY.json` | Post-apply object/grant probe |

## Bindings

| Item | Value |
|------|-------|
| Implementation / correction | `b65c4cd4f9a24e18c45ed30cebccc526f399b159` |
| Preview source | `6b8d83466ad10ad78f1941a066acdc36684e7569` |
| Cap stamp | `20261119135104` / `service_coverage_f_cov_cap_1` |
| Preview deployment | `dpl_F2JNE5vYSisEdsebPYvU5XEEindZ` |
| Preview URL | `https://almona-portfolio-forge-gd9n1olyq.vercel.app` |

## Attribution reminder

Cursor disposable local evidence (CR 22/22, CAP 10/10, 8-worker concurrent) does **not** replace Spark independent results. Preserve Spark’s numbers separately.
