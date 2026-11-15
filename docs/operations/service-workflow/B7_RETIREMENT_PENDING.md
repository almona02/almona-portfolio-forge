# B7 retirement — pending Spark zero-confirm

**Status:** Fixtures cleaned. **One short-lived scoped session retained** until Spark confirms zero remaining.

## Retained for Spark zero-confirm

| Item | Location | Action after Spark `B7STG=0` confirm |
|------|----------|--------------------------------------|
| Support (or admin) session JWT | `C:\projects\_almona_handoff\slice0-b7-permission-audit\support.json` (+ role files as needed for confirm script) | Revoke / sign-out |
| Fixture password file | `_fixture_pw.txt` | Rotate fixture credentials, shred |
| Anon / publishable keys copies | `anon_key.txt`, `publishable_key.txt` | Remove from handoff (project keys remain in vault) |
| Preview share | `preview_access.json` (`dpl_46faneJn…`) | Revoke `_vercel_share` bypass |

## Already done

- B7 synthetic tickets / machines / shares / storage purged (`B7_CLEANUP_RECORD.md`).
- Hash record corrected to `lf_sha256` (`B7_STAGING_APPLY_6c501536.md`).
- Machine linkage labeled + canonical path verified (`B7_MACHINE_LINKAGE_CLOSEOUT.md`).

## Release limitations (explicit)

- Staging verification / correction only.
- **No merge** to main.
- **No production** deployment.
- G-01 used legacy serial-only create; canonical UUID linkage proven separately.
- Service-role live branches and multi-session races remain NOT TESTED live (disposable only).

## Suggested Spark zero-confirm checks

```text
B7STG-% tickets = 0
B7J1-% / B7STG-% machines = 0
tickets total = 24
B7 storage prefixes = 0
tmp_b7_stg_cleanup_delete absent
immutable triggers enabled (6/6)
```
