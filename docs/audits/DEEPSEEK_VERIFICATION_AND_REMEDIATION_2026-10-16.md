# DeepSeek verification and implementation plan

Audit date: 2026-10-16 (Africa/Cairo). Checkout: `326a70e1`, with pre-existing local changes left intact.

## Scope and evidence

Reviewed the pasted audit summary, repository code, production Supabase catalogs and migration history, Supabase security/performance advisors, and Railway production configuration and Redis logs. The original `live/AUDIT-REPORT-almona02.md`, screenshots, JSON evidence and scripts were not supplied. The route counts, browser failures and performance measurements in that report have therefore not been independently reproduced here.

All remote operations in this audit were read-only. No customer records, production functions, infrastructure, credentials or deployment settings were changed. Local changes below are the first implementation slice, not a completed remediation of the application.

Supabase production: `almona02` / `shfsebdncjnncqqnewfj`. Staging exists as `almona02-staging` / `apnmoevmvihfzcnttctx`; its parity and suitability are not yet verified. Production reports PostgreSQL `17.4.1.064`; staging reports `17.11.0.003`.

## Findings that change the priority order

### P0: event ledger has no RLS and excessive client grants

Live catalog checks show `public.reality_events.relrowsecurity = false`. `has_table_privilege` confirms anonymous SELECT, INSERT, DELETE and TRUNCATE privileges; catalog grants also include UPDATE. Authenticated users have similarly broad grants. This is a confirmed database access-control defect; whether particular writes succeed may also depend on triggers and constraints. SQL TRUNCATE permission does not mean PostgREST exposes a TRUNCATE endpoint. No exploit or destructive probe was performed.

The ledger contains proof/payload fields and has no explicit tenant/user ownership column. Do not invent a policy based on `entity_id` without an authoritative ownership mapping. First design a server-only access boundary, review ledger writer/read-only helper functions and partitions, and revoke unnecessary public/client grants. RLS alone will not constrain SECURITY DEFINER helpers or TRUNCATE. Preserve approved backend ledger writes and verify chain integrity.

The historical `migrations/041_realityos_event_ledger.sql` revokes two application roles but does not address Supabase `anon` and `authenticated` roles. This explains how the intended boundary can diverge from live permissions.

### P0 investigation: browser-prefixed secret configuration

Railway variable **names** include `VITE_SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_DB_URL`, `VITE_SENDGRID_API_KEY` and `VITE_SMS_API_KEY`. Values were not retrieved. Names alone do not establish that deployed browser bundles contain these secrets: this Railway service builds a Python image. However, `src/lib/smsService.ts` explicitly reads `import.meta.env.VITE_SMS_API_KEY` and sends it as a browser Authorization header. If configured in the frontend build, this exposes the provider credential to users.

Inventory actual frontend build inputs and served JS without printing secret contents. Move privileged SMS/email/database operations behind authenticated server endpoints; remove secret-bearing VITE variables from frontend environments. Rotate credentials whose exposure is confirmed or suspected, including the published demo account. Rotation requires coordinated updates to consumers and session revocation where appropriate.

### P1: commercial portal suppresses database errors

Confirmed in `ClientPortalDashboard.tsx`: queries filtered `quotes.customer_id`, which does not exist, and queried missing `invoices`. Returned Supabase `error` fields were ignored, producing empty arrays and misleading zero totals.

Initial local fix changes quote filtering to the verified `quotes.user_id`, checks both returned errors, issues independent requests concurrently, shows a retryable unavailable state and suppresses stale request completion after a user change. Missing invoices still prevents this page from displaying financial totals, deliberately. This fix does not implement invoicing.

Additional accounting defect: the dashboard calculates totals from only the newest 10 invoices/quotes. Even after tables are repaired, those cannot be called account-wide totals. Implement server-side aggregates with explicit currency and status semantics; keep paginated activity separate. Order value is not paid invoice revenue and must not be substituted for it.

## Verification of DeepSeek claims

