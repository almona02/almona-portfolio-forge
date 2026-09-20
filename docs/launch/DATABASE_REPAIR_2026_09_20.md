# Launch database repairs — 20 September 2026

Applied sequentially in the authenticated Supabase SQL Editor to project
`shfsebdncjnncqqnewfj` (`almona02`, production). The live schema, policies and
function definitions were inspected first. No customer records were deleted.
The three forward migrations below are the reproducible source of the repairs;
they were executed manually, not through the Supabase CLI migration ledger.

## 1. Profile privileges

`20260920000100_protect_profile_privileges.sql` protects profile inserts and
updates against browser changes to role, verification, identity and workshop
membership. Normal profile edits remain possible. Trusted server administration
remains possible. The deployed policy called `Service role can insert profiles`
actually applied to PUBLIC; it now applies only to `service_role`. Browser
TRUNCATE, REFERENCES and TRIGGER privileges on profiles were revoked.

## 2. Quote schema

`20260920000200_align_quote_api.sql` permits backend-created guest quotes without
opening anonymous table access. It replaces the deployed MAX()+1 numbering
function with a sequence to avoid collisions between RLS-isolated users and
concurrent inserts. Existing quote identifiers are preserved.

The live quote-items table also lacked the API's service field and required
product names and numeric prices that the API did not always supply. The repair
adds `service_id` and `price_pending`, fills missing product labels from the
catalogue, retains external service codes, and explicitly marks unpriced items.
Compatibility triggers support the currently deployed backend. Zero numeric
placeholders on pending-price lines must not be interpreted as approved prices.
Existing line names/prices and existing contact values are preserved.

## 3. Registration

`20260920000300_repair_registration.sql` uses the verified live `plan_type`
subscription schema and removes exception swallowing from signup. Failed
profile/subscription creation now rolls back the signup transaction rather than
leaving an incomplete account. Backfill inserts missing records only.

Before repair: **0 missing profiles, 1 missing subscription**.
After repair: **0 missing profiles, 0 missing subscriptions**.
Existing paid subscriptions are not overwritten.

## 4. Application alignment

The quote service now sends a non-null total and the legacy `contact_info`
representation alongside API contact columns. Frontend quote types include the
API fields and nullable guest owner; quote-item types include service and
pending-price fields. This is targeted alignment, not regeneration of the
entire database type file. The historical quote migration no longer suppresses
SQL failures; migration 024 no longer reintroduces the wrong subscription field.

Application source changes require normal branch/backend deployment. The live
SQL compatibility repair is already active independently of that deployment.

## Verification

All ten read-only checks in `scripts/verify_launch_database.sql` passed in
production: enabled profile guard, blocked browser truncation, service-only
policy, nullable quote owner, sequence numbering, both compatibility triggers,
zero missing profiles/subscriptions, no swallowed signup errors, and RLS enabled
on profiles, quotes, quote_items and subscriptions.

Local PostgreSQL 17 regression checks in `tests/sql/launch_database_regression.sql`
passed against the repository's initial schema. They cover normal edits,
self-promotion/self-verification/workshop protection, cross-user isolation,
trusted server updates, guest and owned quotes, legacy API payloads, product and
unpriced service lines, contact preservation, unique seven-digit numbering,
signup rollback, missing-record backfill, paid-plan preservation, and applying
each migration twice. The test requires an explicitly disposable local database
named `almona_launch_regression`; never run it on production.

Four isolated Python quote-service tests and six frontend quote tests passed.
The database type file passed a standalone strict TypeScript check and ESLint.
`scripts/test_quote_service_isolated.py` loads the real service/repository/error
code without starting unrelated ERP/ML routers; it is not a full backend test.
No live customer enquiry, email, or signup was submitted as a test.

This verification covers these repairs, not a complete security audit of all
project tables, RPCs, routes or commercial workflows.
