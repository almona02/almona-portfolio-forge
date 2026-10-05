# Fabricator user-workflow upgrade scorecard

Date: 5 October 2026 (Batch 2 slice + Batch 3 start).  
Canonical sequencing: [upgrade plan](FABRICATOR_USER_WORKFLOW_UPGRADE_PLAN_2026-10-05.md).

## Verdict

**Batch 1 product exit DONE.** **Batch 2 foundation slice DONE** for UP-06 + UP-09; UP-07/08/10 materially advanced (Profiles library load + server-save feedback; DXF no silent sash invent / steel remap; stock intake via movements+sync + empty-state + query invalidate). **Batch 3 started** (UP-11 customerId retain, UP-12 pattern apply wire, UP-13 fail-closed project BOM). Batch 0 fixtures still open. UP-14 chrome unify deferred.

Overall: **~39%** (≈9 of 23 UP tickets materially closed or advanced + Batch 1 release blockers).

## Batch rollup

| Batch | Status | Score | Notes |
|---|---|---|---|
| **0** Staging baseline | PARTIAL | **45%** | Toolchain + honesty + git done; two-owner fixtures / restore points open |
| **1** Truthful readiness | **DONE** | **95%** | Product exit met |
| **2** Profiles / inventory | **IN PROGRESS** | **70%** | UP-06/09 exit met for catalog vs owned stock; UP-07/08/10 partial; revision reservation (UP-10 remainder) open |
| **3** Customer / pattern / revision | **STARTED** | **35%** | UP-11/12/13 coded; UP-14 open |
| **4** Quote → order | OPEN | **0%** | |
| **5** Production / QC / delivery | OPEN | **5%** | Demos isolated only |
| **6** Reports / a11y / integrations | OPEN | **10%** | NaN inventory map reduced via UP-09 |

## Batch 2 gates

| Gate | Result |
|---|---|
| CatalogResolver fail-closed (no ROCK60/[0]) | **PASS** |
| Studio Stock = owned `fabricator_profiles` | **PASS** |
| Reports inventory map finite costs | **PASS** |
| Stock intake movements + sync (no stale qty write) | **PASS** |
| Empty inventory still shows intake chrome | **PASS** |
| Profiles library load + local/server save feedback | **PASS** (partial — full UUID materialize still open) |
| DXF no silent sash invent / steel→aluminum | **PASS** |
| Revision-bound stock reservation | **OPEN** (UP-10 remainder) |
| `npm run test:batch1` | **PASS** (re-run after this slice) |
| CatalogResolver + inventory unit tests | **PASS** |

## Batch 3 gates (in flight)

| Gate | Result |
|---|---|
| customerId retained on WindowUnit + project meta | **PASS** |
| Pattern library applies to active pose | **PASS** |
| Project BOM no pack/pattern[0] substitute; partial labeled | **PASS** |
| Unified save/revision chrome (UP-14) | **OPEN** |

## Next

1. Finish UP-10 revision-bound reservation + Profiles UUID materialize (UP-07 remainder).  
2. Complete UP-14; close Batch 3 exit.  
3. Do not start Batch 5 release persistence before Batch 2 exit (UP-10 reservation still open).  
4. Close Batch 0 fixtures when operators available.

## Evidence

| Artifact | Role |
|---|---|
| `src/lib/fabricator/catalog/CatalogResolver.ts` | UP-06 |
| `src/lib/fabricator/inventory/*` | UP-09/10 |
| `StudioStockPage.tsx` / `FabricatorReports.tsx` | Owned stock surfaces |
| `ProfileStudioLite.tsx` | UP-07/08 |
| `ProjectCreationManager.tsx` / `PatternLibraryPage.tsx` / `ProjectSummaryDashboard.tsx` | Batch 3 start |
| Plan | [FABRICATOR_USER_WORKFLOW_UPGRADE_PLAN_2026-10-05.md](FABRICATOR_USER_WORKFLOW_UPGRADE_PLAN_2026-10-05.md) |
