# B4 staging apply manifest

**Authorized implementation:** `6a64a01e23dd51439ddfa31243253d4050d93f30`  
**Target:** Supabase staging `apnmoevmvihfzcnttctx` (`almona02-staging`, eu-west-3)  
**Gates:** Staging apply + verification only · no merge · no production · no B5 · #155 frozen · #156 draft

## Pre-apply staging identity

| Check | Expected |
|-------|----------|
| Project | `apnmoevmvihfzcnttctx` / `almona02-staging` |
| Engine | Postgres 17 |
| B1 / B2 / security remediation / B3 chain | Already applied — **do not reapply** |
| B4 RPCs / columns before apply | **Absent** |
| Latest B3 stamp | `20261112192533` `service_workflow_b3_f_b3_03_lock_order` |
| Existing `service_report_revisions` | Preflight required — stop if labour/work_performed incompatible |

## Apply sequence

| Order | Source | MCP name | `lf_sha256` |
|------:|--------|----------|-------------|
| 1 | `20261112210000_service_workflow_b4_report_submission.sql` | `service_workflow_b4_report_submission` | `4f04d4da09f5152b5aea27f2613f8d64d7219224714997a6643d12a9529e6433` |

Payload copy: `docs/operations/service-workflow/applied-sql/b4-staging/`.

## Preflight rule

If existing revisions violate work_performed backfill or F-B4-05 labour XOR, **stop** with counts. Do not invent `no_labour` or alter historical rows to force success.

## Cutover

1. Apply B4 migration **before** deploying the matching staging client preview.  
2. Client at `6a64a01e` (or tip with identical migration/UI blobs) calls `submit_service_report_revision` / `get_service_report_for_visit`.  
3. Verify grants: anon EXECUTE false on submit/getter; authenticated true on both; service_role EXECUTE on submit with actor delegation; direct-write REVOKE retained.
