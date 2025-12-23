# System Pack Mechanism Detection - Complete Fix

## Issue
Panda 50 System (casement) was being detected as sliding, causing incorrect animation.

## Root Cause Analysis

### System Pack Structure
System packs define `system_type` in their profile definitions:
- **Panda 50**: `system_type: 'casement'` (lines 144, 165 in panda.ts)
- **KALE 70 Sliding**: `system_type: 'sliding'` (in kale70.ts)
- **Caluminium PS**: `system_type: 'sliding'` (in ps.ts)

### Detection Priority (NEW)
1. **Pattern's `openingMechanism.type`** (if preset pattern is used)
2. **System Pack's `system_type`** (from `aluminum_profiles[].system_type`)
3. **Cell type** (from user's canvas selection)
4. **WindowUnit type** (fallback)

## Fix Applied

### Code Changes
```typescript
// Get system pack from windowUnit.systemPackId
const systemPack = windowUnit.systemPackId 
    ? SYSTEM_PACKS.find(p => p.meta.id === windowUnit.systemPackId)
    : null;

// Extract system_type from system pack's aluminum_profiles
let systemPackType: 'casement' | 'sliding' | null = null;
if (systemPack?.windowSystemSpec?.aluminum_profiles) {
    const frameProfile = systemPack.windowSystemSpec.aluminum_profiles.find(
        (p: any) => p.role === 'frame'
    );
    if (frameProfile?.system_type) {
        systemPackType = frameProfile.system_type === 'casement' ? 'casement' :
                        frameProfile.system_type === 'sliding' ? 'sliding' : null;
    }
}

// Priority detection
const isSliding = patternMechanism === 'sliding' || 
                 systemPackType === 'sliding' ||
                 (cell?.type === 'sliding' || windowUnit.type?.includes('sliding'));

const isCasement = patternMechanism === 'casement' ||
                  systemPackType === 'casement' ||
                  (!isSliding && (cell?.type === 'sash' || windowUnit.type?.includes('casement')));
```

## System Pack Classification

### Casement Systems ✅
- **Panda 50** (`panda-50`): `system_type: 'casement'`
- **Panda 100** (`panda-100`): `system_type: 'casement'`
- **ROCK 60** (`rock60`): Typically casement (has hinges in accessories)

### Sliding Systems ✅
- **KALE 70 Sliding** (`kale-70-sliding`): `system_type: 'sliding'`
- **Caluminium PS** (`caluminium-ps`): `system_type: 'sliding'`

### Mixed Systems
- Some systems support both (depends on pattern/configuration)

## Testing

### Test Case 1: Panda 50 + 2 Sashes (No Pattern)
1. Select "Panda 50 System"
2. Draw 2 sashes on canvas (no preset pattern)
3. Click Play
4. **Expected:** System pack detection → `systemPackType: 'casement'` → CASEMENT animation
5. **Console:** Should show `systemPackType: 'casement'`

### Test Case 2: Panda 50 + Casement Pattern
1. Select "Panda 50 System"
2. Select "2 Sash Casements" pattern
3. Click Play
4. **Expected:** Pattern detection → `patternMechanism: 'casement'` → CASEMENT animation
5. **Console:** Should show `patternMechanism: 'casement'`

### Test Case 3: KALE 70 Sliding + 2 Sashes
1. Select "KALE 70 Sliding System"
2. Draw 2 sashes on canvas
3. Click Play
4. **Expected:** System pack detection → `systemPackType: 'sliding'` → SLIDING animation
5. **Console:** Should show `systemPackType: 'sliding'`

## Expected Console Output

### For Panda 50 (Casement):
```
[Animation] 🔍 Mechanism detection: {
  patternMechanism: 'none',
  patternId: 'none',
  systemPackId: 'panda-50',
  systemPackType: 'casement',  // ← KEY: From system pack!
  systemPackName: 'Panda 50 System',
  cellType: 'sash',
  isCasement: true,
  finalDecision: 'CASEMENT (rotate)'
}
```

### For KALE 70 Sliding:
```
[Animation] 🔍 Mechanism detection: {
  systemPackId: 'kale-70-sliding',
  systemPackType: 'sliding',  // ← KEY: From system pack!
  isSliding: true,
  finalDecision: 'SLIDING (translate)'
}
```

## Files Modified

- `src/components/fabricator/Window3DGenerator.tsx`
  - Line 89: Added `SYSTEM_PACKS` import
  - Line 587-620: Enhanced mechanism detection with system pack check

## Key Insight

**System packs are the source of truth for mechanism type** - even if the user draws sashes manually, the system pack's `system_type` tells us whether it's casement or sliding. This is more reliable than cell type alone.

