# Lane C staging apply record

| Field | Value |
|-------|-------|
| **Status** | Applied on staging · Spark **`STAGING_PASS_BOUNDED`** · operational closeout **COMPLETE** ([`LANE_C_STAGING_CLOSEOUT.md`](./LANE_C_STAGING_CLOSEOUT.md)) · **no production / merge / FR-1** |
| **Correction runtime** | `e27f21a530fe0eb122ab7886eb8a7854f066a896` |
| **Commit that contains that runtime and was pushed for preview** | `be6bfc7f4a0af6d32f552b8e67dc898efb6ed6ae` |
| **Target DB** | `apnmoevmvihfzcnttctx` (`almona02-staging`, eu-west-3). Production `shfsebdncjnncqqnewfj` was not used. |
| **Local acceptance** | [`LANE_C_LOCAL_ACCEPTANCE_e27f21a5.md`](./LANE_C_LOCAL_ACCEPTANCE_e27f21a5.md) |

## Payload hashes

Checkout hashes are the CRLF working-tree bytes the manifest and Spark checked. `lf_sha256` is the git blob (LF). The text is the same; only newlines differ. Applied SQL was the LF blob.

| Order | Source | CRLF sha256 (manifest) | `lf_sha256` | LF bytes |
|-------|--------|------------------------|-------------|----------|
| 1 | `supabase/migrations/20261118120000_service_tickets_rls_enable_and_tech_header.sql` | `14f27cda49441bff523679bf718e8881b76d991ad9153b83058bc3861329b717` | `aaa139b258499c628afd1acce129200515385c3ece7e857467913a930d0ff3f9` | 3528 |
| 2 | `supabase/migrations/20261118130000_service_routines_lane_c_checklist_execution.sql` | `34ee32463560dc487acc35b533db69b1fc3808e836cb99511196b6541d6f13c9` | `f478689fc326a00e2ee1d1c5425404a8021becbe82fffedd6ddbb2fac581f21d` | 40711 |
| 3 | `supabase/migrations/20261118140000_service_routines_lane_c_checklist_history_reader.sql` | `ed93cd16831987e9f89f3dad7b8b018dc83464cc6c06427e24fe7837324fdf1d` | `00e28a9145d261e66745e94c66ac5da10490fbee4cb532671afb11e0443f6415` | 5753 |

Copies: `applied-sql/lane-c-staging/`.

## Preflight (before any apply)

| Check | Result |
|-------|--------|
| Lane A | `20261116192555` `service_routines_lane_a_authoring` |
| STG-01 | `20261116210024` `service_routines_lane_a_stg01_stale_conflict` |
| Lane B | `20261117193033` `service_routines_lane_b_job_pins` |
| `service_tickets` RLS | already **on** |
| Header RPC, history table, history reader | **absent** |
| `can_read_ticket_workflow`, `is_ticket_visit_attending_technician`, pins | present |
| Unexplained drift | **none** |

`service_tickets` policies before apply, and unchanged after the header migration:

| Policy | Command | Expression |
|--------|---------|------------|
| `Users can create their own tickets` | INSERT | `auth.uid() = user_id` |
| `service_tickets_insert_own` | INSERT | owner or admin/support via `profiles` |
| `service_tickets_select_own_or_staff` | SELECT | `user_id` or `assigned_to` or admin/support. Technicians are not included. |
| `service_tickets_update_scoped` | UPDATE | same USING and CHECK |

Grants before apply: `authenticated` had SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE. `anon` had none. The header migration does not change those grants.

## Live stamps

The header and history-reader files were applied as single migrations. The execution file was applied in dependency order as five stamps because the MCP payload was split. The resulting objects are the reviewed definitions. That split is recorded here; it is not a second review.

| `schema_migrations.version` | Name |
|-----------------------------|------|
| `20261118143223` | `service_tickets_rls_enable_and_tech_header` |
| `20261118143407` | `service_routines_lane_c_checklist_execution` |
| `20261118143458` | `service_routines_lane_c_checklist_helpers` |
| `20261118143521` | `service_routines_lane_c_checklist_validation` |
| `20261118143548` | `service_routines_lane_c_checklist_workspace_record` |
| `20261118143612` | `service_routines_lane_c_checklist_submit` |
| `20261118143633` | `service_routines_lane_c_checklist_history_reader` |

## Resulting definitions and grants

| Object | Result |
|--------|--------|
| `public.get_technician_ticket_header(uuid)` | present, security definer, anon EXECUTE **false**, authenticated EXECUTE **true** |
| `admin_private.technician_may_read_ticket_header(uuid, uuid)` | present, anon EXECUTE **false**, authenticated EXECUTE **true** |
| `public.service_visit_checklist_answer_history` | RLS **on**. authenticated SELECT **true**; INSERT/UPDATE/DELETE **false**. anon SELECT **false**. |
| `svc_visit_checklist_hist_select` | `admin_private.can_read_checklist_attempt_history(ticket_id, job_id, visit_id)` |
| `svc_visit_checklist_hist_no_ins` / `_no_upd` / `_no_del` | `false` |
| `admin_private.can_read_checklist_attempt_history(uuid, uuid, uuid)` | present. anon EXECUTE **false**, authenticated EXECUTE **true**. Does not reference `can_read_ticket_workflow`. |
| `public.get_visit_checklist_workspace(uuid, uuid)` | uses the history reader. anon EXECUTE **false**, authenticated EXECUTE **true**. |
| `admin_private.checklist_current_envelope(uuid)` | anon EXECUTE **false**, authenticated EXECUTE **false** |
| `public.record_visit_checklist_answer(...)` | anon EXECUTE **false**, authenticated EXECUTE **true** |
| `public.submit_service_report_revision(...)` | anon EXECUTE **false**, authenticated EXECUTE **true** |

`admin_private.validate_checklist_for_pin(service_job_visits, jsonb)` remains executable by `anon` and `authenticated`. The reviewed execution file does not revoke it. It is in `admin_private`, which is not a Data API schema.

## Frontend preview

| Field | Value |
|-------|-------|
| Deployment id | `dpl_4DtMTdA71HYaTKnWK7T5GqYsFhq8` (**READY**) |
| Source revision | `be6bfc7f4a0af6d32f552b8e67dc898efb6ed6ae` (contains correction `e27f21a5`) |
| Preview URL | `https://almona-portfolio-forge-33s5ajgsk.vercel.app` |
| Branch alias | `https://almona-portfolio-f-git-2939ea-mohamed-hassans-projects-0ca04921.vercel.app` |
| Env binding | Branch-scoped preview `VITE_SUPABASE_*` → staging `apnmoevmvihfzcnttctx` |
| Protection | SSO on; shareable `_vercel_share` delivered only via secure handoff |

## Secure delivery to Spark

Credentials are **not** in git. Post-closeout, secret-bearing handoff copies are **shredded**; non-secret receipts and Spark evidence paths are listed in [`LANE_C_STAGING_CLOSEOUT.md`](./LANE_C_STAGING_CLOSEOUT.md).

## Explicit non-goals

No production apply. No merge. No FR-1. No further cleanup or verification runs under this apply record. Next-milestone planning only: [`SERVICE_ROUTINES_JOURNEY_CLOSE_MILESTONE_PROPOSAL.md`](./SERVICE_ROUTINES_JOURNEY_CLOSE_MILESTONE_PROPOSAL.md).
