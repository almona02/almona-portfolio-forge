# Service workflow disposable harness

- `disposable_b1_base.sql` — disposable auth/role stand-ins (includes `GRANT USAGE ON SCHEMA auth`).
- `disposable_b1_battery.sql` — B1 + Spark S1–S20 B2 checks (authoritative independent battery).
- `disposable_b2_battery.sql` — Cursor supporting B2S* subset (optional append).
- `run_disposable_b1.py` — local PG17 runner; extracts frozen migrations by SHA; K1–K7.
- `b1_contract.md` / `b2_contract.md` — contract notes.

UI component tests live under `src/components/support/*.b2.test.tsx` (Vitest).
Evidence JSON under `.artifacts/` is gitignored and must not be committed.
