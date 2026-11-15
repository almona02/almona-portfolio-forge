# B6 acknowledgment / closure — permission & evidence matrix (Cursor docs)

Cursor supporting notes only. Spark’s independent matrix/verdicts live in
`scripts/service-workflow/b6_ack_matrix.md` and are preserved separately.

**Runtime freeze under Spark re-verify:** `9998f1a48f1b18b467bc1e4d3552ced5e32325a4`  
**BLOCKED baseline (preserved; does not cover 9998f1a4):** `ec00b692af10629ed5ee506bbb35762ea5ea00a8` — `spark-probes/B6_BLOCKED_ec00b692_RESULTS.json`  
**No staging apply / merge / production / B7**

## Actor × action

| Action | Owner (any role) | Admin/Support | Technician | Non-owner / anon / forged |
|--------|------------------|---------------|------------|---------------------------|
| `accepted` / `refused` | Yes (ownership) | No | No | Deny |
| `unavailable` + contact evidence | No | Yes when effective ∈ {NULL, unavailable} | No | Deny |
| Disposition on current refusal | No | Yes (binds `acknowledgment_id`) | No | Deny |
| Resolve/close (activated) | No | Yes iff prerequisites pass | Resolve only per FSM + prereqs | Deny |

## Contact evidence (policy)

- Staff-entered attempts or notification-log events only — **no fabricated/backdated UI synthesis**.
- Required fields: `attempted_at`, `channel`, `outcome`, `by_actor_id`.
- Minimum: issue notification + **two distinct** follow-ups by `(attempted_at, channel)`.
- Attribution and append-only history preserved; unavailable never displays as acceptance.

## Targeting

- Prerequisites return structured `entity_id` (issued revision uuid for ack codes).
- UI/RPC consumers MUST use `entity_id`; must not parse detail prose; must not default to first head.
- Missing/stale target → fail closed.

## Integrity

| Concern | Rule |
|---------|------|
| Timestamp ties | `ORDER BY responded_at DESC, event_seq DESC, id DESC` |
| Re-close | Preserve original `closed_at`; no duplicate `workflow_resolve_close` audit |
| Closure atomicity | Injected audit failure on close rolls back ticket status |

## Sales-role owner

API/RPC: ownership-based. UI: `role === 'customer'` fail-closed (documented; not assumed every owner is customer).
