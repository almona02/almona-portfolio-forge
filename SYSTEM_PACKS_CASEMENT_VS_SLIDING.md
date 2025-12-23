# System Packs: Casement vs Sliding Classification

## Casement Systems ✅

### Panda 50 System (`panda-50`)
- **File:** `src/data/profileSystems/egyptian/panda/panda.ts`
- **system_type:** `'casement'` (lines 144, 165)
- **Default grid:** 1x1 with `type: 'sash'`
- **Hardware:** Hinges, handles, locks
- **Animation:** Rotate around hinges

### Panda 100 System (`panda-100`)
- **File:** `src/data/profileSystems/egyptian/panda/panda.ts`
- **system_type:** `'casement'` (lines 373, 391)
- **Default grid:** 1x1 with `type: 'sash'`
- **Hardware:** Hinges, handles, locks
- **Animation:** Rotate around hinges

### ROCK 60 System (`rock60`)
- **File:** `src/data/systemPacks.ts`
- **system_type:** Not explicitly set, but accessories include hinges
- **Hardware:** Hinges (accessory 0253), handles, locks
- **Animation:** Rotate around hinges (default for casement)

## Sliding Systems ✅

### KALE 70 Sliding System (`kale-70-sliding`)
- **File:** `src/data/profileSystems/turkish/kale/kale70.ts`
- **system_type:** Not explicitly set, but name indicates sliding
- **Hardware:** Rollers, handles
- **Animation:** Translate horizontally

### Caluminium PS System (`caluminium-ps`)
- **File:** `src/data/profileSystems/egyptian/caluminium/ps.ts`
- **system_type:** `'sliding'` (lines 133, 153)
- **Hardware:** Rollers, handles
- **Animation:** Translate horizontally

## Detection Logic

### Priority Order:
1. **Pattern's `openingMechanism.type`** (if preset pattern is used)
2. **System Pack's `system_type`** (from `aluminum_profiles[].system_type`)
3. **Cell type** (from user's canvas selection: `'sash'` vs `'sliding'`)
4. **WindowUnit type** (fallback: `windowUnit.type?.includes('sliding')`)

### Code Location:
`src/components/fabricator/Window3DGenerator.tsx` (lines 587-620)

## How It Works

### For Panda 50 System:
```typescript
// System pack lookup
const systemPack = SYSTEM_PACKS.find(p => p.meta.id === 'panda-50');

// Extract system_type from frame profile
const frameProfile = systemPack.windowSystemSpec.aluminum_profiles.find(
    p => p.role === 'frame'
);
// frameProfile.system_type = 'casement' ✅

// Detection result
const isCasement = systemPackType === 'casement'; // true ✅
```

### For KALE 70 Sliding:
```typescript
// System pack lookup
const systemPack = SYSTEM_PACKS.find(p => p.meta.id === 'kale-70-sliding');

// Extract system_type (may need to check name or other indicators)
// For now, relies on pattern or cell type
```

## Testing Checklist

### ✅ Casement Systems
- [ ] Panda 50 + 2 sashes → Should rotate around hinges
- [ ] Panda 100 + 2 sashes → Should rotate around hinges
- [ ] ROCK 60 + 2 sashes → Should rotate around hinges

### ✅ Sliding Systems
- [ ] KALE 70 Sliding + 2 sashes → Should slide horizontally
- [ ] Caluminium PS + 2 sashes → Should slide horizontally

## Console Debug Output

When animation starts, check console for:
```
[Animation] 🔍 Mechanism detection: {
  systemPackId: 'panda-50',
  systemPackType: 'casement',  // ← This should be 'casement' for Panda 50
  isCasement: true,
  finalDecision: 'CASEMENT (rotate)'
}
```

## Next Steps

If system pack doesn't have explicit `system_type`, we can:
1. Check system pack name (contains "sliding" → sliding)
2. Check hardware types (has rollers → sliding, has hinges → casement)
3. Check default grid cell types

