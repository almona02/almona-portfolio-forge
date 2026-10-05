# Fabricator repair plan and optimization end-to-end exit

Execution started: [6 October implementation and verification record](../audits/FABRICATOR_REPAIR_EXECUTION_2026-10-06.md). Initial local repairs pass targeted checks; the full live exit remains open. The live QC screen cannot publish governing rules: factory admin/technical-office approval needs a dedicated authorized workflow, not an inspection checkbox.

Date: 5 October 2026 (Africa/Cairo). Baseline local HEAD: 5242a35. Scope: all findings in the live workflow audit and Cursor implementation comparison, plus optimization contract checks below. This document plans implementation; it does not certify a successful live solve or authorize invented manufacturing approvals.

## Execution update — 6 October 2026

Implemented and locally verified: owner isolation/hydration; reconciliation-aware stock reads/intake and physical stock demand; solver/result physical reconciliation; QC deep-link hydration; position-specific BOM continuation; result review and validated cut-list PDF download; multi-page cut-list pagination; QC/Quote scrolling, mobile Quote header and Design summary. Evidence: [execution record](../audits/FABRICATOR_REPAIR_EXECUTION_2026-10-06.md) and [responsive/PDF audit](../audits/FABRICATOR_OPTIMIZATION_RESPONSIVE_AUDIT_2026-10-06.md).

Latest exit checks: 22 tests / 7 files passed; final production frontend build passed; 75-cut, two-page diagnostic PDF rendered and text-checked. Earlier repair baseline: 84 tests; verified incremental Industrial backend build/imports and 5 readiness tests. Full app TypeScript and clean backend rebuild remain open. No new deployment is implied by a Git push.

Next sequence:
1. Build the factory-admin/technical-office approval publication workflow and consume genuine approved profile/rule/tolerance inputs in BOM generation.
2. Bind optimization to owned profiles/current stock and supported settings; persist and reload server-validated revision-bound runs and receipts.
3. Harden release/order/QC/delivery server contracts, then run the complete two-owner live journey and negative access/revision checks.
4. Validate populated Quote and production PDF through the approved live workflow, deploy verified artifacts, and record their identities before declaring exit.

## Current optimization check

- Live Owner A fixture POS-R1 is R3. Reopening its optimization route now returns B001 (BOM missing), “Design must have at least one component,” and “A manufacturing-qualified BOM is required.” Previous in-session BOM review reached B005 (approved catalogue/rule versions missing). Reload/route hydration is therefore a distinct blocker from approval availability.
- Existing local checks: **81/81** across qualification, authority resolver, batch optimization, provenance and page late-result handling; **22/22** across actual AdaptiveSolver integration, reconciliation and workflow store identity guards. Logs: optimization-e2e-audit-tests.log and optimization-integration-audit-tests.log.
- Three additional diagnostic reproductions confirm that reconciliation currently accepts a wrong cut length, a cut larger than its bar, and percentage metrics above 100. Diagnostic tests intentionally assert the observed unsafe acceptance; their green result is **evidence of defects, not acceptance**. File: src/tests/integration/optimizationReconciliation.audit.test.ts; log: optimization-reconciliation-diagnostic.log. During repair invert these assertions to require rejection and rename them as permanent regression checks.
- No positive live solve, stock consumption, quote conversion, release, QC or delivery has passed. Existing test success does not establish live end-to-end readiness.

## Confirmed optimization wiring defects

| Defect | Source evidence | Required outcome |
|---|---|---|
| Missing authority integration | BOMReviewPage.generateBOM passes only identity to qualificationContext; no catalogueVersion/ruleVersion. Existing resolveManufacturingAuthority is not imported by these workflow pages | Approved, revision-bound server authority must supply qualification inputs; unapproved or mismatched authority remains blocked |
| Catalog and owned stock are disconnected | Page now uses component profiles; owned-stock mapping/current availability are still not bound to the run | Solve with the authoritative owned-profile mapping and current availability evidence; retain catalog references separately |
| Controls do not affect the run | OptimizationEqualizer emits strategy/minRemnantLength/maxRemnantAge; OptimizationPage names the argument _payload and ignores it | Pass supported settings to the actual solver/remnant service and record effective settings; disable unsupported controls with an explanation |
| Stock assumptions are implicit | Page sets defaultStockLength 6000; solver caps specified lengths at 8000 and falls back without an approved rule binding | Use approved per-profile bar lengths, kerf/allowance/trim/calibration; reject invalid or unsupported values explicitly |
| Optimization can invalidate its own prerequisites | Fixed locally: post-solve BOM regeneration removed; reviewed BOM and stock acknowledgement retained | Freeze qualified BOM before solving; never replace it with an estimate. A changed BOM requires a new acknowledgement and solve |
| Physical verification is incomplete | Fixed locally: physical occurrences, lengths/angles, bar balances and percentage bounds are checked | Validate every physical occurrence against the qualified ledger and approved allowances, all bar balances, finite costs and percentages |
| Result provenance is not durable server acceptance | Workflow persists result in browser store; page does not obtain a revision-bound server optimization acknowledgement | Persist a run tied to owner/project/position/revision, authority and input fingerprints; reload it through owner-scoped server validation |
| Late-result guard covers only part of identity | Page guards currentProject object/id/update stamp, not explicit owner/source/revision/BOM/stock contract | Reject completion after any contract component changes, including account switch, same-position revision and stock changes |

