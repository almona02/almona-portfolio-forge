---
name: System Tuning Studio (Digital Twin Factory)
overview: Build the "Admin Workbench" that allows maalems and manufacturers to create, tune, and validate new System Packs with 99.8% accuracy—without writing code. This transforms the platform from a hardcoded tool into a scalable ecosystem.
todos:
  - id: create-tuning-types
    content: Create `src/types/tuning.ts` extending SystemPack interface for mutability, validation status, and micron parameter editing
    status: pending
  - id: scaffold-workbench
    content: Create `src/components/tuning/TuningWorkbench.tsx` with 3-pane layout (Inventory/Canvas/Properties) integrating existing SystemTuningStudio components
    status: pending
  - id: build-micron-panel
    content: Create `src/components/tuning/MicronParameterPanel.tsx` for visual tuning of saw kerf (4.2mm), bar end trim (15mm), transom milling (2.5mm), welding loss (3mm), and screen adapter offset
    status: pending
  - id: build-validation-sandbox
    content: Create `src/components/tuning/ValidationSandbox.tsx` that runs EgyptianInterferenceEngine against 100 random window sizes to find edge cases and validate 99.8% accuracy
    status: pending
  - id: enhance-role-tagger
    content: Enhance existing RoleTagger component to support all profile roles (frame, sash, mullion, transom, glazing_bead, interlock, screen_sash, screen_adapter)
    status: pending
  - id: create-system-builder
    content: Create `src/components/tuning/SystemPackBuilder.tsx` that combines DXF import, role tagging, hardware linking, and micron tuning into a unified workflow
    status: pending
  - id: route-integration
    content: Add `/tuning` route to AppRoutes.tsx pointing to TuningWorkbench
    status: pending
  - id: integrate-with-gallery
    content: Add "Tune System" button in Civilization Gallery that opens TuningWorkbench with system pre-loaded
    status: pending
---

# System Tuning Studio (Digital Twin Factory) Plan

## Objective

Build the "Admin Workbench" that allows maalems and manufacturers to create, tune, and validate new System Packs with 99.8% accuracy—without writing code. This transforms the platform from a hardcoded tool into a scalable ecosystem.

## Strategic Value

- **Scalability**: Move from 7 hardcoded systems to 700+ dynamic systems
- **Monetization**: Manufacturers pay to have their systems "Gold Tier Verified" on the platform
- **Accuracy**: Visual validation of micron-level parameters before release
- **Self-Service**: Manufacturers can onboard their own systems without engineering support

## Architecture Overview

The Tuning Studio creates a unified workbench that:
- Integrates existing components (DXF Importer, Role Tagger, Hardware Linker)
- Adds micron-level parameter tuning (99.8% accuracy variables)
- Provides validation sandbox for testing before publishing
- Enables system pack creation from scratch or editing existing packs

## Existing Infrastructure

**Already Implemented:**
- `SystemTuningStudio.tsx` - Dialog-based tuning with DXF import
- `DXFProfileImporter.tsx` - DXF/SVG file upload and parsing
- `RoleTagger.tsx` - Visual role assignment for profiles
- `HardwareLinker.tsx` - Hardware compatibility mapping
- `systemPackBuilder.ts` - System pack construction logic

**What's Missing:**
- Micron parameter tuning UI (saw kerf, milling, welding loss)
- Validation sandbox (stress testing with InterferenceEngine)
- Unified workbench interface (3-pane layout)
- Integration with Gallery for editing existing systems

## Implementation Steps

### Phase 1: Type Definitions & Data Structure

**File:** `src/types/tuning.ts`

Create interfaces for:
- `MutableSystemPack` - Editable version of SystemPack with validation status
- `MicronParameters` - All 99.8% accuracy variables (kerf, trim, milling, welding, adapter offset)
- `TuningSession` - State management for tuning workflow
- `ValidationResult` - Results from sandbox testing

**Key Properties:**
- `tuningStatus: 'draft' | 'tuned' | 'validated' | 'published'`
- `micronConfig: MicronParameters`
- `validationReport: ValidationResult`
- `createdBy: string` (manufacturer/maalem ID)

### Phase 2: Micron Parameter Panel

**File:** `src/components/tuning/MicronParameterPanel.tsx`

