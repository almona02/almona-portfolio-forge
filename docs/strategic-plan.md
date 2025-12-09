# Strategic Plan – Almona Portfolio Forge

Purpose: one living document for internal roadmap, investor comms, grants, and technical specification. Grounded against current README (v5.2) to avoid overpromising.

## 0) Scope & Status (Grounded in README)
- Implemented (per README): Fabricator Pro end-to-end, SmartDraw/3D/AR, verification gate, QR feedback loop, CalibrationWizard/Learner, remnant-first GA + glass CP solver + hybrid mass optimizer, ProductionLabel, Production Scheduler, Machine Twin, multi-brand CNC exports, machining macros, SmartScan/OCR (beta), PWA support, CNC security & kinematic collision detection, unified ticketing, quote→invoice (Commercial workspace), ERP bridge (mock/odoo-ready), Customer Portal, Supabase auth/RLS/realtime, SendGrid, Vercel/Docker, security hardening.
- Not yet implemented (commitments here): waiver + 3-step safety flow; 3D toolpath gate as a hard blocker; IndexedDB + background sync for offline-first production; SmartScan batch UI with importer; Turborepo/Nx refactor; explicit CRM pipeline; hardened ERP sync milestones; outcome-based pricing pilot; government registrations; investor metrics views.

## 1) Liability & Safety (Immediate)
- Deliverables: mandatory Digital Twin Verification (3 screens), logging, 3D collision gate, safety envelopes, insurance.
- Components (new):
  - `SafetyWarningModal.tsx` (Screen 1: warnings)
  - `ToolpathPreviewModal.tsx` (Screen 2: 3D collision viz)
  - `FinalVerificationModal.tsx` (Screen 3: digital signature)
- Logging (example SQL):
  - `cnc_safety_logs(job_id, user_id, verification_step_1_at, step_1_ip, verification_step_2_at, collision_check_passed, verification_step_3_at, digital_signature_hash, gcode_hash_before, gcode_hash_after)`
- Collision & envelopes:
  - Collision detector: three.js + ammo.js meshes; clamp zones, travel limits, emergency stop suggestion.
  - Safety envelopes (JSON): `safety_profiles/yilmaz_w60.json`, `safety_profiles/elumatec_sbz151.json` used in pre-flight before G-code export.
- Insurance: pursue “Technology E&O + Product Liability” (e.g., Marsh Egypt), target ~$15k/yr for ~$5M coverage.

## 2) IP & Data Moat
- Provisional patents (Week 1–2 drafting):
  - “Calibration feedback loop via production QR for ML-based K-factor tuning.”
  - “Remnant-first genetic optimizer for material waste reduction.”
- Draft structure (repo docs folder, not code):
  - `documents/patent_draft_1/{calibration_feedback_loop.md, claims.md, figures/…}`
  - `documents/patent_draft_2/remnant_first_genetic.md`
- Data partnerships:
  - Templates: `data_partnerships/{university_mou_template.docx, ministry_data_sharing_agreement.md}`
  - `anonymization_pipeline.py` (strip PII, aggregate optimization/remnant telemetry).
  - Universities priority: Cairo Univ., Ain Shams, GUC (for EU funding access).

## 3) Offline-First (Production Continuity)
- Goal: “factory never stops cutting” when Supabase/cloud is down.
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
- Target packages: `fabricator-core`, `cnc-export`, `calibration-ai`, `workshop-ui`, `admin-portal`, `shared`.
- Phase 1 (Week 3–4): extract `fabricator-core` (components, lib/optimization, algorithms). Provide temporary re-exports in `src/components/fabricator/index.ts` with deprecation warning.
- Phase 2 (Week 5): Turborepo (or Nx) setup; sample `turbo.json` pipeline (build dependsOn ^build; test dependsOn build).
- Principles: enforce package boundaries; keep backward compatibility during migration; measure build time reduction.

## 5) SmartScan UI Upgrade (Beta → Production-Ready)
- New components (under `components/smartscan/`):
  - `SmartScanBatchUploader.tsx` (drag/drop, queue)
  - `SmartScanProgressQueue.tsx` (processing status)
  - `SmartScanSVGPreview.tsx` (interactive preview)
  - `SmartScanImportWizard.tsx` (Review → Map → Save)
  - Hooks: `useSmartScanBatch`, `useSmartScanPreview`
- Integration points:
  - ProfileTuningStudio: “Import from SmartScan” action.
  - TestScanner: bulk test mode.
  - ProfileLibrary: batch import results.
- Legacy: keep `/smartscan-old` route with deprecation banner.

## 6) CRM / ERP Roadmap (Staged)
- Current (per README): Quote→invoice, Commercial workspace, VAT invoicing, ERP bridge (mock/odoo-ready), Customer Portal, unified ticketing. No explicit CRM pipeline; ERP not hardened.
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
- Backend (concept): materialized view `investor_metrics` with active workshops, ARPU, avg waste reduction, CO₂ saved (material_savings_kg * 14.3), data points, prediction accuracy.
- Frontend components: `LiveMetricsDashboard`, `ImpactHeatmap` (regional waste reduction), `ExportForInvestors` (PDF/Excel).
- KPIs to track: waste reduction, FX savings, offline uptime, data points collected, algorithm accuracy, ARPU/CAC/LTV, certified operators/jobs created.

## 10) Execution Cadence (90 Days)
- Weeks 1–2: IP drafts filed; digital waiver flow (3 screens + logging); safety envelopes for Yilmaz/Elumatec; insurance quote.
- Weeks 3–4: `fabricator-core` extraction; IndexedDB schema + basic sync; offline banner + conflict UI; Turborepo config.
- Weeks 5–8: SmartScan batch UI live; ProfileTuningStudio/TestScanner integration; lighthouse workshops onboarded; baseline waste measured.
- Weeks 9–12: CRM models + sync prototype; Odoo adapter; ITIDA submission; pilot results deck; metrics dashboard v1.

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
- SmartScan currently beta; batch UI/import wizard/offline sync are new.
- PWA mentioned; offline-first with IndexedDB + sync is a new commitment.
- ERP bridge is noted as mock/odoo-ready; explicit CRM pipeline and hardened ERP sync are new.
- Safety already includes pre-production verification and kinematic checks; waiver + enforced 3-step gate + envelopes are new.
- Keep doc updated as milestones ship to avoid overpromising.

