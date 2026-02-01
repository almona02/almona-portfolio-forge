# High-Priority Machine Constraints Implementation

**Date:** January 2026  
**Status:** ✅ **COMPLETE**  
**AICS-001 Reference:** Section 4.3.3 (Machine Constraints)

---

## Executive Summary

Three high-priority, safety-critical machine constraints have been successfully added to the MachineConstraints system. These constraints are registered with the highest priorities (5, 10, 15) to ensure they are evaluated first during validation.

**Constraints Added:** 3  
**Total Machine Constraints:** 18 (up from 15)

---

## Implementation Details

### Files Modified

1. **`src/core/authority/validation_envelopes/MachineConstraints.ts`**
   - Added 3 new constraint definitions
   - Updated MachineValidationContext interface
   - Updated registerMachineConstraints() function
   - Updated MachineConstraints export object

2. **`src/tests/constitutional/ValidationEnvelopeIntegration.test.ts`**
   - Added Test 10: High-Priority Machine Constraints (7 test cases)

---

## Constraints Added

### 1. MACH-016: Maximum Stock Length (8000mm)

**Priority:** 5 (Highest Priority)  
**Rule ID:** AICS-001-4.3.3-16  
**Source:** FabricatorWorkflow.tsx:702

**Description:**
Global hard safety limit for profile stock length: 8000mm. Many regional suppliers use 6–7.5m bars; we cap all cutting calculations at 8000mm to prevent impossible cuts from being generated.

**Validation Logic:**
- Validates that `stockLength <= 8000`
- Passes if `stockLength` is not specified (optional field)

**Context Field:**
- `stockLength?: number` (mm) - Profile stock length

---

### 2. MACH-026: Clamp Zone Avoidance

**Priority:** 10 (High Priority)  
**Rule ID:** AICS-001-4.3.3-26  
**Source:** Machine safety profiles (yilmaz_alm_6510.json)

**Description:**
Cutting operations must not occur in clamp zones (safety-critical, collision prevention). Left clamp: X 0-200mm, Right clamp: X 6300-6500mm (for 6500mm machine).

**Validation Logic:**
- Validates that `clampZoneX` is NOT in left clamp zone (0-200mm)
- Validates that `clampZoneX` is NOT in right clamp zone (6300-6500mm)
- Passes if `clampZoneX` is not specified (optional field)

**Context Field:**
- `clampZoneX?: number` (mm) - X position for clamp zone validation

---

### 3. MACH-027: Rapid Safety Height (50mm)

**Priority:** 15 (High Priority)  
**Rule ID:** AICS-001-4.3.3-27  
**Source:** Collision detector (python_backend/core/kinematics/collision_detector.py:177)

**Description:**
Minimum height for rapid movements to avoid collisions: 50mm. Safety-critical constraint for collision prevention.

**Validation Logic:**
- Validates that `rapidHeight >= 50`
- Passes if `rapidHeight` is not specified (optional field)

**Context Field:**
- `rapidHeight?: number` (mm) - Height for rapid movements

---

## Priority Assignment

The three new constraints are registered with the highest priorities to ensure they are evaluated first:

1. **MACH-016:** Priority 5 (Highest)
2. **MACH-026:** Priority 10
3. **MACH-027:** Priority 15

All other machine constraints have been re-prioritized (shifted by +10) to maintain relative priority order:

- MACH-001: Priority 20 (was 10)
- MACH-002: Priority 30 (was 20)
- ... and so on
- MACH-015: Priority 160 (was 150)

---

## Integration Tests

### Test 10: High-Priority Machine Constraints (7 test cases)

1. **MACH-016: Maximum Stock Length constraint passes for valid stock length**
   - Tests stock length within limit (7500mm)
   - Verifies constraint passes

2. **MACH-016: Maximum Stock Length constraint fails for stock length exceeding limit**
   - Tests stock length exceeding limit (8500mm)
   - Verifies constraint fails and overall validation fails

3. **MACH-026: Clamp Zone Avoidance constraint passes for position outside clamp zones**
   - Tests X position outside clamp zones (3000mm)
   - Verifies constraint passes

4. **MACH-026: Clamp Zone Avoidance constraint fails for position in left clamp zone**
   - Tests X position in left clamp zone (100mm)
   - Verifies constraint fails and overall validation fails

5. **MACH-026: Clamp Zone Avoidance constraint fails for position in right clamp zone**
   - Tests X position in right clamp zone (6400mm)
   - Verifies constraint fails and overall validation fails

6. **MACH-027: Rapid Safety Height constraint passes for height >= 50mm**
   - Tests rapid height at 60mm (>= 50mm requirement)
   - Verifies constraint passes

7. **MACH-027: Rapid Safety Height constraint fails for height < 50mm**
   - Tests rapid height at 30mm (< 50mm requirement)
   - Verifies constraint fails and overall validation fails

---

## Machine Validation Context Updates

The `MachineValidationContext` interface has been extended with three new optional fields:

```typescript
export interface MachineValidationContext extends ValidationContext {
  // ... existing fields ...
  stockLength?: number; // mm - Profile stock length (for MACH-016)
  clampZoneX?: number; // mm - X position for clamp zone validation (for MACH-026)
  rapidHeight?: number; // mm - Height for rapid movements (for MACH-027)
}
```

---

## Constraint Registration Order

Constraints are now registered in priority order (lowest priority number = highest priority):

1. MACH-016: Priority 5
2. MACH-026: Priority 10
3. MACH-027: Priority 15
4. MACH-001: Priority 20
5. MACH-002: Priority 30
6. ... (existing constraints)
7. MACH-015: Priority 160

---

## AICS-001 Compliance

### Section 4.3.3 Requirements

✅ **Machine operating limits:** MACH-016 (Maximum Stock Length)  
✅ **Safety margins:** MACH-026 (Clamp Zone Avoidance), MACH-027 (Rapid Safety Height)  
✅ **All constraints are deterministic:** All three constraints have `deterministic: true`  
✅ **All constraints have explicit sources:** Source documented for each constraint

### Section 4.4 Compliance

✅ **Binary enforcement:** All constraints enforce binary compliance (pass/fail)  
✅ **Transparent evaluation:** All constraints provide clear error messages  
✅ **Priority-based evaluation:** High-priority constraints evaluated first

---

## Summary

**Status:** ✅ **COMPLETE**

- 3 high-priority machine constraints added
- All constraints follow AICS-001 Section 4.3.3 requirements
- Integration tests added (7 test cases)
- Total machine constraints: 18 (up from 15)
- Build successful with no linter errors

**Priority Assignment:**
- MACH-016: Priority 5 (Highest)
- MACH-026: Priority 10
- MACH-027: Priority 15

**AICS-001 Compliance:** ✅ **100%**

All three constraints are safety-critical and are now properly integrated into the ValidationEnvelope system with the highest priorities to ensure they are evaluated first.


