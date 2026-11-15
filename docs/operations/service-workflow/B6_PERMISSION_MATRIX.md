# B6 — Permission matrix (acknowledgment & closure)

**Status:** Freeze artifact (disposable/local only; **no staging apply**)  
**Align:** getter, direct SELECT, RPCs, and UI must agree. Fail closed on ambiguity.

## Roles

| Capability | Ticket owner (`profiles.role = customer`) | Ticket owner with other role (e.g. sales_rep) | Admin / Support | Technician | Sales (non-owner) | Unrelated |
|------------|-------------------------------------------|-----------------------------------------------|-----------------|------------|-------------------|-----------|
| SELECT issued revision (table / getter) | Yes (own ticket) | Yes (own ticket) — workflow-readable owner, **not** hard-coded `role=customer` | Yes | Yes (workflow-readable) | No | No |
| SELECT acknowledgment history | Own ticket’s issued revisions | Own ticket’s issued revisions | Yes | No | No | No |
| RPC `record_service_acknowledgment` (`accepted`/`refused`) | Yes (own ticket) | **Yes (own ticket)** — ownership, not role label | No (use unavailable path) | No | No | No |
| RPC `record_service_acknowledgment_unavailable` | No | No | Yes | No | No | No |
| RPC `record_acknowledgment_disposition` | No | No | Yes | No | No | No |
| RPC `evaluate_ticket_workflow_prerequisites` | Named failures readable if ticket readable | Same | Yes | Yes (if ticket readable) | No | No |
| Close / resolve via `govern_ticket_transition` (+ bulk) | No | No | Yes when prerequisites pass | Resolve only on assigned tickets per existing FSM; still gated by prerequisites when activated | No | No |
| Customer acknowledgment **UI** | Yes | **No (fail-closed)** — UI requires `role === 'customer'` | Unavailable + disposition UI | No | No | No |
| Manager prerequisite / closure **UI** | No | No | Yes | No | No | No |

## Sales-role-owner (explicit)

- **API / RLS / DEFINER getters:** Ticket ownership (`service_tickets.user_id = caller`) grants issued-revision read and customer acknowledgment RPCs regardless of `profiles.role`. A sales-rep who **owns** the ticket may acknowledge via RPC.
- **UI:** `TicketDetailPage` mounts issued-report + acknowledgment UI only when `user.role === 'customer'` **and** `ticket.user_id === user.id`. A sales-role owner therefore sees **no** customer acknowledgment UI (fail-closed observation, same pattern as B5 issued-report mount).
- Do **not** assume every owner has `role=customer`. Document and test both paths; do not “fix” UI role gating by weakening ownership checks on the RPC.

## Closure enforcement surfaces

All resolve/close entry points must hit `admin_private.assert_ticket_workflow_allows_resolve_close`:

- `govern_ticket_transition` (single)
- `govern_ticket_bulk_transition` (via single)
- Client wrappers: `governTicketTransition`, `updateTicketStatus`, `updateTicketStatusAndPriority`

Legacy jobless tickets (`workflow_activated_at IS NULL`) retain the pre-workflow bypass. Once activated, the ticket **cannot** revert to that bypass.

## Consistency rule

If a getter returns an issued revision to a caller, that caller’s acknowledgment SELECT for that revision must not 404-by-policy unless the response type is staff-only (`unavailable` contact evidence may omit raw attempt PII from customer SELECT — attempts remain on the row for staff). Customer UI shows response + comment only.
