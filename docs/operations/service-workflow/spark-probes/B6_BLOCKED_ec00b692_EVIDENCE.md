# Preserved evidence — B6 BLOCKED at `ec00b692`

**Freeze:** `ec00b692af10629ed5ee506bbb35762ea5ea00a8` (stamp `395c2481b8901c8532ba4251c0217619b5842f89`)  
**Verdict:** BLOCKED (Spark independent, disposable only)  
**Retained results JSON:** `B6_BLOCKED_ec00b692_RESULTS.json` (copy of Spark `spark_b6_results.json`; no secrets)

This baseline is preserved separately from later correction tips. Do not treat correction work as rewriting this BLOCKED record.

## Component summary (as reported)

| Suite | Result |
|-------|--------|
| Spark B6 Q6-01–Q6-40 | 37/40 PASS (FAIL Q6-11, Q6-13, Q6-17) |
| Races R6-C1–C4 | 4/4 PASS |
| Cursor disposable B6 | 9/9 PASS (pre-correction claim) |
| Regressions B5 / B4 / B3 / B1–B2 | 40/40 · 27+3 known · 51/51 · 72+4 DEFER |
| Untouched B6 clean-apply | PASS |

## Failures that drove correction

- **Q6-11** — duplicate contact follow-ups accepted (F-B6-05)
- **Q6-13** — unavailable overwrote accepted (F-B6-03)
- **Q6-17** — stale disposition allowed close after re-refuse (F-B6-04)

Plus UI blockers F-B6-UI-01/02 (fabricated attempts; first-head targeting) recorded in the review narrative.
