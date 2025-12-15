# Gold Tier 3D Preview - Simple Implementation Approach

## Quick Summary

The 3D preview in EngineeringBay needs to properly connect:
1. **Profiles** from system pack (not generic fallbacks)
2. **Glass** sized using system pack rules (not manual calculations)
3. **Hardware** auto-connected based on window type (not empty arrays)

---

## The Problem (Current State)

```typescript
// ❌ Current: Uses generic profiles, manual glass sizing, no hardware
const { components, hardware } = generateComponentsFromGrid(
    project,
    currentGrid,
    profiles, // Generic profiles, not system pack specific
    activeSystemPackId // Only used for filtering, not for selection
);
// hardware is usually empty []
// Glass size = sash opening - 2×profile width (not system-aware)
```

---

## The Solution (Gold Tier)

### Step 1: Use System Pack Profiles (5 minutes)

**In EngineeringBay.tsx, update the `liveProject` useMemo:**

```typescript
const liveProject = useMemo<WindowUnit | null>(() => {
    if (!project) return null;

    // ✅ Get system pack
    const systemPack = activeSystemPackId 
      ? SYSTEM_PACKS.find(p => p.meta.id === activeSystemPackId)
      : null;
    
    // ✅ Prioritize system pack profiles
    const effectiveProfiles = useMemo(() => {
      if (systemPack?.profiles && systemPack.profiles.length > 0) {
        // Merge: system pack profiles first, then add missing from passed profiles
        const systemIds = new Set(systemPack.profiles.map(p => p.id));
        return [
          ...systemPack.profiles,
          ...profiles.filter(p => !systemIds.has(p.id))
        ];
      }
      return profiles;
    }, [systemPack, profiles]);
    
    // ✅ Use systemProfileSelections if available
    if (project.systemProfileSelections && systemPack) {
      Object.entries(project.systemProfileSelections).forEach(([role, profileId]) => {
        const selected = effectiveProfiles.find(p => p.id === profileId);
        if (selected) {
          // Ensure this profile is used for this role
          selected.profileRole = role;
        }
      });
    }

    const { components, hardware } = generateComponentsFromGrid(
        project,
        currentGrid,
        effectiveProfiles, // ✅ Use system pack profiles
        activeSystemPackId,
        systemPack // ✅ Pass system pack for glass allowances
    );

    return {
        ...project,
        grid: currentGrid,
        components,
        hardware,
        systemPackId: activeSystemPackId,
        updatedAt: new Date(),
    };
}, [project, currentGrid, profiles, activeSystemPackId]);
```

### Step 2: Fix Glass Sizing (10 minutes)

**In `src/algorithms/smartDraw.ts`, update `generateComponentsFromGrid`:**

```typescript
export function generateComponentsFromGrid(
  project: WindowUnit | null,
  grid: WindowGrid,
  profiles: Profile[],
  systemPackId: string | null,
  systemPack?: SystemPack | null // ✅ Add system pack parameter
): { components: WindowComponent[]; hardware: any[] } {
  // ... existing code ...

  // ✅ Use system pack glass allowances
  const glassAllowances = systemPack?.glassAllowances;
  
  // When calculating glass size for sashes:
  grid.cells.forEach(cell => {
    if (cell.type === 'sash' || cell.type === 'sliding') {
      // ... existing sash generation ...
      
      // ✅ Calculate glass size using system pack rules
      let glassWidth: number;
      let glassHeight: number;
      
      if (glassAllowances) {
        // Use system pack rules (e.g., L - 167, H - 167 for ROCK 60)
        const widthDeduction = (glassAllowances.width?.left || 0) + (glassAllowances.width?.right || 0);
        const heightDeduction = (glassAllowances.height?.top || 0) + (glassAllowances.height?.bottom || 0);
        glassWidth = Math.max(0, cellW - widthDeduction);
        glassHeight = Math.max(0, cellH - heightDeduction);
      } else {
        // Fallback: current method
        const profileWidth = sashProfile.width || 0;
        glassWidth = Math.max(0, cellW - (2 * profileWidth));
        glassHeight = Math.max(0, cellH - (2 * profileWidth));
      }
      
      // ... rest of glass generation ...
    }
  });
}
```

### Step 3: Auto-Connect Hardware (15 minutes)

**Create `src/lib/fabricator/hardwareConnector.ts`:**

