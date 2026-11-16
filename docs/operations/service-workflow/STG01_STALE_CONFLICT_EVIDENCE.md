# STG-01 evidence: stale draft conflict vs hosted REST

## Observed (Spark staging, 2026-11-16)

Source: `C:\projects\_almona_handoff\lane-a-staging-verification\SPARK_CONFIRM.json` → `staging_verdict.STG-01`.

| Observation | Value |
|-------------|--------|
| RPC | `update_service_routine_draft` with mismatched `p_expected_draft_revision` |
| Staging REST | Hang then **HTTP 504 ~125s** (7 consecutive reproductions) |
| Safety | Revision/status stable; correct-revision updates still **200**; no silent overwrite |
| Control | Same function, missing version → SQLSTATE **`P0002`** returns promptly (HTTP 500) |
| Other staging codes | `42501` / `22023` / `23505` return promptly |
| Local disposable | Instant **`40001`** (`SPK-D7-stale` PASS in historical `SPARK_LANE_A_RESULTS_e1345a0a.json`) |

Pre-correction raise site (baseline `e1345a0a` / stamp `20261116192555`):

`RAISE EXCEPTION 'Stale draft revision' USING ERRCODE = '40001'`

## Documented retry mechanism (cited source — not a deployed-version observation)

**Explanation used for this correction:** A custom PL/pgSQL `RAISE` with SQLSTATE **`40001` (`serialization_failure`)** tells PostgREST the failure is transient, so PostgREST **retries the transaction**. That matches a long hang ending in gateway timeout on hosted REST while local/direct PG returns immediately.

Cited source:

- Supabase KB: [SQLSTATE 40001 in an RPC function causes infinite retries](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b)
- Upstream context: PostgREST issue [#3673](https://github.com/PostgREST/postgrest/issues/3673); fix landed for PostgREST **16** (do not retry on `40001`).

### Distinguished: not claimed as observed on this project

This freeze does **not** assert that we inspected staging PostgREST version banners, Postgres log `process_id` retry floods, or `pg_stat_activity` retry loops for STG-01. Those would be optional corroboration at apply time. The **observed** evidence is the Spark differential (40001 path hangs; sibling errcodes and local PG do not). The **mechanism explanation** is the cited Supabase/PostgREST documentation applied to that differential.

## Correction

Function-only migration `20261116213000_service_routines_lane_a_stg01_stale_conflict.sql`:

- SQLSTATE **`PT409`** (HTTP **409**)
- DETAIL **`routine_draft_stale_revision`**
- MESSAGE `Stale draft revision`
- Locking, revision comparison, and admin authorization preserved

Historical Spark local JSON that records `40001` remains as **historical** evidence of the pre-correction tip. Current expectations (battery + contract + client) use **`PT409`**.
