# Cursor evidence — Lane A correction (F-01…F-04)

**Label:** Cursor evidence (not Spark)  
**Contract tip (preserved):** `1350b749ffd999ef3206c9733f0bcfb47b483ce2`  
**Prior freeze (retained):** `5e53ee009507b29de707be0f1eebd0252c34c9c9`  
**Prior evidence (retained):** [`CURSOR_EVIDENCE_LANE_A_RESULTS.md`](./CURSOR_EVIDENCE_LANE_A_RESULTS.md)  
**Run date:** 2026-11-16  
**Environment:** local disposable PostgreSQL 17 on `127.0.0.1:55456` (not staging/production)

## Disposable battery

| Metric | Value |
|--------|-------|
| PASS | 29 |
| FAIL | 0 |
| TOTAL | 29 |

New/extended checks: `RA-A3-22023`, `RA-A3-nomut`, `RA-A3-safety`, `RA-A3-ok-insp`, `RA-A3-ok-safety` (plus prior RA-A1…A13 still green).

```bash
python scripts/service-workflow/run_disposable_routines.py
```

## Vitest

```bash
npx vitest run \
  src/lib/serviceRoutinesApi.test.ts \
  src/components/admin/panels/ServiceRoutinesAuthoringPanel.test.tsx \
  src/pages/SupportRoutineReviewPage.route.test.tsx
```

| Metric | Value |
|--------|-------|
| Test files | 3 passed |
| Tests | 13 passed |

Includes F-01 route access matrix and F-02 default payload structure.
