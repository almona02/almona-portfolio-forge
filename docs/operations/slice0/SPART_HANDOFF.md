# Slice 0 Spart handoff — service security boundary

## Implementation base

| Item | Value |
|---|---|
| Worktree | `C:/projects/almona-slice0` (isolated; original workspace untouched) |
| Branch | `feat/service-slice0-security` |
| Review freeze SHA | `bb40d8ab` (+ edge-function membership fix commit after verification) |
| Base commit | `13faec98` (`origin/main` after #154) |
| Spec reference | Wonder manual-machines spec (target product; **not** implemented beyond existing ticket states) |
| Verification | `docs/operations/slice0/VERIFICATION_REPORT.md` — disposable DB **PASS 10/10**; live edge invoke **unavailable** |
| Deployment package | `docs/operations/slice0/DEPLOYMENT_PACKAGE.md` (ordered; not an apply approval) |

## Personally revalidated on implementation base / deployed envs

- Deployed Prod + Stage `get_shared_ticket` returned full `row_to_json` + all messages (**verified via authorized SQL**, no customer rows dumped).
- Stage `service_tickets.relrowsecurity = false` (**verified**).
- Stage `ticket-attachments.public = true` + anon `ticket-attachments-public-read` (**verified**).
- Client technician + bulk assign bypassed governance (**verified in code** on `13faec98`).
- `TicketGovernanceService` is browser-side (**verified**); not a trusted boundary alone.

## Diff summary (Slice 0 only)

1. `supabase/migrations/20261111010000_service_slice0_security_boundary.sql` — share allowlist + revocation, private attachments, governed RPCs, protected-column trigger, atomic `ticket_governance_audit`, revoke anon table access.
2. `docs/operations/slice0/staging_service_tickets_rls.sql` + `STAGING_RLS_REMEDIATION.md` — **prepared, not applied**.
3. `supabase/functions/ticket-share-attachment` — signed URL for share viewers; **no public download fallback**.
4. Client: `ticketGovernanceApi`, technician/admin/bulk/status paths, ProtectedRoute roles, attachment path/signed URL API, UI removal of `pending_approval` / reopen/close-from-open invalid tech actions.
5. Tests: Vitest unit + SQL checklist under `supabase/tests/service_slice0_security_boundary_test.sql`.

## Explicit product decisions documented in Slice 0

- `pending_approval` and reopen-from-closed: **removed from UI / rejected by RPC** until Wonder policy + DB enforcement land.
- Technician decline uses FSM-valid `assigned → cancelled` (not `open`).
- Bulk assign partial-failure: per-id errors collected; successes audited; client returns succeeded rows and warns on partial.

## Reproduction for Spart

1. Review migration SQL (DEFINER `search_path`, grants, caller checks).
2. On disposable DB: apply security migration + staging RLS SQL; run `supabase/tests/service_slice0_security_boundary_test.sql`.
3. Negative cases: direct `UPDATE service_tickets SET status=...` as authenticated → blocked; anon SELECT → denied after RLS package; share token expired/revoked/short → error; internal note absent from share payload; attachment public URL 404 after private bucket.
4. Positive cases: assigned technician `govern_ticket_transition` to `in_progress`; admin `govern_ticket_assign`; bulk with one bad id → partial.

## Environment apply status

**NOT APPLIED** to staging or production. Code approval ≠ environment approval.

## Residual risks

- Existing message JSON may still contain historical public URLs; share RPC strips them, but old CDN/cache URLs may linger until bucket privacy fully propagates.
- Legacy flat storage paths (pre-scoped uploads) are readable only by staff under new storage policy — owners may need re-upload for customer self-serve download.
- `service_tickets` table-wide UPDATE grant remains for non-protected columns; trigger is the enforcement for status/assignee. Column privilege surgery alone was intentionally not relied upon.
- Staging RLS package not applied; Stage remains exposed until env approval.
- Live DB authorization tests against staging/prod **blocked** by no-apply rule; Vitest covers client contracts only.

## Out of scope (not done)

Machine registry, squads, jobs, reports, contract workflows, Wonder new ticket states, attachment create-persistence on ticket wizard.
