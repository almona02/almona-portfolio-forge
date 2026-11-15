# FR-1 release candidate

**Branch:** `release/fr1-slice0-share-privacy`  
**Base:** `#155` frozen tip `ca9f5067`  
**Staging branch:** `feat/service-workflow-b1-planning` — **untouched** (evidence preserved)  
**Gates:** No merge · no production apply · no deployment-setting changes  
**Backup/PITR:** unresolved production prerequisite (not claimed available)

## Scope (included)

| Layer | Content |
|-------|---------|
| Python | F-B7-01/02 ticket read scope + internal-note privacy (`96f1d833` + FR-1 hardening when `service_jobs` / `service_job_visits` absent) |
| DB | Package B RLS as `20261111201000_service_tickets_rls_enablement.sql` |
| DB | F-B7-04 null-safe revoke/escalate → `20261115190000_fr1_f_b7_04_null_auth.sql` |
| DB | F-B7-03 share audit → `20261115190100_fr1_f_b7_03_share_audit.sql` (lexicographic order = apply order) |
| FE | `createShare` via `create_ticket_share` RPC (+ unit test) |
| Edge | `ticket-share-attachment` fail-closed `record_ticket_share_attachment_access` |

## Explicitly excluded

B1–B6 workflow schema/RPCs, B2 visit-state/UI, B5–B7 journey fixtures, parts fulfillment, routines product.

## Dependency inspection

| Fix | Needs from #155 | Does **not** need |
|-----|-----------------|-------------------|
| F-B7-01/02 | `service_tickets`, `ticket_messages`, `profiles`, Python ticket services | `service_jobs` / visits (optional; FR-1 treats missing as no job scope) |
| F-B7-04 | `revoke_ticket_share`, `govern_ticket_set_escalated`, `admin_private.caller_*` | Workflow tables |
| F-B7-03 | `ticket_shares`, `ticket_governance_audit`, `can_manage_ticket_share`, messages | Workflow tables |
| RLS package | `st_assigned_or_staff` from Slice 0 | Workflow tables |

## Apply order (prod packaging)

```text
A 20261111010000_service_slice0_security_boundary.sql
B 20261111201000_service_tickets_rls_enablement.sql   ← packaged from ops SQL
C 20261111180000_machine_identity_pr1.sql
D 20261111190000_machine_identity_missing_serial_plate_evidence.sql
E 20261111200000_staging_machine_photos_and_ticket_number.sql
F7-04 20261115190000_fr1_f_b7_04_null_auth.sql
F7-03 20261115190100_fr1_f_b7_03_share_audit.sql
+ edge ticket-share-attachment (FR-1 tip)
+ app tip = this branch HEAD
```

Lexicographic migrate order on a fresh DB: A → C → D → E → B (RLS) → F7-04 → F7-03. RLS after A is required before ticket UI authz.

## Verification

| Check | Artifact |
|-------|----------|
| Python privacy unit | `python_backend/tests/test_ticket_access_scope.py` |
| FE share RPC unit | `src/lib/ticketMessageApi.test.ts` |
| Disposable SQL battery | `scripts/service-workflow/run_disposable_fr1.py` → **14 PASS / 0 FAIL** (local ephemeral PG17; results in `.artifacts/fr1-rc/disposable_fr1_results.json`) |
| Rollback / forward-recovery assumptions | See Spark handoff § Recovery |
| Required CI | Must be green on **this branch HEAD** (draft PR) |

## Spark

Independent review required before any production proposal — [`SPARK_FR1_RELEASE_CANDIDATE_REVIEW.md`](./SPARK_FR1_RELEASE_CANDIDATE_REVIEW.md).
