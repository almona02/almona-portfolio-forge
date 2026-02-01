# Strategic Plan – Almona Portfolio Forge

Purpose: one living document for internal roadmap, investor comms, grants, and technical specification. Grounded against current README (v5.2) to avoid overpromising.

## 0) Scope & Status (Grounded in README)

### Current Implementation Status (As of January 2026)

**✅ Fully Implemented:**
- Fabricator Pro end-to-end, SmartDraw/3D/AR, verification gate, QR feedback loop
- CalibrationWizard/Learner (ML-based K-factor tuning exists)
- Remnant-first GA + glass CP solver + hybrid mass optimizer (all algorithms implemented)
- ProductionLabel, Production Scheduler, Machine Twin
- Multi-brand CNC exports, machining macros
- **SmartScan batch UI** ✅ (`SmartScanUploader.tsx` with queue, progress, SVG preview, import wizard)
- **SmartScan integration** ✅ (ProfileTuningStudio tab, TestScanner page)
- PWA support (basic service worker)
- CNC security & kinematic collision detection (CutSimulationViewer, cutSimulator)
- Unified ticketing, quote→invoice (Commercial workspace)
- ERP bridge (mock/odoo-ready with ErpBridge class, audit logging)
- Customer Portal, Supabase auth/RLS/realtime, SendGrid, Vercel/Docker, security hardening
- ProductionDashboard, ValidationDashboard (ROI metrics)
- SustainabilityTracker (CO₂ calculations)

**⚠️ Partially Implemented:**
- **Safety verification**: `ProductionPreviewDialog` exists (single modal with collision checking), but NOT the planned 3-step flow (SafetyWarningModal → ToolpathPreviewModal → FinalVerificationModal)
- **Offline-first**: Basic PWA service worker + WorkspaceSyncService (localStorage fallback), but NO IndexedDB/Dexie.js schema, NO Workbox background sync, NO offline UI components
- **ERP sync**: Basic ErpBridge exists, but NO bidirectional Odoo sync, NO webhook endpoint, NO hardened milestones

**❌ Not Yet Implemented:**
- Waiver + 3-step safety flow (separate modals)
- `cnc_safety_logs` database table
- Safety envelope JSON files (`safety_profiles/yilmaz_w60.json`, etc.)
- IndexedDB + background sync for offline-first production
- Turborepo/Nx monorepo refactor
- Explicit CRM pipeline (leads/opportunities/contacts/activities)
- Hardened ERP sync milestones (M1-M4)
- Patent drafts (calibration feedback loop, remnant-first genetic)
- Investor metrics dashboard (dedicated view with materialized backend)
- Outcome-based pricing pilot
- Government registrations (ITIDA, etc.)

## 1) Liability & Safety (Immediate)

**Status:** ⚠️ **Partially Implemented** (1/3 screens, collision detection exists)

**Current State:**
- ✅ `ProductionPreviewDialog.tsx` exists (single modal with collision checking via `CutSimulationViewer`)
- ✅ Collision detection implemented (`cutSimulator.generateFrameSimulation`, `cutSimulator.validateSimulation`)
- ✅ Three.js + ammo.js integration present
- ❌ **NOT implemented**: 3-step separate modal flow
- ❌ **NOT implemented**: `cnc_safety_logs` database table
- ❌ **NOT implemented**: Safety envelope JSON files

**Remaining Deliverables:**
- Split `ProductionPreviewDialog` into 3 separate modals:
  - `SafetyWarningModal.tsx` (Screen 1: warnings + waiver acceptance)
  - `ToolpathPreviewModal.tsx` (Screen 2: 3D collision visualization - can reuse CutSimulationViewer)
  - `FinalVerificationModal.tsx` (Screen 3: digital signature + final confirmation)
- Database migration: create `cnc_safety_logs` table with fields:
  - `job_id, user_id, verification_step_1_at, step_1_ip, verification_step_2_at, collision_check_passed, verification_step_3_at, digital_signature_hash, gcode_hash_before, gcode_hash_after`
- Safety envelope JSON files: `safety_profiles/yilmaz_w60.json`, `safety_profiles/elumatec_sbz151.json` (machine-specific travel limits, clamp zones)
- Integration: enforce 3-step flow as hard blocker before G-code export
- Insurance: pursue "Technology E&O + Product Liability" (e.g., Marsh Egypt), target ~$15k/yr for ~$5M coverage.

