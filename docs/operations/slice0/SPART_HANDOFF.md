# Slice 0 Spart handoff — R3 freeze (post H-07 / PR-03 / R1)

## Implementation base

| Item | Value |
|---|---|
| Worktree | `C:/projects/almona-slice0` |
| Branch | `feat/service-slice0-security` |
| **Frozen implementation commit** | `7e8ac0a1` (`7e8ac0a19d782474f7c36b02ed4fc086c4abb453`) |
| Base commit | `13faec98` |
| Prior review SHAs | `06ff513b` (R1), `6bc8cb7e`, `bb40d8ab` — superseded |
| Verification | `docs/operations/slice0/VERIFICATION_REPORT.md` — Spark expanded battery **141/141 PASS** |
| Spark R2 archive | `.artifacts/slice0/spark-review-20261111-R2/` |
| Deployment package | `docs/operations/slice0/DEPLOYMENT_PACKAGE.md` |

## R3 defect disposition

| ID | Disposition |
|---|---|
| R1 | Fixed — create succeeds; optional assign gated; explicit unassigned outcome |
| H-07 | Fixed — DEFINER `can_manage_ticket_share`; no profiles-visibility dependency |
| PR-03 | Fixed — priority on protected trigger boundary |

## Reproduction

1. Diff freeze SHA vs `13faec98` (or vs `06ff513b` for R3-only delta).  
2. Apply migration + staging RLS on disposable DB with representative grants.  
3. Run `.artifacts/slice0/battery_r3.cjs` (or Spark R2 `sql/battery.cjs` with D-05 expecting priority denial).  
4. Confirm H-07, H-06, PR-01..PR-03, D-05, A-01.  

## Environment apply status

| Environment | Status |
|---|---|
| Staging Supabase `apnmoevmvihfzcnttctx` | **APPLIED** — DB/RLS/edge cutover; see `.artifacts/slice0/STAGING_EVALUATION_REPORT.md` |
| Staging Vercel client | **NOT DEPLOYED** (team grant missing) |
| Staging Python / Railway | **NOT DEPLOYED** (no non-prod Railway target; prod unauthorized) |
| Production | **NOT APPLIED** |

Deployed evaluation baseline: implementation `7e8ac0a1`; tip `c6d14a89` (docs pin only).

## Post-insert assign residual (accurate)

R1 is **already fixed** in `7e8ac0a1` (create kept; explicit `assignment.status = unassigned` on assign authz denial). Remaining risk is operational: a UI that retries **insert** after assign-only failure can duplicate tickets. Retry assign-only (or accept unassigned).

## Out of scope

Later phases, Wonder states, machine registry, squads/jobs/reports. Production cutover.
