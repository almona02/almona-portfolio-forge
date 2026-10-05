# Fabricator user pages and wiring audit

Date: 5 October 2026. Scope: live Studio user journey plus local source inspection.

## Assessment

The shell and several manufacturing gates work, but data identity, persistence, catalog resolution, commercial handoffs and operational status are inconsistent between pages. Upgrading the workflow contracts should precede visual expansion or new automation. The current evidence does not establish readiness for an end-to-end production workflow.

This continues [the initial fabrication, Stock and Profiles audit](LIVE_FABRICATION_STOCK_PROFILES_AUDIT_2026-10-05.md). Those findings remain relevant; the Reports-versus-Stock comparison below strengthens the inventory-source finding.

## Evidence boundaries

- Used the existing signed-in browser session. Inspected one existing project with three positions and a Panda 50 position, plus workshop-wide pages. The initial project-list header showed ROCK 60 before the position route hydrated Panda 50.
- Navigated pages, opened/closed project creation, inspected tabs and tested navigation. Did not submit a project, edit measurements, approve QC, record purchases, execute cuts, mark orders paid, upload evidence or deliver a unit.
- Navigation can trigger application side effects: BOM generated an estimate on mount; workspace dispatches may autosync; Stock/Reports invoke existing stock reconciliation code. This was not an isolated staging session.
- Source references describe this local checkout. Deployment parity has not been verified, so source-only defects are distinguished from observed live behavior. No backend authorization bypass or cross-account disclosure was demonstrated.
- No mobile/RTL walkthrough, real CNC connection, PDF parity test, network benchmark, multi-device persistence test or production database inspection was performed.

## Page coverage

All paths below are relative to https://www.almona02.com/fabricator/studio.

| Surface | Coverage and observation |
|---|---|
| `/command` | Dashboard, capabilities and quick links; Configure Profiles & Inventory navigates to Projects. |
| `/projects` | Three project groups and five positions loaded. |
| `/projects/:projectId` | Summary loaded three position previews and system/dimension rows. Aggregate action inspected in source, not executed. |
| New Project dialog | Egyptian wizard opens; client/project/address fields shown; closed without submission. |
| `/projects/:projectId/positions/:poseId/measuring` | 1200 × 1400 mm, locked 2 × 1 layout; glazing-required warning. |
| `…/design` | Panda 50; Profiles 0 / Parts 0; missing authoritative physics; estimate labeling present. |
| `…/bom` | Generated estimate with FRAME-60 / SASH-60 / MULLION-60; continuation disabled. |
| `…/optimization` | Blocks missing components and approved catalog/rule versions. |
| `…/commercial` | Initially no cost data; points to optimization but lacks direct recovery CTA in that empty state. |
| `…/production` | Blocks missing optimization and manufacturing-qualified BOM. |
| `/production` | Kiosk shows CNC Machine #2, Ready and Simulate Scan (Test). Supervisor control returns to kiosk in this session. |
| `/production/quality` | Inspection form, authenticated inspector and position summary; approval disabled. No approval attempted. |
| `/production/delivery` | No Unit for Delivery; no unit passed by route. |
| `/orders` | Owner-filtered orders UI; zero orders; instructs conversion from Commercial. |
| `/production/orders` | Different admin OrdersPanel with bulk status/payment controls; zero rows in this session. |
| `/data` | 26 systems; Panda 50 reports Tuned with zero profiles. |
| `/data/tuning?systemPackId=panda-50` | Add Profile opens definition wizard; zero-profile pack says All Tuned and ready for design/optimization. |
| `/data/customers` | Two customer records loaded; New Order action reviewed in source. |
| `/data/patterns` | Pattern browser loads; page-to-project callbacks absent in source. |
| `/data/integrations` | Static registry; SAP/Odoo explicitly unavailable. |
| `/reports` | Five saved profiles, five critical stock alerts, `$ NaN` inventory total, USD pricing, mock OEE explicitly labeled. |
| `/data/stock` | Rechecked for same Panda position: empty inventory despite five profiles on Reports. |

The prior audit covered `/data/profiles` and public `/fabrication-services` in detail. Settings, support, machine registration and every alternative wizard/design branch are outside this pass.

## Findings

Priority: P1 = blocks a core handoff, risks incorrect data or misrepresents readiness; P2 = usability, discoverability or inconsistent feedback. “Live + source” means the symptom was observed and the source supplies a plausible explanation, not proof of identical deployed code.

### FUA-01 — P1 — Workflow statuses do not represent manufacturing readiness (live + source)

