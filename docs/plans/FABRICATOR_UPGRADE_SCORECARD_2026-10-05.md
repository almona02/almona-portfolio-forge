# Fabricator user-workflow upgrade scorecard

Date: 5 October 2026 (Batch 2/3 exit + Batch 0 baseline doc).  
Canonical sequencing: [upgrade plan](FABRICATOR_USER_WORKFLOW_UPGRADE_PLAN_2026-10-05.md).

## Verdict

Program ≈ **92%**. Batches **1–6 product exits met** in code. Batch 0 fixtures still need operator accounts. Soft stock reservation is Batch 2 exit (DB hard reservation deferred). Local commits ahead of origin — not pushed.

## Batch rollup

| Batch | Status | Score | Notes |
|---|---|---|---|
| **0** Staging baseline | PARTIAL | **60%** | Baseline doc + seed template; operators still needed |
| **1** Truthful readiness | **DONE** | **95%** | |
| **2** Profiles / inventory | **DONE** | **95%** | UP-07 materialize persist + UP-10 soft ack + intake idempotency SQL |
| **3** Customer / pattern / revision | **DONE** | **90%** | UP-14 chrome honest (no fake Saved) |
| **4** Quote → order | **DONE** | **90%** | |
| **5** Production / QC / delivery | **DONE** | **95%** | |
| **6** Reports / a11y / integrations | **DONE** | **85%** | Deep RTL audit optional |

## Pending operator apply

| SQL | Purpose |
|---|---|
| `20261005_stock_movements_idempotency.sql` | UP-10 intake unique key |

## Next

1. Apply stock_movements idempotency SQL when convenient.  
2. Designate disposable two-owner accounts → expand Batch 0 seed.  
3. Push when ready.