| Claim | Current evidence | Decision |
|---|---|---|
| Five missing tables | All five absent in production: invoices, payments, fabricator_cutting_plans, chat_interactions, training_enrollments | Confirmed absence; decide canonical storage before adding tables |
| Quote-to-order RPC absent | Function exists with all arguments used by the current client | Missing-function diagnosis is stale; functional execution not verified |
| Admin RPCs absent | Eleven `admin_*` functions found, including manufacturing approvals and hardener operations | Do not recreate blindly; reconcile the full original list and signatures |
| Four incorrect columns | quotes has user_id, not customer_id; profiles.email and service_tickets.referral_source absent; fabricator_projects has project_name, not name | Column mismatches confirmed; audit each caller and its intended identity |
| Admin functions insecure | Functions have anonymous EXECUTE grants; inspected approval-list function checks auth.uid() and is_admin() | Broad grants warrant hardening, but are not proof that admin checks can be bypassed |
| Profile role can be changed by its owner | Broad column grants exist, but a live protect_profile_privileges trigger blocks client privilege changes | Do not report escalation based on grants alone; add behavior tests |
| Six Prestige v1 calls are stale | Six `/api/v1` requests confirmed in usePrestigeAgent.ts | Verify response contracts against live v2 before replacing URLs |
| Backend entry point unknown | Railway builds /python_backend/Dockerfile.realistic, whose CMD is apis.main:app | Deployment target established from configured image path and repository source |
| Redis unreachable | Latest returned Railway logs on Oct 15 report DNS failure for redis.railway.internal:6379 | Confirmed in logs; one service in project inventory, no Redis service |
| Demo publishes credentials | Credentials present in AIRecommendationDemo.tsx | Removed locally; rotation still required |
| Batch cut-list invalid hook call | Page uses hooks inside a component; no immediate source-level violation established | Reproduce built route; inspect React duplication/chunk initialization before choosing fix |
| Missing GLB/JPEG assets, eager Three.js, CLS/LCP | Not remeasured in this audit; chunk rules assign react-reconciler to vendor-3d-react | Track as reported; use production bundle graph and browser evidence |
| /admin rejects admin | Current AdminDashboard checks user.role, ProtectedRoute checks authentication only | Reported redirect not reproduced; inspect profile resolution and enforce authorization consistently |
| OpenAPI/docs exposure is P0 | Public documentation alone is not evidence of an authorization vulnerability | Review API auth/rate limiting and production docs policy separately |

Direct HTTP checks of the Railway domain failed DNS resolution in this sandbox. That is a local verification limitation, not proof of an outage. Railway reports the last deployment SUCCESS (Oct 12). Redis evidence above comes from Railway runtime logs, not that failed HTTP probe.

## Database security and performance baseline

Advisor observations are timestamped Oct 15, so catalog checks are needed for current state. Counts below are findings, not necessarily distinct objects or proven exploits. `verify-db-contract-2026-10-16.sql` provides repeatable read-only catalog checks.

| Advisor category | Findings |
|---|---:|
| Anonymous-callable SECURITY DEFINER functions | 94 |
| Authenticated-callable SECURITY DEFINER functions | 99 |
| Mutable function search paths | 12 |
| Materialized views exposed to API | 7 |
| RLS enabled without policies | 3 |
| Anonymous-sign-in related warnings | 173 |
| Leaked password protection warning | 1 |
| Vulnerable PostgreSQL version warning | 1 |
| Foreign keys without covering indexes | 43 |
| RLS per-row initialization warnings | 338 |
| Multiple permissive policy findings | 301 |
| Unused index findings | 389 |

An independent live scan found one public table without RLS (`reality_events`), although the returned advisor result did not list it. Never rely on the advisor alone. No public RLS policy expression matched user_metadata/raw_user_meta_data in this scan; that does not prove all authorization code is safe.

Database size was 58 MB. A single connection snapshot showed four idle connections and one active connection plus eight background/no-state entries. These observations do not establish a capacity problem. Do not add compute or pooling infrastructure without workload evidence.

Three no-policy tables include manufacturing authority revisions and QC rules; their restricted access may be intentional through server functions. Do not add blanket read policies merely to clear an INFO notice. Likewise, never delete all 389 unused indexes: uniqueness constraints, infrequent business queries and statistics resets matter.

