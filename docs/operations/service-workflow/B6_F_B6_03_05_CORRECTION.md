# B6 — F-B6-03 / F-B6-04 / F-B6-05 + UI correction

**Integrity tip:** `9998f1a48f1b18b467bc1e4d3552ced5e32325a4`  
**Correction tip:** `0b07aa8d00f88effd2b5775e23f097526923f6d3`  
**Depends on:** B6 freeze `ec00b692` (stamp `395c2481`) · Spark BLOCKED findings  
**Gates:** #155 frozen · #156 draft · disposable/local only · **no staging apply** · no merge · no production

## Server (narrow migrations)

`supabase/migrations/20261115170000_service_workflow_b6_f_b6_03_05_correction.sql`  
`supabase/migrations/20261115171000_service_workflow_b6_integrity_targeting.sql`

| ID | Fix |
|----|-----|
| F-B6-03 | `record_service_acknowledgment_unavailable` only when effective ∈ {NULL, unavailable} |
| F-B6-04 | Disposition must bind to current refusal (`acknowledgment_id`) |
| F-B6-05 | Contact attempts distinct by `(attempted_at, channel)` |
| Integrity | `event_seq` tie-break; re-close preserves `closed_at`; no duplicate closure audit |
| Targeting | `evaluate_ticket_workflow_prerequisites` returns structured `entity_id` |

## UI (F-B6-UI-01 / F-B6-UI-02)

`TicketWorkflowClosurePanel`: staff-entered contact attempts only; targets via `entity_id` only (never first-head fallback / prose parse).

## Verification (targeted)

- Disposable: `run_disposable_b6.py` (incl. B6-10…16)
- Spark harness: `run_spark_b6.py` + `spark_b6_battery.sql` + `b6_ack_matrix.md`
- Vitest: `TicketWorkflowClosurePanel.b6.test.tsx`
- Spark re-verify: five fixes + integrity — **no full restart** · **no staging apply**
