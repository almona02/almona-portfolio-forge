# Complex Design Tools for Windows & Doors - Deep Dive Analysis

**Date:** January 2026  
**Purpose:** Extract and implement advanced design tools for aluminum and UPVC window/door systems  
**Scope:** Material-aware, hardware-aware, structural-aware design tools

---

## Executive Summary

This document identifies **complex design tools** needed for professional window/door design in both **aluminum** and **UPVC** materials. These tools go beyond basic shape drawing to include:

1. **Material-Specific Design Tools**
2. **Hardware Placement Tools**
3. **Structural Design Tools** (Mullions, Transoms)
4. **Thermal & Performance Tools**
5. **Assembly & Manufacturing Tools**

---

## Material-Specific Considerations

### Aluminum Systems
- **Profile Depth:** 60mm, 70mm, 100mm, 120mm
- **Thermal Break:** Required for energy efficiency
- **Glazing Pocket:** 15-25mm typical
- **Mullion Types:** Standard, Thermal Break, Structural
- **Hardware:** Heavy-duty hinges, multi-point locks
- **Corner Connections:** 45° miter, corner keys
- **Reinforcement:** Steel inserts for large spans

### UPVC Systems
- **Profile Depth:** 58mm, 60mm, 70mm, 80mm
- **Thermal Break:** Built-in (multi-chamber)
- **Glazing Pocket:** 20-32mm typical
- **Mullion Types:** Standard, Reinforced
- **Hardware:** Standard hinges, espag locks
- **Corner Connections:** Welded (3mm burn-off)
- **Reinforcement:** Steel reinforcement bars

---

## Complex Design Tools Needed

### 1. Material-Aware Shape Tools

**Current:** Basic rectangle, circle, arc, polygon  
**Needed:** Material-aware primitives that understand:
- Profile depth constraints
- Glazing pocket requirements
- Thermal break positioning
- Material-specific dimensions

**Tools:**
- **Aluminum Window Tool** - Creates aluminum window with thermal break
- **UPVC Window Tool** - Creates UPVC window with multi-chamber
- **Material-Specific Rectangle** - Rectangle that knows material constraints
- **Profile-Aware Shapes** - Shapes that respect system pack limits

---

### 2. Hardware Placement Tools

**Current:** Hardware placeholders exist in 3D  
**Needed:** Interactive hardware placement in 2D drafting

**Tools:**
- **Hinge Placement Tool** - Place hinges with Egyptian standard (150mm from top/bottom)
- **Handle Placement Tool** - Place handles at 1100mm (Egyptian standard)
- **Lock Placement Tool** - Place locks with multi-point support
- **Roller Placement Tool** - Place rollers for sliding windows
- **Hardware Library Browser** - Browse and select hardware components

**Hardware Types:**
- **Hinges:** Casement, Tilt-Turn, Top-Hung, Bottom-Hung
- **Handles:** Standard, Ergonomic, Design, Espag
- **Locks:** Multi-Point, Casement, Sliding, Tilt-Turn
- **Rollers:** Standard, Heavy-Duty, Silent
- **Corner Keys:** 15mm, 20mm, Screw-type

---

### 3. Structural Design Tools

**Current:** Basic mullion/transom in SmartDraw  
**Needed:** Advanced structural design in drafting

**Tools:**
- **Mullion Placement Tool** - Place vertical mullions with spacing calculation
- **Transom Placement Tool** - Place horizontal transoms
- **Structural Calculator** - Calculate mullion spacing based on:
  - Material (aluminum vs UPVC)
  - Glazing weight
  - Wind load
  - Span limits
- **Reinforcement Tool** - Add steel/aluminum reinforcement
- **Connection Designer** - Design mullion/transom connections
- **Segmentation Tool** - Auto-segment tall windows (>2.4m)

**Structural Rules:**
- **Aluminum:** Max span 3000mm without intermediate mullion
- **UPVC:** Max span 2400mm without intermediate mullion
- **Reinforcement:** Required for spans >2000mm (aluminum) or >1800mm (UPVC)
- **Tall Windows:** Auto-segment at 2400mm intervals

---

### 4. Thermal & Performance Tools

**Current:** Thermal analysis exists but not in drafting  
**Needed:** Visual thermal design tools

**Tools:**
- **Thermal Break Visualizer** - Show thermal break locations
- **U-Value Calculator** - Calculate U-value based on:
  - Material (aluminum vs UPVC)
  - Glazing type
  - Thermal break presence
