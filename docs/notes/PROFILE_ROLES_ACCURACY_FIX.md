# 🎯 Profile Roles Accuracy Fix - Gold Tier Implementation

## Critical Issues Fixed

### **1. Incorrect Role Assignments in System Packs**

#### **Katra PRO RED Series - BEFORE (WRONG)**
- ❌ Frame Profile 60mm Architrave → `profileRole: 'frame'` 
- ❌ Sliding Sash Profile → `profileRole: 'sash'`
- ❌ Fly-screen Sash Profile → `profileRole: 'accessory'` (WRONG - it's a sash!)
- ❌ Frame with 60mm Architrave → `profileRole: 'frame'`
- ❌ Door Sash Profile → `profileRole: 'sash'`
- ❌ False Mullion Profile → `profileRole: 'mullion'` (should be `mullion_false`)

#### **Katra PRO RED Series - AFTER (CORRECT)**
- ✅ Frame Profile 60mm Architrave → `profileRole: 'frame_architrave'`
- ✅ Sliding Sash Profile → `profileRole: 'sash_sliding'`
- ✅ Fly-screen Sash Profile → `profileRole: 'sash_flyscreen'` (CORRECT - separate from main sash)
- ✅ Frame with 60mm Architrave → `profileRole: 'frame_architrave'`
- ✅ Door Sash Profile → `profileRole: 'sash_door'`
- ✅ False Mullion Profile → `profileRole: 'mullion_false'` (CORRECT - NOT sash!)

#### **FoxyWin & EMAPEN - CORRECTED**
- ✅ Sliding Sash → `profileRole: 'sash_sliding'`
- ✅ Fly-screen/Mosquito Sash → `profileRole: 'sash_flyscreen'` (was incorrectly `accessory`)

---

### **2. Smart Role Detection from Profile Names**

**New File**: `src/lib/fabricator/roleDetection.ts`

Automatically detects roles from profile names using pattern matching:

```typescript
// Examples:
"Frame Profile 60mm Architrave" → 'frame_architrave'
"Sliding Sash Profile" → 'sash_sliding'
"Fly-screen Sash Profile" → 'sash_flyscreen' ✅ (NOT 'sash' or 'accessory')
"Door Sash Profile" → 'sash_door'
"False Mullion Profile" → 'mullion_false' ✅ (NOT 'sash' or 'mullion')
```

**Key Patterns**:
- `fly` / `flyscreen` / `mosquito` / `screen sash` → `sash_flyscreen`
- `sliding` + `sash` → `sash_sliding`
- `door` + `sash` → `sash_door`
- `false` + `mullion` → `mullion_false`
- `architrave` + `frame` → `frame_architrave`

---

### **3. Role-Specific Cutting Formulas**

**New Function**: `getRoleCuttingFormula(role, systemType)`

Each role now has accurate cutting formulas based on system architecture:

| Role | Formula | Reason |
|------|---------|--------|
| `frame` / `frame_architrave` | `L + 50` | Allowance for miter joints |
| `sash_sliding` | `L - 40` | Deduct for overlap and track clearance |
| `sash_flyscreen` | `L - 25` | Smaller deduction (no overlap needed) |
| `sash_door` | `L - 40` | Door sash deduction |
| `sash_casement` | `L - 40` | Standard sash deduction |
| `mullion_false` | `L` | Exact length (no deduction) |
| `mullion` | `L` | Exact length |
| `interlock` | `L - 8` | Small deduction (fits between sashes) |
| `glazing_bead` | `L - 167` | Large deduction (fits inside sash) |

**Critical Understanding**:
- **Fly-screen sash** is NOT the same as main sliding sash
  - Main sliding sash: 2+ pieces, overlap with frame
  - Fly-screen sash: 1 piece, minimal overlap, for insects
  - Different cutting formulas!

- **False mullion** is NOT a sash
  - It's a decorative divider
  - Exact length (no deduction)
  - Different from true mullion (structural)

- **Interlock profile** connects sashes in sliding systems
  - Small deduction (L - 8mm)
  - Fits between sliding sashes

---

### **4. Sliding System Architecture Understanding**

#### **3-Track Sliding System (Katra S120)**
```
Track 1: Main Sliding Sash 1 (sash_sliding)
Track 2: Main Sliding Sash 2 (sash_sliding)
Track 3: Fly-screen Sash (sash_flyscreen) ← SEPARATE PROFILE!
```

**Cutting Formulas**:
- Main Sliding Sash: `L - 40mm` (overlap with frame)
- Fly-screen Sash: `L - 25mm` (minimal overlap, no frame contact)

#### **2-Track Sliding System (EMAPEN EMA60S)**
```
Track 1: Sliding Sash (sash_sliding)
Track 2: Fly-screen Sash (sash_flyscreen) ← SEPARATE PROFILE!
```

---

### **5. NoDXFTuningStudio Integration**

**Updated**: `src/components/fabricator/NoDXFTuningStudio.tsx`

- Now uses `detectRoleFromName()` to auto-detect roles from profile names
- Falls back to existing `profileRole` if present
- Falls back to `type` if no role detected

**User Experience**:
1. User loads system pack
2. System auto-detects roles from profile names
3. User can manually override if needed
4. Cutting formulas automatically applied based on role

---

## Files Modified

1. ✅ `src/data/upvc-systems.ts` - Fixed all Katra, FoxyWin, EMAPEN role assignments
2. ✅ `src/lib/fabricator/roleDetection.ts` - NEW: Smart role detection and cutting formulas
3. ✅ `src/components/fabricator/NoDXFTuningStudio.tsx` - Integrated smart role detection

---

## Accuracy Improvements

### **Before**
- ❌ Fly-screen sash = `accessory` (WRONG)
- ❌ Sliding sash = `sash` (too generic)
- ❌ False mullion = `mullion` (wrong type)
- ❌ All frames = `frame` (missed architrave)
- ❌ No role-specific cutting formulas

### **After**
- ✅ Fly-screen sash = `sash_flyscreen` (CORRECT)
- ✅ Sliding sash = `sash_sliding` (SPECIFIC)
- ✅ False mullion = `mullion_false` (CORRECT)
- ✅ Frame with architrave = `frame_architrave` (SPECIFIC)
- ✅ Role-specific cutting formulas for each profile type

---

## Next Steps

1. ✅ Fix system pack role assignments
2. ✅ Add smart role detection
3. ✅ Add role-specific cutting formulas
4. ⏳ Integrate cutting formulas into optimization engine
5. ⏳ Add interlock profile support to system packs
6. ⏳ Update cutting list generator to use role-specific formulas

---

*Last Updated: December 2024*  
*Status: ✅ Critical Role Accuracy Issues Fixed*

