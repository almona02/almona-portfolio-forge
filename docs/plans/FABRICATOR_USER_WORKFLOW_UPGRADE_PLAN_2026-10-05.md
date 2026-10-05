# Fabricator user workflow upgrade plan

Date: 5 October 2026. Status: Batch 1 (UP-01…05) implemented and promoted to production frontend; consultation live; **~85% Batch 1 / ~18% overall program**. Release-close blocked by git sync, Redis honesty, and Batch 0 fixtures. Batches 2–6 remain proposed. Scorecard: [FABRICATOR_UPGRADE_SCORECARD_2026-10-05.md](FABRICATOR_UPGRADE_SCORECARD_2026-10-05.md). Implementation: [FABRICATOR_BATCH1_IMPLEMENTATION_2026-10-05.md](FABRICATOR_BATCH1_IMPLEMENTATION_2026-10-05.md).

Inputs: [extended Fabricator audit](../audits/FABRICATOR_USER_PAGES_WIRING_AUDIT_2026-10-05.md) and [initial fabrication/Stock/Profiles audit](../audits/LIVE_FABRICATION_STOCK_PROFILES_AUDIT_2026-10-05.md).

## Target outcome

A workshop user can create a customer-linked project, measure and design its positions, resolve verified profiles, review a qualified BOM, plan stock and optimize cuts, save an accurate quotation, create one linked order, release a specific revision, record production and QC evidence, and complete delivery. The same project, position, profile, currency and revision remain identifiable across pages and reloads.

Upgrade the existing React/FastAPI/Supabase architecture in bounded changes. Preserve authoritative hydration, required-part conservation, manufacturing-rule approval, stale-result rejection, stock provenance and QC acknowledgement. A missing contract should produce a useful blocked state; a visual status must never bypass a manufacturing gate.

## Proposed user journey

Primary route sequence: Project → Measure → Design → BOM → Stock check → Optimize → Quote/Order → Production release → QC → Delivery.

Stock check is a position-scoped availability/reservation view backed by the workshop inventory, not a replacement for the global Stock library. A preliminary quote may be produced from an estimate BOM, but must be labeled Draft estimate and never authorize production. Production-backed quotations must reference qualified BOM and reconciled optimization. Standalone workshop pages remain available for Customers, Systems, Profiles, Stock, Orders, Reports and integration setup.

Use one canonical order workspace, with an explicitly separate administrator view when authorized. Design's action should say Review BOM. QC's return action should lead to the same position's production record, and approved QC should offer Delivery for that record.

## Shared contracts to establish before broader UI work

| Contract | Required behavior |
|---|---|
| Workflow identity | Authenticated owner/workshop, project UUID, position UUID, source revision and content/settings fingerprint. Resolve from route; verify ownership on server. |
| Profile identity | Separate catalog part code from owned database UUID. Link to versioned system catalog, role, material and verified geometry/physics. |
| Catalog resolution | One resolver for built-in and persisted custom/tuned systems. Unknown identity is an error; no first-pack substitution. |
| BOM/optimization | Qualification, required-part ledger, source revision/catalog/rule/settings fingerprints and reconciliation result. Invalidate derived artifacts on relevant edits. |
| Inventory | Domain adapter for all persisted fields; explicit mm/m/pieces/bar units; authoritative balance, movements and revision-bound reservations. |
| Quote/order | Currency, priced line items, subtotal/tax/discount/total, customer/project/position links, source quote revision and conversion idempotency. |
| Production/QC/delivery | Server-acknowledged events against released revision and identities; real operator/machine/evidence provenance. |
| Save status | One state machine: local draft → pending → server acknowledged; separate offline/error/conflict. Historical updatedAt cannot establish current save success. |

Keep adapters/repositories centralized. Avoid adding another global store that independently owns the same manufacturing truth. Existing stores should hold route-scoped drafts and validated cache snapshots.

## Implementation batches

The effort labels below describe relative scope, not delivery-date commitments. Complete each exit gate before the dependent batch.

### Batch 0 — Establish a repeatable staging baseline (small)

Resolve test startup without changing production behavior: fix/reuse a working npm launcher and keep optional Storybook browser imports out of ordinary test startup, or install the already-declared missing package using the repository's dependency policy. Record current build/deployment revision and applicable feature flags without exposing credentials.

Create staging fixtures for two owners, two projects, multiple revisions, Panda/ROCK/UPVC/custom packs, priced and unpriced profiles, empty and populated stock, accepted quotes, a released job and QC approval. Restore points must exist for fixture data. Do not use customer production records for mutation tests.

Exit: targeted identity/validation/QC suites run; failures are classified; a route inventory and deployed commit baseline are recorded. Run type-check/build as the first code changes begin, and separate existing failures from new ones.

### Batch 1 — Make readiness, navigation and demos truthful (small to medium)

Tickets:

