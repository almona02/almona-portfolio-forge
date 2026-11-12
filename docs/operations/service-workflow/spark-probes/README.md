# Sanitized Spark probes (B3)

Disposable/local only. No staging credentials. Fixture UUIDs are the shared disposable battery identities (tech1/tech2/support), not live staging secrets.

| Probe | Source | Purpose |
|-------|--------|---------|
| `B3_F_B3_03_CONCURRENT_LOCK_ORDER_PROBE.py` | `scripts/service-workflow/disposable_b3_concurrent_lock_order.py` | Barrier-synchronized start-vs-reassign / dual first-start / assign-decline / safety-vs-reassign |
| Battery SQL | `scripts/service-workflow/disposable_b3_battery.sql` | Full B3 matrix incl. F-B3-02 binding + prior evidence |

Run via `scripts/service-workflow/run_disposable_b3.py` against a throwaway PG17 — never against staging/production.