```typescript
import { WindowUnit, WindowComponent } from '@/types/fabricator';
import { SystemPack } from '@/data/systemPacks';

export function connectHardwareForWindowType(
  windowUnit: WindowUnit,
  components: WindowComponent[],
  systemPack: SystemPack | null
): any[] {
  const hardware: any[] = [];
  const windowType = windowUnit.type || 'casement';
  const sashCount = components.filter(c => c.type === 'sash').length;
  
  // Sliding windows
  if (windowType.includes('sliding')) {
    hardware.push(
      { id: 'roller-1', name: 'Sliding Roller', type: 'roller', quantity: sashCount * 2 },
      { id: 'handle-1', name: 'Sliding Handle', type: 'handle', quantity: sashCount },
      { id: 'gasket-1', name: 'Sliding Gasket', type: 'gasket', quantity: sashCount * 4 }
    );
  }
  
  // Casement windows
  if (windowType === 'casement') {
    hardware.push(
      { id: 'hinge-1', name: 'Casement Hinge', type: 'hinge', quantity: sashCount * 2 },
      { id: 'handle-1', name: 'Casement Handle', type: 'handle', quantity: sashCount },
      { id: 'lock-1', name: 'Casement Lock', type: 'lock', quantity: sashCount }
    );
  }
  
  // Add reinforcement for large sashes
  components.forEach(comp => {
    if (comp.type === 'sash') {
      const area = (comp.width * comp.height) / 1_000_000; // m²
      if (area > 2.0) { // Large sash
        hardware.push({
          id: `reinforcement-${comp.id}`,
          name: 'Reinforcement Bar',
          type: 'reinforcement',
          quantity: 1,
          length: Math.max(comp.width, comp.height)
        });
      }
    }
  });
  
  return hardware;
}
```

**In EngineeringBay.tsx, add hardware connection:**

```typescript
import { connectHardwareForWindowType } from '@/lib/fabricator/hardwareConnector';

const liveProject = useMemo<WindowUnit | null>(() => {
    // ... existing code ...
    
    const { components, hardware: generatedHardware } = generateComponentsFromGrid(...);
    
    // ✅ Auto-connect hardware
    const systemPack = activeSystemPackId 
      ? SYSTEM_PACKS.find(p => p.meta.id === activeSystemPackId)
      : null;
    
    const connectedHardware = connectHardwareForWindowType(
      { ...project, components },
      components,
      systemPack
    );
    
    return {
        ...project,
        components,
        hardware: [...generatedHardware, ...connectedHardware], // ✅ Merge hardware
        // ...
    };
}, [project, currentGrid, profiles, activeSystemPackId]);
```

---

## Quick Test Checklist

After implementation, verify:

1. **Profile Selection**
   - [ ] Select ROCK 60 system pack
   - [ ] Check BOM shows ROCK 60 profiles (not generic)
   - [ ] Verify frame/sash profiles match system pack

2. **Glass Sizing**
   - [ ] Create a sash window
   - [ ] Check glass dimensions in BOM
   - [ ] Verify glass size follows system pack rules (e.g., L-167, H-167 for ROCK 60)

3. **Hardware Connection**
   - [ ] Create sliding window → should have rollers + handle
   - [ ] Create casement window → should have hinges + handle + lock
   - [ ] Check hardware appears in BOM

4. **3D Preview**
   - [ ] Verify 3D shows correct profiles
   - [ ] Verify glass appears in sashes
   - [ ] Verify hardware appears (if 3D models exist)

---

## Files to Modify (Summary)

1. **EngineeringBay.tsx** (3 changes)
   - Use system pack profiles
   - Pass system pack to generateComponentsFromGrid
   - Connect hardware

2. **smartDraw.ts** (1 change)
   - Accept system pack parameter
   - Use glassAllowances for glass sizing

3. **hardwareConnector.ts** (NEW)
   - Auto-connect hardware based on window type

**Total: ~30 minutes of focused work**

---

## Why This Approach Works

1. **Simple**: Only 3 files, minimal changes
2. **Backward Compatible**: Falls back to current behavior if system pack missing
3. **Gold Tier**: Uses system pack data when available
4. **Testable**: Easy to verify with existing system packs

---

## Next Steps (Optional Enhancements)

After basic implementation works:

1. Add component validation (warn if required profiles missing)
2. Add hardware 3D models (visualize hardware in preview)
3. Add glass validation (warn if glass too large/small)
4. Add system pack requirements check

But start with the 3 steps above - they give you 90% of gold tier accuracy!

