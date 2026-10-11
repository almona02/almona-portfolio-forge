# PR #76 preparation — 2026-10-11

Scope: code preparation for independent review. No merge, branch-protection change, browser E2E, production promotion, or remote database write.

## Branch preparation

- Reviewed remote head: `f353f077a1961b478d637da21e207f290d1817f2`.
- Integrated current main: `dcdd3da6c80b6a51f9b949c42300b37453b01444` (#77 included).
- Merge checkpoint: `c18dd7fe6dac4e1dd2d132aa2a131bda1c3dd1ae`, conflict-free.
- Work performed in the isolated phone-review worktree. Cursor's primary checkout preserved.

## Review repairs

1. Require authenticated position ownership before the SECURITY DEFINER ledger read; explicitly revoke anonymous RPC execution, including Supabase's direct default grant.
2. Bind stock length to the same approved profile rather than the catalogue-wide union. Exclude pending catalogue entries, with client/server regression assertions.
3. Preserve decimal fingerprint values such as 4.2, 0.1 and 1e-7 without floating-point noise; deduplicate stock lists and pin SQL object ordering to C collation.
4. Resolve pgcrypto through the extensions schema rather than relying on uncommitted public wrappers.
5. Remove invented approved authority payload backfill from the staging column-parity migration. Missing authority remains unqualified.
6. Remove the convert fixture's redundant admin-profile insertion under authenticated owner claims; the current privilege guard remains enabled.

The new guard migration was generated with Supabase CLI. It is not applied to production or staging. The edited column-parity migration has previously been applied in staging by earlier work; editing its source does not clean up existing stored authority payloads. Promotion must reconcile that history explicitly and must not silently approve fabricated catalogue data.

## Verification

| Gate | Result |
| --- | --- |
| Focused commercial, authority, approvals, purchasing | 74/74 pass |
| Full frontend suite | 275 files pass, 2 skipped; 1800 tests pass, 4 expected failures, 14 skipped |
| Whole-source ESLint (`src --quiet`) | pass |
| Production build | pass; existing chunk-size and client node:crypto warnings remain |
| Type-check delta gate | node clean; app 1774 vs baseline 1791 (-17), no new signatures/occurrence increases |
| Owner/profile/stock pgTAP | 8/8 pass |
| Canonical serialization pgTAP | 15/15 pass |
| Authority binding pgTAP | 8/8 pass |
| Ledger/kerf pgTAP | 8/8 pass |
| Full convert pgTAP after fixture repair | NOT VERIFIED |
| Browser FINAL GOAL / manufacturing E2E | paused; not rerun |
| Fresh head GitHub CI | pending after push |

The app is not type-clean; the existing baseline was not raised. SQL assertion totals above are 39/39 from transactional runs. They do not establish full convert, manufacturing delivery, or empty-database replay acceptance.

## Local SQL test setup incident

A later convert-suite setup attempt used the shared local Docker database `supabase_db_almona-portfolio-forge`. Older prerequisite migrations contained BEGIN/COMMIT wrappers, defeating the intended outer rollback. This persisted local schema/function changes from these scripts, without migration-history entries:

- 20261009160000_fabricator_optimization_evidence_hardening.sql
- 20261009170000_fabricator_hardener_applicability_metadata.sql
- 20261010010000_fabricator_optimization_evidence_ledger_kerf.sql
- 20261010020000_fabricator_evidence_authoritative_binding.sql
- 20261010023000_canonical_jsonb_fingerprint.sql
- 20261011052158_fabricator_evidence_owner_profile_stock_guard.sql

The convert attempt then failed at its temporary-table setup before its Auth fixture insertion. No production or staging database was accessed, no authority seed was applied, and no further writes were attempted on that shared local database after the incident was identified. Do not interpret the convert attempt as rollback-only validation or remote promotion. Future SQL suites should use an isolated disposable database and account for migration transaction wrappers; do not reset the shared database to hide this drift.

## Remaining review and release limits

- One independent approval remains required; this preparation does not bypass it.
- Server ledger derivation binds saved position components and their cuttingLengths. It does not independently regenerate CAD geometry or prove vendor deductions accurate.
- Canonical key ordering parity for supplementary Unicode object keys remains unverified (JavaScript UTF-16 ordering versus SQL C collation); the shared tested vectors cover ordinary keys and Arabic/BMP values.
- Full convert suite and clean migration replay need isolated verification before claiming database release readiness.
- FP-027 DoWin ORTA remains an export blocker; Caluminium conservation fixtures do not close it.
- Production SQL requires separate authorization. No manufacturing authority seed is included.
- Readiness stays controlled pre-production; no score increase is inferred from these checks.
