# ALMONA Fabricator UX: Current vs Future (48-Week Roadmap)
## Comprehensive User Experience Comparison

**Document Classification:** Strategic Analysis  
**Date:** January 2026  
**Version:** 1.0  
**Purpose:** Compare current fabricator user experience with post-roadmap experience

---

## Executive Summary

This document analyzes the transformation of ALMONA's fabricator user experience from the current window/door fabrication system to the future national platform supporting curtain walls, facades, skylights, and complex glazing. The comparison highlights workflow changes, new capabilities, and user experience improvements.

**Key Transformation:** From manual measurement-based workflow to BIM-driven, authority-first industrial platform.

---

## Current State: Window/Door Fabrication (2026)

### Workflow Overview

**Current Flow:**
```
Home Screen → New Project → Material Selection → Manual Measurement → 
Design (Grid-based) → 3D Preview → Optimization → Inventory → 
Production (Cut List) → Quality Control
```

**Total Steps:** 7 main workflow tabs  
**Primary Input:** Manual measurements or grid-based design  
**Output:** Cut lists, CNC files, DXF exports  
**Focus:** Windows and doors only

---

## Future State: National Platform (Post 48-Week Roadmap)

### Workflow Overview

**Future Flow:**
```
Home Screen → New Project → BIM Import (Revit/ArchiCAD) → 
System Pack Selection → Geometry Validation → 
Curtain Wall/Facade/Skylight Processing → BOM Generation → 
Cut List → CNC Export → Production
```

**Total Steps:** Streamlined to 4-5 steps (BIM-driven)  
**Primary Input:** BIM files (Revit/ArchiCAD)  
**Output:** BOMs, cut lists, CNC files, audit trails  
**Focus:** Windows, doors, curtain walls, facades, skylights, complex glazing

---

## Detailed Comparison

### 1. Project Creation & Input

#### Current State (2026)

**Process:**
1. Click "New Project" button
2. Select material (Aluminum/UPVC) → Auto-selects system pack
3. Enter project details (client name, project name)
4. Choose input method:
   - **Manual Measurement:** Enter dimensions manually
   - **Grid-based Design:** Draw window grid in design interface
   - **DXF Import:** Import DXF files (optional)

**Time:** 2-5 minutes  
**User Actions:** 5-10 clicks  
**Input Type:** Manual measurements or grid-based design

**Limitations:**
- ❌ No BIM import capability
- ❌ Manual data entry required
- ❌ Limited to windows and doors
- ❌ No curtain wall/facade/skylight support

#### Future State (Post-Roadmap)

**Process:**
1. Click "New Project" button
2. Select project type:
   - Window/Door (existing)
   - **Curtain Wall** (NEW)
   - **Facade** (NEW)
   - **Skylight** (NEW)
   - **Complex Glazing** (NEW)
3. Choose input method:
   - **BIM Import (Primary):** Upload Revit/ArchiCAD file
   - Manual Measurement (fallback)
   - Grid-based Design (fallback)
4. BIM file processing (< 3 minutes):
   - Geometry extraction
   - System pack detection/suggestion
   - Manufacturability validation

**Time:** 30 seconds - 3 minutes (BIM-driven)  
**User Actions:** 3-4 clicks (BIM import)  
**Input Type:** BIM files (primary), manual (fallback)

**Improvements:**
- ✅ BIM import as primary input method
- ✅ Automatic geometry extraction
- ✅ Support for curtain walls, facades, skylights
- ✅ System pack auto-detection from BIM
- ✅ Manufacturability validation before design

**Time Savings:** 70-80% reduction in project setup time

---

### 2. Design & Geometry Processing

#### Current State (2026)

**Process:**
1. **Manual Measurement Tab:**
   - Enter window dimensions
   - Select opening type (window, door, fixed)
   - Add mullions manually
   - Configure hardware

2. **Design Tab:**
   - Draw window grid
   - Place components (frame, sash, mullions)
   - Configure system pack parameters
   - Validate constraints

3. **3D Preview Tab:**
   - Visualize design
   - Check geometry accuracy (85% visual accuracy)
   - Manual adjustments if needed

**Time:** 10-30 minutes (depending on complexity)  
**User Actions:** 20-50 clicks  
**Accuracy:** 85% visual accuracy, 99.8% production accuracy

