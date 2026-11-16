# Spark — narrow FR-1 follow-up review (deps + fallback tests)

**Branch / draft PR:** `release/fr1-slice0-share-privacy` · https://github.com/almona02/almona-portfolio-forge/pull/158  
**Review exact PR HEAD after this follow-up lands.**  
**Do not merge. Do not apply to production. Do not change deployment settings.**

## Preserve accepted FR-1 evidence

Spark’s **independent content PASS on `d3ef35d4`** remains the content-acceptance evidence for the share/privacy/RLS package.  
**Do not restart a full FR-1 audit** unless this follow-up reveals a regression in FR-1 behavior.

## Scope (this review only)

1. **Dependency fixes (prefer upgrades, not ignores)**
   - Verified advisories:
     - `dnspython` 2.9.0 → **CVE-2026-128089** (GHSA-vvf4-9x63-8xvv) fixed in **2.9.2**
     - `opentelemetry-api` ≤1.45.1 → **CVE-2026-126360** (GHSA-mf5v-w3w3-f6cg) fixed in **1.45.2**
   - Pins updated in `python_backend/requirements-prod.txt` (CI base via `requirements-ci.txt`) and aligned companions in `requirements.txt` (`opentelemetry-sdk`/`proto` 1.45.2, instrumentation/semconv **0.66b2**).
   - Confirm `pip-audit -r requirements-ci.txt --ignore-vuln PYSEC-2026-1325` is clean of these two CVEs on the new HEAD (pre-existing unrelated ignores only if already policy).

2. **Committed fallback regression tests**
   - `python_backend/tests/test_fr1_missing_workflow_tables.py`
   - Missing optional `service_jobs` / `service_job_visits` → **fail closed** (no job scope; no 500).
   - Unrelated DB/transport errors → **propagate**.

## CI

Confirm **terminal required checks** on the **new exact HEAD**.  
Skipped checks on draft PRs are expected for: drafting-path coverage, production marketplace smoke, Supabase Preview (integration), and Full Pipeline docker/summary when backend had previously failed — re-evaluate after this HEAD is green.

## Verdict format

```text
FR-1 follow-up Spark: PASS | BLOCKED
HEAD: <sha>
Content evidence preserved: d3ef35d4 PASS (unchanged)
Deps: dnspython>=2.9.2 + otel-api>=1.45.2 verified | <issue>
Fallback tests: pass | <issue>
CI on HEAD: green | <failed checks>
Full FR-1 re-audit: not required | required because <regression>
Backup/PITR: still unresolved production prerequisite
Production proposal: NOT AUTHORIZED
```
