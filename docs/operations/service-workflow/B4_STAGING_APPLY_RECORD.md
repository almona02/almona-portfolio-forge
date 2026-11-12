# B4 staging apply + verification record

**Authorized implementation:** `6a64a01e23dd51439ddfa31243253d4050d93f30`  
**Target DB:** Supabase staging `apnmoevmvihfzcnttctx` (`almona02-staging`)  
**Preview:** Vercel `dpl_5bfdrjKDqindCoB1QZdf6u7JCd4v` → `https://almona-portfolio-forge-e841uqu93.vercel.app` (SSO-protected; bypass only in `C:\projects\_almona_handoff\slice0-b4-staging-verification\preview_access.json`)  
**Gates:** Staging only · no merge · no production · no B5 · #155 frozen · #156 draft

## Pre-apply

| Item | Result |
|------|--------|
| Staging identity | `apnmoevmvihfzcnttctx` ACTIVE_HEALTHY / PG17 |
| B1 / B2 / security remediation / B3 | Present — **not** reapplied |
| Latest B3 stamp | `20261112192533` `service_workflow_b3_f_b3_03_lock_order` |
| B4 before apply | Absent (submit/getter false) |
| Existing revisions | **0** |
| Data preflight | **CLEAN** — no incompatible rows; no invented declarations |

## Applied stamps (MCP live versions)

| Order | MCP name | `schema_migrations.version` | Notes |
|------:|----------|-------------------------------|-------|
| 1 | `service_workflow_b4_report_submission` | `20261112224008` | Columns + labour XOR CHECK + REVOKE/GRANT SELECT (payload truncated mid-file on first MCP call) |
| 2 | `service_workflow_b4_report_submission_helpers` | `20261112224059` | Evidence helpers + labour/evidence/checklist validators |
| 3 | `service_workflow_b4_report_submission_submit_rpc` | `20261112224211` | `submit_service_report_revision` |
| 4 | `service_workflow_b4_report_submission_getter_rpc` | `20261112224219` | `get_service_report_for_visit` |
| 5 | `service_workflow_b4_attachment_insert_definer` | `20261112232020` | STAGING-B4-01: DEFINER insert helper + historical attending read/workflow (see `B4_STAGING_B4_01_02_CORRECTION.md`) |

Canonical source bytes: `docs/operations/service-workflow/applied-sql/b4-staging/`. Implementation equivalence verified post-apply (RPCs, full XOR CHECK, grants).

## Post-apply verification

| Check | Result |
|-------|--------|
| submit / getter present | true / true |
| Labour XOR CHECK | `(no_labour=true ∧ length=0) ∨ (no_labour=false ∧ length≥1)` |
| anon EXECUTE submit/getter | false / false |
| authenticated EXECUTE | true / true |
| service_role EXECUTE | true / false (getter) |
| Direct INSERT/UPDATE/DELETE on revisions | revoked for anon/authenticated/service_role (postgres retains) |

## Acceptance journey (synthetic `B4STG-%`)

**11 PASS / 0 FAIL.** Real/jobless tickets unchanged (`24` before = `24` after).

| Step | Result |
|------|--------|
| 1 Submit findings/work/no_labour/verification/evidence/declaration | PASS |
| 1b Job → awaiting_review + audit | PASS |
| 2 Idempotent same client_submission_id | PASS |
| 3 Replacement tech denied after reassignment | PASS |
| 3b Historical attending may still submit | PASS |
| 4 Required-field failure (empty findings) | PASS |
| 5 Direct write denied as `authenticated` | PASS |
| 6 Customer getter omits unissued revisions/evidence | PASS |
| 7 Job complete blocked | PASS |
| 7b Ticket close not opened by B4 | PASS |
| 8 Real tickets unchanged | PASS |

UI refetch/remount: covered by Vitest at `6a64a01e` (retained). Share-token: getter EXECUTE revoked from anon.

## Preview / handoff

| Field | Value |
|-------|-------|
| Deployment | `dpl_5bfdrjKDqindCoB1QZdf6u7JCd4v` |
| URL | `https://almona-portfolio-forge-e841uqu93.vercel.app` |
| Git SHA | `6a64a01e23dd51439ddfa31243253d4050d93f30` |
| Target | staging |
| Branch env | `VITE_SUPABASE_*` preview vars for `feat/service-workflow-b1-planning` (staging project comment) |
| Handoff | `C:\projects\_almona_handoff\slice0-b4-staging-verification` |
| Cursor preview fetch | HTTP 200 app HTML |
| Session auth smoke | admin/support/technician/owner **AUTH_OK** |
| Preview share unlock | confirmed via share URL (secret not in chat) |

## Verdict correction

[`B4_INDEPENDENT_VERIFICATION_VERDICT_e203b438.md`](./B4_INDEPENDENT_VERIFICATION_VERDICT_e203b438.md) — earlier Cursor PASS marked **erroneous**; Spark **BLOCKED on F-B4-05**. Final tip verdict: [`B4_INDEPENDENT_VERIFICATION_VERDICT_6a64a01e.md`](./B4_INDEPENDENT_VERIFICATION_VERDICT_6a64a01e.md).

## Explicit non-actions

No merge · no production · no B5 · #155 frozen · #156 draft. Coordinate synthetic cleanup after Spark finishes.
