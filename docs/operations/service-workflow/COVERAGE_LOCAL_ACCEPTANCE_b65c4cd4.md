# Coverage & recurrence — local acceptance @ `b65c4cd4`

**Status:** Local acceptance recorded · staging verification is **not** claimed here  
**Correction / runtime tip:** `b65c4cd4f9a24e18c45ed30cebccc526f399b159` (F-COV-CAP-1 against `e2a2f525`)  
**Accepted proposal:** `42862fdd27636d2682ce81fc287ed3777f8005fb`  
**Stamp docs tip:** `6b8d83466ad10ad78f1941a066acdc36684e7569` (docs only; runtime unchanged)

## Migrations (LF)

| Package | Path | SHA-256 (LF) |
|---------|------|--------------|
| Coverage base | `supabase/migrations/20261118210000_service_coverage_recurrence.sql` | `226d4245ca806cc1cfa8e501c37881a7409fa8c1b07c43e9122ffe030239220d` |
| F-COV-CAP-1 | `supabase/migrations/20261118220000_service_coverage_f_cov_cap_1.sql` | `7f463441037eb83f3e6125870dd0d5849c8db47c59ef6dfe4c8bc06b2ad8e336` |

Binding: [`COVERAGE_RECURRENCE_BINDING_CHOICES.md`](./COVERAGE_RECURRENCE_BINDING_CHOICES.md) · [`F_COV_CAP_1_CORRECTION.md`](./F_COV_CAP_1_CORRECTION.md)

## Attribution (keep separate)

| Layer | Attribution | Result | Notes |
|-------|-------------|--------|-------|
| Disposable CR-01…CR-16 | **Cursor supporting** | **22/22 PASS** | `.artifacts/slice0/service-workflow/disposable_coverage_results.json` |
| F-COV-CAP-1 (895 / 500 / 501 / continuation / idempotent) | **Cursor supporting** | **10/10 PASS** | same JSON `f_cov_cap_1` · 895 remains **local-only** |
| True 8-worker concurrent generation | **Cursor supporting** (true multi-session race) | **PASS** | `workers=8`, `unique_sequences=ok`, before=after=5 · same JSON `concurrency` |
| Spark independent | **Preserved / not substituted** | — | Cursor numbers do **not** replace Spark. Any Spark concurrent or CR matrix remains authoritative where Spark recorded it; this record preserves that separation. |
| Component Vitest | **NOT RUN** | — | Pre-existing Vitest suite-load failure on this workstation |
| Browser | **Environment supplied separately** | Not claimed pass | [`COVERAGE_BROWSER_ENVIRONMENT.md`](./COVERAGE_BROWSER_ENVIRONMENT.md) |

## Explicit non-claims

- This local record alone does **not** authorize production, merge, or FR-1.
- Controlled staging apply is recorded separately: [`COVERAGE_STAGING_APPLY_RECORD.md`](./COVERAGE_STAGING_APPLY_RECORD.md) · delivery [`SPARK_COVERAGE_STAGING_DELIVERY.md`](./SPARK_COVERAGE_STAGING_DELIVERY.md).
- Cursor disposable evidence does not substitute for Spark independent verification.
