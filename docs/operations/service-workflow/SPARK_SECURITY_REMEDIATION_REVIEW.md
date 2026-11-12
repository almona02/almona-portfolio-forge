# Spark review — B1/B2 staging security remediation

**Status:** Staging corrective **APPLIED**. B1/B2 staging acceptance **BLOCKED** until Spark live verification. Browser testing **paused**.  
**Containment:** Lifted (stubs cleared; secured RPC bodies live).  
**Corrective:** Spark FULL ACK received; applied on staging only (`d4cfc8ce`).  
**#155** frozen · **#156** draft · production unauthorized · no B3 · no merge.

---

## Cursor deliverable (this handoff)

| Item | Path / value |
|------|----------------|
| Corrective migration | `supabase/migrations/20261112150000_service_workflow_security_remediation.sql` |
| Security battery (SEC1–SEC8) | `scripts/service-workflow/disposable_security_battery.sql` |
| Battery runner | `scripts/service-workflow/run_disposable_security.py` |
| This review handoff | `docs/operations/service-workflow/SPARK_SECURITY_REMEDIATION_REVIEW.md` |
| Parent handoff | `docs/operations/service-workflow/HANDOFF.md` |
| **Apply record** | `docs/operations/service-workflow/STAGING_SECURITY_REMEDIATION_APPLY_RECORD.md` |
| **Amended package SHA** | `d4cfc8ce7ca34a076dd10edf38d9df0348dd69c4` |
| **Cursor disposable pre-run (amended)** | PASS — before FAIL SEC1/SEC4/SEC5/SEC7/SEC8; after 8/0; SEC8 reproduced→fixed; SEC6 PASS. **Not** Spark evidence. |
| **Spark independent verdict** | Cited from Spark’s independent report (FULL ACK chain): disposable SEC **8/8** PASS + independent probes **15/15** PASS. Do not treat Cursor’s pre-run row as Spark’s result. |

---

## Spark blocking amendment (applied in corrective)

Extend service-role DML revocation beyond jobs/visits/history/audit to:

| Table | Revoke from `service_role` (and authenticated/anon) |
|-------|------------------------------------------------------|
| `public.service_reports` | INSERT, UPDATE, DELETE |
| `public.service_report_revisions` | INSERT, UPDATE, DELETE |
| `public.service_report_reviews` | INSERT, UPDATE, DELETE |
| `public.service_acknowledgments` | INSERT, UPDATE, DELETE |

**Preserved:** `SELECT` for intended reads; table-owner / SECURITY DEFINER writers only.  
**Not added:** any broad service-role write exception. Report submission/review RPCs remain deferred — must not be fabricated via direct writes.

**Staging pre-amendment evidence:** `service_role` held INSERT/UPDATE/DELETE on all four tables (hosted grants probe 2026-11-12).

---

## Containment (staging `apnmoevmvihfzcnttctx`) — historical

| Field | Value |
|-------|--------|
| **Applied at** | `2026-11-12T12:55:00+02:00` |
| **Method** | Ad-hoc stubs + REVOKE anon (not a schema_migrations row) |
| **Status** | **Cleared** by corrective apply (see apply record) |

Previously stubbed entry points restored with secured bodies. Applied history: `20261111222941` B1, `20261111223057` B2, plus corrective stamps in the apply record.

---

## Finding resolution (retained)

### A) Activation
Ordinary authenticated owner/assignee clear was already denied (`7a830739`). Privileged DB-owner/DEFINER clear ≠ ordinary API exploit. Corrective still makes activation immutable once set.

### B) Direct INSERT (jobs)
Ordinary authenticated admin/support lacked table INSERT. Bypass was **service_role** + BYPASSRLS.

### C) Forged review → job completion (Spark amendment)
`service_role` could INSERT `service_reports` → `service_report_revisions` → `service_report_reviews(approved_issued)` then `govern_job_transition(…, 'completed')` succeeded without governed report RPCs. **SEC8** reproduces this fail-open before the amendment and passes after.

---

## Test definitions (SEC1–SEC8)

Source: `scripts/service-workflow/disposable_security_battery.sql`  
Runner: `python scripts/service-workflow/run_disposable_security.py`

| ID | Definition | Before | After |
|----|------------|--------|-------|
| **SEC1** | Anon + staff `p_actor_id` on assign | FAIL-OPEN | PASS |
| **SEC2** | Authenticated mismatched actor | PASS | PASS |
| **SEC3** | Service-role actor ok; missing denied | PASS | PASS |
| **SEC4** | Client + privileged activation clear/rewrite | FAIL (priv clear) | PASS |
| **SEC5** | Auth + service_role direct job INSERT | FAIL (svc insert) | PASS |
| **SEC6** | Legitimate ensure/assign/create + audit | PASS | PASS |
| **SEC7** | Activation clear must not bypass resolve | FAIL-OPEN | PASS |
| **SEC8** | Service_role forged approved review → job completed | **FAIL-OPEN** | **PASS** (blocked; stays `awaiting_review`) |

Latest disposable verdict: before FAIL SEC1/SEC4/SEC5/SEC7/SEC8 → after **8/0 PASS**.

---

## Corrective checklist

- [x] Reject anonymous actor injection  
- [x] Reject authenticated actor mismatch  
- [x] Service-role actor only when `is_service_role_request()`  
- [x] Legitimate governed create/assign + audit (SEC6)  
- [x] Activation immutable once set  
- [x] Restore stubbed RPC bodies  
- [x] Strip effective anon EXECUTE (`PUBLIC` + `anon`)  
- [x] **Spark amendment:** revoke service_role DML on report/revision/review/ack  
- [x] No compensating broad service_role write grant  

---

## Spark procedure (live phase — now)

1. Confirm deployed-definition / grant record matches approved migration (apply record).  
2. Live actor / activation / INSERT / forgery / legitimate checks with fresh scoped sessions.  
3. Resume B2 browser journey only after step 2 passes.

## Out of scope

Production, B3, merge, fabricating report/review RPCs.
