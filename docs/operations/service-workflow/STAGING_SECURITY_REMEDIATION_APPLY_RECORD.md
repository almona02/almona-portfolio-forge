# Staging apply record — service workflow security remediation

**Status:** Applied on staging. Gaps below closed for SQL preservation + hash reconciliation + session placement.  
B1/B2 acceptance remains **BLOCKED** until Spark live verification.  
**Production:** not touched. No B3. No merge. **#155** frozen · **#156** draft.

| Field | Value |
|-------|--------|
| **Authorized by** | Spark FULL ACK (staging apply only) |
| **Approved package SHA** | `d4cfc8ce7ca34a076dd10edf38d9df0348dd69c4` |
| **Reviewed migration path** | `supabase/migrations/20261112150000_service_workflow_security_remediation.sql` |
| **Project** | `apnmoevmvihfzcnttctx` |
| **Tip publishing this record (prior)** | `f709bf7b` (superseded by gap-closeout commit) |

---

## 1) Exact applied SQL (preserved)

Directory: `docs/operations/service-workflow/applied-sql/`  
See `applied-sql/README.md` for hashing method and provenance.

| Order | Stamp | Migration name | Applied payload file | Original? |
|------:|-------|----------------|----------------------|-----------|
| 1 | `20261112141845` | `service_workflow_security_remediation` | `applied-sql/01_20261112141845_service_workflow_security_remediation.sql` | **Yes** (transcript) |
| 1b | *(none)* | unstamped `execute_sql` | `applied-sql/01b_unstamped_execute_sql_1_transcript_line_1276.sql` | **Yes** (transcript) |
| 1c | *(none)* | unstamped `execute_sql` | `applied-sql/01b_unstamped_execute_sql_2_transcript_line_1280.sql` | **Yes** (transcript) |
| 2 | `20261112142222` | `service_workflow_security_remediation_rpc_bodies` | `applied-sql/02_20261112142222_service_workflow_security_remediation_rpc_bodies.sql` | **Yes** (transcript) |
| 3 | `20261112142617` | `service_workflow_security_remediation_enforce_sync` | `applied-sql/03_20261112142617_service_workflow_security_remediation_enforce_sync.sql` | **Yes** (transcript) |

**Important:** Stamp 1 was a **truncated** apply (resolver only). The full reviewed migration file was **not** applied as a single payload. Do not treat the reviewed file as “what was applied.”

---

## 2) Hashing method + corrected file hash claim

**Method:** UTF-8 → LF-normalize → SHA-256; also report trailing-newline-ensured variant. Function bodies: `md5(prosrc)`.

| Object | Hash | Meaning |
|--------|------|---------|
| Reviewed migration @ `d4cfc8ce` (git blob / LF) | `lf_sha256` = `23384c52bc1b9bdd85efc305c10e54d563f7b76857f4e3d445916216eabaec3a` | Correct for LF/git blob |
| Same file on CRLF checkout (raw bytes) | `utf8_raw_sha256` = `7f08776dbf16b9484bb08248aef69d053cf2935c28f70670b75836366eb679e8` | **Not** the blob hash |
| Prior apply-record wording | Called `23384c52…` “Migration blob SHA-256” without stating LF/git-blob semantics | **Corrected here** — that value is the LF/git-blob digest, **not** a hash of any single applied MCP payload |

Applied payload digests (`lf_sha256`):

| Payload | `lf_sha256` |
|---------|-------------|
| Stamp 1 | `d84d0c4dcd8cb15fb2a86c3c818c79f75ad084f6376358a0c27f9d6de360d3ee` |
| Unstamped 1b | `5ff38b621329c429ce344f40efb98d1bbe856123af0facde2c6efc73eb76228b` |
| Unstamped 1c | `bac347dcc24e97eeab051dfa0e82ae90dc5cd94d6eb844c8c96cc0a58e053676` |
| Stamp 2 | `589294e66312fe1ddd32edcaccdb6d33b1536fe5acf7870022d8a1301591928d` |
| Stamp 3 | `96a37259dcef43ef4c579aab5d07196596a8ad3bd18eadb02db15eb719fcca71` |

---

## 3) Deployed function reconciliation

### Hashing note for functions

Live: `md5(prosrc)` from `pg_proc`.  
Source extract: UTF-8 + LF, body between `AS $$` and closing `$$` using the same trailing-newline convention that matched staging for corrective bodies.

### `govern_ticket_transition` (5-argument)

| Source | `md5(prosrc)` | Relation |
|--------|---------------|----------|
| **Deployed** | `09d8cd4ad64d5114fdee5c1f7b3de912` | live |
| Corrective migration / stamp 2 payload | `09d8cd4ad64d5114fdee5c1f7b3de912` | **Identical** to deployed |
| B1 migration `20261111210000_…` (inherited baseline) | `5d1f513e005a160a8b24d184b1bbb152` | **Behavioral difference** |

