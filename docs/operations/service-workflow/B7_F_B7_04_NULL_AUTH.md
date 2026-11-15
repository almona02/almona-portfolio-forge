# F-B7-04 — NULL-poisoned auth OR-chains

**Demonstrated by Spark** (Q7-10 revoke, Q7-15 escalate, Q7-16 assigned still denied)  
**Correction tip migration:** `20261115181000_service_workflow_b7_f_b7_04_null_auth.sql`  
**Also fixed in unapplied F-B7-03 rewrite:** `revoke_ticket_share` gate in `20261115180000_…b7_share_audit.sql`

## Defect

PL/pgSQL treats `IF <null>` as not-taken. Auth shaped as:

```sql
IF NOT (… OR ticket.assigned_to = v_uid OR share.created_by = v_uid) THEN RAISE …;
```

When `assigned_to` / `created_by` is NULL, `= v_uid` yields NULL, the OR chain becomes NULL, `IF NOT NULL` never raises → **any authenticated caller** can revoke shares on unassigned tickets; **any technician** can escalate unassigned tickets.

## Fix

Deny-by-default `IS DISTINCT FROM` arms (same pattern as assignment guards):

- `revoke_ticket_share` — admin/support / owner / assignee / share creator only
- `govern_ticket_set_escalated` — admin/support, or technician **with** `assigned_to IS NOT DISTINCT FROM` caller

## Apply order (staging only)

1. Apply **F-B7-04** (`…15181000…`) — closes live bypass  
2. Spark re-verify Q7-10 / Q7-15 / Q7-16  
3. On Spark approval, apply **F-B7-03** (`…15180000…`, null-safe revoke already in tip)  
4. Record stamps; Spark runs G-01 / G-04

No production. #155 frozen · #156 draft.
