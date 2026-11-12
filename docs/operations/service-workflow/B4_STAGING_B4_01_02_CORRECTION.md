# STAGING-B4-01 / STAGING-B4-02 correction

**Gates:** Staging only · no merge · no production · no B5 · #155 frozen · #156 draft  
**Prior authorized tip:** `6a64a01e` (staging preview `dpl_5bfdrjKDqindCoB1QZdf6u7JCd4v`)  
**This corrective tip:** `f63c91454df69a0146404200d10c4058465b38fc`

## Inventory: approved B4 migration vs staging (pre-corrective)

Compared `supabase/migrations/20261112210000_service_workflow_b4_report_submission.sql` to live `apnmoevmvihfzcnttctx` after split MCP apply (`20261112224008`…`24219`).

| Object | Approved | Staging pre-fix | Notes |
|--------|----------|-------------------|-------|
| Columns + labour XOR + client_submission uidx | yes | present | First chunk |
| Report-family REVOKE INSERT/UPDATE/DELETE | yes | present (no client INSERT/UPDATE/DELETE) | |
| `is_ticket_job_technician` / `can_read_ticket_attachment` | yes | present | Helpers chunk |
| `ticket_attachments_insert` (inline EXISTS + job-tech) | yes | **matched approved text** | Semantically broken under ticket RLS |
| Validators + submit/getter RPCs + grants | yes | present | |
| Other DDL omitted from approved file | — | **none found** | Upload failure was not a missing CREATE POLICY |

**Root cause (STAGING-B4-01):** approved `ticket_attachments_insert` inlines `EXISTS (SELECT … FROM service_tickets …)`. That subquery runs under **caller RLS**. `service_tickets_select_own_or_staff` does not include job technicians, so permitted technicians always failed ticket-folder INSERT while ticket owners succeeded. SELECT already used SECURITY DEFINER `can_read_ticket_attachment`.

**STAGING-B4-02:** `ServiceReportPanel` was nested inside `canExecute && (scheduled || in_progress)`, so completed visits never mounted the form.

## Corrective SQL applied

**Source:** `supabase/migrations/20261113013000_service_workflow_b4_attachment_insert_definer.sql`  
**Applied copy:** `applied-sql/b4-staging/02_20261113013000_service_workflow_b4_attachment_insert_definer.sql`  
**MCP stamp:** `20261112232020` / `service_workflow_b4_attachment_insert_definer`  
**Did not** replay foundation B1–B3 or re-mark `20261112210000` as newly applied.

Adds:

- `admin_private.is_ticket_visit_attending_technician`
- `admin_private.can_insert_ticket_attachment` (SECURITY DEFINER)
- `ticket_attachments_insert` → `can_insert_ticket_attachment(name)` only
- Align `can_read_ticket_attachment` / `actor_can_read_ticket_attachment` with attending predicate
- Extend `can_read_ticket_workflow` so historical attending retains job/visit/getter SELECT after reassignment

## JWT upload verification (no privileged storage inserts)

| Caller | Path | Result |
|--------|------|--------|
| Technician JWT (assigned job ticket folder) | `{ticket}/b4/…` | **OK 200** |
| Technician JWT (private uid folder) | `{uid}/b4/…` | OK 200 |
| Technician JWT (unrelated ticket) | other ticket `/b4/…` | **DENIED 403** |
| Owner JWT (unrelated ticket) | other ticket `/b4/…` | **DENIED 403** |

## Client (STAGING-B4-02)

- Mount `ServiceReportPanel` outside execution wrapper for `completed` visits
- `canSubmit` / visibility = historical `attending_technician_id === auth.uid` (staff may view, not submit)
- `listServiceJobsForTechnician` also returns jobs with completed visits this tech attended
- Technician dashboard `canExecute` only when currently assigned
- Vitest: `ServiceVisitPanel.b4.test.tsx` (5) + retained B3/B4 panel suites

## Spark gate

Targeted review of this tip SHA. **Protected staging client redeploy waits for Spark PASS.** DB corrective already on staging under existing B4 authorization. No production / merge / B5.