Railway has a volume named redis-volume mounted on the API service at /var/lib/postgresql/data and an unattached postgres-volume. A volume name does not indicate a running database. Inspect intended contents and retention requirements before moving or deleting either volume. An active TCP proxy exposes port 8000 in addition to HTTPS; confirm whether a consumer needs it before removal.

## Implementation sequence and acceptance gates

### 1. Contain security risks

- Define the ledger's supported server writer and reader paths. Prepare a migration revoking PUBLIC/anon/authenticated table, partition and sequence privileges as appropriate, enabling RLS and hardening helper function grants. Test the actual backend role before production application.
- Inventory all 94 anonymous-callable definer functions. Classify public utilities, authenticated operations, admin operations and internal helpers. Revoke PUBLIC as well as direct role grants where required; grant only intended roles. Check every overload, internal auth checks, ownership, qualified references and search paths. Avoid a blanket revoke that breaks legitimate callers.
- Inspect exposed materialized views and their grants for tenant data. Put sensitive aggregates behind authorized server functions or private schemas; a regular security-invoker view and a materialized view require different treatment.
- Remove privileged secrets from frontend execution; rotate exposed credentials, revoke relevant sessions and validate consumers. Review anonymous sign-in requirements and enable leaked-password protection where supported. Schedule PostgreSQL upgrade with backup/restore and extension compatibility validation.

Acceptance: anonymous and tenant-B users cannot read or mutate tenant-A data, self-promote, approve manufacturing operations or access internal ledger storage; legitimate server writes still work. Include negative authorization tests and inspect effective privileges after migration.

### 2. Establish a reproducible schema contract

- Reconcile root migrations/, supabase/migrations/ and the remote migration ledger. Production currently lists eleven tracked migrations; their timestamps differ from similarly named local files. This is not proof that the remaining schema was never applied; manually applied SQL may be untracked.
- Create a schema inventory of tables, columns, enums, RPC names/argument types, grants, policies, triggers and function definitions. Match callers to intended data owners and derive a reviewed migration manifest/checksums. Do not replay either entire migration tree against production.
- Rebuild a disposable database and compare it with staging before declaring a canonical tree. Use Supabase CLI-generated filenames for new migrations. Introduce a read-only contract check in CI that reports missing objects and signature drift.

Acceptance: a fresh database can be built from the agreed manifest; schema diffs are explained; generated TypeScript types match that schema; frontend callers have an explicit supported contract.

### 3. Complete commercial data and business operations

- Decide whether invoices/payments belong to existing commercial/order structures or require new ledgers. Define invoice numbering, currencies, monetary precision, allowed state transitions, tax/rounding rules, tenant ownership and immutable audit history before creating tables.
- Implement payment-provider verification on the server, idempotent webhook processing, atomic allocations/refunds and reconciliation; do not trust browser payment status.
- Replace all incorrect column references. Distinguish auth users, workshop customers and client-portal identities; a customer_id is not automatically an auth.uid(). Include pose quotes in the intended view without duplicating orders.
- Add complete-account aggregates and cursor-paginated activity, visible loading/error/empty states and safe retry. Verify quote conversion with valid durable evidence, revoked authority, stale revision, concurrent retries and changed money payloads.
- Trace the other three absent tables to supported features. Use the canonical existing storage if available; otherwise add narrow schemas with explicit grants, RLS, indexes and retention. Remove abandoned feature callers instead of creating unused tables.

Acceptance: owner sees correct quotes/invoices/payments across reloads; account totals are correct beyond ten records and per currency; repeated/concurrent conversion or payment events produce one business outcome; failures never show fabricated zero totals.

### 4. Repair API and infrastructure contracts

