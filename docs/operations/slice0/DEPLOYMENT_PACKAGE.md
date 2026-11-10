# Slice 0 coordinated deployment package (NOT an approval to deploy)

**Frozen implementation commit:** `7e8ac0a1`  
(Supersedes prior freeze labels `06ff513b`, `6bc8cb7e`, `bb40d8ab`.)

Environment apply to staging/production remains a **separate explicit decision**.

**Mandatory:** RLS remediation (`staging_service_tickets_rls.sql` or equivalent) wherever RLS is disabled or policies fail owner/assignee/admin|support scope.

## Coordinated order (minimize exposure / breakage)

```text
1) Database — supabase/migrations/20261111010000_service_slice0_security_boundary.sql
   - share minimize/revoke; private attachments; DEFINER share helper
   - govern_* RPCs + owner/definer trigger (incl. priority)
   - helper EXECUTE; internal-note privacy; assignee+support share manage
2) Edge — ticket-share-attachment (membership-only; no public fallback)
3) Client — this branch (signed downloads; govern_*; create unassigned outcome)
4) Python backend — v2/unified writers → govern_* + p_actor_id
5) staging_service_tickets_rls.sql wherever RLS is off / over-broad (mandatory)
```

Apply (1)+(2) in the same change window; ship (3)+(4) immediately after. Never “recover” by setting `ticket-attachments.public = true`.

## Compatibility checks (pre-apply)

| Check | Expectation |
|---|---|
| Direct `UPDATE service_tickets SET status/priority/assigned_to` as authenticated JWT | 42501; row unchanged |
| `SET` custom GUC then mutate protected columns | Still 42501 (GUC inert) |
| Customer create ticket | Insert succeeds; assignment may be explicit `unassigned` |
| Support INSERT `ticket_shares` for any in-scope ticket | Allowed via DEFINER helper without profiles self-read |
| Unrelated user INSERT `ticket_shares` | Denied |
| `govern_ticket_set_priority` | Atomic row + `priority_update` audit |
| Python status/assign paths | Call `govern_*` with actor id (service_role not trigger-exempt) |
| Share edge membership | Valid token+path → signed URL; internal/cross-ticket → deny |
| Anon table privileges on `service_tickets` | No UPDATE; SELECT denied under RLS package |

## Secure recovery (do not reopen exposure)

1. Downloads break → verify edge secrets/health; redeploy function; **do not** set bucket `public=true`.  
2. Govern RPC errors → roll forward; feature-flag UI mutations; **do not** reopen direct UPDATE of protected columns.  
3. Share payload regression → redeploy freeze SHA function/RPC; never reintroduce `row_to_json`.  
4. Create path assign noise → client already returns created ticket unassigned; do not retry insert on assign denial (avoids duplicates).  
5. SQL rollback of bucket privacy is **not** an approved recovery step.

## Preconditions

- [ ] Disposable verification PASS (`VERIFICATION_REPORT.md` — 141/141 on freeze SHA)  
- [ ] Explicit staging/prod approval recorded  
- [ ] DB backup/snapshot  
- [ ] Edge secrets present  
- [ ] Backend writers on `govern_*`  
- [ ] On-call knows recovery rules  

## Post-apply validation (staging)

1. Anon SELECT/UPDATE `service_tickets` denied.  
2. `get_shared_ticket` allowlist only; no internal notes; path-only attachments.  
3. Revoke blocks new links; note 60s issued-URL residual.  
4. Direct status/priority/assignee UPDATE fails even after custom GUC SET.  
5. Support can create share; unrelated user cannot.  
6. Customer create succeeds without assign; no duplicate on UI retry of assign-only failure.  
7. Owner cannot read internal notes or their storage objects.  
8. Edge: valid membership → 200; wrong path → 403.  
9. Audit SELECT works for staff; storage owner upload/download works.
