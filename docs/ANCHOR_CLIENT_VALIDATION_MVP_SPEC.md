# Anchor Client Validation MVP: Technical Specification
## Minimal Viable Pipeline (8-Week Sprint)

**Document Classification:** Technical Specification  
**Authority:** Pre-Phase 1 Validation  
**Status:** Ready for Development  
**Date:** 2026-01-01  
**Version:** 1.0

---

## Executive Summary

This specification defines the Minimal Viable Pipeline (MVP) to be built in Week -5 of the 8-week validation sprint. The MVP validates the core hypothesis: **"ALMONA can import your Revit curtain wall, extract correct geometry, apply your system rules, and output a machine-ready cut list faster than your current process."**

**Critical Constraint:** Build only what's needed for validation. No features beyond core pipeline.

**The Single Question:** Can we deterministically translate BIM curtain wall geometry into machine-ready fabrication outputs faster than humans?

**Duration:** 8-week build sprint (before 48-week roadmap)  
**Team:** 3 engineers (1 BIM, 1 geometry, 1 frontend)  
**Success:** ≥40% time reduction in "Design → Cut List" for anchor client's Project A.

---

## MVP Scope: What We Build

### ✅ Included (Core Pipeline)

1. **BIM Import (Revit Only)**
   - Revit file parser (.rvt files)
   - Geometry extraction (no structural analysis)
   - Basic metadata extraction (dimensions, quantities)

2. **System Pack Selection (Single Pack)**
   - Client's most-used system pack (e.g., Caluminium PS)
   - System pack configuration (constraints, hardware)
   - No multi-pack support (single pack only)

3. **Geometry Validation**
   - Basic manufacturability checks (dimensions, constraints)
   - No structural analysis
   - No engineering judgment

4. **Cut List Generation**
   - Deterministic BOM generation (from geometry + system pack)
   - Cut list output (parts, quantities, dimensions)
   - Accuracy target: ≤2% variance (relaxed from 0.5% for MVP)

5. **Simple CNC Export**
   - Client's machine brand (e.g., YILMAZ, Elumatec)
   - Basic G-code or DXF export
   - No advanced nesting or optimization

### ❌ Explicitly NOT Included

**BIM:**
- ❌ Rhino support (NOT INCLUDED)
- ❌ Revit families (ONLY Curtain Wall)
- ❌ BIM analysis (NO clash detection, NO quantity takeoff)

**Geometry:**
- ❌ Curved panels (FLAT PANELS ONLY)
- ❌ Complex openings (RECTANGULAR ONLY)
- ❌ Optimization (NO nesting optimization)

**Intelligence:**
- ❌ AI (NO YDT, NO ML, NO suggestions)
- ❌ Tier 2 (NO collaborative intelligence)

**Outputs:**
- ❌ PDF 3D (NO 3D PDF)
- ❌ Multiple formats (ONE CNC format only)
- ❌ BOM (NO purchasing integration)

**UI/UX:**
- ❌ Configuration UI (HARDCODED PARAMETERS)
- ❌ User preferences (NO settings, NO themes)
- ❌ Mobile (DESKTOP ONLY)

### "Nice to Have" Backlog (Post-Validation)

```typescript
const PostValidationBacklog = [
  'Second system pack',
  'Rhino 3DM import',
  'Basic nesting optimization',
  'Second CNC machine format',
  'Improved error messages'
];
```

---

## Technical Architecture

### Simplified Stack

```yaml
frontend:
  framework: "React 18 (NO Next.js - too heavy)"
  ui: "Tailwind CSS + shadcn minimal components"
  3d: "Three.js basic viewer (NO textures, NO shadows)"
  state: "Zustand (NO Redux, NO Context overkill)"

backend:
  runtime: "Python FastAPI (single endpoint)"
  bim_parsing: "pyRevit + ezdxf (geometry only)"
  geometry: "Custom deterministic engine"
  output: "openpyxl (Excel), reportlab (PDF)"

deployment:
  frontend: "Vercel (static)"
  backend: "Railway (single container)"
  database: "SQLite (file-based, NO Supabase)"
```

