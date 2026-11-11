# Spark handoff — B2 assignment (disposable)

**From:** Cursor  
**To:** Spark (independent verification)  
**Date:** 2026-11-11

## What to verify

Branch/ref: `origin/feat/service-workflow-b1-planning` (draft #156)
Reachable freeze: `8f2acc4e806e70e12e87a24dcbebaef78e63e085` (ancestor of tip). Alignment: `B2_SPARK_ALIGNMENT.md`.  
B1 freeze (must stay green): `7a8307395b79df677a96f77cd993a77351b5805c`  
B2 migration: `supabase/migrations/20261111220000_service_workflow_b2_assignment.sql`  
Contract: `docs/operations/service-workflow/B2_ASSIGNMENT_CONTRACT.md`  
Harness: `python scripts/service-workflow/run_disposable_b1.py`  
**B2 freeze SHA:** `8f2acc4e806e70e12e87a24dcbebaef78e63e085` (feat UI+RPC+battery). Branch tip may include docs-only commits after.

## Required coverage

- Concurrent/repeated `ensure_default_service_job` → one Job 1 (K5 + B2S1)
- Additional jobs independent (B2S2)
- Unauthorized assign + forged actor denied (B2A1)
- Decline own job only; ticket/history preserved (B2D1/B2D2)
- Reassign history; reject in-progress visit (B2R1)
- Assignment+audit roll back together (B2A2)
- Ticket reassign does not move jobs (B2T1)
- Legacy jobless unchanged (B2L1)
- Full B1 battery remains green (incl. W2–W4, X5/X6, positive J1)

## Out of scope

Staging/production apply, merge, B3+, squads, visit/report/closure UI.  
#155 remains `ca9f5067`.