Quantities, unit expansion, calibration, cut angles, remnant provenance and solver fallback must be tested explicitly; the current integration suite's green status does not settle these contracts. This audit does not assume quantity should be expanded twice if cuttingLengths already represents all physical pieces.

## Repair sequence

### Slice 1 — Owner identity and durable save/hydration (P1)

Clear auth/persona/query/workspace/workflow caches atomically on owner change. Key all persisted drafts by owner plus project/position/source/revision; quarantine old unscoped drafts. Suppress old headers and workflow links while loading or rejecting identity. Derive role from the current authenticated profile and enforce authorization on the server, regardless of badges.

Persist and hydrate dimensions, glazing, grid, pattern, components, customerId and manufacturing metadata consistently. Hydrate explicit QC/delivery deep links without requiring a previous page visit. Show acknowledgement-backed Saved/Revision loaded status and the actual last saved revision; unsaved edits remain distinct. Apply pattern dimension validation before measurement save.

Exit: A → B account switch reveals no A labels/drafts; foreign project/pose pair rejected; save/reload restores glazing/components/customer/layout; changing revisions invalidates downstream evidence; QC deep-link reload loads correct identity. Customer records remain untouched during fixture testing.

### Slice 2 — Approved manufacturing authority and qualified BOM (P1)

Wire ManufacturingAuthorityResolver into the canonical saved-position/BOM path. Validate owner, position source, current revision and actual server-approved catalogue/profile/rule references. Resolve profile roles without silent frame/sash/steel substitution. Produce a complete physical-piece ledger, quantities and lengths with the correct units; verify generated count and exact membership, not only aggregate counts. Pass genuine authority evidence into qualification and display actionable reasons/approval navigation when absent.

Prepare a dedicated fixture-compatible approval/tolerance setup through the authorized manufacturing approval process. Record approver, version and evidence; do not set production-approved flags or arbitrary tolerances to satisfy a test. Existing migration objects were observed live; inspect definition/grant/index differences before any migration instead of blindly reapplying old pending lists.

Exit: valid approved fixture qualifies; missing/expired/foreign/stale authority, missing pieces and wrong role block; regeneration preserves equivalent qualification or explicitly invalidates changed artifacts. No trust in a client-only status:'qualified' flag.

### Slice 3 — Owned profiles, intake and availability (P1)

Publish the reviewed owned-profile library/materialization path and restore existing rows/save feedback. Check all lookup/update errors; enforce an owner/pack/catalog-code uniqueness contract for retries. Preserve the materialized UUID mapping across saves.

Repair stock intake false success: identify the intended unique constraint, reload the same persisted request and compare payload before acknowledging retries; propagate missing-column and reconciliation/RPC failures. Reconcile atomically on the server or return a clearly pending reconciliation state with safe retry. Reject cross-owner profile IDs. Use one owned-inventory adapter for Stock, Reports and Command and report sync failure instead of labeling stale balances authoritative.

Normalize BOM demand into meters from explicit length and quantity fields; reject unresolved/invalid demands rather than skipping them. Validate cumulative demand when several lines share a profile. The current per-line comparison can allow aggregate demand to exceed balance. Bind availability to the complete identity and BOM/stock version. Label soft availability honestly; if release requires reservation, enforce it transactionally to prevent concurrent oversubscription.

Exit: populated/empty stock display correctly; request retry inserts once; changed payload rejected; missing schema/failed sync never reports success; 50 m stock cannot satisfy two 30 m demand lines; owner/source/revision/BOM changes invalidate acknowledgement.

### Slice 4 — Optimization contract, solver and persistence (P1)

Use an immutable qualified piece ledger and approved owned profile/bar/kerf contract as solver input. Verify prerequisite identity, stock availability and fingerprints at submission and completion. Wire effective equalizer settings/remnants or remove unsupported promises. Define physical units and quantity expansion once.

Strengthen reconciliation: exact profile/occurrence/length/angle against approved transformations; no missing, duplicate or unknown piece; each bar fits with its actual kerf/trim convention; waste and usage reconcile; metrics remain in valid bounds; all costs finite and currency-consistent. Record solver/version/settings and actual fallback behavior. Do not overwrite qualified BOM during completion.

