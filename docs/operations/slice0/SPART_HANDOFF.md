# Slice 0 Spart handoff — remediation freeze (post-BLOCKED)

## Implementation base

| Item | Value |
|---|---|
| Worktree | `C:/projects/almona-slice0` |
| Branch | `feat/service-slice0-security` |
`| Implementation freeze SHA | `06ff513b` — supersedes `bb40d8ab` / `6bc8cb7e` |
| Review tip SHA |  |
| Base commit | `13faec98` (`origin/main` after #154) |
| Prior Spark verdict | **BLOCKED** on `6bc8cb7e` (B1–B4 + C1–C10) |
| Verification | `docs/operations/slice0/VERIFICATION_REPORT.md` — Spark battery **108/108 PASS** on remediated tree |
| Spark archive | `.artifacts/slice0/spark-review-20261111/` (immutable BLOCKED evidence) |
| Deployment package | `docs/operations/slice0/DEPLOYMENT_PACKAGE.md` (ordered; **not** an apply approval) |

## Defect-by-defect disposition

| ID | Disposition |
|---|---|
| B1 | Fixed — owner/definer identity gate; GUC unused |
| B2 | Fixed — helper EXECUTE + schema USAGE + audit SELECT grant |
| B3 | Fixed — owner excluded from internal notes + attachment membership |
| B4 | Fixed — assigned technician can create shares |
| B5 | Already fixed in `6bc8cb7e`; re-confirmed |
| C1–C7, C10 | Fixed (see verification table) |
| C8–C9 | Documented (not code defects) |

## Trusted mutation boundary

- Protected columns change only when `current_user` is the `service_tickets` table owner (`postgres` / `supabase_admin`) — i.e. inside SECURITY DEFINER `govern_ticket_*` RPCs.
- Callers cannot authorize mutations via `SET service_tickets.governed` (or any other GUC).
- `service_role` is **not** exempt from the trigger; backend writers must call `govern_*` with `p_actor_id` when JWT uid is absent.
- Direct HTTP inability to issue `SET` does not dismiss the DB flaw; the DB gate is closed regardless.

## Reproduction for Spart

1. Diff freeze SHA vs `13faec98` (or vs `6bc8cb7e` for remediation-only delta).
2. On disposable DB with representative grants: apply security migration + staging RLS; run Spark `battery.cjs` (or `.artifacts/slice0/battery_remediation.cjs`).
3. Confirm D-07b blocked with GUC set; O-02/O-08/G-01/H-03 pass; A-01 rollback pass.
4. Client units 17/17; Python ticket service 2/2.

## Environment apply status

**NOT APPLIED** to staging or production. Code freeze ≠ environment approval.

## Residual risks / NOT TESTED

- Live edge + Storage signed-URL round-trip: **NOT TESTED**
- Browser attachment rendering: **NOT TESTED**
- Full `supabase db reset` of entire migration history: **NOT TESTED**
- Issued 60s URLs survive revoke until expiry (by design)
- Allowlisted share free text may contain PII
- RLS package still requires explicit env approval wherever RLS is off

## Out of scope (not done)

Machine registry, squads, jobs, reports, contract workflows, Wonder new ticket states, later phases.
