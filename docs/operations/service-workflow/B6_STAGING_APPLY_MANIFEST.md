# B6 staging apply manifest

**Authorized runtime tip:** `da2132b6f2ae6f75eed1187b7fad51ce3dbe97eb`  
**Docs stamp (pre-apply):** `5240e428586d85bba8915223b4da1f2b1e954948`  
**Spark PASS tip (artifacts):** `34940537f3f9749a81fe057f2fd9a026e6290afd`  
**Target:** Supabase staging `apnmoevmvihfzcnttctx` (`almona02-staging`, eu-west-3, PG17)  
**Gates:** Staging apply + verification only · no merge · no production · no B7 · #155 frozen · #156 draft

## Pre-apply staging identity

| Check | Expected / observed |
|-------|---------------------|
| Project | `apnmoevmvihfzcnttctx` / `almona02-staging` ACTIVE_HEALTHY |
| Engine | Postgres 17 |
| B1–B5 chain | Present — **do not reapply** |
| Latest pre-B6 stamp | `20261115123124` `service_workflow_b5_staging_b5_01_review_select` |
| `record_service_acknowledgment` before apply | **Absent** |
| `service_acknowledgments` table | Present (pre-B6 shell; no `event_seq`) |
| `service_acknowledgment_dispositions` | **Absent** |
| Synthetic leftovers | `B6STG-%` = 0 · `B5STG-%` = 0 · tickets = 24 · revisions/reviews = 0/0 |

## Apply sequence (full payloads @ `da2132b6` — LF sha256)

| Order | Source @ `da2132b6` | MCP name | `lf_sha256` | bytes |
|------:|---------------------|----------|-------------|------:|
| 1 | `supabase/migrations/20261115160000_service_workflow_b6_acknowledgment_closure.sql` | `service_workflow_b6_acknowledgment_closure` | `48c8b2f34adcaae2510ed16733f94db4d073a5c44fcf42837160ea8144672af1` | 31292 |
| 2 | `supabase/migrations/20261115170000_service_workflow_b6_f_b6_03_05_correction.sql` | `service_workflow_b6_f_b6_03_05_correction` | `7aec3d9396472fed8515f7b1b23ec25e3fbdec6e6ec8141ec5aa82b96e837828` | 12183 |
| 3 | `supabase/migrations/20261115171000_service_workflow_b6_integrity_targeting.sql` | `service_workflow_b6_integrity_targeting` | `8c0ac6f6730eb6ad116f6f71e79217bc07d6a8fbf4f9f22f929a3785873e21b3` | 15264 |
| 4 | `supabase/migrations/20261115171100_service_workflow_b6_f_b6_08_reclose_auth.sql` | `service_workflow_b6_f_b6_08_reclose_auth` | `97933727cbaf11937a1fb91e14a5753130cf2d95258a0c0e863a7278f4f92326` | 6090 |
| 5 | `supabase/migrations/20261115171200_service_workflow_b6_f_b6_09_event_seq_order.sql` | `service_workflow_b6_f_b6_09_event_seq_order` | `c099f51ee612a768f11804f0a14e0fc4c69d22fb28e07e2be41bd46e0a2e0eec` | 8287 |

Canonical applied copies: `docs/operations/service-workflow/applied-sql/b6-staging/`.

## Dependency order

B5 staging select → B6 base → F-B6-03/05 → integrity (`event_seq` column + getters) → F-B6-08 (auth-before-reclose) → F-B6-09 (`event_seq` authoritative ORDER BY).

## Independent verdict retained (not re-litigated)

| Tip | Disposition |
|-----|-------------|
| `ec00b692` / `ed22ad03` | BLOCKED (freeze) |
| `0b07aa8d` / `b6500999` | BLOCKED F-B6-06/07 |
| `9998f1a4` / `4c045f51` | BLOCKED F-B6-08/09 |
| `3e387199` / `ebdb5eb2` | BLOCKED F-B6-09 only |
| **`da2132b6` / `34940537`** | **Spark disposable PASS** (F-B6-09 fixed) |

Access-holder / Cursor supporting runs are **not** a Spark staging PASS. Spark performs the live staging journey after cutover.

## Post-apply (cutover complete)

| Item | Value |
|------|-------|
| Live stamps (apply order) | `20261115151114` → `20261115151624` → `20261115151655` → `20261115151750` → `20261115151814` |
| Source tip file | `20261115171200_service_workflow_b6_f_b6_09_event_seq_order.sql` |
| Preview | `dpl_HS5wBUNzPpL8LQi9PcfUeubBuE6e` → `https://almona-portfolio-forge-quh8k3ysp.vercel.app` |
| Handoff | `C:\projects\_almona_handoff\slice0-b6-staging-verification` |
| Apply record | `B6_STAGING_APPLY_RECORD.md` |
| Spark handoff | `SPARK_B6_STAGING_HANDOFF.md` |

Note: first MCP `apply_migration` for #1 truncated; remainder landed via unstamped `execute_sql` chunks (same pattern as prior remediation). Live stamp for #1 remains `20261115151114`.