An estimate-only BOM became “BOM Complete” even though Continue to Optimization was disabled and optimization rejected missing authority. Measure showed Complete despite a glazing-required warning. Opening blocked Production/Delivery labels those stages In progress. `studioWorkflow.ts:80–175` uses presence of measurement/BOM/quote/result or stored completion flags; `deriveStageVisualStatus` overrides active stages to in_progress. Completion does not check BOM qualification, reconciliation, QC acknowledgement or dirty revision.

Separate selected-page state from stage evidence. Show Draft estimate, Blocked with reason, Qualified and Approved where relevant. Preserve existing fail-closed manufacturing validators.

### FUA-02 — P1 — Stage order and action targets disagree (live + source)

Workflow bar: Project → Measure → Design → Quote → BOM → Stock → Optimize → Production → QC → Delivery. Quote initially requires optimization. The store orders BOM → optimization → commercial, with preview3d as an extra step. The design button says Proceed to Optimization, but `EngineeringBayWrapper.tsx:120` navigates to BOM. QuoteBuilder also allows BOM-cost estimates, so quoting policy itself is inconsistent.

Choose one journey and distinguish preliminary quote from production-backed quotation. Align navigation, prerequisites, action labels and invalidation with that policy.

### FUA-03 — P1 — Pages resolve different profile catalogs (live + source)

Reports loads five persisted workshop profiles; Stock is empty for the same active project. Gallery can list catalog cutting entries that Stock cannot resolve. Design uses `resolveSystemPackProfiles`; optimization/production/project wrapper use only `SYSTEM_PACKS` and direct `pack.profiles`. ProfileStudioLite saves custom systems elsewhere, so its promise of immediate downstream use is unsupported by these callers. EngineeringBayWrapper also falls back to ROCK 60/first pack when an ID cannot be found, while optimization returns no pack.

Sources: StudioStockPage.tsx:19; EngineeringBayWrapper.tsx:83; OptimizationPage.tsx:75; ProductionPage.tsx:63; ProjectStudioWrapper.tsx:24; resolveSystemPackProfiles.ts. Implement one catalog resolver plus a separate owner-scoped persisted inventory repository. Unknown systems must report unresolved identity rather than substitute another system.

### FUA-04 — P1 — Tuning declares an empty or unverified system ready (live + source)

Panda 50: zero profiles, All Tuned, “ready for design and optimization.” `SystemPackTuningStudio.tsx:203` calls every on an empty array. `handleSaveAndReturn` marks all profiles tuned automatically; `handleMarkAllTuned` only changes local labels and storage. That does not establish measured geometry or approved manufacturing rules.

Require the system's required roles, measured values, calibration evidence and versioned approval. Save must not imply approval. Existing legacy “tuned” labels must not grant manufacturing authority during migration.

### FUA-05 — P1 — Delivery route is disconnected from the selected unit (live + source)

Workflow link discards project/position identity and navigates to global `/production/delivery`. App.tsx:482 renders DeliveryTrackingPage without props; the component requires windowUnit and returns an empty state when absent (DeliveryTrackingPage.tsx:409). It has no store/query bridge. The live page remains No Unit for Delivery.

Introduce a route-bound delivery coordinator that loads the released unit and acknowledged QC revision, or an explicit queue with unit selection. Carry authenticated operator, customer and job identity into a persisted delivery operation.

### FUA-06 — P1 — Delivery evidence still contains production-reachable simulations (source only)

DeliveryTrackingPage.tsx:140 fills random Cairo GPS after capture failure without a development guard; photo capture hashes a timestamp string instead of uploaded image bytes (line 176), and QR scanning manufactures a value (line 211). Operator defaults to operator_001. The page can emit a ProductDelivered event when supplied a unit. This audit did not invoke these operations, and the main route is currently disconnected.

Before connecting FUA-05, isolate simulations into an explicit demo implementation. Require real evidence or an authorized documented exception, actual unit QR validation, authenticated operator and server acknowledgement.

### FUA-07 — P1 — QC depends on ambient state and clears local approval on entry (source + partial live)

The QC route is global. QualityControlPage.tsx reads currentProject/workflowIdentity, and its mount effect calls invalidateStep('quality-control'), clearing the local acknowledgement and resetting the form. It queries authoritative revision but does not reload an existing approval into the workflow. Back to Production goes to the dashboard, not the position production step; success goes to Projects, not Delivery. Start New says progress will be saved, then simply clears workflow.

Preserve existing acknowledged approvals on read; reset only an explicit new inspection or changed revision. Route-bind the position and make return/delivery links explicit. No server approval deletion was shown.

### FUA-08 — P1 — Pose quote does not hand off to persisted orders/invoices (live + source)

