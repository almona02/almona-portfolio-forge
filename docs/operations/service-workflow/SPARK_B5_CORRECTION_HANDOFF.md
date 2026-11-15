# Spark — B5 F-B5-01/02 correction freeze (no staging apply)

**Depends on blocked freeze:** `f8fb9358e976050089cd199579a99bc0a098e0c2`  
**Correction tip:** *(stamped on commit)*  
**Migration:** `supabase/migrations/20261115140000_service_workflow_b5_f_b5_01_02_correction.sql`  
**Gates:** #155 frozen · #156 draft · **no staging apply** · no merge · no production · no B6

## Fixes

| ID | Change |
|----|--------|
| F-B5-01 | `can_read_ticket_attachment`: issued `evidence_paths` readable by ticket owner when `revision_is_customer_visible`; unissued + cross-ticket denied |
| F-B5-02 | Completion requires every completed visit to have ≥1 submitted revision; undecided `returned` denied on terminal jobs (after deciding-review checks) |

## Targeted re-verify (access-holder local)

| Suite | Result |
|-------|--------|
| Spark Q5 battery | **40/40** |
| Q5-15 / 25 / 26 / 27 / 39 | **PASS** |
| Review races C1–C3 | **3/3** |
| Cursor disposable B5 (+ F-B5 checks) | **14/14** |
| B3 / B1–B2 | **55/55** · **72 + 4 DEFER** |
| B4 regression | 27/30 — same pre-B5 Q4-07c/23/30 drifts (non-blocking) |

Runner: `python scripts/service-workflow/run_spark_b5.py` (applies B5 @ f8fb9358 then correction).

## Explicit non-actions

No staging · no merge · no production · no B6 · no full audit restart.