**Diff vs B1 (behavioral, intentional):** B1 inlined actor resolution (`caller_uid` + service-role `p_actor_id` override). Corrective/stamp2 routes through `admin_private.workflow_resolve_actor(p_actor_id)` (anon rejection + no authenticated impersonation). Remainder of transition/authorization logic matches.  
**Action:** No overwrite. No Spark correction packet required — deployed already matches the approved corrective source.

### `evaluate_ticket_workflow_prerequisites`

| Source | `md5(prosrc)` | Relation |
|--------|---------------|----------|
| **Deployed** | `6c7df7099a100bb6a2f95bcdc33afa58` | live |
| B1 migration `20261111210000_…` | `6c7df7099a100bb6a2f95bcdc33afa58` | **Identical** |
| Corrective migration | *body not rewritten* — only listed in grant-scrub `DO` block | Inherited B1 dependency |

**Diff:** None vs approved B1 source. Formatting/behavior unchanged by corrective.  
**Action:** None. Prior record wrongly implied this was a corrective body; corrected to **inherited B1**.

### Other corrective bodies (live `md5(prosrc)`, match approved corrective)

| Function | Args (abbrev.) | body_md5 | anon EXECUTE | stubbed |
|----------|----------------|----------|--------------|---------|
| `admin_private.workflow_resolve_actor` | `uuid` | `f1575192c3b296a9122fa41c230f0f94` | false | false |
| `public.enforce_governed_ticket_columns` | — | `a3dcca1ba2fcd2940b42da3429cd6a8e` | true† | false |
| `public.create_service_job` | 5-arg | `145f7c3aa90563dac603f573e81f6d89` | false | false |
| `public.ensure_default_service_job` | … | `6709a0c273b48894bffdcb05c238e09d` | false | false |
| `public.assign_service_job` | … | `4c5d209e29af259e59d189da43c07c9e` | false | false |
| `public.decline_service_job` | … | `1cc5788a23250911a681667c3e1768d5` | false | false |
| `public.govern_job_transition` | … | `42ce0c0526eb05d691b2c6055a428519` | false | false |
| `public.waive_service_job` | … | `5c3c68db79be63372b5eb9735c669739` | false | false |
| `public.create_service_job_visit` | … | `0a09888aa56990e2d05aaa5cfa8772c4` | false | false |
| `public.govern_visit_transition` | … | `d9e1955ab7cfdc8f8391eb1cac79a2c8` | false | false |
| `public.govern_ticket_transition` | 5-arg | `09d8cd4ad64d5114fdee5c1f7b3de912` | false | false |
| `public.govern_ticket_transition` | 4-arg | `5538ada52ba20bd815129bb4c95b8e29` | false | false |
| `public.evaluate_ticket_workflow_prerequisites` | `uuid` | `6c7df7099a100bb6a2f95bcdc33afa58` | false | false |

† Trigger function EXECUTE visibility; not an RPC entry point.

### Report-family + job table grants (effective)

| Table | svc INSERT/UPDATE/DELETE | auth SELECT | auth INSERT |
|-------|----------------------------|-------------|-------------|
| `service_jobs` / visits / history / audit | false | true | false |
| `service_reports` / revisions / reviews / acks | false | true | false |

---

## 4) Fresh scoped sessions (shared handoff)

**Agreed absolute directory (outside git repos, ACL-restricted to local user + SYSTEM/Administrators):**

`C:\projects\_almona_handoff\slice0-b2-security-sessions`

| Item | Value |
|------|--------|
| Manifest (non-secret) | `C:\projects\_almona_handoff\slice0-b2-security-sessions\MANIFEST.json` |
| Role files | `support.json`, `tech.json`, `admin.json`, `owner.json` |
| Pointers (gitignored) | worktree `.artifacts/.../spark-live-handoff/POINTER.md`; agent-store `SPARK_SESSION_HANDOFF_POINTER.md` |
| Cursor auth smoke | All four roles `AUTH_OK` against staging `/auth/v1/user` at issue time |
| **Spark confirmation** | **Required** — readability + independent staging auth. Delivery **not** complete until Spark confirms. |
| Tokens | **Not** committed; **not** pasted into chat |

Same Windows user can read this path from Cursor and Spark worktrees. If Spark cannot access it, report the limitation and use an explicit secure transfer — do not claim independent execution.

---

## 5) Spark live phase (unchanged gates)

1. Review exact applied SQL + function reconciliation above.  
2. Confirm session handoff readability + staging auth.  
3. Live checks: actor injection/mismatch/delegation, activation durability, direct-INSERT denial, forgery-write denial, legitimate governed ops.  
4. Resume B2 browser journey **only** after step 3 is green.  
5. Publish one final deployed manifest + exact live-check results (Spark).

Prior disposable SEC 8/8 + independent 15/15 evidence preserved; not re-stated as a substitute for live staging checks.
