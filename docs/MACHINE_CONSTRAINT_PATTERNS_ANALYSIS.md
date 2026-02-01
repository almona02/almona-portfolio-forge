# Machine Constraint Patterns Analysis

**Date:** January 2026  
**Purpose:** Identify additional machine constraint patterns for registration  
**Status:** ✅ **ANALYSIS COMPLETE**

---

## Executive Summary

This analysis searched the codebase for machine constraint implementations to identify additional constraint patterns that can be registered with the ValidationEnvelope system.

**Search Results:**
- ✅ Found 8-10 additional machine constraint patterns
- ✅ Patterns span multiple code areas (algorithms, CNC integration, machine configs)
- ✅ Some patterns are already registered (15 constraints)
- ✅ Additional patterns identified for future registration

---

## 1. Search Methodology

### Search Patterns Used

1. **Direct Pattern Matching:**
   - `maxCuttingLength`, `toolReach`, `axisLimit`, `safetyMargin`
   - `machine.*limit`, `machine.*constraint`, `machine.*maximum`, `machine.*minimum`
   - `CNC.*constraint`, `CNC.*limit`, `CNC.*specification`

2. **File Scope:**
   - `src/algorithms/*.ts` - Optimization algorithms
   - `src/lib/fabricator/*.ts` - Fabrication logic
   - `src/integrations/cnc/` - CNC integration code
   - `src/lib/machines/` - Machine configuration files
   - `python_backend/services/cnc/` - Python CNC services

---

## 2. Identified Machine Constraint Patterns

### 2.1 Already Registered (15 Constraints)

These patterns are already implemented in `MachineConstraints.ts`:

| Pattern | Constraint ID | Status |
|---------|---------------|--------|
| Maximum Cutting Length (6000mm) | MACH-001 | ✅ Registered |
| Maximum Safe Cutting Length (6500mm) | MACH-002 | ✅ Registered |
| Tool Reach Limit (300mm) | MACH-003 | ✅ Registered |
| X-Axis Travel Limit (6000mm) | MACH-004 | ✅ Registered |
| Y-Axis Travel Limit (3000mm) | MACH-005 | ✅ Registered |
| Z-Axis Travel Limit (300mm) | MACH-006 | ✅ Registered |
| Safety Margin Requirement (50mm) | MACH-007 | ✅ Registered |
| Profile Width/Height Limits | MACH-008 to MACH-011 | ✅ Registered |
| Operation Type Support | MACH-012 | ✅ Registered |
| Minimum Cutting Length (50mm) | MACH-013 | ✅ Registered |
| Combined Axis Travel Limit | MACH-014 | ✅ Registered |
| Tool Reach vs Z-Axis Compatibility | MACH-015 | ✅ Registered |

---

### 2.2 Additional Patterns Found (8-10 Patterns)

#### Pattern 1: Maximum Stock Length

**Location:** `src/pages/FabricatorWorkflow.tsx:702`
```typescript
const MAX_STOCK_LENGTH_MM = 8000;
```

**Description:** Global hard safety limit for profile stock length (many regional suppliers use 6–7.5m bars; cap at 8000mm to prevent impossible cuts).

**Constraint Pattern:**
- **ID:** MACH-016 (suggested)
- **Type:** Maximum stock length limit
- **Value:** 8000mm
- **Priority:** High (safety-critical)

---

#### Pattern 2: Machine-Specific Maximum Lengths (Varied)

**Locations:**
- `src/integrations/cnc/ElumatecCNC.ts:15` - `maxLength: 7000` (7 meters)
- `src/integrations/cnc/HomagCNC.ts:15` - `maxLength: 8000` (8 meters)
- `src/integrations/yilmaz/YilmazGCodeGenerator.ts:89` - ALM-6510: `maxLength: 6500`
- `src/integrations/yilmaz/YilmazGCodeGenerator.ts:104` - ALM-7510: `maxLength: 7500`

**Description:** Machine-specific maximum cutting lengths vary by machine model.

**Constraint Pattern:**
- **ID:** MACH-017 (suggested)
- **Type:** Machine-model-specific maximum length
- **Values:** 6500mm (ALM-6510), 7000mm (Elumatec), 7500mm (ALM-7510), 8000mm (Homag)
- **Priority:** Medium (machine-specific)

