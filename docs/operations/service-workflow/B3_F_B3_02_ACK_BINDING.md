# F-B3-02 — Personal safety acknowledgment binding

**Base:** safety-path final `742d1a98` (accepted evidence retained)  
**This correction:** `b7a6dace3510e486357a1e10c5b80a985818b717`  
**Migration:** `supabase/migrations/20261112200000_service_workflow_b3_f_b3_02_ack_binding.sql`  
**Local disposable:** B3 38/0 PASS (incl. B3-F2-1..7); B1/B2 under B3 72 PASS / 4 DEFER (M4/M5/R3/R4)  
**Gates:** No staging apply until Spark targeted review PASS · no merge · no production · no B4

## Policy

A **passed** personal acknowledgment is bound to:

1. the **visit** (`visit_id`)
2. the **current attending / assigned technician** (`attested_by` + `for_technician_id`)
3. the job’s **assignment generation** (`assignment_generation`)

`service_jobs.assignment_generation` increments on assign / reassign / decline when the assignee changes. Historical safety rows are **append-only** (never deleted).

### Validity

Prior passed reuse is allowed only when the latest safety row (`attested_at DESC, ordinal DESC`) is `passed` **and** matches the current visit, bound technician, and current generation.

- Reassignment invalidates reuse, including **tech1 → tech2 → tech1**.
- The current attending technician must provide their own explicit confirmation before starting (attest-on-start or a still-valid prior personal pass).
- Admin/support **cannot** substitute their personal passed acknowledgment for the attending technician. Staff **may** record failed checks / safety observations.
- A later **failed** check continues to invalidate an earlier pass.

Authorization, acknowledgment validation, start transitions, and audit remain concurrency-safe under `FOR UPDATE` on visit/job/ticket (start-vs-reassign serializes to a coherent authorized outcome).

## Spark verify

1. Same technician, same visit, unchanged assignment: valid prior acknowledgment works  
2. Reassignment: old acknowledgment rejected (history preserved)  
3. Reassignment away and back: old acknowledgment still rejected  
4. Support acknowledgment cannot authorize technician start  
5. Fresh confirmation by the new attending technician succeeds  
6. Cross-visit reuse and failed-check bypass remain denied  
7. Concurrent reassignment/start yields a coherent authorized outcome  
