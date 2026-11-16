# Spark coordination — Machine Identity PR1 (correction pass)

**Remote apply:** not authorized. Local disposable only.  
**Migration:** `supabase/migrations/20261111180000_machine_identity_pr1.sql` (amended in correction pass).

## Correction-pass targeted tests (priority)

1. **Non-disclosure:** customer `machine_duplicate_detect` + `register_machine_identity` — foreign exact/sep must not flip customer review/`needs_staff_review`/sep flag; `foreign_match_exists` stays `null` for customers.  
2. **Staff-only duplicate audit:** `duplicate_case_opened` with `visibility=staff_only`; owner-visible events must not contain `duplicate_case_id` or foreign ids.  
3. **Catalog status:** `linked` / `uncatalogued` / `uncertain` distinct on register + row.  
4. **Technician link deferred:** assigned technician denied (including own-machine edge).  
5. **Protected identity edits blocked;** `machines.id` immutable without relying on audit FK; non-identity updates allowed without inventing edit-audit completeness.  
6. Re-run full disposable dual-shape + Spark verifier after correction commit.

## Re-run locally

```bash
# Cursor dual-shape battery (ephemeral PG :55434)
python scripts/machine-identity/run_disposable_pr1.py

# Spark independent verifier (ephemeral PG :55435 by default)
python scripts/machine-identity/spark_pr1_verify.py

npx vitest run src/lib/machines/serialCanonical.test.ts
```

## Out of scope

Transfers, QR, passport UI, merges, staging/production apply, authorized identity-correction RPC.