- **Energy Performance Indicator** - Visual indicator of energy efficiency
- **Thermal Bridge Detector** - Highlight thermal bridges

**Thermal Considerations:**
- **Aluminum:** U-value 5.5 W/m²K (single glazing, no thermal break) → 2.8 W/m²K (with thermal break)
- **UPVC:** U-value 2.8 W/m²K (double glazing, multi-chamber)
- **Thermal Break:** Required for aluminum in energy-efficient designs

---

### 5. Assembly & Manufacturing Tools

**Current:** Basic geometry only  
**Needed:** Manufacturing-aware design tools

**Tools:**
- **Corner Connection Tool** - Design corner connections (miter, corner keys)
- **Welding Tool** (UPVC) - Design welded corners with burn-off
- **Glazing Pocket Designer** - Design glazing pocket dimensions
- **Gasket Placement Tool** - Place gaskets and seals
- **Spacer Designer** - Design glass spacers
- **Manufacturing Constraints Checker** - Validate manufacturability

**Manufacturing Rules:**
- **Aluminum:** 45° miter cuts, corner keys, min corner radius
- **UPVC:** Welded corners (3mm burn-off), min welding length
- **Glazing:** Clearance requirements, bite depth, max pane size

---

### 6. Pattern-Specific Tools

**Current:** Basic templates  
**Needed:** Pattern-aware design tools

**Tools:**
- **Casement Designer** - Design casement windows with hinges
- **Sliding Designer** - Design sliding windows with tracks
- **Tilt-Turn Designer** - Design tilt-turn windows
- **Panda Designer** - Design panda windows (screen + glass)
- **Shish Designer** - Design shish windows (rolling shutter)
- **Corner Window Designer** - Design corner windows (90° connection)
- **Picture Window Designer** - Design fixed picture windows

---

### 7. Multi-Material Design Tools

**Current:** Single material only  
**Needed:** Mixed material designs

**Tools:**
- **Material Selector** - Switch between aluminum and UPVC
- **Hybrid Designer** - Design windows with mixed materials
- **Material Compatibility Checker** - Validate material combinations
- **System Pack Matcher** - Match design to available system packs

---

## Implementation Priority

### Phase 1: Core Material Tools (High Priority)
1. Material-Aware Shape Tools
2. Hardware Placement Tools
3. Structural Design Tools (Mullions/Transoms)

### Phase 2: Advanced Tools (Medium Priority)
4. Thermal & Performance Tools
5. Assembly & Manufacturing Tools

### Phase 3: Specialized Tools (Low Priority)
6. Pattern-Specific Tools
7. Multi-Material Design Tools

---

## Technical Architecture

### Material-Aware Design System

```typescript
interface MaterialAwareShape {
  material: 'aluminum' | 'upvc';
  systemPack: string;
  profileDepth: number;
  glazingPocket: {
    depth: number;
    width: number;
    clearance: number;
  };
  thermalBreak?: {
    width: number;
    material: string;
  };
  constraints: {
    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;
  };
}
```

### Hardware Placement System

```typescript
interface HardwarePlacement {
  type: 'hinge' | 'handle' | 'lock' | 'roller';
  position: Point;
  orientation: 'horizontal' | 'vertical';
  specifications: {
    model: string;
    loadCapacity?: number;
    egyptianStandard: boolean;
  };
}
```

### Structural Design System

```typescript
interface StructuralElement {
  type: 'mullion' | 'transom' | 'reinforcement';
  material: 'aluminum' | 'upvc';
  position: number;
  dimensions: {
    width: number;
    depth: number;
    height: number;
  };
  reinforcement?: {
    type: 'steel' | 'aluminum';
    dimensions: { width: number; height: number };
  };
}
```

---

## Next Steps

1. **Create Material-Aware Tool System**
2. **Implement Hardware Placement Tools**
3. **Add Structural Design Tools**
4. **Integrate with Existing Drafting Workbench**

---

**Reference:**
- `src/data/systemPacks.ts` - System pack definitions
- `src/data/upvc-systems.ts` - UPVC system specifications
- `src/lib/presets/ThermalBridgingAnalyzer.ts` - Thermal analysis
- `src/lib/3d/hardware/HardwareModelLibrary.ts` - Hardware models
- `src/lib/fabricator/bom/HardwareBOMCalculator.ts` - Hardware BOM