Pose Commercial returns early with QuoteBuilder (`CommercialPage.tsx:801`). The quote/invoice management and Convert to Order handlers later in the component are not rendered there. App.tsx wires CommercialPage only at the pose route. QuoteBuilder saves to workflowStore, not draftQuotes or server quotes. Orders instructs the user to convert from a workspace that the canonical pose flow cannot reach.

Persist revision-bound quotes and provide a visible accepted-quote → order transition. Preserve line items, customer UUID, project/position IDs and source quote ID. An estimate must have an explicit status, separate from a released quotation.

### FUA-09 — P1 — Existing order conversion can tax an already-taxed total (source only)

CommercialPage.tsx:170–187 takes draftQuote.amount as order subtotal, adds 14% again, and inserts no quote_id/project/position relation. Its quote creation already derives a tax-inclusive total, including the BOM fallback. Retry can create another order because conversion has no uniqueness/idempotency contract.

Use one canonical monetary breakdown and an idempotent conversion operation. This is a code-path defect, not a claim about statutory tax treatment, and the current pose early return makes this handler unreachable from that UI.

### FUA-10 — P1 — User navigation exposes an admin Orders panel and weakly separated status actions (live + source)

Both Orders destinations are visible to the signed-in Customer role. `/orders` filters by user; `/production/orders` mounts an administrator-oriented OrdersPanel with no component role gate or owner filter and exposes bulk payment/status controls. Database RLS may still prevent unauthorized access; no bypass was tested. `OrderManagement.tsx:89` changes status by order ID alone and offers Mark Paid/Start Production/Mark Delivered without corresponding payment/release/delivery evidence. Revenue sums currencies as EGP and includes refunded amounts.

Consolidate user orders, separately protect administrative actions, and enforce transitions/ownership/evidence on the server. Payment state and production/delivery state should reflect their own acknowledged records. Fix currency-aware revenue semantics.

### FUA-11 — P1 — Kiosk production is a simulation with a hardcoded machine (live + source)

ProductionDashboard passes machineId 2 and operator Mahmoud. KioskModeDashboard.tsx:115 builds a mock piece for any barcode, stores logs only in localStorage and simulates cutting on a timer. Pause only logs/toasts and does not stop that interval. No actual cut was invoked. Live presents CNC Machine #2 and Ready; only the scan control advertises Test. Operator persona forces kiosk, explaining the observed inability to switch to Supervisor.

Mark the entire simulation as Demo and prevent operational release through it. Bind real scans to released cut IDs, real operator/machine identity and machine acknowledgements. If physical execution remains unsupported, provide a truthful manual operator workflow with recorded confirmations.

### FUA-12 — P1 — Reports mis-map persisted inventory and display NaN (live + source)

Reports shows `$ NaN`, missing per-meter cost, UNKNOWN systems, while its upper summary says five low-stock profiles and embedded dashboard says zero low stock. FabricatorReports.tsx:95–102 maps only stock_quantity/min_stock_level and casts raw rows to Profile; cost_per_meter and other snake_case fields remain unmapped. InventoryDashboard uses camelCase costPerMeter. USD is hardcoded in inventory display, while quotes use EGP.

Use one checked database-to-domain adapter for Stock, Reports, Pricing and BOM; require finite numeric values and carry currency/units explicitly. Unknown price must remain “Not configured,” never NaN or silently assumed zero.

### FUA-13 — P2 — Command-center readiness and KPIs are mostly static (live + source)

TodayDashboard hardcodes jobs, late jobs, alerts and connected-machine counts to zero. Command cards say READY although Stock is empty and systems lack usable profiles. ProductionMonitor hardcodes workshop savings percentages; Reports labels its OEE correctly as Mock Summary, but uses a broad Live data badge on the same screen.

Separate static capability availability from operational readiness. Show Unknown/not connected/loading/error rather than green zeroes. Bind job, alert and machine metrics to scoped data with timestamps. Preserve explicit demo labels for sample analytics.

### FUA-14 — P1 — Customer-to-project and dashboard quick actions lose intent (live + source)

Configure Profiles & Inventory lands on Projects, confirmed live. TodayDashboard/MaterialAlertsPanel use `/fabricator-workflow`. FabricatorWorkflowRedirect sends that to Projects unless new=true, and does not forward location.state. Customer New Order sends fromCustomer in navigation state to that legacy URL; ProjectCreationManager does not consume it. Default Egyptian creation has free-text client name, while saved-customer selection exists only in the standard wizard; creation constructs a fresh customerCode and omits meta.customerId.

Use canonical explicit actions: new project, profile library, stock. Carry customer UUID through wizard metadata into persisted project relations; preserve it across redirects and both wizard modes.

