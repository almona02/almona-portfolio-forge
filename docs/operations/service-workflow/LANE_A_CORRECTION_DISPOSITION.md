# Lane A correction disposition (F-01…F-04)

| Field | Value |
|-------|-------|
| Contract (unchanged) | `1350b749ffd999ef3206c9733f0bcfb47b483ce2` |
| Prior runtime freeze (retained) | `5e53ee009507b29de707be0f1eebd0252c34c9c9` |
| Prior Cursor evidence (retained) | [`CURSOR_EVIDENCE_LANE_A_RESULTS.md`](./CURSOR_EVIDENCE_LANE_A_RESULTS.md) |
| Correction tip | set at push (`git rev-parse` of this docs+runtime correction) |
| Correction Cursor evidence | [`CURSOR_EVIDENCE_LANE_A_CORRECTION_RESULTS.md`](./CURSOR_EVIDENCE_LANE_A_CORRECTION_RESULTS.md) (29/0 battery · 13 Vitest) |
| Scope | Findings only — no staging apply, merge, production, or FR-1 |

## Finding-by-finding

| ID | Finding | Disposition | Change |
|----|---------|-------------|--------|
| **F-01** | Support lacked a review UI without Admin access | **Fixed** | Route `/support/routines` with `ProtectedRoute requireRoles={['admin','support']}`; `SupportRoutineReviewPage` + `ServiceRoutineReviewPanel` (preview + record review only). `/admin` remains `requireAdmin`. Route tests: Support can review queue; Technician/Customer redirected with **no** draft content; Support still denied `/admin`. |
| **F-02** | Default starter payload used `kind` instead of required `type` / `requirement_class` | **Fixed** | `defaultRoutinePayload()` supplies `type: 'safety_gate'`, `requirement_class: 'safety_gate'`, `waivable: false`, no invented limits/tolerances/manufacturer copy/review. Vitest asserts structure. |
| **F-03** | Ambiguous `text[] \|\| text` concatenation; validation errors unclear | **Fixed** | Validator + publish path use `array_append(text[], text)`. Publish validation raises **SQLSTATE `22023`** with itemised message/`DETAIL`. Battery asserts `22023`, item text, **zero** status mutation, **zero** `routine_published` audit on deny. |
| **F-04** | Measurement source check skipped safety-section items | **Fixed** | Source-ref rule runs for measurements in **every** section. Battery: missing-source deny in inspection (`RA-A3`) and safety (`RA-A3-safety`); valid-source publish for both (`RA-A3-ok-insp`, `RA-A3-ok-safety`). |

## Evidence commands (Cursor evidence — correction)

```bash
python scripts/service-workflow/run_disposable_routines.py
npx vitest run \
  src/lib/serviceRoutinesApi.test.ts \
  src/components/admin/panels/ServiceRoutinesAuthoringPanel.test.tsx \
  src/pages/SupportRoutineReviewPage.route.test.tsx
```

## Local browser (isolated)

See [`SPARK_LANE_A_LOCAL_BROWSER.md`](./SPARK_LANE_A_LOCAL_BROWSER.md). Docker Desktop engine was **not** reachable at correction time — do not substitute staging.
