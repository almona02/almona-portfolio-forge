# Spark — DO-1 staging delivery (paths only)

| Field | Value |
|-------|-------|
| Status | Spark **`STAGING PASS`** recorded · operator cleanup **done** · Spark zero-confirm pending |
| Staging ref | `apnmoevmvihfzcnttctx` (`almona02-staging`) |
| Forbidden | production `shfsebdncjnncqqnewfj` |
| Accepted SHA | `1278d4c40f14f05f25c3dd88b6763c8a9ef22113` |
| Preview tip | `2beea5ec9b63d1a34ecd3210786843ae9d564755` |
| Deployment | `dpl_CmvJNkCLH1ycnmr6t2L2WBLzswQt` |
| Function hash | `06547a6e…` (**operator-claimed**) |
| Acceptance | [`DO1_STAGING_ACCEPTANCE.md`](./DO1_STAGING_ACCEPTANCE.md) |
| Apply record | [`DO1_STAGING_APPLY_RECORD.md`](./DO1_STAGING_APPLY_RECORD.md) |
| Local acceptance | [`SERVICE_DAILY_OPS_DO1_LOCAL_ACCEPTANCE.md`](./SERVICE_DAILY_OPS_DO1_LOCAL_ACCEPTANCE.md) |
| Cleanup receipt | `C:\projects\_almona_handoff\do1-staging-verification\OPERATOR_CLEANUP_RECEIPT.md` |

## Secure handoff (out of git)

`C:\projects\_almona_handoff\do1-staging-verification\`

| File | Purpose |
|------|---------|
| `SPARK_DO1_STAGING_SECURE_HANDOFF.txt` | Shareable preview URL + bindings (secrets) |
| `preview_access.json` | Machine-readable preview + share |
| `USERS_AND_FIXTURES_MANIFEST.json` | Users, fixture IDs, stamps, hashes |
| `FIXTURE_SETUP.md` | Bounded fixture shape |
| `CLEANUP_AFTER_RUN.md` | **Cleanup owner: Cursor operator** |
| `FIXTURE_CREDENTIALS.txt` / `credentials/*` | Password grant secrets |
| `APPLY_VERIFY.md` | Stamp / grant verify summary |
| `apply_do1.sql` | Reviewed payload copy |

## Attribution

Spark owns staging verification evidence under its run folder. Cursor owns apply, protected preview unlock, fixture provision, and post-run cleanup.
