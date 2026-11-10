# Slice 0 ordered deployment package (NOT an approval to deploy)

Review SHA: `bb40d8ab` (+ follow-up edge-function hardening commit if present).  
Environment apply to staging/production remains a **separate explicit decision**.

## Dependency order (avoid exposure window and broken downloads)

```text
1) Database migration 20261111010000_service_slice0_security_boundary.sql
   - minimizes get_shared_ticket
   - adds revoke + governed RPCs + protected-column trigger
   - sets ticket-attachments.public = false and drops anon public-read
2) Edge function ticket-share-attachment
   - required immediately after (1) for share viewers to download evidence
3) Client release with this branch
   - uploads storage_path (no public URL)
   - signs downloads / calls edge for share tokens
   - uses govern_ticket_* instead of direct status/assignee updates
4) Optional: staging_service_tickets_rls.sql (if target still has RLS off)
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

- [ ] Disposable/local verification PASS (see `VERIFICATION_REPORT.md`)
- [ ] Explicit staging/prod approval recorded
- [ ] Backup / snapshot of target DB
- [ ] Edge function secrets present (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] On-call knows recovery rules above

## Post-apply validation (staging)

1. Anon SELECT/UPDATE `service_tickets` denied.
2. `get_shared_ticket(valid)` → no phone/email; no internal notes; attachments path-only.
3. Expired/revoked tokens fail.
4. Direct `UPDATE service_tickets SET status=...` fails for authenticated JWT.
5. Technician assigned can `govern_ticket_transition` to `in_progress` with audit row.
6. Share attachment edge: valid token+path → 200 signed URL; wrong path → 403; no token → 400/404.
7. Old public object URL returns non-public access (403/404), not anonymous 200.