Visual tuning interface for:
- **Saw Blade Kerf**: 4.2mm (default, adjustable 3.5-5.0mm)
- **Bar End Trim**: 15mm (default, adjustable 10-20mm)
- **Transom Milling Depth**: 2.5mm (default, adjustable 1.0-5.0mm)
- **UPVC Welding Loss**: 3mm per corner (default, adjustable 2-5mm)
- **Screen Adapter Offset**: 15mm (Panda-specific, adjustable 12-18mm)

**Features:**
- Visual sliders with real-time preview
- Category-specific parameters (Aluminum vs UPVC)
- Formula explanations (e.g., "This affects glass fit calculation")
- Validation warnings (e.g., "Kerf too large may cause fit issues")

### Phase 3: Validation Sandbox

**File:** `src/components/tuning/ValidationSandbox.tsx`

Stress testing component that:
- Generates 100 random window sizes within system constraints
- Runs `EgyptianInterferenceEngine.validate()` on each
- Reports failures (e.g., "Sash too heavy at 2.5m height")
- Displays pass/fail statistics
- Highlights edge cases that need attention

**Output:**
- Pass rate percentage (target: 99.8%+)
- Failure cases with specific dimensions
- Recommendations for constraint adjustments
- "Ready to Publish" certification badge

### Phase 4: Unified Workbench

**File:** `src/components/tuning/TuningWorkbench.tsx`

Main 3-pane interface:

**Left Pane - Inventory:**
- Profile list (from DXF import or manual entry)
- Accessory library
- Hardware catalog
- Drag-and-drop to center canvas

**Center Pane - Canvas:**
- Visual assembly view
- Role tagging interface (enhanced RoleTagger)
- Profile relationships (frame → sash → bead)
- Hardware placement visualization

**Right Pane - Properties:**
- Micron Parameter Panel
- System constraints (min/max dimensions)
- Validation Sandbox results
- Publish controls

### Phase 5: Integration Points

**Gallery Integration:**
- Add "Tune System" button to SystemPackCard
- Pre-loads system data into TuningWorkbench
- Allows editing existing Gold Tier systems

**Pilot Integration:**
- Tuned systems automatically appear in Pilot
- Validation status badge (e.g., "99.8% Verified")
- Manufacturer attribution

## Critical Integration Points

### Micron Engine Integration
- `MicronParameterPanel` outputs config compatible with `MicronOptimizationEngine`
- Property names must match: `sawBladeKerf`, `barEndTrim`, `transomMillingDepth`, `upvcWeldingLoss`, `screenAdapterOffset`

### Interference Engine Integration
- `ValidationSandbox` uses `EgyptianInterferenceEngine.validate()`
- Must construct proper `WindowAssembly` objects for testing
- Reports errors using `err.code` for mapping to Maalem Wisdom

### System Pack Builder
- Leverage existing `buildCustomSystemPack()` function
- Extend to include micron parameters and validation status
- Output format compatible with `SYSTEM_PACKS` array

## Files to Create

1. `src/types/tuning.ts` - Type definitions
2. `src/components/tuning/TuningWorkbench.tsx` - Main workbench
3. `src/components/tuning/MicronParameterPanel.tsx` - Micron tuning UI
4. `src/components/tuning/ValidationSandbox.tsx` - Stress testing
5. `src/components/tuning/SystemPackBuilder.tsx` - Unified builder (enhances existing)

## Files to Modify

1. `src/components/fabricator/SystemTuningStudio.tsx` - Integrate micron panel
2. `src/components/gallery/SystemPackCard.tsx` - Add "Tune System" button
3. `src/routes/AppRoutes.tsx` - Add `/tuning` route
4. `src/lib/fabricator/systemPackBuilder.ts` - Extend to include micron params

## Success Criteria

- Create new system pack from DXF upload
- Tune micron parameters visually
- Validate system with 100 random test cases
- Publish system to Gallery/Pilot
- Edit existing systems from Gallery
- No TypeScript errors
- All validations pass before publishing

## Design Specifications

### Workbench Layout
- Left Pane: 300px width (collapsible)
- Center Pane: Flexible (main workspace)
- Right Pane: 400px width (collapsible)
- Total: Full viewport height

### Color Coding
- Draft: Gray
- Tuned: Yellow
- Validated: Green
- Published: Gold (#FFD700)

### Micron Parameter Ranges
- Saw Kerf: 3.5-5.0mm (default 4.2mm)
- Bar End Trim: 10-20mm (default 15mm)
- Transom Milling: 1.0-5.0mm (default 2.5mm)
- UPVC Welding: 2-5mm (default 3mm)
- Screen Adapter: 12-18mm (default 15mm)

