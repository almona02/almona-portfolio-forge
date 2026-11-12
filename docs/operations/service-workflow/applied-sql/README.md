# Applied SQL payloads — staging security remediation

Exact SQL recovered from Cursor/Spark agent transcripts of the MCP `apply_migration` / `execute_sql` calls that mutated staging `apnmoevmvihfzcnttctx`.  
**These are the original applied payloads** (not reconstructed from the reviewed migration file).

Secrets scan (2026-11-12): no passwords, JWTs, or fixture credentials in these files.

## Hashing method (canonical for this closeout)

1. Interpret bytes as **UTF-8**.  
2. Normalize newlines to **LF** (`\r\n` / `\r` → `\n`).  
3. Report:
   - `lf_sha256` — SHA-256 of the LF-normalized text as-is  
   - `lf_trailing_nl_sha256` — same after ensuring exactly one trailing `\n` if missing  
4. Function body comparisons use Postgres `md5(prosrc)` (body between dollar-quotes; typically includes a leading newline).

Do **not** compare a CRLF working-tree file’s raw SHA-256 to a git blob without LF normalization.  
Git blob at `d4cfc8ce` for the reviewed migration is LF-stored; `lf_sha256` = `23384c52bc1b9bdd85efc305c10e54d563f7b76857f4e3d445916216eabaec3a`.  
A CRLF checkout’s **raw** SHA-256 differs (`7f08776d…`) and must not be labeled the blob hash.

## Execution order

| Order | Stamp / channel | Name | File | Notes |
|------:|-----------------|------|------|-------|
| 1 | `20261112141845` `apply_migration` | `service_workflow_security_remediation` | `01_20261112141845_service_workflow_security_remediation.sql` | **Truncated:** resolver + grants only (2716 chars). Not the full reviewed migration. |
| 1b | *unstamped* `execute_sql` | — | `01b_unstamped_execute_sql_1_transcript_line_1276.sql` | enforce body (pre-sync) + job/visit/history/audit + **report-family** DML REVOKEs + SELECT grants |
| 1c | *unstamped* `execute_sql` | — | `01b_unstamped_execute_sql_2_transcript_line_1280.sql` | `create_service_job` drop/recreate + EXECUTE grants |
| 2 | `20261112142222` `apply_migration` | `service_workflow_security_remediation_rpc_bodies` | `02_20261112142222_service_workflow_security_remediation_rpc_bodies.sql` | Remaining RPC restores + govern_ticket overloads + anon EXECUTE scrub |
| 3 | `20261112142617` `apply_migration` | `service_workflow_security_remediation_enforce_sync` | `03_20261112142617_service_workflow_security_remediation_enforce_sync.sql` | Re-apply enforce body to match approved migration comments/`prosrc` |

Orders **1b** and **1c** are material to the live schema but have **no** `schema_migrations` row. They are preserved here as original transcript payloads so the three stamps are not mistaken for a complete apply log.

## Payload digests (`lf_sha256`)

| File | `lf_sha256` | `lf_trailing_nl_sha256` |
|------|-------------|-------------------------|
| `01_…remediation.sql` | `d84d0c4dcd8cb15fb2a86c3c818c79f75ad084f6376358a0c27f9d6de360d3ee` | same |
| `01b_…_1276.sql` | `5ff38b621329c429ce344f40efb98d1bbe856123af0facde2c6efc73eb76228b` | `298976e3c49bd5b156e182fd6a09bc1018d59d4aedc21bdda36abc8d38466449` |
| `01b_…_1280.sql` | `bac347dcc24e97eeab051dfa0e82ae90dc5cd94d6eb844c8c96cc0a58e053676` | `784d23edb1b2c519217f33815285e058796254611c16fa5307d9dcbf2f2ec674` |
| `02_…rpc_bodies.sql` | `589294e66312fe1ddd32edcaccdb6d33b1536fe5acf7870022d8a1301591928d` | same |
| `03_…enforce_sync.sql` | `96a37259dcef43ef4c579aab5d07196596a8ad3bd18eadb02db15eb719fcca71` | `7cba8981a352e87396e3c5888f69792a92d7bbe0dcb4b86ac59eb0dc1bd546d3` |

## Provenance

| File | Source |
|------|--------|
| `01_…` | Main agent transcript `apply_migration` tool args |
| `01b_…_1276` / `01b_…_1280` | Main agent transcript `execute_sql` tool args |
| `02_…` | Subagent `230a3d30-…` `apply_migration` tool args |
| `03_…` | Main agent transcript `apply_migration` tool args (matches `.artifacts/enforce_sync.sql`) |
