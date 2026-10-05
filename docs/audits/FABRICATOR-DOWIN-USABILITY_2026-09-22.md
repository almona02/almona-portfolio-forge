# Fabricator Pro versus DoWin: workflow and usability

Date: 22 September 2026. Fabricator source revision: `eb5a75e`.
Revised after authenticated inspection of www.almona02.com. The deployed commit
was not independently identified; source findings are labelled separately.

**Assessment:** DoWin's inspected interface gives a clearer, compact path from a
saved position to its cutting requirements. Fabricator has broader project,
commercial and regional capabilities, but needs more reliable state and simpler
operator navigation before claiming equivalent production usability.

## Evidence and limits

- Inspected the running local DoWin application: Project, Design,
  Management–Production, Optimization, Production Status, and Profile Management.
- Opened the existing `FP024C_90_CONTROL` project and its saved design. Selected
  a glass area and viewed its properties and the production cut-list preview.
- Did not edit/save designs, run optimization, deduct stock, export files or send
  anything to a machine. Controller acceptance and physical accuracy were not tested.
- After sign-in, inspected Command, Projects, a saved position's Measure, Design,
  BOM, Quote, Optimization and Production, plus Stock, Systems, Orders, QC,
  Delivery, Integrations and Drafting mode. Inspected Design at the default narrow
  viewport and at 1440 × 1000. Arabic and physical-device testing remain pending.
- No Save, Approve, export, stock mutation or machine-send action was submitted.
  Opening BOM automatically generated an in-browser result; navigation changed
  workflow indicators. This was not a zero-state-change inspection.
- Existing September 9/20 audits supplied context only. Their parity or capability
  claims were not adopted as new measurements. No binaries or private databases
  were inspected in this review.

## Authenticated findings that change the priorities

The saved Fabricator position was 1210 × 1550 mm, type `sliding_window_2sash`,
system ROCK 60. DoWin's reference was a different 1200 × 1200 mm PVC design.
These jobs are not a matched accuracy benchmark.

| ID | Priority | Evidence and scope | Required outcome |
| --- | --- | --- | --- |
| L01 | P0 | Measure showed two sliding cells; Design showed one fixed cell for the same position, plus M001 missing measurements despite saved dimensions. A later observation after session interruption showed ROCK 60 in the header but Panda 50 / 1200 × 1400 in the editor; its trigger is unproven. | One position/revision must hydrate every screen. No silent defaults for existing designs. Preserve geometry/system on reload, deep links and mode switches. |
| L02 | P0 | BOM showed D005: no grid/preset, defaults will be used, alongside 99.8% accuracy and 100% confidence. Its cut list had two aggregate rows, one angle each and blank System provenance. | Incomplete results are estimates, not production-ready. Require a complete piece ledger and validated rule/catalogue revision. |
| L03 | P0 | Quote showed O001 optimization required alongside an EGP total and enabled Save/PDF/Continue actions. Actions were not clicked. | Separate estimates from approved quotes; enforce prerequisites in handlers/backend and persist the priced revision. |
| L04 | P0 | QC had seven unchecked items and enabled Approve & Complete. Source `QualityControlPage.tsx:14` completes the step without reading checks or persisting evidence. Approval was not clicked. | Require recorded checks, tolerances, authenticated inspector and approved revision before an auditable approval transaction. |
| L05 | P0 | Optimization showed parts/stock/results as Not recorded but estimated 12.5% waste and about 13 bars. Source `OptimizationPage.tsx` marks optimization complete with an empty result for zero components and on exceptions. No failure was induced live. | Empty demand and solver failures must remain incomplete and block release. Estimates must derive from real inputs or be labelled illustrative. |
| L06 | P1 | Dashboard showed 87.5% OEE, recent jobs and performance claims alongside zero connected machines and connect-data text. Morning Brief failed. Source contains literal metrics, recent jobs and Last sync: 2 min ago. | Use real metrics with source/time range/freshness, labelled demo data, or honest empty/error states. |
| L07 | P1 | Gallery showed 26 packs; several Tuned packs had zero profiles. ROCK 60 showed zero there but six in Design. | Reconcile catalogue sources; distinguish Configured, Validated and Production-qualified. Tuned does not mean supplier-approved. |
| L08 | P1 | At 1440 × 1000, navigation, positions and inspector compressed the editor, with horizontal scrolling and clipped controls. Narrow Design explicitly requires a larger display. | Canvas-first desktop layout; collapse secondary panels and keep the primary action visible. Provide mobile Measure/Review/Status, without claiming mobile CAD parity. |
| L09 | P1 | Drafting exposed many tools/tab groups, Template Editor selected, Elements: 0, and Verified with Hash: undefined in its tooltip. | Default to the current drawing; Verified requires actual revision evidence. Separate template authoring from job design. |
| L10 | P1 | Orders directed users to quote conversion, but the inspected pose Quote had no visible conversion action. SAP/Odoo were explicitly planned. | Verify/expose quote-to-order conversion. Keep unavailable integrations explicit and remove development-task wording from customer UI. |