**Limitations:**
- ❌ Manual geometry entry
- ❌ No BIM geometry import
- ❌ Limited to window/door patterns
- ❌ No curtain wall panel decomposition
- ❌ No facade system processing

#### Future State (Post-Roadmap)

**Process:**
1. **BIM Import (Automatic):**
   - Upload Revit/ArchiCAD file
   - System extracts geometry automatically
   - Panels, mullions, frames extracted
   - Metadata extracted (dimensions, quantities)

2. **Geometry Validation:**
   - System validates manufacturability
   - Highlights constraint violations
   - Suggests fixes (non-binding)

3. **System Pack Application:**
   - Select or auto-detect system pack
   - Apply system rules to geometry
   - Generate BOM from geometry + system pack

4. **3D Preview:**
   - Visualize extracted geometry
   - Validate against system pack constraints
   - Check manufacturability

**Time:** 2-5 minutes (BIM-driven)  
**User Actions:** 5-10 clicks (mostly validation)  
**Accuracy:** 99.5% panel geometry, 98% mullion location

**Improvements:**
- ✅ Automatic geometry extraction from BIM
- ✅ Curtain wall panel decomposition
- ✅ Facade system processing
- ✅ Skylight geometry handling
- ✅ Complex glazing (curved geometry)
- ✅ System pack auto-detection
- ✅ Manufacturability validation before processing

**Time Savings:** 80-90% reduction in design time

---

### 3. System Pack Selection & Configuration

#### Current State (2026)

**Process:**
1. **Material Selection:**
   - Aluminum → Auto-selects PS System Pack
   - UPVC → Auto-selects FoxyWin System

2. **System Pack Tuning:**
   - Navigate to Tuning Studio
   - Import DXF files (optional)
   - Configure 88% of parameters without CAD
   - Tune frame, sash, hardware

3. **System Pack Validation:**
   - Check tuning status
   - Verify all profiles tuned
   - Proceed to design

**Time:** 5-15 minutes (if tuning needed)  
**User Actions:** 10-20 clicks  
**Configuration:** Manual tuning required

**Limitations:**
- ❌ Limited to window/door system packs
- ❌ No curtain wall system packs
- ❌ No facade system packs
- ❌ Manual configuration required

#### Future State (Post-Roadmap)

**Process:**
1. **System Pack Auto-Detection:**
   - BIM file analyzed
   - System pack suggested based on geometry
   - User confirms or selects alternative

2. **System Pack Library:**
   - **Curtain Wall Packs:** Unitized, stick systems
   - **Facade Packs:** Various facade systems
   - **Skylight Packs:** Skylight-specific systems
   - **Window/Door Packs:** Existing packs maintained

3. **System Pack Application:**
   - Rules applied automatically
   - Constraints enforced
   - Hardware assigned based on system pack

**Time:** 30 seconds - 1 minute  
**User Actions:** 1-2 clicks (confirmation)  
**Configuration:** Automatic from BIM + system pack

**Improvements:**
- ✅ Auto-detection from BIM
- ✅ Curtain wall system packs
- ✅ Facade system packs
- ✅ Skylight system packs
- ✅ Automatic rule application
- ✅ No manual tuning required (for BIM-driven projects)

**Time Savings:** 90% reduction in system pack configuration time

---

### 4. BOM & Cut List Generation

#### Current State (2026)

**Process:**
1. **Component Generation:**
   - Generate components from grid
   - Calculate profiles required
   - Gather all profiles (UnitProfileGatherer)

2. **Cut List Generation:**
   - Generate cutting list from system pack
   - Calculate quantities
   - Apply optimization

3. **Optimization:**
   - Genetic algorithm (remnant-first)
   - Constraint programming (glass nesting)
   - Linear programming (exact optimization)
   - Hybrid optimizer

4. **Export:**
   - DXF export
   - CNC export (YILMAZ, Elumatec, FOMM, Emmegi, Biesse)
   - QR codes

**Time:** 5-15 minutes (including optimization)  
**User Actions:** 5-10 clicks  
**Output:** Cut lists, DXF, CNC files

**Limitations:**
- ❌ Limited to window/door components
- ❌ No curtain wall BOM generation
- ❌ No facade BOM generation
- ❌ No skylight BOM generation

#### Future State (Post-Roadmap)

