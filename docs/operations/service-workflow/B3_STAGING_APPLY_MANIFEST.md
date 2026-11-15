# B3 staging apply manifest

**Authorized runtime:** `4e0ddd225e35ef615052214898db088b718f9e5c`  
**Target:** Supabase staging `apnmoevmvihfzcnttctx` (`almona02-staging`, eu-west-3)  
**Gates:** Staging apply + verification only · no merge · no production · no B4 · #155 frozen · #156 draft

## Pre-apply staging identity

| Check | Result |
|-------|--------|
| Project | `apnmoevmvihfzcnttctx` / `almona02-staging` |
| Engine | Postgres 17 |
| B3 visit RPCs before apply | **Absent** (`start_service_job_visit` / schedule / safety not present) |
| Latest `schema_migrations` before apply | `20261112153007` `profiles_select_staff_directory_for_assignment` |
| Slice 0 / B1 / B2 | **Already applied — do not reapply** |
| Security remediation stamps | `20261112141845` / `42222` / `42617` (+ profile SELECT stamps) |

## Derived apply sequence (from migration files; not stale “11→15”)

Payloads copied under `docs/operations/service-workflow/applied-sql/b3-staging/` (LF-normalized).  
`lf_sha256` = SHA-256 of UTF-8 text with newlines normalized to LF and a single trailing newline.

| Order | Source filename | Name (MCP) | `lf_sha256` | Depends on |
|------:|-----------------|------------|-------------|------------|
| 1 | `20261112180000_service_workflow_b3_visit_execution.sql` | `service_workflow_b3_visit_execution` | `3248d40a9d1c3a5f6ab1c0f7a30dafefd25c190cdc032dbfb6e6c328c4166172` | Staging B1/B2 + security remediation (already present) |
| 2 | `20261112190000_service_workflow_b3_visit_corrections.sql` | `service_workflow_b3_visit_corrections` | `ea8100304af2de4a4725a9d6ab91049e4b992735d025d3d7919191d8ac0e771e` | Order 1 |
| 3 | `20261112194500_service_workflow_b3_safety_path_final.sql` | `service_workflow_b3_safety_path_final` | `227840626ef2aaf32f71aba5e2daf2a9922f904a0b75c6ad54fa064508122f35` | Order 2 |
| 4 | `20261112200000_service_workflow_b3_f_b3_02_ack_binding.sql` | `service_workflow_b3_f_b3_02_ack_binding` | `55e704410dd322ce57759fbe797ff4fdc785ee75b8d1d561a3fa36dd364a1f95` | Order 3 |
| 5 | `20261112201500_service_workflow_b3_f_b3_03_lock_order.sql` | `service_workflow_b3_f_b3_03_lock_order` | `49304afcf469ba6d9bce1545b1d8b140393e83a82b70508fd2cac21efc0ca5f7` | Order 4 |

MCP `apply_migration` assigns **live** `schema_migrations.version` timestamps at apply time; record them in the apply report. Do not expect the filename prefixes `20261112180000`… to equal staging stamps.

**Recorded stamps:** `20261112191932` → `20261112192046` → `20261112192133` → `20261112192242` → `20261112192533` (see [`B3_STAGING_APPLY_RECORD.md`](./B3_STAGING_APPLY_RECORD.md)).

## Cutover (signature)

1. Staging had **no** `start_service_job_visit` before apply — no live callers of a 2-arg start.  
2. Client at `4e0ddd22` already calls the **4-arg** RPC (`p_safety_attestation`).  
3. Apply DB chain **before** deploying the protected preview that exercises visit start.  
4. After order 2, only the 4-arg start remains (`DROP` of 2-arg in corrections).  
5. Verify grants: `anon` EXECUTE false on B3 visit RPCs; `authenticated`/`service_role` true.

## `workflow_resolve_actor` NULL quirk (bounded — not a stop)

Deployed behavior (security remediation body):

| Caller | `p_actor_id` | Result |
|--------|--------------|--------|
| Anon / no JWT | any | `42501 Authentication required` (does **not** trust supplied id) |
| Service role | `NULL` | `42501 Service-role actor required` |
| Service role | real profile id | Allowed override after profile exists |
| Authenticated | `NULL` | Uses JWT `caller_uid` (normal client path) |
| Authenticated | other uuid | `42501 Actor impersonation not permitted` |

**Does not** grant unauthorized access or mutation. Regression: disposable B3-A* / B3-S3 + prior staging remediation actor probes. `EXECUTE` is revoked from `anon`/`authenticated` on the resolver itself; only DEFINER owners/`service_role`/`postgres` may call it directly.

## Spark probes (sanitized)

See `docs/operations/service-workflow/spark-probes/`.