## 2) IP & Data Moat

**Status:** ❌ **Not Implemented** (algorithms exist, but no patent drafts)

**Current State:**
- ✅ `CalibrationLearner` exists (`python_backend/ai_services/calibration/calibration_learner.py`) - ML-based K-factor tuning
- ✅ `RemnantFirstGeneticOptimizer` exists (`src/algorithms/RemnantFirstGeneticOptimizer.ts`) - remnant-first strategy
- ✅ QR feedback loop exists (production QR codes → calibration feedback)
- ❌ **NOT implemented**: Patent draft documents
- ❌ **NOT implemented**: Data partnership templates

**Remaining Deliverables:**
- Provisional patents (Week 1–2 drafting):
  - "Calibration feedback loop via production QR for ML-based K-factor tuning."
  - "Remnant-first genetic optimizer for material waste reduction."
- Draft structure (repo docs folder, not code):
  - `documents/patent_draft_1/{calibration_feedback_loop.md, claims.md, figures/…}`
  - `documents/patent_draft_2/remnant_first_genetic.md`
- Data partnerships:
  - Templates: `data_partnerships/{university_mou_template.docx, ministry_data_sharing_agreement.md}`
  - `anonymization_pipeline.py` (strip PII, aggregate optimization/remnant telemetry).
  - Universities priority: Cairo Univ., Ain Shams, GUC (for EU funding access).

## 3) Offline-First (Production Continuity)

**Status:** ⚠️ **Partially Implemented** (basic PWA exists, but no IndexedDB/Workbox)

**Current State:**
- ✅ Basic PWA service worker (`public/service-worker.js`) with caching
- ✅ `WorkspaceSyncService` (`src/lib/workspace/WorkspaceSyncService.ts`) with localStorage fallback
- ✅ Basic offline sync logic (`src/lib/offline-sync.ts`, `fabricator-mobile/src/services/OfflineManager.ts`)
- ❌ **NOT implemented**: IndexedDB/Dexie.js schema
- ❌ **NOT implemented**: Workbox background sync
- ❌ **NOT implemented**: Offline UI components

**Remaining Deliverables:**
- Goal: "factory never stops cutting" when Supabase/cloud is down.
- IndexedDB (Dexie.js) schema target:
  - `optimizationJobs: ++id, projectId, status, createdAt`
  - `cncExports: ++id, jobId, machineType, gcode, synced`
  - `productionLabels: ++id, jobId, qrCode, printedAt`
  - `syncQueue: ++id, operation, payload, retries`
- Workbox SW:
  - Background sync for `/api/sync` via `BackgroundSyncPlugin('syncQueue')`.
- UI: `OfflineBanner`, `SyncStatusBadge`, `ConflictResolutionDialog`.
- Testing protocol: 24h offline simulation with dropouts; multi-device conflict cases; ≥50 queued jobs; deterministic conflict resolution policy (last-write-wins with manual override where critical).

## 4) Architecture Refactor (DDD Monorepo)

**Status:** ❌ **Not Implemented** (single package.json, no monorepo structure)

**Current State:**
- ✅ Single `package.json` with all dependencies
- ✅ Modular code structure (components, lib, algorithms)
- ❌ **NOT implemented**: Monorepo structure (Turborepo/Nx)
- ❌ **NOT implemented**: Package extraction

**Remaining Deliverables:**
- Target packages: `fabricator-core`, `cnc-export`, `calibration-ai`, `workshop-ui`, `admin-portal`, `shared`.
- Phase 1 (Week 3–4): extract `fabricator-core` (components, lib/optimization, algorithms). Provide temporary re-exports in `src/components/fabricator/index.ts` with deprecation warning.
- Phase 2 (Week 5): Turborepo (or Nx) setup; sample `turbo.json` pipeline (build dependsOn ^build; test dependsOn build).
- Principles: enforce package boundaries; keep backward compatibility during migration; measure build time reduction.

## 5) SmartScan UI Upgrade (Beta → Production-Ready)

**Status:** ✅ **Fully Implemented** (all components exist, integrated)

**Current State:**
- ✅ `SmartScanUploader.tsx` (`src/components/fabricator/smartscan/SmartScanUploader.tsx`) - 1075 lines, includes:
  - Drag/drop file upload (react-dropzone)
  - Queue system with job status tracking
  - Sequential processing with progress tracking
  - SVG preview with download
  - Import wizard integration
