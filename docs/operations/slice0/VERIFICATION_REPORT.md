# Slice 0 disposable verification report

**Date:** 2026-11-11  
**Review branch:** `feat/service-slice0-security`  
**Frozen implementation commit:** `bb40d8ab`  
**Worktree:** `C:/projects/almona-slice0`  
**Disposable engine:** Docker `postgres:17` container `almona-slice0-pg` on `127.0.0.1:54329`  
**Staging/production apply:** not performed

## Spart access

- Diff: `git show bb40d8ab` / `git diff origin/main...bb40d8ab` in worktree `C:/projects/almona-slice0`
- Handoff: `docs/operations/slice0/SPART_HANDOFF.md`
- Deployment package: `docs/operations/slice0/DEPLOYMENT_PACKAGE.md`
- This report: `docs/operations/slice0/VERIFICATION_REPORT.md`
- Logs: `.artifacts/slice0/` (local; may be gitignored)

## Checks run

### A. Migration apply (representative baseline → Slice 0)

1. Applied `disposable_baseline.sql` (pre-Slice-0 vulnerable share + public bucket + synthetic fixtures) → **PASS**
2. Applied `supabase/migrations/20261111010000_service_slice0_security_boundary.sql` → **PASS**
3. Applied `docs/operations/slice0/staging_service_tickets_rls.sql` → **PASS**

### B. Database security harness (`disposable_verify.sql`)

| Check | Result |
|---|---|
| share minimize + internal notes excluded + path-only attachments | PASS |
| expired / short tokens rejected | PASS |
| share revocation | PASS |
| direct status/assignee mutation blocked | PASS |
| authorized technician transition + audit row | PASS |
| unrelated user transition denied | PASS |
| illegal transition: no status change, no audit | PASS |
| bulk assign partial failure + success audit | PASS |
| attachment bucket private | PASS |
| legacy public URL → storage_path resolution | PASS |
| **Overall** | **PASS 10/10** |

### C. RLS visibility (JWT claim + `SET ROLE authenticated`)

| Actor | Visible tickets | Result |
|---|---|---|
| Unrelated customer B | 0 | PASS |
| Owner customer A | 2 | PASS |
| Assigned technician (staff SELECT policy) | 2 | PASS (see residual) |
| Admin | 2 | PASS |
| `anon` SELECT/UPDATE privileges | false/false | PASS |

### D. Client unit tests

`npx vitest run` on ticketMessageApi / ticketGovernanceApi / ProtectedRoute → previously **17 passed** (re-run after edge fix if touched; edge function is Deno-only).

### E. Edge function live invoke

**UNAVAILABLE / NOT RUN against Storage API** in this session: local Supabase edge runtime was stopped (`supabase status` reported `supabase_edge_runtime_*` stopped); disposable Postgres has no Supabase Storage signing endpoint.

**Static/auth contract verification (code review after fix):**

- Uses service-role client only; does not treat end-user JWT as storage authority.
- Requires share `token` (≥16) + `path`; rejects `..`.
- Rejects missing/revoked/expired shares.
- **Blocker found and fixed:** previous logic allowed any path under `{ticketId}/` with a valid token. Now requires the path to appear on a **non-internal** message attachment for that ticket.
- Signs 60s URL only after membership check; no public-bucket fallback.

## Independently verified blocker fixed

- `ticket-share-attachment`: removed ticket-folder prefix bypass (`!allowed && !path.startsWith(ticketPrefix)`). Unauthorized sibling objects under the ticket folder can no longer be signed with a share token alone.

## Residual risks / honest gaps

1. Live edge + Storage signed-URL round-trip not executed here.
2. Staff SELECT policy includes all `technician` roles (not assignee-only). Mutations remain assignee-scoped in RPCs.
3. Historical public CDN/cache URLs may still exist until bucket privacy is applied in a real Supabase project; disposable DB proved schema/policy intent only.
4. Full `supabase db reset` of entire migration history not used; baseline was a representative ticket/share/storage stub matching production shapes.

## Scope hold

No later phases started. No staging/production changes applied.