**Note:** This could be handled through machine-specific constraint sets rather than a single constraint.

---

#### Pattern 3: Machine-Specific Maximum Widths

**Locations:**
- `src/integrations/cnc/ElumatecCNC.ts:16` - `maxWidth: 2500` (2.5 meters)
- `src/integrations/cnc/HomagCNC.ts:16` - `maxWidth: 4000` (4 meters)
- `src/integrations/yilmaz/YilmazGCodeGenerator.ts:90` - ALM-6510: `maxWidth: 400`

**Description:** Machine-specific maximum widths for panel/profile processing.

**Constraint Pattern:**
- **ID:** MACH-018 (suggested)
- **Type:** Machine-model-specific maximum width
- **Values:** 400mm (ALM-6510), 2500mm (Elumatec), 4000mm (Homag)
- **Priority:** Medium (machine-specific)

---

#### Pattern 4: Machine-Specific Maximum Heights

**Locations:**
- `src/integrations/cnc/ElumatecCNC.ts:17` - `maxHeight: 250` (250mm)
- `src/integrations/cnc/HomagCNC.ts:17` - `maxHeight: 300` (300mm)
- `src/integrations/yilmaz/YilmazGCodeGenerator.ts:91` - ALM-6510: `maxHeight: 200`

**Description:** Machine-specific maximum heights for profile processing.

**Constraint Pattern:**
- **ID:** MACH-019 (suggested)
- **Type:** Machine-model-specific maximum height
- **Values:** 200mm (ALM-6510), 250mm (Elumatec), 300mm (Homag)
- **Priority:** Medium (machine-specific)

---

#### Pattern 5: Minimum Cut Length (Machine-Specific)

**Locations:**
- `src/integrations/cnc/ElumatecCNC.ts:20` - `minCutLength: 50` (50mm)
- `src/integrations/cnc/HomagCNC.ts:20` - `minCutLength: 100` (100mm)
- `src/integrations/yilmaz/YilmazGCodeGenerator.ts:93` - ALM-6510: `minCutLength: 50`

**Description:** Machine-specific minimum cut lengths (varies by machine type).

**Constraint Pattern:**
- **ID:** MACH-020 (suggested)
- **Type:** Machine-model-specific minimum cut length
- **Values:** 50mm (Elumatec, ALM-6510), 100mm (Homag)
- **Priority:** Medium (machine-specific)

**Note:** MACH-013 already covers standard 50mm minimum, but machine-specific values could be added.

---

#### Pattern 6: Precision Limits

**Locations:**
- `src/integrations/cnc/ElumatecCNC.ts:22` - `precision: 0.1` (0.1mm)
- `src/integrations/cnc/HomagCNC.ts:22` - `precision: 0.05` (0.05mm)
- `src/integrations/yilmaz/YilmazGCodeGenerator.ts:98` - ALM-6510: `precision: 0.1`

**Description:** Machine-specific precision/accuracy limits.

**Constraint Pattern:**
- **ID:** MACH-021 (suggested)
- **Type:** Precision limit (machine-specific)
- **Values:** 0.05mm (Homag), 0.1mm (Elumatec, ALM-6510)
- **Priority:** Low (validation, not rejection)
- **Note:** Precision is typically a validation/advisory constraint, not a hard rejection constraint.

---

#### Pattern 7: Maximum Spindle Speed

**Locations:**
- `src/integrations/yilmaz/YilmazGCodeGenerator.ts:99` - ALM-6510: `maxSpindleSpeed: 24000` (RPM)
- `src/lib/machines/AIM3410MachineSet.ts:28` - AIM-3410: `maxSpindleSpeed: 24,000 RPM`
- `src/lib/machines/ALM6510MachineSet.ts:27` - ALM-6510: `maxSpindleSpeed: 12,000 RPM`
- `python_backend/core/kinematics/collision_detector.py` - Machine constraints (not specified)

**Description:** Maximum spindle speed limits (varies by machine).

**Constraint Pattern:**
- **ID:** MACH-022 (suggested)
- **Type:** Maximum spindle speed limit
- **Values:** 12,000 RPM (ALM-6510), 24,000 RPM (AIM-3410)
- **Priority:** Medium (machine-specific)

---