Positive live checks: Production blocked without optimization; Delivery blocked
without QC. Preserve these safeguards. SmartDraw already provides keyboard
navigation, undo/redo, mirroring, dimensions and pattern suggestions.

## Live DoWin reference

The loaded design showed a 1,200 × 1,200 mm overall opening, two 600 mm divisions,
and two glass labels of 535 × 1,114 mm. Its cut-list preview showed four frame
parts at 1,200 mm with 45°/45° ends, a vertical mullion at 1,116 mm with 90°/90°
ends, and glazing-bead rows including 537 and 1,116 mm. The displayed total was
13 pieces and 12,528 mm. These are UI observations under existing saved settings,
not independently approved manufacturing dimensions or a new parity fixture.

Positive interaction patterns:

- Four main stages: Project → Design → Management–Production → Optimization.
- Canvas selection enables relevant sash/mullion actions and shows glass properties.
- Production view combines position list, drawing preview, named assembly parts,
  profile code, millimetres, both end angles, quantity and totals.
- Optimization places required parts beside stock, with cutting results and a
  separate unplaced-parts tab. Stock deduction and offcut return are explicit actions.
- Catalogue management separates profile systems, stock, glass, customers and
  general settings from everyday design work.

DoWin friction observed:

- Saved positions were initially collapsed behind a narrow edge toggle; the
  canvas was blank until the saved design was opened.
- Long position/system names were clipped in the sidebar.
- A `Test Notify` button appears in the design ribbon.
- English UI contains Turkish catalogue text and a Turkish empty-state message.
- Project list displayed order `100009`, while Design displayed `10009` for the
  selected project. Investigate this identifier discrepancy before relying on it.
- `Send to Machine` describes saving an MDB file; this label does not prove delivery
  to, or acceptance by, a controller.

## Supporting Fabricator source findings and improvements

P0 blocks reliable release of affected production work. P1 improves pilot usability.

