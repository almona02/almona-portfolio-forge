# Spark independent results — runtime freeze `9998f1a4`

**Tested SHA:** `9998f1a48f1b18b467bc1e4d3552ced5e32325a4`  
**Runner:** `scripts/service-workflow/run_spark_b6c.py` (chain includes `…171000` integrity)  
**Harness:** `spark_b6_battery.sql` restored from `b6500999` (Q6-01–Q6-43)  
**Raw JSON:** local `C:\Users\bobbi\AppData\Local\Temp\b6cspark\spark_b6c_results.json` (disposable; not staging)

## Historical verdicts (preserved; do not cover this tip)

| Tip | Verdict | Evidence |
|-----|---------|----------|
| `ec00b692` | BLOCKED | `B6_BLOCKED_ec00b692_EVIDENCE.md` / `…_RESULTS.json` |
| `0b07aa8d` | BLOCKED (F-B6-06/07) | `scripts/service-workflow/b6_ack_matrix.md` |

## Independent results on `9998f1a4`

| Check | Result |
|-------|--------|
| Clean apply B6+B6FIX+B6INT | PASS |
| Spark Q6-01–Q6-43 | **43/43 PASS** |
| Q6-41 tied timestamps (10/10 last-writer via `event_seq`) | PASS `last_writer_wins=10/10 stable_reads=t` |
| Q6-42 authorized re-close (`closed_at` + no dup audits) | PASS `wf=1/1 gov=1/1` |
| Q6-43 closure audit-bomb rollback | PASS `st=resolved aud=0` |
| R6-C1..C4 concurrency | **4/4 PASS** |
| Cursor disposable B6-01..16 | 16/16 PASS (supporting; not Spark Q6) |
| B5 regression | 40/40 |
| B4 regression | 27 pass / 3 known / 0 unexpected |
| B3 regression | 51/51 |
| B1/B2 | 72 pass / 4 DEFER / 0 fail |

## Focus notes

1. **Q6-41 / ties:** Under forced equal `responded_at`, `ORDER BY responded_at DESC, event_seq DESC` yields last writer 10/10. Same-ticket writers take `pg_advisory_xact_lock` before insert, so `event_seq` matches the lock-serialized order (not a bare sequence assumed equal to commit order across unlocked writers). Concurrent accept×refuse (R6-C2) appends two rows with one effective.
2. **Q6-42:** Authorized support re-close preserves backdated `closed_at` and emits no duplicate workflow/governance audits.
3. **F-B6-08 (blocks clean PASS):** On `9998f1a4`, the idempotent re-close/re-resolve early `RETURN` runs **before** role authorization. Unauthorized callers would receive a silent success instead of `42501`. Q6-42 (support actor) does not catch this. Required: authorization before idempotent return.
4. **entity_id:** Structured revision uuid on ack outstanding/refusal codes; Cursor B6-16 and Spark Q6-21 head isolation remain green.
5. **Five prior corrections:** Q6-11/13/17 and related paths remain green; not re-litigated here.

## Verdict on `9998f1a4`

**BLOCKED — F-B6-08 only.**  
Q6-41 / Q6-42 (authorized path) / Q6-43, entity_id targeting, prior five corrections, and concurrency/regressions are green. Prior BLOCKED tips (`ec00b692`, `0b07aa8d`) remain historical and do not cover this SHA.

## Attribution

Cursor’s 7-check suite is `cursor_b6_targeted_battery.sql` only — not equivalent to this Q6-01–Q6-43 run.
