# Slice 0 ordered deployment package (NOT an approval to deploy)

Review SHA: `9b54fb02` (supersedes `bb40d8ab` / `6bc8cb7e`).  
Environment apply to staging/production remains a **separate explicit decision**.

**Mandatory:** RLS remediation (`staging_service_tickets_rls.sql` or equivalent) wherever RLS is disabled or policies fail the approved owner/assignee/admin|support scope — not optional.

## Dependency order (avoid exposure window and broken downloads)

```text
1) Database migration 20261111010000_service_slice0_security_boundary.sql
   - minimizes get_shared_ticket; revoke; private attachments
   - govern_ticket_* RPCs + owner/definer trigger (no GUC auth)
   - helper EXECUTE for storage/audit; internal-note message/storage privacy
   - assigned-technician share manage; priority + bulk transition RPCs
2) Edge function ticket-share-attachment (membership-only signing)
3) Client release with this branch (signed downloads; govern_* paths)
4) python_backend release (v2/unified ticket writers → govern_* + p_actor_id)
5) staging_service_tickets_rls.sql wherever RLS is off / over-broad (mandatory for those envs)
```

### Why this order

| Wrong order | Failure mode |
|---|---|
| Client before DB | Client still expects old behavior; public URLs may keep working if bucket still public → **exposure continues** |
| DB before edge+client | Private bucket + path-only share payload → **downloads break** until edge/client land |
| Restore `public=true` as “recovery” | **Re-opens anonymous download** — forbidden |

### Exposure-window minimization

- Apply (1) and (2) in the same change window (minutes).
- Ship (3) immediately after, or in the same release train.
- Do not leave production on private bucket without the edge function.

### Recovery (must not silently restore public access)

1. If downloads break: verify edge function health and `SUPABASE_SERVICE_ROLE_KEY` / URL; re-deploy function; do **not** set `storage.buckets.public = true`.
2. If governed RPCs error: roll forward with function fix; temporary emergency is feature-flagging UI actions, not reopening direct UPDATE of status/assignee.
3. If share RPC regresses: redeploy known-good function body from this SHA; keep allowlist (never reintroduce `row_to_json`).
4. SQL rollback of bucket privacy is **not** an approved recovery step.

## Preconditions checklist

- [ ] Disposable/local verification PASS (see `VERIFICATION_REPORT.md`; Spark battery 108/108 on freeze SHA)
- [ ] Explicit staging/prod approval recorded
- [ ] Backup / snapshot of target DB
- [ ] Edge function secrets present (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] On-call knows recovery rules above
- [ ] Backend writers migrated off direct status/assignee UPDATE

## Post-apply validation (staging)

1. Anon SELECT/UPDATE `service_tickets` denied.
2. `get_shared_ticket(valid)` → no phone/email; no internal notes; attachments path-only.
3. Expired/revoked tokens fail; revoke does not instantly invalidate already-issued 60s URLs.
4. Direct `UPDATE service_tickets SET status=...` fails for authenticated JWT even after `SET` custom GUC.
5. Technician assigned can `govern_ticket_transition` to `in_progress` with audit row; can create share.
6. Owner cannot SELECT internal notes or their attachment objects.
7. Share attachment edge: valid token+path → 200 signed URL; wrong path → 403; no token → 400/404.
8. Old public object URL returns non-public access (403/404), not anonymous 200.
9. Storage upload/download and audit SELECT succeed for owner/assignee/admin.
