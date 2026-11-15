# B5 staging apply + verification record

**Authorized correction tip:** `d2743078fdb7a648e09cfed7aeac554cef43570d`  
**Docs stamp (pre-header):** `0896551e79a39155c05fc47a446038453aa1cf8b`  
**Depends on blocked freeze:** `f8fb9358e976050089cd199579a99bc0a098e0c2`  
**Target DB:** Supabase staging `apnmoevmvihfzcnttctx` (`almona02-staging`)  
**Gates:** Staging only · no merge · no production · no B6 · #155 frozen · #156 draft

## Independent verdict (preserved)

| Layer | Disposition |
|-------|-------------|
| Spark @ `f8fb9358` | **BLOCKED** — F-B5-01 (owner issued-evidence reads) · F-B5-02 (completion/return stranding) |
| Access-holder local @ `d2743078` | Targeted batteries green (Q5 40/40, races 3/3, disposable 14/14) — **not** a Spark staging PASS |
| B4 under B5 | 27/30 with **documented stale** Q4-07c / Q4-23 / Q4-30 — not scored as B5 failures |

## Pre-apply

| Item | Result |
|------|--------|
| Staging identity | `apnmoevmvihfzcnttctx` ACTIVE_HEALTHY / PG17 |
| B1–B4 | Present — not reapplied |
| Latest pre-B5 stamp | `20261112232020` `service_workflow_b4_attachment_insert_definer` |
| B5 before apply | Absent (`review_service_report_revision` false) |
| Revisions / reviews | 0 / 0 |
| Real tickets | 24 (unchanged baseline) |
| Payload match tip | LF sha256 match for both migration files @ `d2743078` |

## Applied stamps (MCP live versions)

| Order | MCP name | `schema_migrations.version` | Source `lf_sha256` | bytes |
|------:|----------|-------------------------------|--------------------|------:|
| 1 | `service_workflow_b5_manager_review` | `20261115120412` | `1417c23a0f8a6d9762333f61764a125dcdfbbb867b02fe996f1239a8cf420693` | 9797 |
| 2 | `service_workflow_b5_f_b5_01_02_correction` | `20261115120443` | `544dd5c8cca2f3731d754b8a27e9aca4b4d02c7a5eda213bfaac55f0e46dbe89` | 10240 |

Full payloads recorded under `docs/operations/service-workflow/applied-sql/b5-staging/` (no truncated chunks).

## Post-apply deployed definitions / policies

| Check | Result |
|-------|--------|
| `review_service_report_revision(uuid,text,text,uuid)` | present |
| Correction strand gate (completed visit must have submitted revision) | **true** in live `pg_get_functiondef` |
| Terminal-job return denial | **true** in live def |
| `can_read_ticket_attachment` issued `evidence_paths` + `revision_is_customer_visible` | **true** |
| `service_report_revisions_select` | staff OR `revision_is_customer_visible` |
| anon EXECUTE review | **false** |
| authenticated EXECUTE review | **true** |
| service_role EXECUTE review | **true** |
| getter EXECUTE | authenticated only (anon/service_role revoked) |
| Direct INSERT/UPDATE/DELETE on reports/revisions/reviews/acks | revoked for anon/authenticated/service_role |

## Staging journey (Spark)

Synthetic fixtures only (`B5STG-%`). Preserve evidence; cleanup + credential retirement after Spark finishes.

1. Technician submits a report.
2. Admin/support returns that exact revision with mandatory comments.
3. Historical attending technician resubmits a new revision; original unchanged.
4. Different authorized reviewer approves/issues.
5. Owner sees eligible issued report + downloads evidence; unrelated users and unissued evidence denied.
6. While a correction is pending, last issued version remains visible.
7. Issued-history vs contract — do not treat “latest displayed” as erase of prior issued history.
8. Multiple completed visits: returned/pending alongside approved visit; remaining work still completable (no stranding).
9. `further_work_required` and outstanding visits block inappropriate completion.
10. Repeated review → no duplicate decision/audit; acknowledgment / ticket closure remain **B6**.

Keep report approval distinct from a safe return-to-service decision.

## Preview / handoff

See apply tip commit after header-label fix; handoff dir `C:\projects\_almona_handoff\slice0-b5-staging-verification`.

## Explicit non-actions

No merge · no production · no B6 · #155 frozen · #156 draft.
