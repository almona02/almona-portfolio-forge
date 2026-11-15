# Spark — B6 freeze handoff (no staging apply)

**F-B6-08 correction tip:** `3e387199dcca327a218e8371e24ee69310e55bf4` — migration `…171100`  
**Spark independent verdict:** **PASS** — `spark-probes/B6_SPARK_INDEPENDENT_VERDICT_3e387199.md`  
**Cursor supporting only:** `spark-probes/B6_3e387199_CURSOR_SUPPORTING.md` (also: former `B6_3e387199_SPARK_RESULTS.md` was Cursor-authored; superseded)  
**Prior integrity tip (F-B6-08 FAIL evidence preserved):** `9998f1a48f1b18b467bc1e4d3552ced5e32325a4` — `spark-probes/B6_9998f1a4_SPARK_RESULTS.md`  
**Docs stamp:** `585b0281f79dce3cc23d737556444e950646169f`  
**Harness sync tip:** `d360ed23192579d309ad31ced1ed8c5fcc570962`  
**Correction tip (historical):** `0b07aa8d00f88effd2b5775e23f097526923f6d3` — F-B6-03/04/05 + UI-01/02; BLOCKED F-B6-06/07  
**Depends on:** B5 accepted `2a4042ad44d9234739f514720c3d413ea0ca42e8`  
**BLOCKED baseline (preserved):** `ec00b692af10629ed5ee506bbb35762ea5ea00a8` — `spark-probes/B6_BLOCKED_ec00b692_EVIDENCE.md`  
**Gates:** #155 frozen · #156 draft · **no staging apply** · no merge · no production · no B7

## Ask

Independent Spark verdict on runtime freeze `9998f1a4` only. Do **not** apply B6 to staging. Disposable/local verification is sufficient. Preserve prior BLOCKED verdicts as historical evidence; they do not cover this tip.

## Harness attribution (do not conflate)

| Suite | Path | Owner | Scope |
|-------|------|-------|-------|
| Spark independent Q6-01–Q6-43 | `scripts/service-workflow/spark_b6_battery.sql` + `run_spark_b6c.py` (+ `run_spark_b6.py`) | Spark | Full battery restored from `b6500999`; concurrency R6-C1..C4 |
| Spark matrix (historical) | `scripts/service-workflow/b6_ack_matrix.md` | Spark | Verdicts on freeze/`0b07aa8d`; preserve separately |
| Cursor targeted supporting | `scripts/service-workflow/cursor_b6_targeted_battery.sql` + `run_cursor_b6_targeted.py` | Cursor | Short 7-check smoke only — **not** equivalent to Q6-01–Q6-43 |
| Cursor docs matrix | `docs/operations/service-workflow/b6_ack_matrix.md` | Cursor | Supporting contract notes |
| Cursor disposable | `scripts/service-workflow/disposable_b6_battery.sql` | Cursor | Supporting |

Cursor’s prior “7/7” claim is the targeted supporting suite only.

## Scope checklist

1. Customer ack of exact issued revision: `accepted` / `refused` (+ comment).
2. Append-only + derived effective response; repeats idempotent; later responses preserve history.
3. `unavailable` only with attributable contact evidence under contact policy (no hardcoded 7-day SQL rule).
4. Refusal → audited manager disposition before close; never convert refusal/unavailable → acceptance.
5. Closure checks required jobs, completing issued reports, visits/reviews, ack/disposition, resolution summary, permitted state.
6. Optional jobs need not complete; active attendance + pending reviews must be settled.
7. Named prerequisite failures via trusted backend.
8. Enforce on every close/resolve entry point; legacy jobless retained; activated cannot bypass.
9. Concurrency-safe/atomic ack, disposition, resolve/close + audit where one operation.
10. Customer acknowledgment UI + manager prerequisite/closure UI.

## Integrity focus for `9998f1a4` (Spark)

1. **Q6-41:** deterministic effective acknowledgment under tied timestamps, including concurrent competing responses and rollback. `event_seq` must reflect a defined serialized order; a sequence alone must not be assumed to prove commit order (same-ticket writers take `pg_advisory_xact_lock` before insert).
2. **Q6-42:** authorized re-close preserves `closed_at` and emits no duplicate workflow/governance audit. Authorization must still run before an idempotent return.
3. **Q6-43:** actual closure audit-failure rollback remains intact.
4. Structured `entity_id` targets the correct outstanding/refused revision; missing or stale targets fail safely.
5. Previously accepted five corrections and relevant regression/concurrency checks remain green.

## Artifacts

| Kind | Path |
|------|------|
| Contract | `docs/operations/service-workflow/B6_ACKNOWLEDGMENT_CLOSURE_CONTRACT.md` |
| Permission matrix | `docs/operations/service-workflow/B6_PERMISSION_MATRIX.md` |
| Contact policy | `docs/operations/service-workflow/B6_ACKNOWLEDGMENT_CONTACT_POLICY.md` |
| Migration | `supabase/migrations/20261115160000_service_workflow_b6_acknowledgment_closure.sql` |
| Disposable | `scripts/service-workflow/disposable_b6_battery.sql` + `run_disposable_b6.py` |
| Spark harness | `spark_b6_battery.sql` + `run_spark_b6c.py` + `b6_ack_matrix.md` (under `scripts/service-workflow/`) |
| Cursor supporting | `cursor_b6_targeted_battery.sql` + `run_cursor_b6_targeted.py` |
| UI | `CustomerReportAcknowledgmentPanel`, `TicketWorkflowClosurePanel` (wired on `TicketDetailPage`) |
| Vitest | `CustomerReportAcknowledgmentPanel.b6.test.tsx`, `TicketWorkflowClosurePanel.b6.test.tsx` |
| Migrations | `…160000` B6 · `…170000` F-B6-03/05 · `…171000` integrity · `…171100` F-B6-08 auth-before-reclose |

## Explicit non-actions

No staging apply · no preview redeploy for B6 · no production · no merge · no auto-closure · no closed-ticket reopening · no contract scheduling · no routine-editor · no B7.
