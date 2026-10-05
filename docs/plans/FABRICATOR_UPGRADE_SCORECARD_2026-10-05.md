# Fabricator user-workflow upgrade scorecard

Date: 5 October 2026 (Batch 4 near-exit).  
Canonical sequencing: [upgrade plan](FABRICATOR_USER_WORKFLOW_UPGRADE_PLAN_2026-10-05.md).

## Verdict

**Batch 4 ~75%.** UP-15 pose quotes live (SQL applied). UP-16 pose quote→order (idempotent, no double tax) + link migration. UP-17 owner Orders vs admin bulk gate. Program ≈ **58%**. Local commits ahead of origin — not pushed.

**Apply next SQL:** `supabase/migrations/20261005_orders_pose_quote_link.sql`

## Batch rollup

| Batch | Status | Score | Notes |
|---|---|---|---|
| **0** Staging baseline | PARTIAL | **45%** | Fixtures open |
| **1** Truthful readiness | **DONE** | **95%** | |
| **2** Profiles / inventory | **NEAR EXIT** | **90%** | |
| **3** Customer / pattern / revision | **NEAR EXIT** | **70%** | |
| **4** Quote → order | **NEAR EXIT** | **75%** | Apply pose-quote→order link SQL; polish remainders |
| **5** Production / QC / delivery | OPEN | **5%** | Next after link SQL |
| **6** Reports / a11y / integrations | OPEN | **10%** | |

## Batch 4 gates

| Gate | Result |
|---|---|
| Pose quote persist (UP-15) | **PASS** (SQL applied) |
| Convert to Order from pose Commercial | **PASS** (code) |
| Idempotent convert / no double VAT | **PASS** |
| `orders.fabricator_pose_quote_id` unique | **READY** — apply link migration |
| Owner Orders UX + admin gate | **PASS** |

## Next

1. Apply `20261005_orders_pose_quote_link.sql` on Supabase.  
2. Smoke: Save quote → Convert to Order → Orders list.  
3. Start Batch 5 (release / QC / delivery).

## Local commits (unpushed)

- `c2b6fa0` / `3ef4d94` / `8a40189` + this Batch 4 close slice  