| Priority | Gap and current evidence | Recommended change / acceptance |
| --- | --- | --- |
| P0 | Save status is inferred from `project.updatedAt`, rather than a confirmed write. `ManufacturingStatusBar.tsx:28`. | Track Unsaved / Saving / Saved / Failed from persistence acknowledgements. A failed save must never display Saved; show retry and last confirmed revision. |
| P0 | Production layout renders unconditional green `CNC Online` / `Saw Online` indicators. `ProductionStudioLayout.tsx:15`. `ProductionCommand.tsx:367` simulates transport before a Job sent message. | Show Unknown/Disconnected until a real heartbeat exists. Separate file generated, downloaded, transmitted and controller accepted. |
| P0 | `workflowStore.ts:146` and `:208` replace design/project without clearing dependent BOM, optimization, quote and documents. | Bind artifacts to owner/project/position/revision. On edits or position switches, invalidate stale results and block export until regeneration. |
| P0 | Complete physical-length and controller parity is still unresolved in the existing evidence; standalone preflight has no production caller found in this review. | Reconcile original piece identities, quantities, lengths, both angles, kerf, trim and unplaced pieces across BOM, nesting and export. Require approved supplier/controller evidence. Do not change formulas merely to copy this saved DoWin output. |
| P1 | BOM review renders only `cuttingLengths[0]` and `angles[0]`, despite plural data. `BOMReviewPanel.tsx:262`. DoWin exposes assembly identity and both ends. | Expand the actual piece ledger: position, part, profile, cut length, left/right angle and quantity. Define array semantics first; never invent a second angle. Link rows to the drawing. |
| P1 | Ten workflow stages coexist with studio navigation. The bar puts Quote before BOM/Optimize, while the store's ordered sequence puts commercial after optimization. `studioWorkflow.ts:93`, `workflowStore.ts:103`. | Distinguish an early estimate from a manufacturing-based final quote. Present one recommended next action with prerequisites; preserve expert shortcuts and canonical routes. |
| P1 | Stage labels use 11 px text and are hidden below the medium breakpoint. Status text and sidebar labels include hard-coded English. `FabricatorWorkflowBar.tsx:41,144,172`; `UniversalNavSidebar.tsx:49`. | Keep current/next step labels visible on small screens, enlarge primary touch targets, translate all operator navigation/statuses, and test Arabic RTL with profile codes/numbers kept readable. |
| P1 | Project creation exposes project-type selection, custom-system management and tuning inside the creation flow. `NewProjectWizard.tsx:211,266,322`. | Offer a short path using a qualified system and remembered defaults. Move catalogue authoring to an explicit expert action. Validate manufacturing prerequisites before production even when draft creation is allowed. |
| P1 | Ctrl+S maps to Save & Next, whose local handler validates then adds/selects a position; it does not itself await persistence. `EngineeringBay.tsx:294,350`. | Make Ctrl+S save the current position; use a separate shortcut for Save & Next. Navigate only after successful save. Verify parent callbacks before changing behavior. |
| P1 | Footer connection uses `navigator.onLine`; manufacturing profile is the literal `platform-default`. `ManufacturingStatusBar.tsx:15,51`. | Distinguish browser network availability from backend/machine health. Display the actual resolved manufacturing settings source and version. |

## Ease-of-use judgement

For an experienced cutting operator, DoWin's inspected arrangement is easier to
understand because it keeps the drawing, required parts and production actions
close together. This is a heuristic judgement, not a timed comparison.

Fabricator already has a canonical workflow bar, contextual design tools,
keyboard shortcuts, regional defaults and Arabic/RTL infrastructure. Preserve
these foundations. Its most valuable next improvements are reliable save/status
feedback, visible position/revision context, a complete cut-list review, and one
clear next action. More dashboards or AI controls would not resolve these gaps.

Suggested operator view: **Project → Design → Review & Price → Cut & Export**.
Keep the existing detailed stages beneath those groups. Show the active customer,
project, position, system, revision and save state persistently. Provide an expert
mode for catalogue tuning and detailed production controls.

## Ordered work packages

1. Correct save, connectivity and export status claims; add save-failure recovery.
2. Enforce position/revision isolation and downstream invalidation.
3. Complete piece-level review and production export gating.
4. Simplify routine navigation, clarify estimate versus final quote, and localize
   the operator path completely.
5. Qualify selected supplier systems and controller outputs, then benchmark usability.

## Benchmark still required

Use matching, approved input data in both applications: a fixed two-light window,
a sash window, an asymmetric layout, a repeated multi-position order, and a
stock-shortage case. Include dimension edits after optimization, refresh/reopen,
failed save, and missing profile data. Test with a novice and an experienced
operator in their working language.

Record task completion, time, clicks, corrections, help requests, save/recovery
failures and output discrepancies. Require no unexplained missing parts, no stale
exports and no false success messages. Numerical speed or ease-of-use rankings
remain unmeasured. The authenticated walkthrough is complete within the scope
above; matched-job save/recovery trials and controlled DoWin optimization/export
remain outstanding. See `FABRICATOR-IMPROVEMENT-PLAN_2026-09-22.md` for sequencing.