#### Pattern 8: Maximum Feed Rate

**Locations:**
- `src/integrations/yilmaz/YilmazGCodeGenerator.ts:100` - ALM-6510: `maxFeedRate: 5000` (mm/min)
- `src/lib/machines/AIM3410MachineSet.ts:40-43` - AIM-3410: `feedRates: { x: 60 m/min, y: 50 m/min, z: 50 m/min }`
- `src/integrations/cnc/ElumatecCNC.ts:23` - `cuttingSpeed: 10000` (10 m/min = 10,000 mm/min)
- `src/integrations/cnc/HomagCNC.ts:23` - `cuttingSpeed: 15000` (15 m/min = 15,000 mm/min)

**Description:** Maximum feed rate/cutting speed limits (varies by machine and axis).

**Constraint Pattern:**
- **ID:** MACH-023 (suggested)
- **Type:** Maximum feed rate limit (axis-specific)
- **Values:** 5,000-15,000 mm/min (varies by machine and axis)
- **Priority:** Medium (machine-specific, axis-specific)

---

#### Pattern 9: Tool Magazine Capacity

**Locations:**
- `src/integrations/yilmaz/YilmazGCodeGenerator.ts:97` - ALM-6510: `toolMagazineCapacity: 20`
- `src/integrations/yilmaz/YilmazGCodeGenerator.ts:82` - AIM-7510: `toolMagazineCapacity: 16`
- `src/lib/machines/AIM3410MachineSet.ts:34` - AIM-3410: `toolCapacity: 8` (7 cutters + 1 saw blade)
- `src/integrations/cnc/CNCController.ts` - `tool_changer_capacity` (abstract interface)

**Description:** Maximum number of tools that can be held in tool magazine.

**Constraint Pattern:**
- **ID:** MACH-024 (suggested)
- **Type:** Tool magazine capacity limit
- **Values:** 8-20 tools (varies by machine)
- **Priority:** Low (operational constraint, not geometric/material)

**Note:** This is more of an operational/planning constraint than a geometric constraint.

---

#### Pattern 10: Maximum Tool Weight/Diameter

**Locations:**
- `src/lib/machines/AIM3410MachineSet.ts:36` - AIM-3410: `maxSawDiameter: 180 mm`
- `src/lib/machines/AIM3410MachineSet.ts:37` - AIM-3410: `maxToolWeight: 3 kg`
- `python_backend/core/kinematics/collision_detector.py:170` - `tool_diameter: float = 10.0`
- `python_backend/core/kinematics/collision_detector.py:171` - `tool_length: float = 50.0`

**Description:** Maximum tool dimensions and weight limits.

**Constraint Pattern:**
- **ID:** MACH-025 (suggested)
- **Type:** Tool dimension/weight limits
- **Values:** 
  - Max saw diameter: 180mm (AIM-3410)
  - Max tool weight: 3kg (AIM-3410)
  - Tool diameter: 10mm (standard)
  - Tool length: 50mm (standard)
- **Priority:** Medium (tool-specific)

---

#### Pattern 11: Clamp Zone Constraints

**Locations:**
- `src/lib/machines/ALM6510MachineSet.ts` - Clamp zones defined
- `python_backend/core/kinematics/collision_detector.py:164-167` - Clamp configuration
- `src/data/safety_profiles/yilmaz_alm_6510.json` - Clamp zones: X 0-200mm, X 6300-6500mm

**Description:** Clamp zones where cutting operations cannot occur.

**Constraint Pattern:**
- **ID:** MACH-026 (suggested)
- **Type:** Clamp zone avoidance
- **Values:** 
  - Left clamp: X 0-200mm
  - Right clamp: X 6300-6500mm (for 6500mm machine)
- **Priority:** High (safety-critical, collision prevention)

---

#### Pattern 12: Rapid Safety Height

**Locations:**
- `python_backend/core/kinematics/collision_detector.py:177` - `rapid_safety_height: float = 50.0`
- Machine safety envelope configurations

**Description:** Minimum height for rapid movements to avoid collisions.

**Constraint Pattern:**
- **ID:** MACH-027 (suggested)
- **Type:** Rapid safety height requirement
- **Values:** 50mm (standard)
- **Priority:** High (safety-critical)

---

