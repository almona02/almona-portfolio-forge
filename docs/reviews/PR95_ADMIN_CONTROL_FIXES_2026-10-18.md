# PR95 admin control fixes — 2026-10-18

## Implemented

- Replace the nonfunctional role picker with the existing Radix Select, accessible user-specific names, confirmation and a pending state.
- Load users through an authenticated admin-only Edge Function, with pagination, search and explicit errors. Use existing `username` instead of the nonexistent `profiles.email` column.
- Validate the JWT with Auth and read admin authority from the database. Never accept actor identity from the request body or expose a service key in frontend code.
- Change roles through a service-role-only, SECURITY INVOKER RPC. It rechecks the actor under locks, rejects self-role changes, validates target/role and atomically records the change. Existing browser privilege protections remain unchanged. Add the already advertised `support` enum value.
- Remove best-effort browser audit writes. Database triggers record actual product price changes and ticket assignment/status/priority changes, including bulk product changes as one entry per changed product. A failed audit insertion rolls back its business update. Browser audit INSERT is revoked.
- Show actors, full entity IDs and audit-loading errors. Historical browser-generated entries cannot be retroactively authenticated; missing actors are labeled legacy.
- Neutralize spreadsheet formula prefixes before CSV quoting; retain quote/newline escaping. Reject negative/non-finite bulk prices.
- Surface technician query errors and count all unresolved statuses as open, including in-progress and waiting tickets.

## Deployment order

1. Apply the PR's original `20261018001000_admin_audit_log.sql` migration, then `20261018122551_admin_control_security.sql`. Use the project's normal migration review/release procedure; no migration was applied by this task.
2. Deploy `supabase/functions/admin-users` with JWT verification enabled (`supabase/config.toml`). It uses the standard server-side `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables. Never add the service key to Vite variables.
3. Deploy the frontend. Until the function is available, Users & Roles displays an unavailable/retry state, not an empty successful result.

The authority for these changes is the Supabase migration tree already used by PR95. Existing production migration history must be checked before deployment; this task did not establish the state of a live database.

## Validation and limits

Per the user's request, no test suites were run or rerun. The app baseline type gate passes with no new signatures (1,757 existing errors against a 1,791 baseline); this is not a type-clean result. Targeted lint reports zero errors. Edge Function TypeScript syntax transpilation reports zero errors; this does not replace Deno type/runtime validation.

The local Supabase status command failed because the Docker Linux engine is not running; no local database query/advisors or migration execution could be performed. No production data was modified and no function was deployed. Before release, verify anonymous/non-admin denial, successful admin changes plus audit rows, self-demotion denial, browser RPC/INSERT denial, and rollback when an audit insert fails. Existing PR CI failures were not rerun or bypassed.

PR97 remains separate. When integrating both PRs, preserve the new Technicians, Users & Roles and Audit Log section IDs in PR97's shared `adminNavigationItems` inventory.
