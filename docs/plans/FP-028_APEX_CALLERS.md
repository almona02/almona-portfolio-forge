# FP-028 — Apex production callers (Phase 0 inventory)

**Date:** 2026-10-04  
**Scope:** Characterization only. No routing change in this note.

## ApexEngineV6 — production `new ApexEngineV6(...)`

| Caller | Path | Role |
| --- | --- | --- |
| Project Studio optimize | `src/components/fabricator/project/ProjectStudio.tsx` | Per-unit optimize (`miter`) |
| Batch optimization | `src/lib/fabricator/production/BatchOptimizationService.ts` | Batch per-unit generate |
| Window 3D generator | `src/components/fabricator/Window3DGenerator.tsx` | Manufacturing preview / cuts |

## ApexEngineV6 — type-only imports (consume `ApexV6Output`)

| Consumer | Path |
| --- | --- |
| ProjectOptimizer | `src/components/fabricator/project/ProjectOptimizer.tsx` |
| ProjectQuoteSummary | `src/components/fabricator/project/ProjectQuoteSummary.tsx` |
| ProjectBOMAggregate | `src/components/fabricator/project/ProjectBOMAggregate.tsx` |

## ApexEngineV2 — production

| Caller | Path | Role |
| --- | --- | --- |
| GoldTierOrchestrator | `src/lib/fabricator/goldTier/GoldTierOrchestrator.ts` | Routes window units through V2 |

## Implication for Phase 4

- One production entry point must cover Project Studio, batch optimization, and 3D generator.
- V2 remains only behind an orchestrator/legacy adapter until parity gates pass.
- Output shape must grow per-cell sash/glass with `sourceCellId` without inventing pack data (A2).

## A2 authority gate (2026-10-04)

- `ApexEngineV6` now rejects non-authoritative `SystemPack` inputs with `ApexSystemAuthorityError` (`INCOMPLETE_SYSTEM_PACK`).
- Production callers that still pass catalog `SystemPack` (ProjectStudio, BatchOptimizationService, Window3DGenerator) will block until they supply an approved `FenestrationSystem` (Phase 1 contract / pack revision work).
- Invented `GENERIC-60` profiles, stock, hardware, and fabrication rules are removed from the adapter.
