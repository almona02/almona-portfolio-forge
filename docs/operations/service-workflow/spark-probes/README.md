# Sanitized Spark probes (B3)

Disposable/local only. No staging credentials. Fixture UUIDs are the shared disposable battery identities (tech1/tech2/support), not live staging secrets.

| Probe | Source | Purpose |
|-------|--------|---------|
| `B3_F_B3_03_CONCURRENT_LOCK_ORDER_PROBE.py` | `scripts/service-workflow/disposable_b3_concurrent_lock_order.py` | Barrier-synchronized start-vs-reassign / dual first-start / assign-decline / safety-vs-reassign |
| `B3_SPARK_INDEPENDENT_PROBES.sql` | Spark SP-01..SP-08 (+ SP-05C) | Independent lifecycle/auth/forge/audit probes |
| `B3_SPARK_INDEPENDENT_RESULTS.json` | `.artifacts/spark-b3/results.json` (sanitized publish) | Spark independent counts — separate from Cursor’s nine journey passes |
| Battery SQL | `scripts/service-workflow/disposable_b3_battery.sql` | Full B3 matrix incl. F-B3-02 binding + prior evidence |
| Script copy | `scripts/service-workflow/spark_b3_independent_probes.sql` | Same probes for disposable runners |

Run via `scripts/service-workflow/run_disposable_b3.py` against a throwaway PG17 — never against staging/production.

**Limitation note:** Hosted preview delivery is unresolved for release readiness; browser verification used a staging-backed local build. Service-role live checks remain disposable-only unless separately authorized.
