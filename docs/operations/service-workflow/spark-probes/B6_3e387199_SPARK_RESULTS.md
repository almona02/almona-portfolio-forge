# Spark independent results — F-B6-08 correction `3e387199`

**Tested SHA:** `3e387199dcca327a218e8371e24ee69310e55bf4`  
**Runner:** `scripts/service-workflow/run_spark_b6c.py` (chain includes `…171100` F-B6-08)  
**Harness:** `spark_b6_battery.sql` Q6-01–Q6-44  
**Prior FAIL tip (preserved):** `9998f1a48f1b18b467bc1e4d3552ced5e32325a4` — `B6_9998f1a4_SPARK_RESULTS.md` (BLOCKED F-B6-08)

## Verdict

**PASS** on `3e387199`.

## Results

| Check | Result |
|-------|--------|
| Clean apply B6+FIX+INT+AUTH | PASS |
| Spark Q6-01–Q6-44 | **44/44 PASS** |
| Q6-41 tied timestamps | PASS 10/10 |
| Q6-42 authorized re-close | PASS `closed_at` kept; wf/gov 1/1 |
| Q6-43 closure audit-bomb | PASS |
| Q6-44 auth-before-idempotent re-close | PASS `auth_ok=t/t/t den=t/t/t/t/t/t/t mut_ok=t mut_den=t` |
| R6-C1..C4 | **4/4 PASS** |
| B5 / B3 / B1-B2 regressions | green (B4: 3 known / 0 unexpected) |

## Q6-44 coverage (this tip)

Authorized: support, admin, service_role→support delegation — success, no mutation of `closed_at`/audits.  
Denied (42501 / auth failure, no ticket payload, no mutation): owner customer, assigned tech, unrelated tech, sales, anon, forged actor, unattributed service_role.

## Historical (not superseded)

| Tip | Verdict |
|-----|---------|
| `ec00b692` | BLOCKED (freeze baseline) |
| `0b07aa8d` | BLOCKED F-B6-06/07 |
| `9998f1a4` | BLOCKED F-B6-08 only |

No staging apply · no merge · no production · no B7.
