# Slice 0 policy notes

## pending_approval
Not in `ticketTransitions` FSM. UI options and RPC inputs reject it. Product policy deferred to Wonder consistency pass.

## Reopen from closed
FSM: `closed → []`. Technician reopen button removed. Admin UI no longer offers inventing reopen via pending_approval. Future reopen requires explicit FSM + RPC change.

## Technician decline
Uses `assigned → cancelled` (valid FSM) instead of illegal `assigned → open`.

## Customer acknowledgment vs closure
Wonder Journey A14–A15: acknowledgment may be accepted/refused/unavailable and must not alone block closure. **Not implemented in Slice 0** (no service reports). Existing ticket close remains staff-governed via `resolved → closed`.

## Bulk assign partial failure
`govern_ticket_bulk_assign` isolates per-id errors; successes and their `ticket_governance_audit` rows commit with the RPC; response includes `succeeded`, `failed`, `partial`.
