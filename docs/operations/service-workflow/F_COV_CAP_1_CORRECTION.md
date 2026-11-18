# F-COV-CAP-1 correction

**Against:** `e2a2f525cba0feb7238bfd6d89d866e0cd13560f`  
**Finding:** Silent `EXIT WHEN v_seq > 500` in generate + schedule list truncated eligible Cairo-window candidates (e.g. 895 daily dues) without status or continuation.  
**Correction migration:** `supabase/migrations/20261118220000_service_coverage_f_cov_cap_1.sql`  
**Migration SHA-256 (LF):** `7f463441037eb83f3e6125870dd0d5849c8db47c59ef6dfe4c8bc06b2ad8e336`

## Behavior

- Removes silent truncation.
- Accepted window unchanged: `[start_date, least(as_of+90d, inclusive end_date)]`.
- `p_batch_limit` NULL → process/list **all** eligible candidates; `status=complete`.
- `p_batch_limit` > 0 → at most that many eligible rows this call; `status=incomplete` + `continuation{coverage_id,next_sequence}`.
- Repeat with continuation until `complete`; no gaps, no duplicate sequences; atomic one-occurrence path preserved.

## Evidence (Cursor disposable)

| Layer | Result |
|-------|--------|
| CR-01…CR-16 | **22/22 PASS** (preserved) |
| 8-worker concurrent generate | **PASS** (preserved) |
| F-COV-CAP-1 battery | **10/10 PASS** (895 schedule/gen+cont, 500/501 boundaries, idempotent re-run) |

Artifact: `.artifacts/slice0/service-workflow/disposable_coverage_results.json`

## Browser environment (separate)

See [`COVERAGE_BROWSER_ENVIRONMENT.md`](./COVERAGE_BROWSER_ENVIRONMENT.md). Not a claim of a browser pass for this correction stamp.

## Non-claims

No staging apply · no production · no merge · no FR-1 · no scope expansion beyond F-COV-CAP-1.