**Process:**
1. **BOM Generation (Automatic):**
   - Generate BOM from geometry + system pack
   - Calculate parts, quantities, dimensions
   - Apply system pack rules (hardware, gaskets, seals)
   - **Deterministic (Tier 3, zero AI)**

2. **Cut List Generation:**
   - Generate cut list from BOM
   - Format for workshop use
   - Group by material type

3. **Optimization (Enhanced):**
   - Existing optimization maintained
   - **Curtain wall nesting** (NEW)
   - **Facade panel optimization** (NEW)
   - **Skylight material optimization** (NEW)

4. **Export (Enhanced):**
   - Existing exports maintained
   - **Curtain wall-specific CNC formats** (NEW)
   - **Facade-specific exports** (NEW)
   - **Skylight-specific exports** (NEW)
   - **RealityOS audit trail** (NEW)

**Time:** 2-5 minutes (BIM-driven, faster)  
**User Actions:** 2-3 clicks (mostly automated)  
**Output:** BOMs, cut lists, CNC files, audit trails

**Improvements:**
- ✅ Curtain wall BOM generation
- ✅ Facade BOM generation
- ✅ Skylight BOM generation
- ✅ Complex glazing BOM generation
- ✅ Deterministic BOM (99.8%+ accuracy)
- ✅ RealityOS audit trail
- ✅ Enhanced CNC export formats

**Time Savings:** 60-70% reduction in BOM/cut list generation time

---

### 5. Workflow Steps

#### Current State (2026)

**7-Step Workflow:**
1. **Measuring** - Manual measurements or grid design
2. **Design** - Component placement and configuration
3. **3D Preview** - Visualization and validation
4. **Optimization** - Material optimization
5. **Inventory** - Stock management
6. **Production** - Cut list generation and export
7. **Quality Control** - Quality checks

**Navigation:** Tab-based with hash routing  
**Mobile Support:** Limited (desktop-focused)

#### Future State (Post-Roadmap)

**Streamlined 4-5 Step Workflow (BIM-Driven):**
1. **BIM Import** - Upload and process BIM file (NEW)
2. **Geometry Validation** - Validate manufacturability (NEW)
3. **System Pack Application** - Apply system rules (ENHANCED)
4. **BOM & Cut List** - Generate BOM and cut list (ENHANCED)
5. **Export & Production** - Export to CNC and production (ENHANCED)

**Alternative Workflow (Manual Fallback):**
- Maintains existing 7-step workflow for manual projects
- BIM-driven workflow is primary, manual is fallback

**Navigation:** Simplified for BIM-driven, tab-based for manual  
**Mobile Support:** Enhanced (responsive design)

**Improvements:**
- ✅ Streamlined workflow for BIM-driven projects
- ✅ Reduced steps (7 → 4-5 for BIM projects)
- ✅ Maintains manual workflow as fallback
- ✅ Better mobile support

---

### 6. Project Types & Capabilities

#### Current State (2026)

**Supported Project Types:**
- ✅ Windows (various types)
- ✅ Doors (various types)
- ✅ Fixed glazing
- ❌ Curtain walls (NOT SUPPORTED)
- ❌ Facades (NOT SUPPORTED)
- ❌ Skylights (NOT SUPPORTED)
- ❌ Complex glazing (NOT SUPPORTED)

**System Packs:**
- Window/door system packs only
- Limited to aluminum and UPVC

#### Future State (Post-Roadmap)

**Supported Project Types:**
- ✅ Windows (existing, maintained)
- ✅ Doors (existing, maintained)
- ✅ Fixed glazing (existing, maintained)
- ✅ **Curtain Walls** (NEW - unitized and stick systems)
- ✅ **Facades** (NEW - various facade systems)
- ✅ **Skylights** (NEW - with slope validation)
- ✅ **Complex Glazing** (NEW - curved geometry)

**System Packs:**
- Window/door system packs (maintained)
- **Curtain wall system packs** (NEW)
- **Facade system packs** (NEW)
- **Skylight system packs** (NEW)
- Support for multiple materials

**Improvements:**
- ✅ 4x more project types supported
- ✅ Expanded system pack library
- ✅ Multi-material support

---

### 7. Accuracy & Quality

#### Current State (2026)

**Accuracy:**
- **Visual Accuracy:** 85% (3D preview)
- **Production Accuracy:** 99.8% (cut lists)
- **Dual Output Engine:** 85% visual + 99.8% production from single calculation

