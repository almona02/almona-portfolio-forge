# Cursor evidence — local UI-retirement

Lane A historical browser tally (**19/21 proven**, **2 UI-retirement assertions void**) is **preserved** and **not rewritten**.

## Backend (isolated PG17) — Cursor-executed; Spark verification PENDING

| Field | Value |
|-------|-------|
| Cursor result | **7/7 PASS** (manual apply path) |
| Independent Spark verification | **PENDING** |
| Executed (UTC) | 2026-11-17T16:48:26Z |
| Environment | local disposable PostgreSQL 17 `127.0.0.1:55457` (not staging/production) |
| Battery SQL | `scripts/service-workflow/disposable_ui_retire_evidence.sql` |
| Battery SHA-256 | `3d6aa7ea32f8d4304034c4aafd1cd1ab5b8d1dd36382c415582ac883e216f10e` |
| Runner | `scripts/service-workflow/run_disposable_ui_retire_evidence.py` |
| Runner SHA-256 | `d3d23d06f106eba7b271c5e76ed433270ff0e8ab52d8b1b30767573db3f02a3b` |
| Results JSON | `.artifacts/slice0/service-workflow/disposable_ui_retire_evidence_results.json` |
| Lane A migration SHA-256 | `d6d87b1fdb97441d96a7a82218a4d4865a7109f3f936a9a9b90491842ab407f1` |
| STG-01 migration SHA-256 | `250a7f281ef6b0485fda27fe3a555632b5bd019f9eedb61ead55f04f16e4be81` |

### Assertions covered by backend battery

1. Exact retire success → version `retired`
2. Denied/error control → non-admin `42501`; version **and** parent remain `published`
3. Persisted version status after re-read
4. Parent routine status checked **separately**

### Automated runner failures (separate from manual PASS)

| Attempt | Result |
|---------|--------|
| `run_disposable_ui_retire_evidence.py` (task 301249) | **FAIL** — hung / Windows `pg_ctl` readiness race |
| Re-run without `-w` (task 301250) | **FAIL** — readiness / early shutdown race |
| Fixed battery re-run (task 301251) | **FAIL** — same class of runner failure |

Successful evidence used a **manual** `initdb` + `pg_ctl start` + `psql -f` apply of base → Lane A → STG-01 → `disposable_ui_retire_evidence.sql` (see `ra_retire_bat.out` under `.artifacts/…` when present).

## Real-browser flow (isolated backend) — NOT TESTED

Requested: author → review → publish → UI-retire against isolated backend with exact success/no-error, reload, persisted version status, parent status separately, denied/error control.

| Label | Value |
|-------|-------|
| Status | **NOT TESTED** |
| Do not report as | UI PASS |

## Complementary only

| Artifact | Role |
|----------|------|
| `src/components/admin/panels/ServiceRoutinesAuthoringPanel.test.tsx` | Exact toast title unit/component tests — **not** browser/DB acceptance |
| Panel test SHA-256 (pre-commit file bytes) | recompute after commit; see results JSON / commit tree |

## Explicit non-claims

- No rewrite of Lane A’s two historical void UI-retirement assertions.
- No staging access, production, merge, or FR-1 changes.

## Reproduce backend battery

```bash
python scripts/service-workflow/run_disposable_ui_retire_evidence.py
# If runner fails on Windows, manual: local PG17 apply
#   disposable_routines_base.sql →
#   20261116180000_service_routines_lane_a_authoring.sql →
#   20261116213000_service_routines_lane_a_stg01_stale_conflict.sql →
#   disposable_ui_retire_evidence.sql
```
