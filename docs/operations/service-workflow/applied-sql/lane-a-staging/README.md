# Applied SQL payloads — Lane A staging (`apnmoevmvihfzcnttctx`)

## Reviewed source

| Field | Value |
|-------|-------|
| Database tip | `e1345a0aef857e857fe5af50176c1fcb633aae70` |
| Migration path | `supabase/migrations/20261116180000_service_routines_lane_a_authoring.sql` |
| Git blob | `3ca6fb4165cd92c38fe18274d7869123fd834e45` |
| Byte length | **38958** (`git cat-file -s`) |
| SHA-256 | `62255ac2329864f11aa19bf66eb72ff5a491935c8fd586820ea3c0cb9ccbbc1b` |
| Verify | `git cat-file blob <blob> \| openssl dgst -sha256` (binary pipe; **not** PowerShell text pipe) |

Exact reviewed bytes preserved as:

`01_20261116180000_service_routines_lane_a_authoring.sql`

## Live apply channel

Chunked `execute_sql` of the reviewed body (BEGIN/COMMIT wrappers stripped for MCP statement batches), then `apply_migration` stamp:

| Order | Artifact | Channel |
|------:|----------|---------|
| 1–5 | `chunks/chunk_01.sql` … `chunk_05.sql` | `execute_sql` |
| stamp | `service_routines_lane_a_authoring` | `apply_migration` (`SELECT 1` marker after schema applied) |

Concatenation of chunks == reviewed body with only standalone `BEGIN;` / `COMMIT;` lines removed (and chunk_01 `SET LOCAL lock_timeout` omitted as it requires an open transaction).

## Live stamp

| version | name |
|---------|------|
| `20261116192555` | `service_routines_lane_a_authoring` |

## Out of scope

No production (`shfsebdncjnncqqnewfj`) · no FR-1 · no merge · no assignment/pinning/recurrence/technician-result.
