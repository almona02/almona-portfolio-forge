# Cursor supporting evidence — F-B6-09 tip `da2132b6`

**Not a Spark independent verdict.** Spark alone verifies and publishes PASS/BLOCKED.

**Correction SHA:** `da2132b6f2ae6f75eed1187b7fad51ce3dbe97eb`  
**Migration:** `supabase/migrations/20261115171200_service_workflow_b6_f_b6_09_event_seq_order.sql`  
**Runner:** `scripts/service-workflow/run_cursor_b6_f09_supporting.py`  
**Harness used (unchanged Spark artifacts synced from `ebdb5eb2`):** Q6-01–Q6-47 + R6-C1–C5 logic

## Fix

`effective_acknowledgment` / `effective_acknowledgment_disposition` and prerequisite
disposition selection order by `event_seq DESC` (authoritative). Timestamps remain
for chronology/display only. Sequence defaults still fire at INSERT after
`pg_advisory_xact_lock(b6_ack:<ticket>)`.

## Supporting results on `da2132b6`

| Check | Result |
|-------|--------|
| Q6-01–Q6-47 | 47/47 PASS |
| Q6-41 | PASS |
| R6-C5 (c5a–c5c effective == max-seq) | **3/3 PASS** |
| R6-C1–C4 | 4/4 PASS |
| Cursor disposable B6-01..16 | 16/16 |
| B5 / B3 regressions | 40/40, 51/51 |

Prior tip `3e387199` remains BLOCKED on F-B6-09 per Spark. Misattributed Cursor
“Spark PASS” on that tip is withdrawn in
`B6_SPARK_INDEPENDENT_VERDICT_3e387199.md`.
