# Database and crash remediation — verified implementation status

## Production database

Five local migrations dated 2026-10-16 have been applied to production `shfsebdncjnncqqnewfj` after staging validation and the required explicit approvals. They restrict ledger and privileged RPC access, expose a minimal authenticated migration-state reader, implement workshop-customer invoices and payments with optional portal membership, add locked/idempotent manual receipt RPCs, and restore support/training/cutting-plan read contracts.

The final catalog check found zero public tables without RLS. The ledger still contains 37 events at position 37; `md5(string_agg(event_hash, ',' order by chain_position))` remains `88f02e5af6b9102390bd423985b52291`. Authorization tests used rolled-back synthetic staging fixtures, retained under `fixtures/`. No historical orders were converted into invoices automatically.

## Local application changes

- Portal quote ownership uses `user_id`; invoice/payment access relies on workshop ownership or explicit portal membership through RLS. Payment reads exclude provider responses. Dashboard errors remain errors rather than misleading zero balances, and full-account totals are grouped by currency.
- All five admin routes enforce the admin role. Customer activity no longer selects a nonexistent profile email field.
- The reproducible cut-list crash came from missing runtime engine/icon imports. Both cut-list routes now render in a browser without exceptions.
- Rollup shared preload helpers have their own runtime chunk. An automated build assertion prevents 3D chunks from entering the eager application graph. Browser checks of privacy and both cut-list routes requested no 3D chunks. PWA precache decreased from about 16.6 MB to 3,422.61 KiB / 31 entries; lazy code is cached on use.
- Resolved Vite browser environment removes server credential names and privileged Supabase tokens before bundling. This does not rotate any previously exposed credentials.
- Agent requests target the shipped `/api/v2` namespace. A packaged advisory knowledge router and Docker copies are implemented locally. Unavailable authoritative G-code validation returns 501 rather than fabricated success.
- Missing static assets are excluded from the Vercel SPA fallback; image runtime cache accepts only successful responses and uses a new cache version.

## Verification

- Final production build passed, with existing large-chunk and optional Node crypto fallback warnings.
- Four focused Vitest files: 14 tests passed (authorization, dashboard error/isolation behavior, real cut-list render, browser environment protection).
- Six Python API contract tests passed, including packaged knowledge loading, unavailable validation, missing engine, and request limits. On this Windows host the sandboxed TestClient stalled; the same tests completed outside the sandbox.
- Type regression gate passed: node project clean; app 1,765 existing errors against the 1,791-error baseline, zero new signatures/increases. This is not a type-clean result.
- Browser smoke: privacy and both cut-list routes rendered without page errors or eagerly requested 3D code.
- `git diff --check` passed.

Follow-up implementation: all four portal section loaders now clear prior-account state, ignore stale completions, and expose retry errors. Three additional tests passed for invoice retries, account-switch isolation, and rejection of browser-forged payment links. The payment-link service now fails explicitly until a server/provider integration exists; it no longer invents URLs or trusts localStorage as a payment authority. The follow-up build passed. A direct final app TypeScript run and comparison of every signature/occurrence against the Windows baseline again found 1,765 errors, zero new signatures, and zero increases; the node project had already passed unchanged. This remains a baseline comparison, not type cleanliness.

## Railway repair

User approved the staged Redis deployment, including usage charges and API redeployment. Patch `4fb13729-ab1e-4c31-bb2c-5d43582b2592` was reviewed and committed. Redis deployment `51c62dfa-ac33-4394-afb1-1b98daea1d46` succeeded, with Redis 8.2, generated credentials, and a new persistent `/data` volume. Existing volumes were retained. API deployment `2a5f8d3a-575d-4531-aa61-61df502e2de6` rebuilds the existing remote main commit with the private Redis reference; it does not contain the uncommitted local application fixes. Final API health verification is recorded below when complete.

## Remaining release work

Railway subsequently reported the API deployment as SUCCESS. Its startup logs confirm Redis cache configuration. An initial direct post-restart health command was blocked by an automatic-review quota failure. During the subsequent authorized main-release preparation, the live `/health` response confirmed database healthy, Redis healthy (check passed), and zero critical failures. Overall status remained degraded because other optional integrations are not configured.

The local frontend/backend changes have not been pushed or deployed. Do not describe this work as complete production remediation until those changes are reviewed and released. Provider settlement/payment-link generation, recurring invoice writes, portal invitation delivery, credential rotation, authoritative G-code validation, remaining missing demo assets, and the wider existing database advisor/type backlog need separate implementation or operational work. Payment provider success must never be inferred from a locally fabricated link or browser-only record. Bounded portal pagination remains necessary before a complete account-scale performance claim.

## Main release candidate

The release was reconstructed on remote main `9c0780ef`, excluding seven earlier local commits and unrelated working-tree changes. Clean-checkout verification caught five ignored runtime knowledge JSON files; these are now explicitly tracked and copied into Docker. Seventeen frontend tests, six backend contract tests, and real-engine chat/diagnosis smoke checks passed. The type regression gate passed with 1,765 existing app errors and no new signatures/increases. Publishing is authorized by the user; hosted deployment commit status must be checked after merge.