**Quality Control:**
- Manual quality checks
- Optimization validation
- Cut list review

#### Future State (Post-Roadmap)

**Accuracy:**
- **Geometry Accuracy:** 99.5% panel geometry, 98% mullion location (BIM-driven)
- **BOM Accuracy:** 99.8%+ (deterministic, Tier 3)
- **Cut List Accuracy:** 99.8%+ (deterministic, Tier 3)
- **Constitutional Compliance:** 100% (enforced via CI/CD)

**Quality Control:**
- Automatic manufacturability validation
- Constitutional boundary enforcement
- RealityOS audit trail
- Enhanced quality checks

**Improvements:**
- ✅ Higher geometry accuracy (BIM-driven)
- ✅ Deterministic BOM/cut list (zero AI inference)
- ✅ Constitutional compliance enforcement
- ✅ Full audit trail (RealityOS)

---

### 8. Integration & Export

#### Current State (2026)

**Exports:**
- DXF files
- CNC files (YILMAZ, Elumatec, FOMM, Emmegi, Biesse)
- QR codes
- Excel reports

**Integration:**
- Limited ERP integration
- No BIM export
- No audit trail export

#### Future State (Post-Roadmap)

**Exports:**
- **All existing exports maintained**
- **BIM-compatible exports** (NEW)
- **RealityOS audit trail** (NEW)
- **Enhanced CNC formats** (NEW - curtain wall/facade/skylight specific)
- **Compliance reports** (NEW)

**Integration:**
- **BIM import/export** (NEW)
- **RealityOS integration** (NEW)
- **Enhanced ERP integration** (Phase 3)
- **Multi-tenant support** (Phase 3)
- **White-label support** (Phase 3)

**Improvements:**
- ✅ BIM round-trip capability
- ✅ Full audit trail
- ✅ Enhanced integrations
- ✅ Multi-tenant architecture

---

### 9. User Interface & Experience

#### Current State (2026)

**UI Theme:**
- Dark industrial theme
- Orange/red accent colors
- Professional, technical aesthetic

**Navigation:**
- Tab-based workflow
- Hash routing for deep linking
- 7 main workflow tabs

**Mobile Support:**
- Limited (desktop-focused)
- Basic responsive design

#### Future State (Post-Roadmap)

**UI Theme:**
- **Maintained:** Dark industrial theme
- **Enhanced:** Better contrast and accessibility
- **New:** White-label customization (Phase 3)

**Navigation:**
- **Simplified:** 4-5 steps for BIM-driven projects
- **Maintained:** 7-step workflow for manual projects
- **Enhanced:** Better progress indicators
- **New:** Persona-based UI adaptations (Authority Foundation)

**Mobile Support:**
- **Enhanced:** Better responsive design
- **Improved:** Mobile-optimized workflows

**Improvements:**
- ✅ Simplified navigation for BIM projects
- ✅ Better mobile support
- ✅ White-label customization
- ✅ Persona-based UI

---

### 10. Authority & Governance

#### Current State (2026)

**Authority Model:**
- Implicit authority boundaries
- No explicit constitutional enforcement
- Manual quality checks

**Governance:**
- Basic audit logging
- Limited traceability
- No constitutional compliance checks

#### Future State (Post-Roadmap)

**Authority Model:**
- **Explicit constitutional boundaries** (NEW)
- **Constitutional Guardian infrastructure** (NEW)
- **Authority-first architecture** (NEW)
- **Human responsibility hooks** (NEW)

**Governance:**
- **Full audit trail** (RealityOS) (NEW)
- **Complete traceability** (NEW)
- **Constitutional compliance enforcement** (NEW)
- **Governance dashboard** (NEW)

**Improvements:**
- ✅ Explicit authority boundaries
- ✅ Constitutional compliance enforcement
- ✅ Full audit trail
- ✅ Governance dashboard

---

## Quantitative Comparison

### Time Savings

| Task | Current Time | Future Time | Improvement |
|------|--------------|------------|-------------|
| **Project Setup** | 2-5 min | 30 sec - 3 min | 40-70% faster |
| **Design/Geometry** | 10-30 min | 2-5 min | 80-90% faster |
| **System Pack Config** | 5-15 min | 30 sec - 1 min | 90% faster |
| **BOM/Cut List Gen** | 5-15 min | 2-5 min | 60-70% faster |
| **Total Workflow** | 22-65 min | 5-14 min | **70-80% faster** |

