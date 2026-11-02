# Marketplace migration replay repair — 2026-11-02

Supabase Preview reported SQLSTATE 42P07 because `used_machine_listings` existed before its historical migration was recorded. Read-only catalog inspection also found the next base table, `admin_audit_log`, already present.

The two base migrations now initialize grants and policies only when creating their table. Index creation tolerates existing indexes. Marketplace bucket setup runs only for a missing bucket, and the view counter is created only if its exact signature is absent. Both migrations remain transactional and enable RLS. This preserves existing rows and later security changes, including authenticated marketplace admin DELETE, submission-ID grants, removed audit INSERT policy/permissions, storage restrictions, and hardened counter definitions/ACLs. Existing schemas are not reconciled or silently replaced.

Validation: disposable PostgreSQL 17 fresh installation, repeated replay after simulated hardening, existing row preservation, newer grants, policy/index/function preservation, and missing-counter restoration all passed. The original marketplace migration fails the same regression fixture with the reported duplicate-table error. Migration version validation passes for 76 migrations; workflow YAML parses. A dedicated marketplace-replay CI job runs the fixture alongside the existing approval-replay job.

No production rows, schema, migration history, or project settings were changed. The per-PR Supabase Preview setting was observed disabled during the preceding repair; a skipped provider check is not evidence that remote migrations applied successfully. Merge and subsequent deployment checks must be assessed separately.