### File Structure

```
mvp/
├── client/                    # Frontend
│   ├── upload/               # Single file upload
│   ├── viewer/               # Basic geometry viewer
│   └── export/               # Download buttons
├── server/                   # Backend
│   ├── bim/                 # Revit parser
│   ├── geometry/            # Deterministic engine
│   └── outputs/             # Excel/PDF/CNC generators
└── system_packs/            # Hardcoded client rules
    └── caluminium_ps_v3.json
```

---

## Component Specifications

### 1. Revit Importer (MVP) - Single Format, Single Family

**File:** `mvp/server/bim/RevitBasicImporter.ts`

**What It Does:**
- Parses Revit .rvt files from client's standard template
- Extracts ONLY Curtain Wall panels, mullions, basic openings
- Ignores everything else (MEP, furniture, annotations)
- Supports: Revit 2023, Revit 2024
- Extraction focus: Panels, Mullions, Openings
- Accuracy target: 99.5% panel geometry, 98% mullion location

**What It Does NOT Do:**
- No structural analysis
- No family semantic interpretation (geometry-grade only)
- No Rhino import
- No ArchiCAD import
- No clash detection, no quantity takeoff

**Fallback Strategy:**
> "If Revit parsing fails twice on the same template, Revit is downgraded from 'core assumption' to 'future enhancement'."

**Fallback Option:** Manual DXF upload (if Revit parsing fails)

**Input:**
- Revit .rvt file (from client)

**Output:**
```typescript
interface ExtractedGeometry {
  panels: {
    id: string;
    width: number;  // mm
    height: number; // mm
    type: string;   // e.g., "glass_panel", "opaque_panel"
  }[];
  mullions: {
    id: string;
    length: number; // mm
    depth: number;  // mm
    type: string;   // e.g., "vertical_mullion", "horizontal_transom"
  }[];
  frames: {
    id: string;
    width: number;  // mm
    height: number; // mm
    type: string;   // e.g., "unitized_frame", "stick_frame"
  }[];
  metadata: {
    projectName: string;
    units: 'mm' | 'm' | 'ft';
    version: string;
  };
}
```

**Success Criteria:**
- Import client's Revit file in < 3 minutes
- Extract geometry with ≤2% variance from manual measurement
- No structural analysis code

---

### 2. System Pack Validator (Single Pack - Hardcoded)

**File:** `mvp/system_packs/ClientSystemPack.ts`

**What It Does:**
- ONE SYSTEM PACK ONLY (e.g., "Caluminium PS Unitized v3.2")
- Hardcoded rules, no configuration UI
- Source: Client-provided Excel/PDF specs
- Rules: Panel decomposition (unitized_by_grid), mullion calculation (centerline_intersection), hardware defaults (client_standard_hardware_set_2025)

**What It Does NOT Do:**
- No multi-pack support
- No constraint generation (only enforcement)
- No structural analysis
- No configuration UI (hardcoded parameters)

