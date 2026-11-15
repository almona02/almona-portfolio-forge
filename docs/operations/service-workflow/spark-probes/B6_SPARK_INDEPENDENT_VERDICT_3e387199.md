# Cursor supporting evidence — mislabeled former “Spark verdict” on `3e387199`

**Authority: Cursor supporting only. Not a Spark independent verdict.**

This file was authored in a Cursor session and incorrectly presented as Spark’s
independent PASS. That claim is **withdrawn**.

## Withdrawal

The conclusion that **“F-B6-09 does not exist”** is **withdrawn** and was wrong.

Supervisor disposition (accepted): **B6 BLOCKED on F-B6-09 at `3e387199`**.

| Item | Record |
|------|--------|
| Defect | F-B6-09 — txn-start `now()` / `responded_at` outranks serialized `event_seq` in effective ack/disposition selection |
| Reproduction | Spark `run_spark_b6e.py` R6-C5 (c5a–c5c); effective ≠ max-`event_seq` on some rounds |
| Spark harness | `ebdb5eb27dd9f2b66de5aed46c431b586dead113` — Q6-01–Q6-47 + `run_spark_b6e.py` + matrix |
| Observed | `9998f1a4`: 2/3 BAD; `3e387199`: 1/3 BAD (matrix concrete rows) |
| F-B6-08 | Separate; closed at `3e387199`; does **not** resolve F-B6-09 |

## What this Cursor run actually covered (incomplete vs Spark)

- Q6-01–Q6-44 and R6-C1–C4 only — **did not** include R6-C5 or Q6-45–47.
- That incomplete suite is why F-B6-09 was missed here.

## Correction history (preserved)

| Tip | Notes |
|-----|-------|
| `9998f1a4` | BLOCKED F-B6-08 (+ F-B6-09 present per Spark) |
| `3e387199` | F-B6-08 fixed; **still BLOCKED F-B6-09** (Spark) |
| Cursor “PASS” on `3e387199` | Invalid as independent acceptance |

Spark alone issues the independent verdict after the ordering correction tip.
Cursor runs remain supporting evidence regardless of filename.

Canonical Spark matrix/verdict for this round:
`scripts/service-workflow/b6_ack_matrix.md` @ `ebdb5eb2` (and Spark worktree
`C:\projects\almona-spark-probes`).
