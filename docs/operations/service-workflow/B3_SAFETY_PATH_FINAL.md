# B3 final safety-path correction

**Accepted base:** `a8503d1416b62db97e5c28b4da45f350a65e5a01` (CONDITIONAL PASS corrections)  
**This correction:** `742d1a98fccc34c5a28277cb2f8ea34587ae2b2e`  
**Migration:** `supabase/migrations/20261112194500_service_workflow_b3_safety_path_final.sql`  
**Local disposable:** B3 31/0 PASS (incl. B3-S1/S2/S3, B3-D2); B1/B2 under B3 72 PASS / 4 DEFER (M4/M5/R3/R4)  
**Gates:** No staging apply until Spark targeted review PASS · no merge · no production · no B4

## Changes

### 1. No implicit safety approval
`govern_visit_transition(..., 'in_progress')` no longer supplies `b3_minimum_safety_attestation()`.
It calls `start_service_job_visit` with **NULL** attestation.
Start succeeds only when:
- caller passes the exact attestation text, **or**
- a previously recorded **explicit** `passed` check is still the latest safety record.

Compatibility calls without that evidence fail with a clear `22023`.

### 2. Deterministic safety ordering
Latest check = `ORDER BY attested_at DESC, ordinal DESC`.
`ordinal` is a monotonic `bigint` (sequence default).
- A later **failed** supersedes a prior passed.
- A later **explicit passed** (new record) supersedes a prior failed.
Same `attested_at` cannot hide a failed behind a passed (or vice versa) without ordinal tie-break.

### 3. Hosted grant protection
All new/overloaded B3 visit RPCs: `REVOKE ALL … FROM PUBLIC, anon` then `GRANT EXECUTE … TO authenticated, service_role`.
In-function `workflow_resolve_actor` auth remains even if EXECUTE is adversarially re-granted to anon.

## Abort / no-access
Still require no fabricated passed check. Failed (or missing) safety may lead to abort/no-access without recording a passed result.

## Spark verify matrix
- Direct start and facade start reject missing explicit acknowledgment
- Valid explicit acknowledgment (attest-on-start or prior passed) succeeds
- Failed-check ordering is deterministic under equal timestamps
- Abort/no-access without fabricated passed
- Actor isolation / anon adversarial re-grant still denied