Add owner/revision-bound server run persistence with idempotency and payload equality. Validate results server-side before accepting them for commercial or release use; return a run receipt. Reload persisted runs after full refresh; changed geometry, glazing, material, catalogue/rules or relevant stock contract must invalidate/reject stale use. No invented pose ID fallback when pose is missing.

Exit: real solver positive fixture reconciles every cut/bar and survives reload; wrong lengths, overloaded bars, impossible metrics and stale/foreign/changed retry requests reject; duplicates and late completions do not advance the workflow; production references the same qualified BOM/run/stock evidence.

### Slice 5 — Quote/order/release authorization (P1)

Complete positive pose quote save/reload and idempotent convert-to-order with one VAT application and correct currency. Validate referenced owner/project/position/source/current revision server-side for quote, order and release writes. Direct release insert's owner_user_id check alone is insufficient; restrict direct writes and validate artifacts through a transactional RPC. Enforce immutable release snapshots with validated fingerprints and stock reservation/availability policy. Reject changed payload for reused keys and handle concurrent duplicate requests deterministically.

Exit: quote retry and conversion create one intended record; totals reconcile; owner submit/cancel and admin bulk routes enforce roles; stale/cross-owner references reject; release snapshot binds the exact saved revision and authoritative run.

### Slice 6 — QC and delivery (P1)

Load approved dimensions/tolerance from the server, verify release/current revision and owner/source, reload existing approvals, and retain negative gates. Bind delivery to the accepted release and QC plus current position identity. Validate GPS bounds and hash format; record real permitted capture with transparent limitations. Check request equality on idempotent retries and serialize concurrent submissions. Require explicit camera/location permission where applicable; permission refusal must leave delivery pending without fake evidence.

Exit: fixture QC approval survives reload; stale revision/foreign release and missing tolerance reject; real permitted evidence produces one delivery receipt; exact retry returns it and changed retry rejects; no demo evidence completes production.

### Slice 7 — Command, Reports and supporting pages (P2)

Use the same owned inventory for alerts and balances; fix finite cost mapping, EGP/currency grouping and per-metric source badges. Replace engine READY with availability unless operational readiness is proved. Map draft jobs into visible board states rather than counting jobs in no column. Deploy profile library, project/order/pattern search and native integration links; remove unavailable SAP/Odoo actions. Verify keyboard focus, dialog errors, mobile layouts and Arabic RTL on the repaired journey.

Exit: zero NaN/Infinity, no misleading mock/live badges, consistent seeded inventory/alerts, usable search/routes/dialogs and honest save/machine/network status.

### Slice 8 — Deployment and live acceptance (required)

Review the accumulated local implementation and preserve unrelated document moves. Build the frontend and the exact live Industrial Dockerfile.realistic backend from the final source revision. Verify installed security versions (the previous image contained PyJWT 2.15.0), pip check, API import/path contract and required readiness behavior. Record known unrelated lint/type baseline separately; root tsc success alone is not full application type coverage.

Validate migrations, RLS, grants and RPC contracts before publishing; record exact Git SHA, frontend artifact hash and backend image/deployment digest. Deploy only this reviewed slice using a clean artifact, retain rollback references, and verify PWA update activation so an old cached bundle cannot masquerade as the new implementation. Confirm endpoint correctness and real dependency readiness; HTTP 200 with degraded health is not healthy acceptance.

## End-to-end optimization acceptance matrix

| Case | Required proof |
|---|---|
| Fixed aluminum fixture | Save/reload → authority → full frame/glazing ledger → owned UUID stock → solve → exact bar reconciliation → saved run → quote/release consume same run |
| Sliding multi-sash fixture | Distinct repeated physical cuts, role mappings, allowed dimensions and all piece quantities reconcile |
| UPVC fixture | Approved welding/kerf/steel rules and material-specific roles; no invented reinforcement |
| Stock variants | Sufficient, short, empty, aggregate shared-profile demand, allowed remnants and concurrent claims |
| Solver settings | Changing supported settings reaches the actual engine; effective settings and fallbacks recorded |
| Invalid geometry/results | Oversize/non-finite cuts, wrong length/angle/profile, duplicate/missing piece, bar overflow and impossible metrics reject |
| Identity changes | Account switch, foreign project/pose, same-pose revision bump, authority/BOM/stock change during solve reject stale completion |
| Durability | Full reload/new session retains accepted run, inputs, qualified BOM and owned profile mapping; browser-only draft not mistaken for server receipt |
| Handoffs | Quote/order → release → QC → delivery all use matching authoritative revision/run; altered retry payload and stale references reject |

For each case capture fixture ID/revision, input/run/receipt fingerprints, effective settings, expected/actual result and deployed artifact identity. The final live positive journey must pass along with negative cases before updating the scorecard to verified exit. Current gate failures remain recorded; no bypass is part of this plan.
