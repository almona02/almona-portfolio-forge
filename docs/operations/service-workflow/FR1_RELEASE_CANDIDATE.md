# FR-1 release candidate

**Branch:** `release/fr1-slice0-share-privacy`  
**Freeze tip:** `e17858a59c64426af6067d1ec114e311673daad9`  
**Draft PR:** https://github.com/almona02/almona-portfolio-forge/pull/158 (**keep draft** pending explicit production authorization)  
**Base:** `#155` tip `ca9f5067` (ancestor) — **leave #155 unmerged**; close superseded when #158 is the sole vehicle  
**Staging branch:** `feat/service-workflow-b1-planning` — **untouched** (evidence preserved)  
**Gates:** No merge · no production apply · no deployment-setting changes  
**Production packet:** [`FR1_PRODUCTION_APPROVAL_PACKET.md`](./FR1_PRODUCTION_APPROVAL_PACKET.md)  
**Backup/PITR:** org plan API = **free** → platform daily backups/PITR **not entitled/unverified**; `ACTIVE_HEALTHY` ≠ backup. Logical dump + proven restore required before authorization.

## Revisions

| Revision | Role |
|----------|------|
| `d3ef35d4` | **Spark independent content PASS** — preserve |
| `e17858a5` | **Freeze tip** — CVE pins + fallback tests; CI terminal green (33 aggregated = 31 check-runs + 2 Vercel statuses) |

## Scope (included)

| Layer | Content |
|-------|---------|
| Python | F-B7-01/02 ticket read scope + internal-note privacy (`96f1d833` + FR-1 hardening when `service_jobs` / `service_job_visits` absent) |
| Python tests | `test_fr1_missing_workflow_tables.py` — missing optional workflow tables **fail closed**; unrelated DB errors **propagate** |
| Deps (follow-up) | `dnspython==2.9.2` (CVE-2026-128089); `opentelemetry-api/sdk/proto==1.45.2` + instrumentation/semconv `0.66b2` (CVE-2026-126360) |
| DB | Package B RLS as `20261111201000_service_tickets_rls_enablement.sql` |
| DB | F-B7-04 null-safe revoke/escalate → `20261115190000_fr1_f_b7_04_null_auth.sql` |
| DB | F-B7-03 share audit → `20261115190100_fr1_f_b7_03_share_audit.sql` |
| FE | `createShare` via `create_ticket_share` RPC (+ unit test) |
| Edge | `ticket-share-attachment` fail-closed `record_ticket_share_attachment_access` |

## Explicitly excluded

B1–B6 workflow schema/RPCs, B2 visit-state/UI, B5–B7 journey fixtures, parts fulfillment, routines product/implementation.

## Dependency inspection (FR-1 features)

| Fix | Needs from #155 | Does **not** need |
|-----|-----------------|-------------------|
| F-B7-01/02 | `service_tickets`, `ticket_messages`, `profiles`, Python ticket services | `service_jobs` / visits (optional; FR-1 treats missing as no job scope) |
| F-B7-04 | `revoke_ticket_share`, `govern_ticket_set_escalated`, `admin_private.caller_*` | Workflow tables |
| F-B7-03 | `ticket_shares`, `ticket_governance_audit`, `can_manage_ticket_share`, messages | Workflow tables |
| RLS package | `st_assigned_or_staff` from Slice 0 | Workflow tables |

## Apply order (prod packaging)

```text
A 20261111010000_service_slice0_security_boundary.sql
C 20261111180000_machine_identity_pr1.sql
D 20261111190000_machine_identity_missing_serial_plate_evidence.sql
E 20261111200000_staging_machine_photos_and_ticket_number.sql
B 20261111201000_service_tickets_rls_enablement.sql
F7-04 20261115190000_fr1_f_b7_04_null_auth.sql
F7-03 20261115190100_fr1_f_b7_03_share_audit.sql
+ edge ticket-share-attachment (FR-1 tip)
+ app tip = this branch HEAD
```

Lexicographic migrate order on a fresh DB: A → C → D → E → B (RLS) → F7-04 → F7-03.

## Verification

| Check | Artifact |
|-------|----------|
| Spark content | **PASS on `d3ef35d4`** (preserved) |
| Python privacy unit | `python_backend/tests/test_ticket_access_scope.py` |
| Python missing-table fallback | `python_backend/tests/test_fr1_missing_workflow_tables.py` |
| FE share RPC unit | `src/lib/ticketMessageApi.test.ts` |
| Disposable SQL battery | `scripts/service-workflow/run_disposable_fr1.py` → **14 PASS / 0 FAIL** on packaging tip |
| Required CI | Must be green on **exact follow-up HEAD** (draft PR) |
| Backup/restore | Still required before production authorization |

## Spark

- Content acceptance evidence: `d3ef35d4`  
- Narrow follow-up: [`SPARK_FR1_FOLLOWUP_DEPS_FALLBACK.md`](./SPARK_FR1_FOLLOWUP_DEPS_FALLBACK.md)  
- Original full handoff (historical): [`SPARK_FR1_RELEASE_CANDIDATE_REVIEW.md`](./SPARK_FR1_RELEASE_CANDIDATE_REVIEW.md)