## 3. Recommended Additional Constraints

### High Priority (Safety-Critical)

1. **MACH-016: Maximum Stock Length (8000mm)**
   - **Source:** `FabricatorWorkflow.tsx`
   - **Rationale:** Global safety limit to prevent impossible cuts
   - **Priority:** High

2. **MACH-026: Clamp Zone Avoidance**
   - **Source:** Machine safety profiles, collision detector
   - **Rationale:** Safety-critical, prevents collisions
   - **Priority:** High

3. **MACH-027: Rapid Safety Height (50mm)**
   - **Source:** Collision detector
   - **Rationale:** Safety-critical, collision prevention
   - **Priority:** High

### Medium Priority (Machine-Specific)

4. **MACH-022: Maximum Spindle Speed**
   - **Source:** Machine specifications
   - **Rationale:** Machine capability limit
   - **Priority:** Medium

5. **MACH-023: Maximum Feed Rate (Axis-Specific)**
   - **Source:** Machine specifications
   - **Rationale:** Machine capability limit
   - **Priority:** Medium

6. **MACH-025: Tool Dimension/Weight Limits**
   - **Source:** Machine specifications
   - **Rationale:** Tool compatibility validation
   - **Priority:** Medium

### Low Priority (Operational/Advisory)

7. **MACH-021: Precision Limits**
   - **Source:** Machine specifications
   - **Rationale:** Validation/advisory, not rejection constraint
   - **Priority:** Low

8. **MACH-024: Tool Magazine Capacity**
   - **Source:** Machine specifications
   - **Rationale:** Operational planning constraint, not geometric/material
   - **Priority:** Low

### Not Recommended (Machine-Specific Variations)

- **MACH-017 to MACH-020:** Machine-specific maximum lengths/widths/heights/minimum cuts
  - **Rationale:** These are machine-model-specific and should be handled through machine-specific constraint sets, not generic constraints
  - **Alternative:** Use machine-specific constraint registration or machine profile validation

---

## 4. Implementation Recommendations

### Recommended Constraints to Add (5-7 constraints)

1. **MACH-016: Maximum Stock Length (8000mm)** ✅ High Priority
2. **MACH-026: Clamp Zone Avoidance** ✅ High Priority
3. **MACH-027: Rapid Safety Height (50mm)** ✅ High Priority
4. **MACH-022: Maximum Spindle Speed** ✅ Medium Priority
5. **MACH-023: Maximum Feed Rate** ✅ Medium Priority
6. **MACH-025: Tool Dimension/Weight Limits** ✅ Medium Priority

**Total Recommended:** 6 additional constraints

### Implementation Notes

1. **Machine-Specific Constraints:**
   - Consider machine-specific constraint sets rather than generic constraints
   - Use machine profile validation for model-specific limits
   - Generic constraints should represent standard/common limits

2. **Safety-Critical Constraints:**
   - MACH-016, MACH-026, MACH-027 are safety-critical
   - Should be registered with high priority (low priority number)
   - Should fail loudly (non-negotiable)

3. **Operational Constraints:**
   - Tool magazine capacity, precision limits are operational
   - Consider if these belong in Process constraints category instead
   - Precision limits may be advisory rather than rejection constraints

---

## 5. Summary

### Patterns Found

- **Total Patterns Identified:** 12 additional patterns
- **Already Registered:** 15 constraints (covered standard patterns)
- **Recommended to Add:** 6 constraints (high/medium priority)
- **Not Recommended:** 6 patterns (machine-specific variations, operational constraints)

### Next Steps

1. **Implement High Priority Constraints:**
   - MACH-016: Maximum Stock Length
   - MACH-026: Clamp Zone Avoidance
   - MACH-027: Rapid Safety Height

2. **Implement Medium Priority Constraints:**
   - MACH-022: Maximum Spindle Speed
   - MACH-023: Maximum Feed Rate
   - MACH-025: Tool Dimension/Weight Limits

3. **Consider Machine-Specific Constraint Sets:**
   - Create machine profile-specific constraint registration
   - Handle machine-model variations through profiles

---

**Analysis Status:** ✅ **COMPLETE**  
**Recommendations:** 6 additional constraints (3 high priority, 3 medium priority)  
**Implementation Priority:** High for safety-critical constraints


