# F-B7-03 — Ticket share audit

**Migration:** `supabase/migrations/20261115180000_service_workflow_b7_share_audit.sql`  
**Gates:** Staging-only after Spark targeted review · #155 frozen · #156 draft · no production

## Lifecycle (atomic with mutation)

| Mutation | RPC | Audit |
|----------|-----|-------|
| Create | `create_ticket_share(p_ticket_id, p_expires_at)` | `ticket_governance_audit.action = share_created` with `share_id`, `expires_at`, `actor_role` — **never** token |
| Revoke | `revoke_ticket_share(p_token)` | `share_revoked` with `share_id`, `actor_role` — token used only as lookup key, never stored in audit |

Direct `INSERT`/`UPDATE`/`DELETE` on `ticket_shares` is revoked from `authenticated`/`anon`. Clients SELECT only via `ticket_shares_select_scoped`. FE must call the RPCs (`ticketMessageApi.createShare` / `revokeShare`).

## Access events (separate from governance actors)

Table `ticket_share_access_events` records successful public-share deliveries:

- `access_kind`: `ticket_payload` (`get_shared_ticket`) or `attachment` (`record_ticket_share_attachment_access` from the edge signer)
- `reader_kind`: `anonymous` or `authenticated_session`
- `session_uid`: optional `auth.uid()` when a session is present — **session marker only**, not a governance actor
- **Never stored:** raw share tokens, signed URLs, message contents

### Retry / count semantics

1. Access accounting runs in the **same transaction** before the payload or signed URL is returned (**fail-closed**).
2. Each successful delivery inserts **one** event.
3. Client retries that succeed again create **additional** events. Counts measure successful deliveries, not unique visitors.
4. Failed / expired / revoked tokens raise before any event insert.

## Entry points reviewed

| Surface | Path | Audit |
|---------|------|-------|
| Authenticated create | `create_ticket_share` RPC | lifecycle |
| Authenticated revoke | `revoke_ticket_share` RPC | lifecycle |
| Public ticket read | `get_shared_ticket` | access event `ticket_payload` |
| Public attachment sign | edge `ticket-share-attachment` → `record_ticket_share_attachment_access` | access event `attachment` |
| Direct client `ticket_shares` write | **denied** (no silent bypass) | n/a |
