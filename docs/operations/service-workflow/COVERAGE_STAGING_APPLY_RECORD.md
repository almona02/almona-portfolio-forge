# Coverage & recurrence — staging apply record

| Field | Value |
|-------|-------|
| **Status** | Applied on staging · Spark **`STAGING PASS`** (targeted) · operator **`CLEANUP_EXECUTED`** · Spark zero-confirm **COMPLETE** · operational closeout **COMPLETE** ([`COVERAGE_STAGING_CLOSEOUT.md`](./COVERAGE_STAGING_CLOSEOUT.md)) · **no production / merge / FR-1** |
| **Correction runtime** | `b65c4cd4f9a24e18c45ed30cebccc526f399b159` (F-COV-CAP-1) |
| **Commit pushed for preview** | `6b8d83466ad10ad78f1941a066acdc36684e7569` (docs tip; runtime unchanged from `b65c4cd4`) |
| **Target DB** | `apnmoevmvihfzcnttctx` (`almona02-staging`, eu-west-3). Production `shfsebdncjnncqqnewfj` was not used. |
| **Local acceptance** | [`COVERAGE_LOCAL_ACCEPTANCE_b65c4cd4.md`](./COVERAGE_LOCAL_ACCEPTANCE_b65c4cd4.md) |

## Payload hashes

Reviewed source hashes are LF git-blob bytes. Applied SQL copies under `applied-sql/coverage-staging/` strip outer `BEGIN`/`COMMIT`/`SET LOCAL lock_timeout` for MCP `apply_migration` (platform wraps DDL). Object text matches the reviewed migrations.

| Order | Source | Source `lf_sha256` | Applied stripped `lf_sha256` | Applied bytes |
|-------|--------|--------------------|------------------------------|---------------|
| 1 | `supabase/migrations/20261118210000_service_coverage_recurrence.sql` | `226d4245ca806cc1cfa8e501c37881a7409fa8c1b07c43e9122ffe030239220d` | `bba2cbdbb8e0252f9c546bd68b7da4d76f3720b68ef9849da7c8506906e43224` | 43699 |
| 2 | `supabase/migrations/20261118220000_service_coverage_f_cov_cap_1.sql` | `7f463441037eb83f3e6125870dd0d5849c8db47c59ef6dfe4c8bc06b2ad8e336` | `6955028c919c3676f03218575f62f956d1067ebcb65ea6487713a706b3bf23c7` | 11146 |

Copies: `applied-sql/coverage-staging/`.

## Preflight (before any apply)

| Check | Result |
|-------|--------|
| Lane A | `20261116192555` `service_routines_lane_a_authoring` |
| STG-01 | `20261116210024` `service_routines_lane_a_stg01_stale_conflict` |
| Lane B | `20261117193033` `service_routines_lane_b_job_pins` |
| Lane C stamps | present (`20261118143223`…`20261118143633`) |
| Coverage tables / RPCs | **absent** |
| `public.create_service_job` | 5-arg with `DEFAULT`s (`p_ticket_id, p_title, p_required, p_rationale, p_actor_id`) — 4-arg calls resolve |
| `public.pin_service_job_routine`, `admin_private.can_read_ticket_workflow`, `admin_private.routine_family_set`, `admin_private.workflow_resolve_actor(uuid)` | present |
| Unexplained drift | **none** |

### Machines policies (unchanged; not broadened)

| Policy | Command | Notes |
|--------|---------|-------|
| `machines_insert_own` | INSERT | owner insert |
| `machines_select_own` | SELECT | non-anonymous owner |
| `machines_staff_select` | SELECT | admin/support via `profiles` |
| `machines_update_own_nonidentity` | UPDATE | non-anonymous owner |

### Machines table grants (existing; not broadened)

`anon`, `authenticated`, and `service_role` already held full table privileges (SELECT/INSERT/UPDATE/DELETE/…). Preflight recorded that state; this apply does **not** add further machines access.

## Live stamps

Base coverage was applied in dependency order as six stamps (MCP payload split). F-COV-CAP-1 is a seventh stamp. Resulting objects match the reviewed definitions.

| `schema_migrations.version` | Name |
|-----------------------------|------|
| `20261119134713` | `service_coverage_recurrence_tables` |
| `20261119134802` | `service_coverage_recurrence_helpers` |
| `20261119134943` | `service_coverage_recurrence_mgmt_lifecycle` |
| `20261119135008` | `service_coverage_recurrence_mgmt_adopt` |
| `20261119135028` | `service_coverage_recurrence_generate_list` |
| `20261119135035` | `service_coverage_recurrence_grants` |
| `20261119135104` | `service_coverage_f_cov_cap_1` |

## Resulting definitions and grants

| Object | Result |
|--------|--------|
| `public.service_machine_coverages` | RLS **on**. authenticated SELECT **true**; INSERT **false**. anon SELECT/INSERT **false**. |
| `public.service_maintenance_occurrences` | RLS **on**. authenticated SELECT **true**; INSERT **false**. anon SELECT/INSERT **false**. |
| All 9 public coverage RPCs | anon EXECUTE **false**; authenticated EXECUTE **true** |
| `generate_machine_coverage_occurrences` | signature includes `p_batch_limit`, `p_continue_coverage_id`, `p_continue_sequence` (F-COV-CAP-1) |

### Deployed definition fingerprints (sha256 of `pg_get_functiondef`)

| Function | sha256 |
|----------|--------|
| `generate_machine_coverage_occurrences` | `c99673d48948e77dd199932ebaa65acf1a13d8c066ebdba538d25f58928e362c` |
| `create_machine_coverage` | `bad4ce3b3635323d501c84c2857e21f9f2c2262744961e2a0962e5eff51a9b42` |

## Frontend preview

| Field | Value |
|-------|-------|
| Deployment id | `dpl_F2JNE5vYSisEdsebPYvU5XEEindZ` (**READY**) |
| Source revision | `6b8d83466ad10ad78f1941a066acdc36684e7569` (contains runtime `b65c4cd4`) |
| Preview URL | `https://almona-portfolio-forge-gd9n1olyq.vercel.app` |
| Branch alias | `https://almona-portfolio-f-git-2939ea-mohamed-hassans-projects-0ca04921.vercel.app` (do not use for immutable binding) |
| Env binding | Branch-scoped preview `VITE_SUPABASE_*` → staging `apnmoevmvihfzcnttctx` (comment: Lane A staging browser gate) |
| Protection | SSO on; shareable `_vercel_share` TTL to **2026-11-26T13:59:08Z** (Unix `1795701548`) |

## Secure delivery to Spark

Credentials and share secrets are **not** in git. Handoff root:

`C:\projects\_almona_handoff\coverage-staging-verification\`

## Explicit non-goals

No production apply. No merge. No FR-1. No new feature scope. The 895-occurrence case remains **local-only**; staging fixtures are bounded.
