# Hosted-auth compatibility (PR1 applied migration)

| Field | Value |
|-------|--------|
| Applied staging migration | `machine_identity_pr1_schema_atomic` (`20261111165835`) |
| Source reviewed SQL | `supabase/migrations/20261111180000_machine_identity_pr1.sql` |
| Production | unauthorized / untouched |

## Adjustment

Hosted Supabase already owns `auth.users` and auth helper procedures. Section 0 of the PR1 migration therefore:

- Creates disposable `auth.users` / `auth.uid` / `auth.jwt` stubs **only when** `to_regclass('auth.users')` / `to_regprocedure(...)` reports them absent.
- Never issues `CREATE TABLE IF NOT EXISTS` or `CREATE OR REPLACE` against hosted auth objects.

This is a **transport/environment compatibility** gate for local disposable Postgres vs hosted Auth. It does not alter application RLS, RPC authorization, or identity-guard behavior.

## Verification (no application security behavior change)

| Check | Result |
|-------|--------|
| Hosted apply skips auth DDL when `auth.users` exists | Yes (staging apply succeeded without touching auth schema) |
| Application RPCs (`register_machine_identity`, `machine_duplicate_detect`, `link_ticket_machine`) | Unchanged authz semantics |
| RLS policies on `machines` / duplicate cases / identity events | Unchanged |
| Disposable auth stubs | Local/disposable harness only — **must not be executed against hosted auth** |

## Follow-up evidence migration

`supabase/migrations/20261111190000_machine_identity_missing_serial_plate_evidence.sql` replaces only `register_machine_identity` to require persisted plate-area `photo_urls` when serial is absent. It contains **no** auth DDL. Apply on staging only after Spark passes this correction package; do not re-apply the foundation PR1 schema merely because an earlier status said pending.
