# Bundle Keep vs Remove Analysis

**Date:** 2025-02-10  
**Context:** Following Agent Manager 503 error discussion and "Nano Banana" strategy for bundle simplification.

---

## Executive Summary

This analysis maps every controversial dependency to actual usage in the codebase. The project has **significant redundancy** (UI frameworks, chart libraries, PDF engines) and **unused imports** that inflate bundle size. Below is a data-driven "keep vs remove" breakdown.

---

## 1. UI Framework Conflict (The "Civil War")

### Current State
| Library | Usage Count | Files |
|---------|-------------|-------|
| **Shadcn/Radix** | ~200+ imports | Primary UI system (`@/components/ui`, `@radix-ui/*`) |
| **Ant Design** | 4 files | TechChecklist, YilmazMachineDashboard, YilmazAnalytics, ProfileScannerUploader |
| **@ant-design/icons** | Same 4 files | Icons for the above |

### Recommendation: **REMOVE antd + @ant-design/icons**

**Rationale:**
- Shadcn/Radix is already the dominant system (200+ vs 4 files)
- Ant Design adds ~1.2MB+ (per ANTD_CHUNK_OPTIMIZATION.md)
- Icons: Replace with `lucide-react` (already used in 200+ files)

**Migration Path:**
1. Migrate these 4 components to Shadcn + lucide-react:
   - `src/components/ticketing/yilmaz/mobile/TechChecklist.tsx`
   - `src/pages/YilmazMachineDashboard.tsx`
   - `src/components/predictive/YilmazAnalytics.tsx`
   - `src/components/fabricator/smartscan/ProfileScannerUploader.tsx`
2. Run: `npm uninstall antd @ant-design/icons`
3. Remove antd from `package.json` overrides if present

**Estimated savings:** ~1.2MB

---

## 2. Chart Library Redundancy

### Current State
| Library | Usage | Files |
|---------|-------|-------|
| **recharts** | Heavy | 15+ files (commercial, advisory, analytics, national dashboards) |
| **chart.js + react-chartjs-2** | Medium | 4 files |

**Chart.js files:**
- `FabricationReportGenerator.tsx`
- `RemnantLifespanChart.tsx`
- `MaterialUtilizationChart.tsx`
- `PerformanceBenchmarkChart.tsx`

### Recommendation: **REMOVE chart.js + react-chartjs-2**

**Rationale:**
- Recharts is tree-shakeable; chart.js is heavier
- Recharts already used in ~15 components
- Single chart library simplifies maintenance

**Migration Path:**
1. Rewrite the 4 chart.js components using recharts equivalents
2. Run: `npm uninstall chart.js react-chartjs-2 @types/chart.js`
3. Remove chart.js from vite `manualChunks` if referenced

**Estimated savings:** ~100–150KB

---

## 3. AI/ML Libraries (Constitutional & Bundle Impact)

### 3a. @google/generative-ai — **KEEP**

**Usage:** Actively used in `src/lib/ai/gemini.ts`
- `getEquipmentRecommendation` — ARViewer, WorkspaceChecker, SalesAcceleration
- `getTechnicalSupport`, `identifyPartFromImage` — AITechnicalChatbot, SparePartsService
- `getWorkshopLayout`, `getDiagnosticGuidance`, `getMaintenanceAdvice`

**Note:** Gemini 503 errors are provider-side capacity issues, not bundle issues. The library is correctly lazy-loaded via dynamic imports when AI features are used.

---

### 3b. @huggingface/inference — **REMOVE**

**Usage:** **ZERO** production usage.

- Defined in `src/lib/dynamicImports.ts` as `loadHuggingFace`
- **Never called** anywhere in the codebase
- Only referenced in `TierPurity.test.ts` as a forbidden import (for Tier 3 paths)

**Migration Path:**
1. `npm uninstall @huggingface/inference`
2. Remove `loadHuggingFace` from `src/lib/dynamicImports.ts`
3. Remove from `vite.config.ts` `manualChunks` ml-engine block if present

**Estimated savings:** ~200–400KB

---

### 3c. @tensorflow/tfjs — **EVALUATE (Consider Remove)**

**Usage:** 3 files, all lazy-loaded
- `src/lib/ai/faultDetection.ts` — AI fault detection
- `src/lib/ml/ModelTrainer.ts` — ML model training
- `src/future/advisory/RemnantUsagePredictor.ts` — predictive remnant usage

**Constitutional Note:** Tier 3 forbids AI/ML in `src/algorithms`, `src/lib/constitutional`, `src/lib/pricing`, `src/realityos_core`. TensorFlow is in `src/lib/ai`, `src/lib/ml`, `src/future` — **not** in Tier 3 paths. So the test passes, but the Gemini discussion raised "Tier 3 Protected Determinism (No AI in execution)" as a design principle.

**Recommendation:**
- **Option A:** If these features are shipped and used → keep, ensure they stay lazy-loaded (already in `ml-engine` chunk)
- **Option B:** If these are experimental/unused → remove and delete the 3 files
- **Option C:** Move to backend (Python) if ML inference is critical