- **UP-01:** Separate active-page selection from workflow status. Qualification/reconciliation/QC evidence and revision freshness determine readiness. Map warnings to contextual reasons and recovery links. Covers FUA-01/02/19.
- **UP-02:** Align stage order, Review BOM action, quote empty-state link, QC return link and explicit project/position context. Add Reports navigation; replace legacy dashboard quick links. Covers FUA-02/14/20.
- **UP-03:** Correct empty-array tuning readiness; stop Save & Return from silently marking profiles approved. Covers FUA-04.
- **UP-04:** Label kiosk and sample metrics as Demo; separate operational capability from readiness. Disable simulated evidence in normal production paths, and remove production role overrides. Covers FUA-06/11/13/18.
- **UP-05:** Fix public calculator selectors and deliver consultation through a validated lead handler; implement/remove dead portfolio/resources CTAs. Covers the initial audit.

Exit: estimate BOM never says manufacturing Complete; blocked steps remain navigable for explanation but cannot execute; system with zero required profiles is blocked; tests cannot grant production permissions through URL flags; demos cannot emit operational delivery/release records; public selections affect estimates and consultation acknowledges delivery to its endpoint.

### Batch 2 — Unify profiles, systems and inventory (large; foundation)

Tickets:

- **UP-06:** Implement shared catalog resolution and profile database adapter. Migrate every consumer: Gallery, Tuning, EngineeringBayWrapper, BOMReviewPanel, OptimizationPage, ProductionPage, ProjectStudioWrapper, project aggregation, Reports and Stock. Covers FUA-03/12/16 and initial inventory identity findings.
- **UP-07:** Replace creation-only Profiles with persisted library plus create/edit flows, explicit system context and local/server save feedback. Import local-only packs through a reviewed migration, retaining original codes and raw files. Covers initial Profiles audit.
- **UP-08:** Replace inferred DXF geometry with measured entities and confirmed roles. Require valid positive finite dimensions/weights/bar lengths, valid allowances, actual material and per-system mechanism. Present unverified manual data explicitly. Covers initial import/physics findings.
- **UP-09:** Load owned stock independently of active position, then expose explicit system filtering. Keep setup, purchase intake, remnants and movement history available in empty states. Eliminate NaN and mixed field/currency assumptions. Covers FUA-03/12.
- **UP-10:** Make purchase/CSV intake transactional and idempotent; reload/invalidate authoritative inventory after success. Add revision-bound stock check/reservation and release/expiry behavior without double deduction. Covers initial stale/partial stock findings.

Migration: map catalog codes to owned UUIDs with owner+catalog uniqueness; preserve original code aliases and existing UUID foreign keys. Detect duplicates and missing relations before automatic consolidation. Do not silently translate steel into aluminum or upgrade old tuned labels to approved authority. Compare balances from movements and flag unresolved discrepancies for review.

Exit: the same workshop profiles appear on Profiles, Stock and Reports; a saved custom system resolves in design/BOM/optimization/production after reload; catalog IDs are never submitted as profile UUIDs; two sequential/concurrent intakes give correct balances; interrupted/retried imports cannot duplicate stock; invalid/unknown geometry or price blocks affected downstream actions with reasons.

### Batch 3 — Bind customer, pattern and revision handoffs (medium)

Tickets:

- **UP-11:** Persist canonical project creation irrespective of read-rollout flags; retain selected customer UUID through both wizard modes and redirects. Covers FUA-14/17.
- **UP-12:** Connect PatternLibraryPage to explicit project/position context. Preview compatibility and resulting layout, then apply as a draft with explicit save; Cancel returns to originating context. Covers FUA-15.
- **UP-13:** Resolve exact project BOM inputs, display per-position qualification/failure, aggregate actual quantities and label partial estimates. Covers FUA-16.
- **UP-14:** Use one acknowledged revision/save status across sidebar/header/footer. Suppress stale context until route hydration finishes and retain recoverable unsaved drafts. Covers FUA-19.

Exit: customer-started creation produces a project linked to that customer; both feature-flag configurations resolve the created pose; changing position never retains another position's BOM/optimization/quote; applying a pattern invalidates only derived artifacts for the correct draft/revision; a failed position cannot become an apparently complete whole-project BOM.

### Batch 4 — Complete quote → order and separate admin capabilities (medium to large)

Tickets:

- **UP-15:** Persist quote records and line items bound to project/position/revision; expose draft estimate, priced quote, accepted, superseded and expired states. Reports and commercial lists query the same records. Covers FUA-08.
- **UP-16:** Add atomic idempotent quote-to-order conversion. Preserve monetary breakdown without adding tax twice; persist quote/customer/project/position relationships and revision snapshots. Covers FUA-09.
- **UP-17:** Consolidate user Orders with pagination/search and contextual next actions. Restrict admin bulk payment/status operations in UI and server policy; enforce release/QC/delivery transitions with evidence. Calculate totals per currency or explicit dated exchange conversion. Covers FUA-10.

