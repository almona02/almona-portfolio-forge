# Fabricator Batch 1 readiness

Date: 5 October 2026. Scope: preparation for UP-01 through UP-05 in the [workflow upgrade plan](FABRICATOR_USER_WORKFLOW_UPGRADE_PLAN_2026-10-05.md).

Latest verification: Batch 1 is implemented; 10 frontend files / 27 tests and the frontend production build passed again. The consultation migration is applied and verified on the configured live Supabase project, and the corrected production backend Docker image builds and starts successfully. See the [current implementation and verification report](FABRICATOR_BATCH1_IMPLEMENTATION_2026-10-05.md). The tooling baseline below records the earlier preparation stage.

## Toolchain recovery

The missing npm-cli error was caused by sandbox access to the user-level npm installation. npm and npx both report 11.11.1 outside that restriction; Node is 22.17.0. No global launcher replacement was necessary. Run npm through the approved execution context in Codex. The Program Files bundled CLI is also accessible, but using it does not remove sandbox restrictions on spawned tools.

Installed dependencies were stale: Vitest 3.2.7 was present while package.json and the lock require 4.1.11, and @vitest/browser-playwright was missing. `npm ci --no-audit --no-fund` successfully restored 1665 packages. The lockfile was preserved. Normal test startup now loads the existing configuration without modification.

Added `npm run test:batch1` for the existing identity, fail-closed optimization, measurement integrity and QC approval regression tests. Baseline: **5 files, 13 tests passed**. `npm run type-check` also passed. These tests protect existing gates; they do not yet cover the new Batch 1 behavior.

`npm run build` passed, including PWA service-worker generation. Vite reported large bundle warnings; these do not prevent Batch 1 implementation. Evidence is in npm-restore.log, batch1-tests.log, batch1-typecheck.log and batch1-build.log at the repository root.

## Implementation slices and acceptance checks

| Ticket | Primary files | Required checks |
|---|---|---|
| UP-01 | src/lib/fabricator/studioWorkflow.ts; src/components/fabricator/shell/FabricatorWorkflowBar.tsx | Active route remains distinct from status. Estimate BOM cannot imply manufacturing completion. Missing/stale evidence gives a blocked reason and recovery link. Preserve workflow validators and revision invalidation. |
| UP-02 | EngineeringBay.tsx; EngineeringBayWrapper.tsx; UniversalNavSidebar.tsx; TodayDashboard.tsx; MaterialAlertsPanel.tsx; QuoteBuilder.tsx; QualityControlPage.tsx | Review BOM action matches its destination; stage order follows the plan; navigation keeps project/position context; QC returns to the matching production record; Reports is discoverable. |
| UP-03 | src/components/fabricator/SystemPackTuningStudio.tsx | Empty profiles are not tuned. Save & Return persists explicit edits without automatically marking every profile tuned. Tuning never substitutes for manufacturing approval. |
| UP-04 | src/hooks/usePersona.ts; ProductionDashboard.tsx; production/KioskModeDashboard.tsx; src/pages/DeliveryTrackingPage.tsx | URL role flags cannot grant production permissions. Sample metrics and kiosk simulations are explicit demos. Simulated GPS, photos or scans cannot create production delivery/release evidence. |
| UP-05 | src/pages/FabricationServices.tsx; shared Radix Select; existing lead persistence/handler after discovery | Selections update estimates and reset incompatible options. Consultation validates and receives an acknowledged receipt. Portfolio/resource actions have valid destinations or are removed. |

Implement UP-01/02 together first, then UP-03 and UP-04. UP-05 can be a separate bounded change. Inventory adapter UP-06 and Stock loading UP-09 belong to later batches and are not prerequisites for these UI corrections.

Before accepting each slice, add focused behavior tests for its failure modes and rerun `npm run test:batch1`, type-check and build. Validate authenticated route context and the public calculator in a browser. The public lead handler must be inspected before choosing a persistence contract.

## Remaining staging work

The tooling baseline does not establish deployment readiness. Batch 0's two-owner, multi-revision fixtures, release/QC fixtures, deployed revision/feature-flag inventory and restore points remain to be verified in staging. Do not mutate customer production records to satisfy these checks. Browser Storybook tests, the complete test suite, backend tests and full lint are not covered by the targeted baseline above.
