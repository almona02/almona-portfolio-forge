# Fabricator user-workflow upgrade scorecard

Date: 5 October 2026 (Batch 4 start).  
Canonical sequencing: [upgrade plan](FABRICATOR_USER_WORKFLOW_UPGRADE_PLAN_2026-10-05.md).

## Verdict

**Batch 1 DONE. Batch 2 ~90%. Batch 3 ~70%. Batch 4 started** (UP-15 pose quote persist + UP-16 double-tax fix). Program ≈ **52%**. Not pushed.

## Batch rollup

| Batch | Status | Score | Notes |
|---|---|---|---|
| **0** Staging baseline | PARTIAL | **45%** | Fixtures open |
| **1** Truthful readiness | **DONE** | **95%** | |
| **2** Profiles / inventory | **NEAR EXIT** | **90%** | Soft reservation; materialize owned UUIDs |
| **3** Customer / pattern / revision | **NEAR EXIT** | **70%** | Save chrome unified |
| **4** Quote → order | **STARTED** | **25%** | UP-15 table+Save; UP-16 tax fix; UP-17 open |
| **5** Production / QC / delivery | OPEN | **5%** | |
| **6** Reports / a11y / integrations | OPEN | **10%** | |

## Batch 4 gates (in flight)

| Gate | Result |
|---|---|
| `fabricator_pose_quotes` migration | **READY** (apply on Supabase) |
| Pose Commercial Save → upsert by project/pose/revision | **PASS** (code) |
| Workspace convert no double VAT | **PASS** |
| Atomic pose quote→order + Orders unify | **OPEN** |

## Next

1. Apply `supabase/migrations/20261005_fabricator_pose_quotes.sql`.  
2. Finish UP-16 pose convert + UP-17 Orders.  
3. Then Batch 5.

## Commits (local, unpushed)

- `c2b6fa0` Batch 2 foundation + Batch 3 handoffs  
- `3ef4d94` Batch 2 remainders + UP-14 chrome  
- (this) Batch 4 UP-15/16 start  
