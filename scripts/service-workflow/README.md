# Service workflow disposable harness

- `disposable_b1_base.sql` — disposable auth/role stand-ins (includes `GRANT USAGE ON SCHEMA auth`).
- `disposable_b1_battery.sql` — B1 + Spark S1–S20 B2 checks (authoritative independent battery).
- `disposable_b2_battery.sql` — Cursor supporting B2S* subset (optional append).
- `disposable_b3_battery.sql` — B3 visit schedule/start/complete/abort battery (local/disposable only).
- `disposable_b4_battery.sql` — B4 report submission battery (local/disposable only; no staging).
- `spark_b3_independent_probes.sql` — sanitized Spark SP-* B3 probes (publish copy).
- `run_disposable_b1.py` — local PG17 runner; extracts frozen migrations by SHA; K1–K7.
- `run_disposable_b3.py` — local PG17 runner for B3 (applies B1/B2 frozen + security remediation + B3 + B3 corrections; no staging).
- `b1_contract.md` / `b2_contract.md` — contract notes.
- `spark_independent_probes.sql` / `spark_forge_probes.sql` — Spark sanitized security regression probes (post-corrective).
- `journey3m.cjs` / `journey3n.cjs` / `verify_decline.cjs` — sanitized B2 UI decline journey helpers (env-driven; no secrets in-repo).

UI component tests live under `src/components/support/*.b2.test.tsx`, `*.b3.test.tsx`, and `*.b4.test.tsx` (Vitest).
Evidence JSON under `.artifacts/` is gitignored and must not be committed.
Journey screenshots for acceptance: agent-store `slice0/evidence/b2-journey/` (not committed).