### FUA-15 — P1 — Pattern library selection never reaches a project (live page + source)

PatternLibraryPage renders PatternLibraryWizard without onPatternSelected/onCancel. Generate only calls the optional callback after analysis; Cancel also only invokes an optional callback. The standalone page can customize but cannot apply or navigate the result.

Add a route coordinator with project/position context, system compatibility and an explicit apply-preview/save transition; without a context provide project selection or new-project entry. Preserve existing grid data until the user explicitly applies changes.

### FUA-16 — P1 — Project BOM aggregation substitutes fallback systems/patterns and skips failures (source only)

ProjectSummaryDashboard.tsx:143–166 falls back to the first system and pattern, catches individual generation failures and continues to present a combined project cost. It displays calculated-position count, but no per-position failure reason. This differs from strict pose BOM resolution.

Resolve exact system/pattern identity; report each blocked position. Label partial estimates explicitly and block whole-project quote/release when required positions are missing. Aggregate actual quantities, not array row counts, when displaying component totals.

### FUA-17 — P1 — Read rollout flag controls whether new projects are persisted (source only)

ProjectCreationManager.tsx:121 skips savePose unless FABRICATOR_READ_V2 is enabled, but then always navigates to a full project/position route. PoseWorkflowLayout and EngineeringBayWrapper treat those IDs as authoritative regardless of that flag. With the flag off, newly generated UUIDs may refer only to local jobs and fail authoritative hydration. That flag combination was not tested live.

Make canonical project creation persist through one agreed write path, independent of a read-migration flag. Test both rollout configurations and failure recovery without creating phantom projects.

### FUA-18 — P1 — Production persona override is not development-gated (source only)

usePersona.ts:30 accepts a role URL parameter, sets permissions and visible tabs from it and marks confidence high without an environment guard. This establishes a client capability-spoofing risk, not a demonstrated backend escalation. Do not rely on client persona permissions for authoritative writes.

Remove/restrict test overrides in production, derive operational roles from authenticated claims/server membership, and test server refusal of unauthorized admin/payment/release operations.

### FUA-19 — P2 — Save/connectivity indicators contradict each other (live + source)

Sidebar says Workspace Unsaved / No local save recorded; footer says AUTOSAVE Saved. ManufacturingStatusBar.tsx:32 infers saved from project.updatedAt; WorkspaceContext logs sync failures without exposing them. Online reflects navigator.onLine, not successful API sync. Machine/Manufacturing settings are static placeholders rather than the active resolved contract. This combines with the stale pre-hydration system shown in the header.

Use one revision-scoped save acknowledgement and explicit pending/local/offline/server/error states. Suppress stale project-specific chrome during authoritative hydration. Resolve machine/settings labels from actual selected configuration.

### FUA-20 — P2 — Discoverability and empty-state recovery need a consistent contract (live + source)

Reports route exists but is absent from the inspected primary navigation. Operation templates points to Tuning without a system ID; SystemPackTuningStudio redirects immediately to the gallery. Integrations is a static explanatory table with no native destination links, and includes implementation text “in this task.” BOMReviewPanel returns null when no BOM exists and no exact system/pattern enables generation, leaving no recovery UI.

Provide explicit navigation and route prerequisites. Every empty/error/blocked state should explain the missing record and offer a contextual recovery link. Rename tuning versus operation templates honestly, and present integration availability in user terms.

## Working safeguards to retain

- PoseWorkflowLayout hydrates authoritative owner/project/position identity before rendering pose pages.
- Optimization and Production visibly refuse incomplete/unqualified data.
- BOM and 3D are visibly labeled as estimates when unqualified.
- QC uses revision verification, idempotency and server acknowledgement; correct its routing and read behavior instead of replacing those checks with checkbox-only completion.
- Customers uses owner-scoped reads/writes. The user Orders page scopes its reads. Preserve and extend these patterns.

## Verification attempted

Attempted five existing suites: workflowStore.identity, workflowStore.failClosed, OptimizationPage.failClosed, MeasuringPage.integrity and qualityApproval. `npm run test -- …` could not start because the npm launcher resolves a missing npm-cli.js. Direct `node node_modules/vitest/vitest.mjs run …` also could not start: vitest.config.ts imports missing @vitest/browser-playwright even with Storybook browser tests disabled. No test pass is claimed. No application source was edited in this audit.

## Recommended next action

Follow [the upgrade plan](../plans/FABRICATOR_USER_WORKFLOW_UPGRADE_PLAN_2026-10-05.md), beginning with truthful readiness and shared identities. Treat catalog/profile persistence, BOM authority and inventory writes as prerequisites for connecting real production and delivery.
