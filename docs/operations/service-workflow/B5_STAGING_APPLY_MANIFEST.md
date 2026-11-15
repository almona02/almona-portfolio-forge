# B5 staging apply manifest

**Authorized correction tip:** `d2743078fdb7a648e09cfed7aeac554cef43570d`  
**Docs stamp:** `0896551e79a39155c05fc47a446038453aa1cf8b`  
**Target:** Supabase staging `apnmoevmvihfzcnttctx` (`almona02-staging`, eu-west-3, PG17)  
**Gates:** Staging apply + verification only · no merge · no production · no B6 · #155 frozen · #156 draft

## Pre-apply staging identity

| Check | Expected / observed |
|-------|---------------------|
| Project | `apnmoevmvihfzcnttctx` / `almona02-staging` ACTIVE_HEALTHY |
| Engine | Postgres 17 |
| B1–B4 chain | Present — **do not reapply** |
| Latest pre-B5 stamp | `20261112232020` `service_workflow_b4_attachment_insert_definer` |
| `review_service_report_revision` before apply | **Absent** |
| `submit_service_report_revision` / getter | Present |
| Existing revisions / reviews | **0 / 0** |
| Synthetic leftovers | `B4STG-%` = 0 · `B5%` = 0 · other tickets = 24 (unchanged) |

## Apply sequence (full payloads — no truncated chunks)

| Order | Source @ `d2743078` | MCP name | `lf_sha256` | bytes |
|------:|---------------------|----------|-------------|------:|
| 1 | `supabase/migrations/20261115120000_service_workflow_b5_manager_review.sql` | `service_workflow_b5_manager_review` | `1417c23a0f8a6d9762333f61764a125dcdfbbb867b02fe996f1239a8cf420693` | 9797 |
| 2 | `supabase/migrations/20261115140000_service_workflow_b5_f_b5_01_02_correction.sql` | `service_workflow_b5_f_b5_01_02_correction` | `544dd5c8cca2f3731d754b8a27e9aca4b4d02c7a5eda213bfaac55f0e46dbe89` | 10240 |

Canonical applied copies: `docs/operations/service-workflow/applied-sql/b5-staging/`.

## Independent verdict retained (not re-litigated)

Spark independent review @ freeze `f8fb9358` was **BLOCKED** on F-B5-01 / F-B5-02. That disposition stands.

Access-holder local re-verify of correction tip `d2743078` is **not** a Spark staging PASS. Spark performs the staging journey below.

### Documented stale B4 assertions (not B5 failures)

Under B5, the B4 battery expectations for these three checks are **known pre-B5 drifts** and must not be scored as F-B5 defects:

| ID | Why stale under B5 |
|----|--------------------|
| Q4-07c | Offboard/own-folder evidence expectation vs hosted attachment model drift |
| Q4-23 | Asserts “no review/issue RPC” — false once B5 `review_service_report_revision` exists |
| Q4-30 | Evidence readability matrix expectation drift vs live storage/policy surface |

Treat unexpected B4 fails outside `{Q4-07c, Q4-23, Q4-30}` as real regressions.

## Test-file authorship note

`src/lib/ticketGovernanceApi.b5.spark.test.ts` and `src/components/support/CustomerIssuedReportView.b5.spark.test.tsx` are **branch tests independently executed by Spark**, not Spark-authored probes.