- ✅ `ImportWizard.tsx` (`src/components/fabricator/smartscan/ImportWizard.tsx`) - Review → Map → Save workflow
- ✅ `smartScanApi.ts` (`src/services/smartScanApi.ts`) - API client with single/batch/enhanced scan
- ✅ **Integration complete:**
  - ProfileTuningStudio: SmartScan tab (line 1818-1833)
  - TestScanner page: uses SmartScanUploader
- ⚠️ **Note**: Uses sequential processing (calls `/single` endpoint in loop) instead of true batch API endpoint, but functional

**Status:** Production-ready ✅ (can mark as complete, optional enhancement: use true batch API endpoint for better performance)

## 6) CRM / ERP Roadmap (Staged)

**Status:** ⚠️ **Partially Implemented** (ERP bridge exists, but not hardened; CRM not started)

**Current State:**
- ✅ ERP bridge exists (`python_backend/core/business/erp_bridge.py`):
  - `ErpBridge` class with `emit_invoice_event`
  - `ErpAuditLogger` for transaction logging
  - Odoo adapter structure (`python_backend/core/business/adapters/odoo_adapter.py`)
  - Egyptian e-invoice compliance (`EgyptianEinvoiceBuilder`)
- ✅ Quote→invoice workflow exists
- ✅ Commercial workspace, VAT invoicing, Customer Portal, unified ticketing
- ❌ **NOT implemented**: CRM pipeline (leads/opportunities/contacts/activities)
- ❌ **NOT implemented**: Hardened ERP sync (M1-M4 milestones)
- ❌ **NOT implemented**: Odoo webhook endpoint
- ❌ **NOT implemented**: Bidirectional sync

**Remaining Deliverables:**
- CRM (new): leads/opportunities, contact/org models, activity timeline tied to quotes/orders; surface in Customer Portal.
- ERP-lite hardening: Odoo webhook `/api/odoo/webhook`; bidirectional sync for quotes/orders/invoices, stock moves; audit with before/after; retry with backoff + manual override UI.
- Milestones:
  - M1: Data models + API contracts.
  - M2: Bidirectional sync (quotes/orders/invoices).
  - M3: Pilot with 1–2 workshops; rollback/retry playbook.
  - M4: Multi-tenant hardening, backfill, rollups.

## 7) Pricing Pilot (Outcome-Based)
- Script: Month 1 baseline (free install, measure waste); Month 2 charge 10% of savings; floor $299, cap $2,999; 15% savings guarantee (else 3 months free).
- Dashboard example (Cairo Precision Windows): baseline waste 28% → 19% (savings 9% of material cost) → ~$450 charge at 10% share.
- Lighthouse workshops: 3 targets; keep 2–5 backups to offset dropout risk.

## 8) Government & Certification (Vision 2030 Alignment)
- Registrations: ITIDA Digital Transformation Provider (4–6 weeks, 2 references), Federation of Egyptian Industries (Tech Provider), Ministry of Trade SME program (needs pilot case study).
- Certification: “Digital Fabricator” with Ministry of Education + universities; curriculum template “Digital Fabricator Curriculum.”
- Messaging: “Digital Public Good / Sovereign Industrial Asset”; import-substitution FX savings; circular economy via remnant marketplace.

## 9) Metrics Dashboard (Investor/Grant)

**Status:** ⚠️ **Partially Implemented** (dashboards exist, but not investor-specific)

**Current State:**
- ✅ `ProductionDashboard.tsx` - production metrics, workshop impact
- ✅ `ValidationDashboard.tsx` - ROI calculator, validation metrics
- ✅ `SustainabilityTracker.ts` (`src/analytics/SustainabilityTracker.ts`) - CO₂ calculations
- ✅ Waste reduction metrics, time savings tracked
- ❌ **NOT implemented**: Dedicated `investor_metrics` materialized view
- ❌ **NOT implemented**: `LiveMetricsDashboard` component (investor-specific)
- ❌ **NOT implemented**: `ImpactHeatmap` (regional waste reduction)
- ❌ **NOT implemented**: `ExportForInvestors` (PDF/Excel export)

