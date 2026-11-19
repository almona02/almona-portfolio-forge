# DO-1 staff daily ops — staging apply record

| Field | Value |
|-------|-------|
| **Status** | Applied on staging · READY packet issued · **awaiting Spark staging verification** · **no production / merge / DO-2 / DO-3 / scheduler** |
| **Accepted implementation SHA** | `1278d4c40f14f05f25c3dd88b6763c8a9ef22113` |
| **Preview source tip** | `2beea5ec9b63d1a34ecd3210786843ae9d564755` (build fix on top of accepted runtime) |
| **Proposal tip** | `4c8285117b3a304b7f113885d14b260259128e70` |
| **Target DB** | `apnmoevmvihfzcnttctx` (`almona02-staging`, eu-west-3). Production `shfsebdncjnncqqnewfj` was **not** used. |
| **Local acceptance** | [`SERVICE_DAILY_OPS_DO1_LOCAL_ACCEPTANCE.md`](./SERVICE_DAILY_OPS_DO1_LOCAL_ACCEPTANCE.md) |

## Payload hashes

Reviewed source hashes are LF bytes. Applied SQL copy under `applied-sql/do1-staging/` matches source (no BEGIN/COMMIT strip required).

| Order | Source | Source/applied `lf_sha256` | Bytes |
|-------|--------|----------------------------|-------|
| 1 | `supabase/migrations/20261118230000_service_daily_ops_do1_staff_workspace.sql` | `cbb48f7a91eac61b9a5c2de716c951d625e3065acf9288c31764e20774e97e7b` | 4260 |

Copies: `applied-sql/do1-staging/`.

## Preflight (before apply)

| Check | Result |
|-------|--------|
| Coverage stamps (`20261119134713`…`20261119135104`) | present |
| `admin_private.workflow_resolve_actor(uuid)` | present |
| `admin_private.cairo_today()` | present |
| `service_maintenance_occurrences` / `service_jobs` / `service_tickets` | present |
| `public.get_staff_daily_ops_workspace(date,uuid)` | **absent** before apply |

## Live stamp

| `schema_migrations.version` | Name |
|-----------------------------|------|
| `20261119164749` | `service_daily_ops_do1_staff_workspace` |

## Resulting definition and grants

| Object | Result |
|--------|--------|
| `public.get_staff_daily_ops_workspace(date,uuid)` | SECURITY DEFINER; authenticated EXECUTE **true**; anon EXECUTE **false** |
| `pg_get_functiondef` sha256 | `06547a6e1b103c044b28c299d1f4b4c761b62d081ec3c0fd665058b18adabc7e` |

Admin smoke (service-role actor): overdue occurrences **2** (open parents only); jobs awaiting review **1**; awaiting customer **1**; unassigned includes DO1 open job and excludes cancelled-parent job (desk may also show residual non-DO1 unassigned rows).

## Frontend preview

| Field | Value |
|-------|-------|
| Deployment id | `dpl_CmvJNkCLH1ycnmr6t2L2WBLzswQt` (**READY**) |
| Source revision | `2beea5ec9b63d1a34ecd3210786843ae9d564755` (contains accepted runtime `1278d4c4`) |
| Preview URL | `https://almona-portfolio-forge-jmdtko7ug.vercel.app` |
| Branch alias | `https://almona-portfolio-f-git-2939ea-mohamed-hassans-projects-0ca04921.vercel.app` (do not use for immutable binding) |
| Env binding | Branch-scoped preview `VITE_SUPABASE_*` → staging `apnmoevmvihfzcnttctx` (comment: Lane A staging browser gate) |
| Protection | SSO on; shareable `_vercel_share` in out-of-git handoff only |

## Secure delivery

Credentials and share secrets are **not** in git. Handoff root:

`C:\projects\_almona_handoff\do1-staging-verification\`

**Cleanup owner:** Cursor operator — `CLEANUP_AFTER_RUN.md`

## Explicit non-goals

No production apply. No merge. No DO-2/DO-3. No coverage scheduler. No machines grant/policy broadening.