**Estimated savings if removed:** ~500KB+

---

## 4. PDF Libraries (Three Engines)

### Current State
| Library | Purpose | Usage |
|---------|---------|-------|
| **jspdf + jspdf-autotable** | Generate PDFs (tables, reports) | FacadeReportService, CutListExport, ManualCuttingPacketGenerator |
| **pdf-lib** | Generate/modify complex PDFs | CommercialPDFService, PDFExportService, pdfExporter, ReportingService, PDFExportGenerator, comparisonPdf |
| **pdfjs-dist** | View/parse PDFs (read text) | ProfileImportTool (extract text from uploaded PDFs) |

### Recommendation: **KEEP ALL THREE** (different roles)

**Rationale:**
- **jspdf:** Best for simple reports with tables (FacadeReportService, cut lists)
- **pdf-lib:** Best for complex PDF generation (commercial invoices, comparison reports)
- **pdfjs-dist:** Only option for client-side PDF *viewing* and text extraction

**Optimization:** Convert `FacadeReportService` to lazy-load jspdf:
- Currently: `import { jsPDF } from 'jspdf'` (eager)
- Change to: `const [{ default: jsPDF }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])` (like CutListExport)
- This defers ~300KB until facade report is actually generated

---

## 5. Bundles to KEEP (Essential)

| Library | Reason |
|---------|--------|
| **Shadcn/Radix** | Primary UI system, 200+ usages |
| **lucide-react** | Primary icon set |
| **Three.js / @react-three/fiber / drei** | Core 3D (fabricator, window generator, 3D configurator) |
| **recharts** | Primary charts (commercial, analytics, advisory) |
| **exceljs** | Excel import/export (lazy) |
| **maplibre-gl** | Service coverage map (lazy) |
| **@google/generative-ai** | Gemini AI features (equipment, support, parts) |
| **dxf-writer** | DXF export |
| **@uiw/react-md-editor** | Ticket description (lazy in TicketWizardDialog) |

---

## 6. Action Plan (Nano Banana Strategy)

### Phase 1: Quick Wins (No Migration)
```bash
npm uninstall @huggingface/inference
```
- Remove `loadHuggingFace` from `src/lib/dynamicImports.ts`
- Update `vite.config.ts` if ml-engine references it

### Phase 2: Migrate Ant Design (4 Components)
1. Migrate TechChecklist, YilmazMachineDashboard, YilmazAnalytics, ProfileScannerUploader to Shadcn + lucide-react
2. `npm uninstall antd @ant-design/icons`
3. Remove antd from overrides in package.json if present

### Phase 3: Migrate Chart.js (4 Components)
1. Rewrite FabricationReportGenerator, RemnantLifespanChart, MaterialUtilizationChart, PerformanceBenchmarkChart using recharts
2. `npm uninstall chart.js react-chartjs-2 @types/chart.js`

### Phase 4: Lazy-Load FacadeReportService jspdf
- Refactor `FacadeReportService.ts` to use dynamic import like `CutListExport.ts`

### Phase 5: Evaluate TensorFlow (Optional)
- Audit if faultDetection, ModelTrainer, RemnantUsagePredictor are used in production
- If not, remove @tensorflow/tfjs and the 3 files

---

## 7. Vite manualChunks Status

Current `vite.config.ts` already has good chunk splitting:
- `react-core` — React, ReactDOM, scheduler
- `vendor-3d` — three, @react-three/fiber, drei
- `physics-engine` — ammo.js
- `ml-engine` — TensorFlow, @google/generative-ai (HuggingFace can be removed from here)
- `document-vendor` — jspdf, pdf-lib, pdfjs-dist, exceljs, dxf-writer
- `ui-radix` — @radix-ui/*
- `animation` — framer-motion
- `react-vendor` — Ant Design, charts, etc. (will shrink after antd removal)

---

## 8. Summary Table

| Dependency | Status | Action |
|------------|--------|--------|
| antd | REMOVE | Migrate 4 components → Shadcn |
| @ant-design/icons | REMOVE | Replace with lucide-react |
| chart.js, react-chartjs-2 | REMOVE | Migrate 4 components → recharts |
| @huggingface/inference | REMOVE | Zero usage |
| @tensorflow/tfjs | EVALUATE | Remove if features unused |
| @google/generative-ai | KEEP | Actively used |
| jspdf, pdf-lib, pdfjs-dist | KEEP | Different purposes |
| Recharts | KEEP | Primary charts |
| Shadcn/Radix | KEEP | Primary UI |
| Three.js, R3F, drei | KEEP | Core 3D |

---

## 9. Estimated Bundle Impact

| Phase | Est. Savings |
|-------|--------------|
| Phase 1 (HuggingFace) | ~200–400KB |
| Phase 2 (Ant Design) | ~1.2MB |
| Phase 3 (Chart.js) | ~100–150KB |
| Phase 4 (FacadeReportService lazy) | Better initial load (defer ~300KB) |
| Phase 5 (TensorFlow, if removed) | ~500KB+ |

**Total potential:** ~2MB+ reduction + improved initial load.
