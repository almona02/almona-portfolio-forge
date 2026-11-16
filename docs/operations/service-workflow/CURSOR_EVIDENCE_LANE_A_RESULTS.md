# Cursor evidence — Lane A disposable battery + Vitest

**Label:** Cursor evidence (not Spark)  
**Contract tip:** `1350b749ffd999ef3206c9733f0bcfb47b483ce2`  
**Migration:** `supabase/migrations/20261116180000_service_routines_lane_a_authoring.sql`  
**Run date:** 2026-11-16  
**Environment:** local disposable PostgreSQL 17 on `127.0.0.1:55456` (not staging/production)

## Disposable battery

| Metric | Value |
|--------|-------|
| PASS | 24 |
| FAIL | 0 |
| TOTAL | 24 |

| check_id | status | detail |
|----------|--------|--------|
| RA-A1 | PASS | Admin draft created |
| RA-A1-cust | PASS | customer denied |
| RA-A1-sales | PASS | sales denied |
| RA-A1-tech | PASS | tech denied |
| RA-A2 | PASS | missing safety section denied |
| RA-A2-ok | PASS | published immutable |
| RA-A3 | PASS | limit w/o source denied |
| RA-A4-deny | PASS | deny list blocks override |
| RA-A4-family | PASS | family mismatch hard deny |
| RA-A4-ok | PASS | catalog model linked |
| RA-A5-hist | PASS | review history preserved / eligibility cleared |
| RA-A5-self | PASS | author self-review denied |
| RA-A6-edit | PASS | published not editable |
| RA-A6-next | PASS | next draft created |
| RA-A7 | PASS | retired |
| RA-A7-preview | PASS | preview retained |
| RA-A8-cust | PASS | customer denied |
| RA-A8-tech | PASS | technician published preview |
| RA-A9-anon | PASS | anon denied |
| RA-A10 | PASS | success audit events durable |
| RA-A11 | PASS | repeat publish idempotent |
| RA-A12 | PASS | stale draft_revision denied |
| RA-A12b | PASS | content unchanged after stale |
| RA-A13 | PASS | retired code not released |

Reproduce:

```bash
python scripts/service-workflow/run_disposable_routines.py
```

## Vitest (Cursor evidence)

```bash
npx vitest run src/lib/serviceRoutinesApi.test.ts src/components/admin/panels/ServiceRoutinesAuthoringPanel.test.tsx
```

| Metric | Value |
|--------|-------|
| Test files | 2 passed |
| Tests | 8 passed |

Covers RPC binding signatures, draft concurrency 409 mapping, list select surface, and Admin panel draft/lifecycle smoke without technician result controls.
