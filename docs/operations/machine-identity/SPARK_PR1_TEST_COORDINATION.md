# Spark coordination — Machine Identity PR1 tests

**Freeze target:** commit that lands migration `20261111180000_machine_identity_pr1.sql` + client helpers.  
**Remote apply:** not authorized. Local disposable only.

## Already executed by Cursor (local ephemeral PG `:55434`)

| Suite | Result |
|---|---|
| Disposable battery on **production-shaped** registry (UNIQUE+NOT NULL serial, then migration) | **15/15 PASS** |
| Disposable battery on **staging-shaped** missing registry (no `machines`, no ticket `machine_id`, then migration) | **15/15 PASS** |
| Vitest `src/lib/machines/serialCanonical.test.ts` | run in same freeze |

Evidence: `.artifacts/slice0/machine-identity/disposable_pr1_results.json`

Re-run locally:

```bash
# ephemeral cluster already documented in scripts/machine-identity/run_disposable_pr1.py
python scripts/machine-identity/run_disposable_pr1.py
npx vitest run src/lib/machines/serialCanonical.test.ts
```

## Requested Spark focus (machine-specific)

1. Re-run disposable batteries independently; confirm both starting shapes.  
2. Review RPC contracts: `register_machine_identity`, `machine_duplicate_detect`, `link_ticket_machine` for authz / non-disclosure.  
3. Confirm separator-insensitive path **flags only** (no auto-link).  
4. Confirm recovery note: cannot restore UNIQUE/NOT NULL after null/duplicate serials without human remediation.  
5. Do **not** apply to staging/production.

## Out of scope for Spark this pass

Transfers, QR, passport UI, merges, staging apply, production cutover.
