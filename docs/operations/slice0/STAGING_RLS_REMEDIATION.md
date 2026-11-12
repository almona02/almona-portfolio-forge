# Slice 0 — Staging `service_tickets` RLS remediation (PREPARE ONLY)

**Status:** Prepared for review. **Do not apply** to staging or production without explicit environment approval separate from code merge approval.

## Verified state (inspected 2026-11-11)

| Environment | `service_tickets.relrowsecurity` | Notes |
|---|---|---|
| `almona02-staging` (`apnmoevmvihfzcnttctx`) | **false** | Critical: table grants include anon/authenticated UPDATE |
| `almona02` production (`shfsebdncjnncqqnewfj`) | true (prior inventory) | Still has broad table grants; Slice 0 migration revokes anon |

Also verified on both environments: deployed `get_shared_ticket` returns `row_to_json(t)` + all messages (pre-Slice-0). Staging `ticket-attachments.public = true` with anon SELECT policy.

## Exact change (apply only after approval)

1. Apply `supabase/migrations/20261111010000_service_slice0_security_boundary.sql` (share minimize, private attachments, governed RPCs).
2. Apply `docs/operations/slice0/staging_service_tickets_rls.sql` on **staging** (enable RLS + policies). Production already expects RLS enabled; re-running ENABLE is safe.
3. Deploy edge function `ticket-share-attachment` for signed shared downloads (no public bucket fallback).

## Expected effect

- Anonymous clients cannot SELECT/UPDATE `service_tickets` rows without a valid share RPC allowlist response.
- Customers see only own tickets; assigned technicians see assigned tickets; unrelated technicians denied; admins allowed; anon denied for table access.
- Attachment objects are not anonymously downloadable via public URL.

## Validation (positive / negative)

Run after apply (use throwaway fixtures; no customer PII):

1. Anon SELECT `service_tickets` → 0 rows / denied.
2. Customer A SELECT own ticket → allowed; Customer A SELECT B’s ticket → denied.
3. Technician assigned → SELECT/transition via `govern_ticket_transition` allowed.
4. Unrelated technician → SELECT denied; transition RPC denied.
5. Admin → SELECT + assign RPC allowed.
6. Direct UPDATE of `status`/`assigned_to` as authenticated → rejected by trigger.
7. `get_shared_ticket` valid token → allowlisted fields only; internal notes absent.
8. Expired / revoked / short token → error.
9. Former public attachment URL → no anonymous download.

## Recovery

```sql
-- Emergency only: temporarily disable RLS if legitimate traffic blocked after bad policy.
ALTER TABLE public.service_tickets DISABLE ROW LEVEL SECURITY;
-- Then restore from staging_service_tickets_rls.sql after fixing policies.
```

Rollback of function bodies: redeploy previous migration revision of `get_shared_ticket` from git history **only** if containment must be undone (not recommended).
