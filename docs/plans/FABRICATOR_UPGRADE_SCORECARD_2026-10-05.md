# Fabricator user-workflow upgrade scorecard

Date: 5 October 2026 (Batch 2 exit close + Batch 3 chrome).  
Canonical sequencing: [upgrade plan](FABRICATOR_USER_WORKFLOW_UPGRADE_PLAN_2026-10-05.md).

## Verdict

**Batch 1 DONE.** **Batch 2 ~90%** — UP-06/07/08/09/10 materially closed (owned UUID materialize, soft revision reservation, intake sync). **Batch 3 ~70%** — UP-11 always-on persist, UP-12/13, UP-14 save chrome unified. Batch 0 fixtures still open. Program ≈ **48%**.

## Batch rollup

| Batch | Status | Score | Notes |
|---|---|---|---|
| **0** Staging baseline | PARTIAL | **45%** | Fixtures / restore points open |
| **1** Truthful readiness | **DONE** | **95%** | |
| **2** Profiles / inventory | **NEAR EXIT** | **90%** | Soft reservation (no DB deduct); deeper idempotency DB keys optional |
| **3** Customer / pattern / revision | **NEAR EXIT** | **70%** | UP-14 chrome unified; polish remainders |
| **4** Quote → order | OPEN | **0%** | Next coding batch |
| **5** Production / QC / delivery | OPEN | **5%** | |
| **6** Reports / a11y / integrations | OPEN | **10%** | |

## Batch 2 gates

| Gate | Result |
|---|---|
| CatalogResolver fail-closed | **PASS** |
| Owned Stock / Reports inventory | **PASS** |
| Intake movements + sync + invalidate | **PASS** |
| Materialize catalog → owned UUID | **PASS** |
| Soft revision stock acknowledgement | **PASS** |
| Hard transactional reservation table | **DEFERRED** (table-less evidence sufficient for stage gate) |

## Batch 3 gates

| Gate | Result |
|---|---|
| customerId + always-on savePose | **PASS** |
| Pattern library apply | **PASS** |
| Project BOM fail-closed / partial | **PASS** |
| Unified save chrome (bar / sidebar / header) | **PASS** |

## Next

1. **Batch 4** — UP-15…17 quote → order.  
2. Batch 0 fixtures when operators available.  
3. Do not start Batch 5 release coordinator until Batch 4 quote/order exit.

## Evidence

| Artifact | Role |
|---|---|
| `materializeOwnedProfiles.ts` | UP-07 |
| `stockIntake.ts` + StudioStock acknowledge | UP-10 |
| `manufacturingSaveChrome.ts` | UP-14 |
| `ProjectCreationManager` always `savePose` | UP-11 |
| Commit trail | `c2b6fa0` + this slice |
