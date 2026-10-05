# Fabricator user-workflow upgrade scorecard

Date: 5 October 2026 (Batch 5 code shipped — apply release + delivery SQLs).  
Canonical sequencing: [upgrade plan](FABRICATOR_USER_WORKFLOW_UPGRADE_PLAN_2026-10-05.md).

## Verdict

**Batch 5 code EXIT for UP-18/19/20** — QC reload, shop release freeze, delivery server ack. Program ≈ **72%**. Apply two new SQLs before treating Batch 5 as fully closed. Local commits ahead of origin — not pushed.

## Batch rollup

| Batch | Status | Score | Notes |
|---|---|---|---|
| **0** Staging baseline | PARTIAL | **45%** | Fixtures open |
| **1** Truthful readiness | **DONE** | **95%** | |
| **2** Profiles / inventory | **NEAR EXIT** | **90%** | |
| **3** Customer / pattern / revision | **NEAR EXIT** | **70%** | |
| **4** Quote → order | **DONE** | **90%** | Pose quotes + convert + Orders gate; SQLs applied |
| **5** Production / QC / delivery | **CODE DONE** | **85%** | SQLs pending apply: releases + delivery acks |
| **6** Reports / a11y / integrations | OPEN | **10%** | |

## Batch 5 evidence

| Gate | Result |
|---|---|
| UP-19 QC reload (`getLatestQualityApproval`) | **PASS** (code) — no clear-on-entry |
| UP-18 `fabricator_position_releases` | **PENDING APPLY** |
| UP-20 `fabricator_delivery_acknowledgements` + RPC | **PENDING APPLY** |
| Production → release freeze → QC query params | **PASS** (code) |
| Delivery operational path (QR = `ALMONA_{pose}_R{rev}`) | **PASS** (code) |
| Demo delivery still cannot complete ops | **PASS** (test) |

## Next

1. Apply `20261005_fabricator_position_releases.sql` then `20261005_fabricator_delivery_acks.sql`.  
2. Batch 6 — reports / a11y / integrations.  
3. Batch 0 fixtures when operators available.