Exit: accepted quote creates exactly one linked order after retries/concurrency; PDF/list/order show the same line items and totals; client changes invalidate or supersede affected quotes explicitly; unauthorized writes fail server-side; an order cannot be delivered through a label-only status update.

### Batch 5 — Connect production, QC and delivery to released records (large)

Tickets:

- **UP-18:** Introduce a released-job/position coordinator. Freeze qualified BOM, reconciled cut ledger, stock reservation and machine/settings versions into the release record. Bind operator scans to known released cut IDs. Covers FUA-03/11.
- **UP-19:** Preserve/reload existing QC acknowledgements; start an inspection explicitly, bind to released revision, and retain idempotent server validation. Restore contextual back/next actions. Covers FUA-07.
- **UP-20:** Build Delivery coordinator/queue using explicit unit and approved QC identity. Store real evidence bytes/hashes and actual QR validation; fail on unavailable location unless an authorized exception is recorded. Acknowledge server completion before updating order/unit status. Covers FUA-05/06.

Physical machine integration requires an agreed protocol and real acknowledgement source. Until that exists, ship a clearly labeled manual production-recording flow; do not claim timer completion is CNC execution. No physical cut should be attempted as a browser regression test.

Exit: release refuses stale BOM/settings/reservations; unknown scans are rejected; Pause stops the relevant workflow rather than only showing a toast; QC and Delivery survive refresh/another device and reject stale revisions; fake evidence cannot complete delivery; one delivery acknowledgement advances the correct order/unit.

### Batch 6 — Finish operational reporting and usability (medium)

- **UP-21:** Bind Command/Reports metrics to authoritative jobs, inventory, alerts and recorded machine events. Show source, freshness and unknown/error states. Distinguish mock analytics per metric. Covers FUA-12/13.
- **UP-22:** Add searchable profile/system lists, consistent contextual recovery, accessible dialogs/accordion controls and keyboard-operated pattern/project selection. Verify desktop, narrow tablet and Arabic RTL workflows. Covers FUA-20 and initial accessibility findings.
- **UP-23:** Make Integrations a useful capability/setup page with native links and honest external availability. Avoid SAP/Odoo implementation until a concrete connector contract exists. Covers FUA-20.

Exit: no hardcoded green operational readiness, NaN, currencyless totals or task-specific implementation copy; keyboard and RTL users can complete supported journeys; every unavailable action explains its prerequisite and recovery.

## Required regression scenarios

| Scenario | Acceptance |
|---|---|
| Owner/project/position mismatch | Reject hydration/write without leaking another owner's records. |
| Position switch during solver/save | Discard stale completion and keep the newly selected position intact. |
| Change geometry, system, rule version or machine settings | Invalidate dependent BOM/optimization/release approval; preserved original evidence remains auditable. |
| Empty/unknown/custom catalog | Exact resolution or actionable block; no substituted pack/geometry. |
| Stock intake retry/concurrency | Correct balance and one movement per request; no partial success hidden by a toast. |
| Quote conversion retry/concurrency | One order, exact preserved money/links and source revision. |
| QC refresh/revisit | Existing server approval remains visible; new inspection is explicit. |
| Delivery evidence failure | No fabricated proof; no delivered status without acknowledgement. |
| Offline/save error/session change | Truthful status, recoverable owned drafts and no stale account context. |
| Core desktop/tablet/RTL/keyboard journey | Project through recorded delivery with contextual navigation and legible state. |

Run existing targeted identity, measurement, optimization and QC tests after relevant changes; add meaningful contract/integration tests for adapters, transactional stock, quote conversion and approval/release boundaries. Run lint/type-check/build and bounded end-to-end staging tests for each release candidate. Avoid treating mocked unit tests as proof of deployed RPC/RLS or machine behavior.

## Rollout and recovery

Use additive schema changes and reviewed backfills first. Keep existing record IDs and legacy URLs; redirect to canonical routes with context preserved. Gate new write paths by explicit capability flags, not ambiguous read flags. Roll out to staging, then a small workshop cohort with reconciliation of stock, quote totals and release evidence before wider adoption.

Rollback disables new UI/write paths while retaining newly created acknowledged records and migration mappings. It must not restore incompatible balances or erase audit evidence. Display an operational block if old clients cannot understand new release contracts.

Track route-hydration failures, blocked reasons, save acknowledgement latency, unresolved catalog IDs, stock reconciliation errors, duplicate conversions, stale solver results and approval/delivery rejection rates. No credentials, personal customer fields or raw sensitive evidence should be included in diagnostics.

## First implementation slice

Start with UP-01 through UP-04 plus UP-06's database adapter and UP-09's authoritative Stock load. This creates a concrete improvement quickly: honest stage/tuning readiness, explicit demo behavior, and consistent finite inventory values on Stock and Reports. Then finish custom-profile/catalog persistence before connecting production and delivery.

Public fabrication conversion repair (UP-05) is independent and can be delivered as a separate change. Estimated sequencing is dependency-driven; no deadline is promised until staging tests, migration scope and machine/ERP boundaries are agreed.
