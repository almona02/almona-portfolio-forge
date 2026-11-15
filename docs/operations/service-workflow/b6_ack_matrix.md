# B6 acknowledgment / closure — permission & evidence matrix (Cursor docs)

Cursor supporting notes only. Spark’s independent matrix/verdicts live in
`scripts/service-workflow/b6_ack_matrix.md` @ `ebdb5eb2` / worktree
`C:\projects\almona-spark-probes` and are preserved separately.

**Supervisor:** B6 BLOCKED on **F-B6-09** at `3e387199` (txn-start timestamps
outranked `event_seq`). Correction: `…171200` makes `event_seq` authoritative.
**F-B6-08** closed at `3e387199`; does not resolve F-B6-09.
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
| Effective order (F-B6-09) | `ORDER BY event_seq DESC, id DESC` — timestamps are display/chronology only |
| Re-close | Preserve original `closed_at`; no duplicate `workflow_resolve_close` audit; auth before idempotent return (F-B6-08) |
| Closure atomicity | Injected audit failure on close rolls back ticket status |

## Sales-role owner

API/RPC: ownership-based. UI: `role === 'customer'` fail-closed (documented; not assumed every owner is customer).