**Remaining Deliverables:**
- Backend (concept): materialized view `investor_metrics` with active workshops, ARPU, avg waste reduction, CO₂ saved (material_savings_kg * 14.3), data points, prediction accuracy.
- Frontend components: `LiveMetricsDashboard`, `ImpactHeatmap` (regional waste reduction), `ExportForInvestors` (PDF/Excel).
- KPIs to track: waste reduction, FX savings, offline uptime, data points collected, algorithm accuracy, ARPU/CAC/LTV, certified operators/jobs created.

## 10) Execution Cadence (90 Days) - **UPDATED STATUS**

**Completed (as of January 2026):**
- ✅ Weeks 5–8: SmartScan batch UI live; ProfileTuningStudio/TestScanner integration ✅ **DONE**

**Remaining (revised timeline):**
- Weeks 1–2: IP drafts filed; digital waiver flow (3 screens + logging); safety envelopes for Yilmaz/Elumatec; insurance quote.
- Weeks 3–4: `fabricator-core` extraction; IndexedDB schema + basic sync; offline banner + conflict UI; Turborepo config.
- Weeks 9–12: CRM models + sync prototype; Odoo adapter hardening; ITIDA submission; pilot results deck; investor metrics dashboard v1.

## 11) Testing & Validation (Target Cases)
- Safety: reject malicious G-code (e.g., M99 loops), validate Z-height vs envelope, require signature before export.
- Offline: run optimization/CNC export offline; queue ≥50 jobs; conflict resolution deterministic.
- SmartScan: batch 10 PDFs sequentially; accurate SVG preview; import to profile library.
- CRM/ERP: create quote in Odoo from Fabricator; sync stock bidirectionally; graceful network failure handling.

## 12) Risks & Mitigations
- Patent delay → rely on trade secrets + speed; file Egypt first, then PCT.
- Pilot churn → maintain 5 backup workshops.
- Odoo API drift → adapter pattern, contract tests.
- Team burnout → reserve ~20% time for tech debt each sprint.
- Government latency → parallel private-sector push; grants as upside.

## 13) Resource Allocation (Guideline)
- Weeks 1–4: Dev1 safety/offline; Dev2 architecture refactor; Founder IP + govt/insurance.
- Weeks 5–8: Dev1 SmartScan + ProfileTuning integration; Dev2 pilot setup + monitoring; Founder sales/partnerships.
- Weeks 9–12: Dev1 CRM models + sync; Dev2 metrics dashboard; Founder investors/grants.

## 14) Success Criteria (90 Days)
- Safety: 0 CNC incidents; 100% waiver completion.
- IP: 2 provisionals filed; 1 university MoU signed.
- Offline: 99.9% workshop uptime during outages (measured).
- Architecture: ≥30% build-time reduction with Turborepo.
- Pilot: ≥15% waste reduction at 3 workshops.
- Government: ITIDA registration submitted/approved milestone.

## 15) README Cross-Reference Notes

**Updated Status (January 2026):**
- ✅ SmartScan batch UI/import wizard **COMPLETE** (no longer "new")
- ⚠️ PWA mentioned; offline-first with IndexedDB + sync **STILL PENDING** (basic PWA exists, but not full offline-first)
- ⚠️ ERP bridge is noted as mock/odoo-ready; explicit CRM pipeline and hardened ERP sync **STILL PENDING**
- ⚠️ Safety already includes pre-production verification and kinematic checks; waiver + enforced 3-step gate + envelopes **STILL PENDING** (single modal exists, but not 3-step flow)
- Keep doc updated as milestones ship to avoid overpromising.

## 16) Implementation Analysis Summary

**Completion Status:**
- ✅ **Fully Complete (1/9)**: SmartScan UI Upgrade
- ⚠️ **Partially Complete (4/9)**: Safety (1/3 screens), Offline-First (basic PWA only), ERP (bridge exists, not hardened), Metrics (dashboards exist, not investor-specific)
- ❌ **Not Started (4/9)**: IP/Patents, Architecture Refactor, CRM Pipeline, Pricing Pilot, Government/Certification

**Key Findings:**
1. SmartScan is production-ready and can be marked complete
2. Safety verification needs 3-step modal split (currently single modal)
3. Offline-first needs IndexedDB/Dexie.js + Workbox implementation
4. ERP bridge exists but needs hardening (M1-M4 milestones)
5. No monorepo structure yet (single package.json)
6. No CRM pipeline started
7. No patent drafts filed
8. Metrics dashboards exist but need investor-specific view

