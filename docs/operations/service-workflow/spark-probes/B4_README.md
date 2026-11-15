# Sanitized Spark probes (B4)

Disposable/local only unless separately authorized for staging. No credentials in this tree.

| Artifact | Purpose |
|----------|---------|
| `B4_DISPOSABLE_BATTERY.sql` | Full R4 matrix + F-B4-04 + F-B4-05 |
| `B4_SPARK_INDEPENDENT_PROBES.sql` | Getter JSON privacy, labour XOR table boundary, auth-order |
| `B4_DISPOSABLE_RESULTS_6a64a01e.json` | Cursor disposable counts bound to approved implementation |
| `../B4_INDEPENDENT_VERIFICATION_VERDICT_6a64a01e.md` | Final tip verdict |
| `../B4_INDEPENDENT_VERIFICATION_VERDICT_e203b438.md` | Historical: erroneous Cursor PASS; Spark BLOCKED F-B4-05 |

Run disposable via `python scripts/service-workflow/run_disposable_b4.py` on throwaway PG17 — never production.

**e203b438:** Spark BLOCKED on F-B4-05. Soft labour CHECK is not acceptable. Approved tip: `6a64a01e`.
