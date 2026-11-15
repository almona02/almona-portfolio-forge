# B3 staging apply + verification record

**Authorized runtime:** `4e0ddd225e35ef615052214898db088b718f9e5c`  
**Target DB:** Supabase staging `apnmoevmvihfzcnttctx` (`almona02-staging`)  
**Preview:** Vercel `dpl_2grd69bNE2e2mwoNSfyqJMmCZ9xd` → `https://almona-portfolio-forge-ithk1ggd6.vercel.app` (SSO-protected; chat-pasted bypass revoked; replacement only in `C:\projects\_almona_handoff\slice0-b3-staging-verification\preview_access.json`)  
**Gates:** Staging only · no merge · no production · no B4 · #155 frozen · #156 draft

## Pre-apply

| Item | Result |
|------|--------|
| Staging identity | `apnmoevmvihfzcnttctx` ACTIVE_HEALTHY / PG17 |
| Prior tip migration | `20261112153007` profiles staff directory |
| B3 RPCs before apply | Absent |
| Slice 0 / B1 / B2 | Already present — **not** reapplied |
| Manifest | [`B3_STAGING_APPLY_MANIFEST.md`](./B3_STAGING_APPLY_MANIFEST.md) |
| Actor NULL quirk | Bounded — anon denied; service-role requires actor; authenticated NULL → JWT uid; no unauthorized access |
| Cutover | No pre-existing `start_service_job_visit`; client at runtime SHA uses 4-arg; preview deployed **after** DB chain |

## Applied stamps (MCP live versions)

| Order | Source file | MCP name | `schema_migrations.version` |
|------:|-------------|----------|-------------------------------|
| 1 | `20261112180000_…b3_visit_execution.sql` | `service_workflow_b3_visit_execution` | `20261112191932` |
| 2 | `20261112190000_…b3_visit_corrections.sql` | `service_workflow_b3_visit_corrections` | `20261112192046` |
| 3 | `20261112194500_…b3_safety_path_final.sql` | `service_workflow_b3_safety_path_final` | `20261112192133` |
| 4 | `20261112200000_…f_b3_02_ack_binding.sql` | `service_workflow_b3_f_b3_02_ack_binding` | `20261112192242` |
| 5 | `20261112201500_…f_b3_03_lock_order.sql` | `service_workflow_b3_f_b3_03_lock_order` | `20261112192533` |

Payloads + hashes: `docs/operations/service-workflow/applied-sql/b3-staging/`.  
Machine apply log: `.artifacts/slice0/service-workflow/b3-staging/apply_results.json`.

## Post-apply verification

- `start_service_job_visit(uuid, uuid, text, text)` present; **2-arg absent**
- `anon_exec=false` on B3 visit/assign RPCs; `authenticated_exec=true`
- Lock helpers `admin_private.lock_{ticket,job,visit}_hierarchy` present
- `assignment_generation` / safety binding columns present
- Protected-column triggers on `service_jobs` / `service_job_visits` retained

## Acceptance journey (synthetic only)

All steps **PASS**. Real/jobless tickets unchanged (`24` before = `24` after). Synthetic `B3STG-%` tickets deleted after run (`remaining=0`).

| Step | Result |
|------|--------|
| 1 Schedule + reschedule history | PASS (`hist=2`) |
| 2 Missing ack blocks start | PASS (`22023`) |
| 3 Failed safety blocks start | PASS |
| 4 Explicit attending-tech start | PASS (visit/job/ticket → in_progress) |
| 5 Clocks preserved on retry | PASS |
| 6 Active reassignment denied; reassign invalidates ack; fresh tech start | PASS |
| 7 Abort / no-access / return visit | PASS |
| 8 Visit complete does not complete job or close ticket | PASS |
| 9 Unauthorized start/complete denied (`42501`) | PASS |

## Preview

| Field | Value |
|-------|-------|
| Deployment | `dpl_2grd69bNE2e2mwoNSfyqJMmCZ9xd` |
| URL | `https://almona-portfolio-forge-ithk1ggd6.vercel.app` |
| Git SHA | `4e0ddd225e35ef615052214898db088b718f9e5c` |
| Target | staging |
| Protection | Vercel SSO (`all_except_custom_domains`); shareable bypass rotated into restricted handoff dir (chat paste revoked) |

Branch preview env comment documents staging Supabase binding for `feat/service-workflow-b1-planning`.

## Explicit non-actions

No merge · no production deploy · no B4 · #155 frozen · #156 draft.