**Input:**
- Extracted geometry (from Revit importer)
- System pack configuration (client's pack, e.g., Caluminium PS)

**Output:**
```typescript
interface ValidationResult {
  valid: boolean;
  errors: {
    elementId: string;
    errorType: 'dimension' | 'angle' | 'clearance' | 'constraint';
    message: string;
    severity: 'error' | 'warning';
  }[];
  warnings: {
    elementId: string;
    message: string;
  }[];
}
```

**Success Criteria:**
- Validates geometry against system pack constraints
- No "impossible geometry" passes through
- No structural analysis code

---

### 3. Geometry Pipeline (Pure Deterministic)

**File:** `mvp/server/geometry/MVPGeometryPipeline.ts`

**What It Does:**
- PURE GEOMETRY → CUT LIST (No AI, no optimization, no suggestions)
- Process: Extract (Tier 3) → Validate against hardcoded client constraints → Apply single system pack rules → Generate CNC for client's specific machine

**What It Does NOT Do:**
- No AI inference
- No optimization (deterministic calculation only)
- No suggestions
- No Tier 2 collaborative intelligence

**Input:**
- Validated geometry (from validator)
- System pack configuration

**Output:**
```typescript
interface BOM {
  parts: {
    partId: string;
    description: string;
    quantity: number;
    length: number;  // mm
    width?: number;  // mm (if applicable)
    depth?: number;  // mm (if applicable)
    material: string;
    systemPack: string;
  }[];
  hardware: {
    itemId: string;
    description: string;
    quantity: number;
    type: string;  // e.g., "screw", "gasket", "seal"
  }[];
  summary: {
    totalParts: number;
    totalLength: number;  // mm
    totalHardware: number;
  };
}
```

**Success Criteria:**
- BOM matches manual calculation within ≤2% variance (MVP target)
- All calculations traceable to geometry + system pack
- No AI inference in BOM generation

---

### 4. Cut List Generator

**File:** `src/lib/cutlist/CutListGenerator.ts`

**What It Does:**
- Generates cut list from BOM (deterministic)
- Formats for workshop use (readable, machine-ready)
- Groups by material type and operation

**What It Does NOT Do:**
- No advanced nesting (basic grouping only)
- No optimization algorithms
- No material waste calculation (basic only)

**Input:**
- BOM (from BOM generator)

**Output:**
```typescript
interface CutList {
  materialGroups: {
    materialType: string;  // e.g., "aluminum_profile_120mm"
    cuts: {
      partId: string;
      length: number;  // mm
      quantity: number;
      operation: string;  // e.g., "cut", "drill", "mill"
    }[];
  }[];
  summary: {
    totalCuts: number;
    totalLength: number;  // mm
  };
}
```

**Success Criteria:**
- Cut list matches workshop expectations
- Format is clear and machine-ready
- No manual editing required for basic operations

---

### 5. Simple CNC Exporter (Client-Specific Format)

**File:** `mvp/server/outputs/CNCExporter.ts`

**What It Does:**
- Exports to client's specific machine format
- Format: Specific G-code dialect for client machine
- Brand: Elumatec/Intermac/Yilmaz (pick one)
- Validation: File must load without manual editing

**What It Does NOT Do:**
- No advanced nesting algorithms
- No tool path optimization
- No multi-machine support (single machine brand only)
- No advanced features (basic operations only)

**Fallback Strategy:**
- If CNC export fails: Provide Excel-only validation (acceptable for MVP)
- CNC is usability criterion, not architectural proof

**Input:**
- Cut list (from cut list generator)
- Machine configuration (client's machine brand)

**Output:**
- G-code file (for CNC machines) or DXF file (for cutting machines)

**Success Criteria:**
- File loads on client's machine without manual editing
- Basic operations work (cutting, drilling)
- No advanced features required

---

## User Flow: 4-Step Process

### Step 1: Upload (30 seconds)

```
DRAG & DROP → "project_A.rvt"
[PROCESSING...] (target: <2 minutes)
✅ File validated: 47 panels, 28 mullions detected
```

### Step 2: Review (60 seconds)

```
GEOMETRY PREVIEW (simple 3D, no textures)
⚠️ Check: 2 panels exceed max length (8m)
✅ All mullions within tolerance
[ACCEPT GEOMETRY] or [CANCEL]
```

### Step 3: Process (45 seconds)

```
APPLYING SYSTEM PACK: Caluminium PS v3.2
✓ Panel decomposition
✓ Mullion calculation  
✓ Hardware assignment
✓ Cut list generation
✅ READY: 47 parts, 124.7m total
```

### Step 4: Export (15 seconds)

```
DOWNLOAD:
📊 project_A_cutlist.xlsx (client template)
⚙️ project_A_cnc.gcode (Elumatec format)
📄 project_A_summary.pdf
```

**Total Target Time:** <4 minutes for 50-panel project  
**Client Baseline:** Measure their current time (likely 20-60 minutes)

---

## UI Components (Minimal)

### Validation Wizard

**File:** `mvp/client/upload/ValidationWizard.tsx`

**What It Does:**
- Simple 4-step wizard (upload → review → process → export)
- Basic Three.js viewer (wireframe only, no textures, no shadows)
- Single file upload component
- Download buttons for outputs

**What It Does NOT Do:**
- No advanced UI features
- No customization options
- No reporting or analytics
- No mobile support (desktop only)
- No configuration UI (hardcoded parameters)

---

## Success Criteria (MVP)

### Technical Criteria

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| **Processing Time** | ≤2 minutes for 50-panel project | Time measurement |
| **Panel Count Accuracy** | ≥99% | Manual count comparison |
| **Mullion Location Accuracy** | ≥98% | Manual location comparison |
| **Output Quality** | CNC file loads without manual editing | Machine test |
| **Reliability** | No crashes in 10 consecutive runs | Stress test |
| **Simplicity** | 4-step process, no configuration needed | User test |
| **Constitutional Compliance** | 100% | No prohibited code |

### Business Criteria

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| **Time Savings** | ≥40% reduction (Design → Cut List) | Time-motion study |
| **User Satisfaction** | ≥4/5 average | Survey (3 roles: designer, manager, operator) |
| **Workflow Completion** | <4 minutes for 50-panel project | Time measurement |
| **Human Touches Count** | Secondary metric (context only) | Count manual interventions |

### Client Baseline Comparison

**CLIENT BASELINE (current process):**
1. Open Revit: 30s
2. Export to Excel: 45s
3. Manual calculations: 12min
4. Format cut list: 8min
5. Create CNC file: 15min
**TOTAL: ~36 minutes**

**MVP TARGET:**
1. Upload: 30s
2. Process: 2min
3. Download: 15s
**TOTAL: ~3 minutes**

**IMPROVEMENT: 33 minutes saved (92%)**

---

## Build Timeline (8 Weeks)

### Week 1-2: Foundation

**Day 1-3: Setup**
```bash
mkdir mvp
npm create vite@latest mvp-client -- --template react-ts
cd mvp-server && python -m venv venv
```

**Day 4-7: Basic Upload + Viewer**
- Single file upload component
- Basic Three.js viewer (wireframe only)
- No textures, no materials, no lighting

### Week 3-4: BIM Core

**Week 3: Revit Parser (Geometry Only)**
```python
# Install: pyRevit, ezdxf
# Goal: Extract panels, mullions from .rvt
# Output: Simple JSON with points, edges
```

**Week 4: Geometry Engine**
- Pure deterministic calculations
- Panel decomposition (grid-based)
- Mullion intersection calculation

**Week 4 Checkpoint:** If geometry extraction fails twice on same template, pivot to DXF fallback or end MVP early.

### Week 5-6: System Pack Application

**Week 5: Hardcoded Rules**
```typescript
const rules = loadSystemPack('client_caluminium_ps_v3.json');
// Apply to geometry
// Generate part list
```

**Week 6: Output Generators**
- Excel: Match client's existing template
- CNC: Single machine format
- PDF: One-page summary

**Week 6 Checkpoint:** If CNC file doesn't load on client machine, fix specific machine dialect or provide Excel-only validation.

### Week 7-8: Validation & Polish

**Week 7: Internal Testing**
- Test with 3 sample projects
- Fix geometry extraction bugs
- Tune performance (<2 min processing)

**Week 8: Client Dry Run**
- Install on client machine
- Test with REAL project A
- Measure time, fix critical issues

---

## Testing Requirements

### Unit Tests

- Revit import (geometry extraction accuracy)
- System pack validation (constraint enforcement)
- BOM generation (deterministic calculation)
- Cut list generation (format correctness)

### Integration Tests

- End-to-end: Revit file → Cut list → CNC export
- Accuracy validation: Compare with manual calculation
- Constitutional compliance: No prohibited code

### Client Validation Tests

- Week -4: Project A (first validation)
- Week -2: Projects B & C (second validation)

---

## Risks & Mitigations

### High Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Revit parsing fails** | High | Critical | Use client's exact Revit template; fallback: manual DXF upload. **If fails twice on same template, downgrade Revit from 'core assumption' to 'future enhancement'.** |
| **Geometry errors** | Medium | High | Extensive validation; highlight errors in preview |
| **Performance >2min** | Medium | Medium | Profile and optimize; acceptable for MVP if <5min |
| **Client changes mind** | Low | Critical | Signed Pre-POC agreement; weekly check-ins |

### Go/No-Go Decision Points

**Week 4 Checkpoint: Geometry Extraction**
```typescript
if (!canExtractAccurateGeometry(clientFile)) {
  console.error('❌ Geometry extraction failed');
  // Pivot: Use DXF instead of Revit
  // Or: End MVP early
}
```

**Week 6 Checkpoint: Output Quality**
```typescript
if (!cncFileLoadsOnClientMachine(output)) {
  console.error('❌ CNC output failed');
  // Fix specific machine dialect
  // Or: Provide Excel only for validation
}
```

### Constitutional Enforcement (MVP Version)

```typescript
// File: mvp/constitution/MVPGuard.ts
/**
 * MVP-SPECIFIC CONSTITUTIONAL GUARD
 * Simplified from full version
 */
class MVPGuard {
  private static PROHIBITED_IN_MVP = [
    'structuralAnalysis',
    'loadCalculation', 
    'thermalAnalysis',
    'energySimulation',
    'aiSuggestion',
    'optimizationOverride'
  ];
  
  validateOperation(operation: string): boolean {
    // In MVP: ANY prohibited term = immediate fail
    return !this.PROHIBITED_IN_MVP.some(term => 
      operation.toLowerCase().includes(term)
    );
  }
}
```

### Measurement Integration

**Built-in Timing:**
```typescript
// Automatic time tracking
class MVPTimeTracker {
  private startTime: number;
  
  start(step: string) {
    this.startTime = Date.now();
    console.log(`⏱️ ${step} started`);
  }
  
  end(step: string) {
    const duration = Date.now() - this.startTime;
    console.log(`✅ ${step}: ${duration}ms`);
    this.saveToCSV(step, duration);
  }
}

// Integrated into every step
tracker.start('upload');
// ... upload happens
tracker.end('upload'); // Logs: "upload: 1543ms"
```

---

## What Happens After MVP Validation

### If Validation Succeeds (Go)

**Week -1:**
- Incorporate validated learnings into Phase 1 plan
- Expand MVP to full Phase 1 scope:
  - Multi-system pack support
  - ArchiCAD import
  - Advanced optimization
  - 3D PDF generation
- Begin Phase 1 development (Week 5-16)

### If Validation Fails (No-Go)

**Week -1:**
- Diagnostic review (identify root causes)
- Re-scope Phase 1 (fundamental changes)
- Consider alternative approaches

---

## Conclusion

This MVP specification defines the minimal pipeline needed to validate the core hypothesis. It's intentionally limited to:

- **Single system pack** (not multi-pack)
- **Revit only** (not Rhino/ArchiCAD)
- **Basic CNC export** (not advanced nesting)
- **Simple UI** (not full workflow)

**The goal:** Prove the core pipeline works in real production conditions, not build the complete system.

---

**Document Status:** ✅ Ready for Development  
**Next Review:** After Week -4 validation (first client test)  
**Authority:** Technical Specification for Validation MVP