- Inventory live OpenAPI through an accessible network and compare every Prestige operation's request, response, authentication and error model. Migrate each v1 call to its real v2 equivalent with an adapter where contracts differ. Add integration tests, not only URL substitution.
- Repair Redis using a real reachable service or supported managed endpoint; use private networking references, bounded timeouts and failure behavior appropriate to cache, rate limiting, queues and sessions. Do not silently disable a security-critical dependency.
- Align readiness/liveness semantics and Railway healthchecks. Verify DATABASE_URL's intended server and pooling mode without exposing its value. Document API service, database and Redis ownership.
- Review TCP proxy and volume use; remove obsolete resources only after verifying dependencies and retention. Keep OpenAPI/docs access an explicit production policy.

Acceptance: all six agent actions pass authenticated integration tests; Redis health is stable under connection failure/recovery; readiness reflects required dependencies without restart storms.

### 5. Fix routes, assets and frontend performance

- Reproduce batch-cut-list in a production build with source maps; inspect React dependency identity and chunk cycles. Preserve deterministic cutting output and compare golden fixtures after any fix.
- Resolve admin profile loading and route authorization centrally, while enforcing authorization again in database/API operations. Test anonymous, customer, admin, missing-profile and expired-session cases.
- Replace missing assets with real licensed assets or supported generated geometry/fallbacks. Add a build artifact check asserting expected MIME/signatures; ensure missing static files return 404 rather than HTML.
- Measure entry dependency closure. Move Three.js/reconciler, PDF and other heavy imports behind actual route/interaction boundaries; inspect barrel exports and chunk dependency cycles. Validate both cold and warm navigation, including lazy chunk failures.
- Compress/resize marketing images, reserve dimensions and remeasure /about CLS and representative LCP. Use consistent device/network settings and compressed transfer bytes.

Acceptance: both batch demo aliases render without console exceptions; text-only routes do not request Three.js; no missing model/image response masquerades as HTML. Target field p75 LCP <= 2.5 s, CLS <= 0.1, INP <= 200 ms; lab tests are proxies until field samples exist.

### 6. Release and prevent regression

Apply each small migration to verified staging, run positive/negative RLS tests as actual API roles, inspect query plans and advisor deltas, exercise the complete measure-to-production workflow and verify restore/rollback paths. Review query latency and pg_stat_statements before adding composite/FK indexes; use bounded lock timeouts and concurrent index creation where appropriate. Convert stable RLS auth lookups to initplans and consolidate policies only after proving equivalent permissions.

Run relevant unit/integration tests, ESLint, type baseline delta and production build for changed slices. The existing type gate permits approximately 1.8k historical errors; do not refresh its baseline to hide regressions. Ship via reviewed code/migrations, then verify deployed behavior and rollback triggers. Maintain a finding register with evidence, owner, acceptance result and release revision.

## First local implementation slice

- Removed published demo username/password from AIRecommendationDemo.tsx. Credential rotation remains outstanding.
- Corrected quote ownership filter and added a fail-closed, retryable portal error state; parallelized the independent queries and ignored stale responses after auth changes.
- Added regression tests for resolved Supabase errors, retry, unauthenticated access and late responses after logout.

Validation: three portal regression tests passed; targeted ESLint exited 0 with 0 errors and 84 warnings (including existing any-typed commercial UI); git diff --check passed. The type baseline gate passed with 1770 app errors versus a 1791 baseline, zero new signatures and zero occurrence increases; the node project was clean. This is not a type-clean result. The repeatable SQL audit was executed successfully against production. Production remains unchanged; missing invoicing and the database security findings remain open until the staged work above is completed.

## Reference documentation

Production build generated the client and PWA service worker. Warnings include browser externalization of node:crypto in validateOptimizationEvidencePayload.ts, oversized chunks, and an unknown manualChunks input option during service-worker generation. PWA reports 380 precache entries totaling 16588.51 KiB; review install/update transfer cost and selective precaching as part of phase 5. A successful build does not validate browser execution of the crypto-dependent path.

- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Database function privileges and security](https://supabase.com/docs/guides/database/functions)
- [Database linter and remediation](https://supabase.com/docs/guides/database/database-linter)

The Supabase changelog markdown endpoint could not be read by the web tool (unsupported text/markdown); current RLS/function documentation was retrieved through Supabase's documentation connector. Recheck relevant release notes before schema implementation.
