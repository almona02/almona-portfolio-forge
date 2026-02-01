# Phase 2 Execution Workflow (Closed-Loop Production)

This document describes the Phase 2 execution workflow implementation that adds execution stages, status transitions, production feedback, and inventory consumption tracking with Supabase persistence.

## Scope
- Execution stages for production projects (material prep → QC)
- Status transitions with feedback capture (quality, time, issues)
- Inventory consumption logging tied to stages
- UI for execution tracking inside Production Workflow

## AICS-001 Constitutional Compliance
References: AICS-001 Sections 1, 3, 4
- No ML/AI used in execution path (Section 1)
- Deterministic workflow and transitions (Section 3)
- Human validation required via explicit operator input for status and feedback (Section 4)

## Data Model
Migration: `supabase/migrations/20260116_execution_workflow_tables.sql`

Tables:
- `execution_stages`: per-project production stages and status
- `execution_logs`: event log for stage progress and issues
- `inventory_consumption`: material usage and wastage by stage

RLS:
- Policies restrict rows to the authenticated project owner through `production_projects.user_id`

## Types and Workflow Definition
File: `src/types/execution.ts`

Key types:
- `ExecutionStage`, `ExecutionLog`, `InventoryConsumption`
- `ExecutionFeedback` for human-submitted feedback and consumption data
- `EXECUTION_WORKFLOW` defines ordered stages and transition constraints

Stages:
1. Material Preparation
2. Frame Assembly
3. Sash Assembly
4. Glazing Installation
5. Hardware Installation
6. Quality Control & Final Inspection

## Service Layer
File: `src/services/executionService.ts`

Capabilities:
- Initialize stages for a project
- Update stage status with feedback (complete/fail)
- Record inventory consumption
- Generate execution summary (time, quality, wastage)

Production service wiring:
- `src/services/productionService.ts` exposes execution APIs for UI usage

## UI Integration
Files:
- `src/components/fabricator/drafting/components/ExecutionTrackingPanel.tsx`
- `src/components/fabricator/drafting/components/ProductionWorkflowPanel.tsx`

Features:
- Execution stages list with status badges
- Start / Complete / Fail actions
- Feedback dialog with quality score, time, issues, notes
- Inventory consumption entry per stage
- Summary metrics (efficiency, quality, wastage)

## Inventory Consumption Flow
1. Operator enters item code/name/category and quantities.
2. Consumption is stored in `inventory_consumption`.
3. Wastage data aggregates into execution summary.

Note: BOM integration is manual entry for now. Next iteration can prefill consumption from BOM items.

## Status Transitions
Valid transitions enforced in service:
- `pending` → `in_progress` or `skipped`
- `in_progress` → `completed` or `failed`
- `failed` → `in_progress` (retry)
- `completed` and `skipped` are terminal

## Testing
File: `src/tests/lib/fabricator/executionService.test.ts`

Coverage:
- Stage initialization
- Status transition logic
- API surface availability

## How to Use
1. Create/select a production project in the Production Workflow panel.
2. Open the "Execution Tracking" tab.
3. Initialize stages (first run only).
4. Start a stage, then complete/fail with feedback.
5. Add inventory consumption items if needed.

## Limitations and Next Steps
- Execution UI currently expects a selected production project.
- Consumption items are manual; integrate with BOM for prefill.
- Operator identity currently uses a placeholder; wire to auth user.
