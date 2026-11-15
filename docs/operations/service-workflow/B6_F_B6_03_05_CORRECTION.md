# B6 — F-B6-03 / F-B6-04 / F-B6-05 + UI correction

**Depends on:** B6 freeze `ec00b692` (stamp `395c2481`) · Spark BLOCKED findings  
**Gates:** #155 frozen · #156 draft · disposable/local only · **no staging apply** · no merge · no production

## Server (narrow migration)

`supabase/migrations/20261115170000_service_workflow_b6_f_b6_03_05_correction.sql`

| ID | Fix |
|----|-----|
| F-B6-03 | `record_service_acknowledgment_unavailable` only when effective ∈ {NULL, unavailable} |
| F-B6-04 | Closure gate requires `v_disp.acknowledgment_id = v_ack.id` for the current refusal |
| F-B6-05 | Contact attempts must be distinct by `(attempted_at, channel)` |

Named prerequisite details now include `id=<revision_uuid>` for head-aware UI targeting.

## UI (F-B6-UI-01 / F-B6-UI-02)

`TicketWorkflowClosurePanel`: staff-entered contact attempts only (no fabricated backdates); unavailable/disposition target the outstanding/refused head from the failure detail (not the first issued head).

## Verification (targeted)

- Disposable: B6-10/11/12 (+ prior B6-01…09) via `run_disposable_b6.py`
- Vitest: `TicketWorkflowClosurePanel.b6.test.tsx` head-aware + real-attempt cases
- Spark re-verify: Q6-11 / Q6-13 / Q6-17 + UI probe — **no full restart**
