# Staging apply record — service workflow security remediation

**Status:** Applied on staging. B1/B2 acceptance remains **BLOCKED** until Spark live verification.  
**Production:** not touched. No B3. No merge.

| Field | Value |
|-------|--------|
| **Authorized by** | Spark FULL ACK (staging apply only) |
| **Approved package SHA** | `d4cfc8ce7ca34a076dd10edf38d9df0348dd69c4` |
| **Migration file** | `supabase/migrations/20261112150000_service_workflow_security_remediation.sql` |
| **Migration blob SHA-256** | `23384c52bc1b9bdd85efc305c10e54d563f7b76857f4e3d445916216eabaec3a` |
| **Project** | `apnmoevmvihfzcnttctx` |
| **Applied (UTC)** | `2026-11-12T14:18:45Z` (initial) → `2026-11-12T14:22:22Z` (RPC bodies) → `2026-11-12T14:26:17Z` (enforce body sync to approved blob) |
| **Fresh sessions issued (UTC)** | `2026-11-12T14:23:27Z` |

## schema_migrations stamps

| version | name |
|---------|------|
| `20261112141845` | `service_workflow_security_remediation` |
| `20261112142222` | `service_workflow_security_remediation_rpc_bodies` |
| `20261112142617` | `service_workflow_security_remediation_enforce_sync` |

Hosted apply used two DDL chunks plus an enforce-body sync so live `prosrc` matches the approved migration blob (comment-preserving). Semantics unchanged.

## Containment

Pre-apply stubs on B2 entry points are **cleared**. Restored RPC bodies are live; `stubbed=false` on all corrective entry points.

## Deployed function hashes + EXECUTE grants

`body_md5 = md5(prosrc)`. `anon_x` / `auth_x` / `svc_x` = `has_function_privilege(..., 'EXECUTE')`.

| Function | Args | body_md5 | anon | auth | service_role | stubbed |
|----------|------|----------|------|------|--------------|---------|
| `admin_private.workflow_resolve_actor` | `uuid` | `f1575192c3b296a9122fa41c230f0f94` | false | false | true | false |
| `public.enforce_governed_ticket_columns` | — | `a3dcca1ba2fcd2940b42da3429cd6a8e` | true† | true | true | false |
| `public.create_service_job` | `uuid, text, boolean, text, uuid` | `145f7c3aa90563dac603f573e81f6d89` | false | true | true | false |
| `public.ensure_default_service_job` | `…, uuid` | `6709a0c273b48894bffdcb05c238e09d` | false | true | true | false |
| `public.assign_service_job` | `…, uuid` | `4c5d209e29af259e59d189da43c07c9e` | false | true | true | false |
| `public.decline_service_job` | `…, uuid` | `1cc5788a23250911a681667c3e1768d5` | false | true | true | false |
| `public.govern_job_transition` | `…, uuid` | `42ce0c0526eb05d691b2c6055a428519` | false | true | true | false |
| `public.waive_service_job` | `…, uuid` | `5c3c68db79be63372b5eb9735c669739` | false | true | true | false |
| `public.create_service_job_visit` | `…, uuid` | `0a09888aa56990e2d05aaa5cfa8772c4` | false | true | true | false |
| `public.govern_visit_transition` | `…, uuid` | `d9e1955ab7cfdc8f8391eb1cac79a2c8` | false | true | true | false |
| `public.govern_ticket_transition` | 5-arg | `09d8cd4ad64d5114fdee5c1f7b3de912` | false | true | true | false |
| `public.govern_ticket_transition` | 4-arg | `5538ada52ba20bd815129bb4c95b8e29` | false | true | true | false |
| `public.evaluate_ticket_workflow_prerequisites` | `uuid` | `6c7df7099a100bb6a2f95bcdc33afa58` | false | true | true | false |

† Trigger function; EXECUTE for `anon` is expected and not an RPC entry point.

All listed body_md5 values match the approved migration blob at `d4cfc8ce` (evaluate retained from prior B1/B2 apply).

### Trigger

`enforce_governed_ticket_columns_trigger` — `BEFORE UPDATE ON public.service_tickets` → `enforce_governed_ticket_columns()`.

## Effective table grants (report family + jobs)

| Table | svc INSERT/UPDATE/DELETE | auth SELECT | auth INSERT | anon INSERT/UPDATE/DELETE |
|-------|----------------------------|-------------|-------------|--------------------------------|
| `service_jobs` | false / false / false | true | false | false |
| `service_job_visits` | false / false / false | true | false | false |
| `service_job_assignment_history` | false / false / false | true | false | false |
| `service_workflow_audit` | false / false / false | true | false | false |
| `service_reports` | false / false / false | true | false | false |
| `service_report_revisions` | false / false / false | true | false | false |
| `service_report_reviews` | false / false / false | true | false | false |
| `service_acknowledgments` | false / false / false | true | false | false |

`service_role` SELECT preserved on the above. Authenticated SELECT preserved on the report family.

## Fresh scoped sessions

Issued for Spark live checks (do **not** paste JWTs into chat):

| Location | Purpose |
|----------|---------|
| Agent store `…/files/slice0/sessions_b2_security_20261112/{support,tech,admin,owner}.json` | Fresh password-grant JWTs |
| Agent store `…/files/slice0/SPARK_B2_SECURITY_SESSIONS.md` | Pointer / manifest (no secrets) |
| Agent store `…/files/slice0/staging_fixture_auth.txt` | Fixture password (unchanged) |

Roles issued: support, tech, admin, owner — all OK at issue time.

## Spark next steps (no further Cursor prompt required)

1. Confirm this apply record (hashes + grants, including report family).  
2. Live actor / activation / INSERT / forgery / legitimate checks with the fresh sessions.  
3. Resume B2 browser journey only after step 2 is green.

B1/B2 staging acceptance stays **BLOCKED** until Spark’s live verdict.