### Accuracy Improvements

| Metric | Current | Future | Improvement |
|--------|---------|--------|-------------|
| **Geometry Accuracy** | 85% (visual) | 99.5% (BIM) | +14.5% |
| **BOM Accuracy** | 99.8% | 99.8%+ | Maintained |
| **Cut List Accuracy** | 99.8% | 99.8%+ | Maintained |
| **Constitutional Compliance** | N/A | 100% | NEW |

### Capability Expansion

| Capability | Current | Future | Change |
|------------|---------|--------|--------|
| **Project Types** | 3 (window/door/fixed) | 7 (adds curtain wall/facade/skylight/complex glazing) | +133% |
| **System Packs** | Window/door only | Window/door + curtain wall + facade + skylight | +300% |
| **Input Methods** | Manual/Grid/DXF | BIM (primary) + Manual/Grid/DXF (fallback) | +BIM |
| **Export Formats** | DXF/CNC/Excel | All existing + BIM + RealityOS + Compliance | +3 formats |

---

## User Experience Transformation Summary

### Current State (2026)
- **Workflow:** 7-step manual process
- **Input:** Manual measurements or grid design
- **Focus:** Windows and doors only
- **Time:** 22-65 minutes per project
- **Accuracy:** 85% visual, 99.8% production
- **Authority:** Implicit boundaries

### Future State (Post-Roadmap)
- **Workflow:** 4-5 step BIM-driven process
- **Input:** BIM files (primary), manual (fallback)
- **Focus:** Windows, doors, curtain walls, facades, skylights, complex glazing
- **Time:** 5-14 minutes per project (70-80% faster)
- **Accuracy:** 99.5% geometry, 99.8%+ production, 100% constitutional compliance
- **Authority:** Explicit constitutional boundaries

### Key Transformations

1. **Input Method:** Manual → BIM-driven (primary)
2. **Workflow Steps:** 7 → 4-5 (BIM projects)
3. **Project Types:** 3 → 7 (133% increase)
4. **Time Savings:** 70-80% faster
5. **Accuracy:** Higher geometry accuracy (BIM-driven)
6. **Authority:** Implicit → Explicit constitutional boundaries
7. **Governance:** Basic → Full audit trail (RealityOS)

---

## Migration Path for Current Users

### Phase 1: BIM Import Available (Week 5-16)
- **New Option:** BIM import available alongside manual workflow
- **User Choice:** Use BIM import or continue with manual workflow
- **Training:** BIM import training provided
- **Support:** Both workflows supported

### Phase 2: BIM Recommended (Week 17-28)
- **Default:** BIM import recommended for new projects
- **Manual:** Manual workflow still available as fallback
- **Training:** Enhanced BIM training
- **Support:** Both workflows supported

### Phase 3: BIM Primary (Week 29-40)
- **Primary:** BIM import is primary workflow
- **Manual:** Manual workflow available for edge cases
- **Training:** Comprehensive BIM training
- **Support:** Both workflows supported, BIM prioritized

### Phase 4: Full Platform (Week 41-48)
- **Complete:** Full national platform with all capabilities
- **Multi-tenant:** Multi-tenant support
- **White-label:** White-label customization
- **RealityOS:** Full RealityOS integration

---

## Conclusion

The 48-week roadmap transforms ALMONA from a window/door fabrication tool into a comprehensive national platform supporting curtain walls, facades, skylights, and complex glazing. The user experience evolves from manual measurement-based workflows to BIM-driven, authority-first industrial processes.

**Key Benefits:**
- **70-80% time savings** in project workflows
- **133% increase** in supported project types
- **Higher accuracy** through BIM-driven geometry extraction
- **Explicit authority boundaries** via constitutional governance
- **Full audit trail** via RealityOS integration

**Migration Strategy:**
- Gradual introduction of BIM capabilities
- Manual workflow maintained as fallback
- Comprehensive training and support
- User choice throughout migration

**The transformation maintains backward compatibility while dramatically expanding capabilities and improving efficiency.**

---

**Document Status:** ✅ Complete  
**Next Review:** After Phase 1 completion (Week 16)




















