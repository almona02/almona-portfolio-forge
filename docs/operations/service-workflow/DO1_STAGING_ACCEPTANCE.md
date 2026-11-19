# DO-1 staging acceptance — Spark **`STAGING PASS`** (read-only journey)

**Recorded:** 2026-11-19  
**Scope:** Staging verification only · **no** production · **no** merge · **no** DO-2/DO-3 · **no** scheduler · **no** migration reapply · **no** runtime change  
**Accepted implementation:** `1278d4c40f14f05f25c3dd88b6763c8a9ef22113`  
**Preview source (1-char build fix; runtime intent unchanged):** `2beea5ec9b63d1a34ecd3210786843ae9d564755`  
**Immutable preview:** `dpl_CmvJNkCLH1ycnmr6t2L2WBLzswQt` @ `https://almona-portfolio-forge-jmdtko7ug.vercel.app`  
**Proposal tip:** `4c8285117b3a304b7f113885d14b260259128e70`  
**Migration stamp:** `20261119164749` / `service_daily_ops_do1_staff_workspace`  
**Apply record:** [`DO1_STAGING_APPLY_RECORD.md`](./DO1_STAGING_APPLY_RECORD.md)  
**Local acceptance:** [`SERVICE_DAILY_OPS_DO1_LOCAL_ACCEPTANCE.md`](./SERVICE_DAILY_OPS_DO1_LOCAL_ACCEPTANCE.md)

---

## 1. Verdict (Spark-authored — preserved; do not overwrite)

| Field | Value |
|-------|-------|
| Status | **`STAGING PASS`** (read-only journey) |
| Functional | **40/40** (+ **6/6** anon) · 0 failed |
| Staging ref | `apnmoevmvihfzcnttctx` (`almona02-staging`) |
| Forbidden production | `shfsebdncjnncqqnewfj` (untouched) |

Authoritative Spark artifacts (**do not overwrite**):

- `C:\projects\_do1_verify\runs\verify_staging\SPARK_DO1_STAGING_VERDICT.md`
- `C:\projects\_do1_verify\runs\verify_staging\spark_do1_cleanup_inventory.json`
- `C:\projects\_do1_verify\runs\verify_staging\spark_do1_staging_api.json`
- `C:\projects\_do1_verify\runs\verify_staging\spark_do1_staging_browser.json`
- `C:\projects\_do1_verify\runs\verify_staging\spark_do1_staging_anon.json`
- verify_staging `shots/` + scripts

Handoff mirrors (operator copies; not authoritative substitutes):  
`C:\projects\_almona_handoff\do1-staging-verification\evidence-preserved\`

---

## 2. Runtime / deployment bindings

| Binding | Value |
|---------|-------|
| Implementation | `1278d4c40f14f05f25c3dd88b6763c8a9ef22113` |
| Preview source | `2beea5ec9b63d1a34ecd3210786843ae9d564755` |
| Deployment | `dpl_CmvJNkCLH1ycnmr6t2L2WBLzswQt` (immutable URL only) |
| Staging project | `apnmoevmvihfzcnttctx` |
| Migration stamp | `20261119164749` |
| Migration LF sha256 | `cbb48f7a91eac61b9a5c2de716c951d625e3065acf9288c31764e20774e97e7b` |
| Function-definition sha256 | `06547a6e1b103c044b28c299d1f4b4c761b62d081ec3c0fd665058b18adabc7e` (**operator-claimed**; Spark: no `pg_proc` over REST — corroborated by applied-SQL byte equality + exact behavior match) |

---

## 3. Evidence attribution

| Layer | Attribution | Result |
|-------|-------------|--------|
| Staging API (bindings + DO1-STG-01…13) | **Spark independent** | 24/24 |
| Staging browser on immutable preview | **Spark independent** | 10/10 |
| Anon / preview / binding | **Spark independent** | 6/6 |
| Operator apply / preview / fixtures / auth repair | Cursor | Apply + `AUTH_REPAIR_RECORD.md` + handoff |
| Local Cursor disposable / Vitest | Supporting / local only | **Not** a substitute for staging Spark |

---

## 4. Explicit limitations (must travel with the PASS)

Preserve these qualifications from Spark’s verdict:

1. **L1:** Function-definition hash is **operator-claimed** (no `pg_proc` over REST); corroborated by applied-SQL LF identity + exact staging behavior.
2. **L2:** Deployment↔source binding is handoff-claimed; corroborated by immutable-URL serving, SSO wall/share behavior, staging-only login POST, and UI/behavior match to `2beea5ec`.
3. **L3:** Empty-queue UI state not observable on staging (queues non-empty); covered by LOCAL PASS instead.
4. **L4:** Earlier staging auth 500s (repaired) are an environment note, not a product finding; no behavior was assessed while they persisted.

**Non-fixture residuals to preserve:** unassigned jobs `e4912dca…` (“Job 1”) and `988c5636…` (“Job 3”) — must **not** be deleted.

---

## 5. Operational closeout status

| Step | Owner | Status |
|------|-------|--------|
| Staging PASS recorded | This document + Spark verdict | **Recorded** |
| Cleanup inventory | Spark `spark_do1_cleanup_inventory.json` | Inventoried |
| Fixture + access retirement | Cursor operator | **Done** — `C:\projects\_almona_handoff\do1-staging-verification\OPERATOR_CLEANUP_RECEIPT.md` + `CLEANUP_EXECUTION.json` (2026-11-19T17:46:05Z) |
| Zero-confirm | Spark | Awaiting post-cleanup |
| Closeout record | Operator | After Spark zero-confirm |

**This acceptance does not authorize** production, merge, DO-2/DO-3, scheduler, migration reapply, or runtime change.
