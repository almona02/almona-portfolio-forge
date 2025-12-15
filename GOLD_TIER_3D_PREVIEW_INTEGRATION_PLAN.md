# Gold Tier 3D Preview Integration Plan
## EngineeringBay + Window3DGenerator System Pack Integration

## Executive Summary

This plan ensures the 3D preview in EngineeringBay reflects **gold-tier accuracy** by properly connecting:
- System pack profiles (from `systemProfileSelections` and system pack `profiles` array)
- Glass/glazing components (using system pack `glassAllowances`)
- Hardware components (auto-connected based on window type/preset)
- Component relationships (frame → sash → glazing → hardware chain)

---

## Current State Analysis

### ✅ What Works
1. System pack selection updates `activeSystemPackId`
2. Grid layout can be applied from system pack `defaultGrid`
3. Basic profile selection in `generateComponentsFromGrid`
4. Glass calculations exist but don't use system pack rules

### ❌ What's Missing (Gold Tier Gaps)

1. **System Profile Selections Not Used**
   - `project.systemProfileSelections` exists but isn't used in component generation
   - System pack's `profiles` array isn't prioritized
   - Profile selection falls back to generic profiles instead of system pack profiles

2. **Glass Sizing Not System-Aware**
   - Glass dimensions calculated manually (sash opening - 2×profile width)
   - System pack's `glassAllowances` not used
   - No validation against system pack glass rules

3. **Hardware Not Auto-Connected**
   - Hardware array is empty or generic
   - No connection based on window type (sliding vs casement)
   - System pack hardware definitions not used

4. **Component Relationships Missing**
   - Frame → Sash → Glazing → Hardware chain not enforced
   - No validation that all required components are present
   - Missing components don't show warnings in 3D

---

## Gold Tier Integration Strategy

### Phase 1: System Pack Profile Integration

#### 1.1 Use `systemProfileSelections` from Project

**Current Code (EngineeringBay.tsx:77-82):**
```typescript
const { components, hardware } = generateComponentsFromGrid(
    project,
    currentGrid,
    profiles, // Pass available profiles for selection
    activeSystemPackId
);
```

**Enhanced Code:**
```typescript
// Get system pack profiles if available
const systemPack = activeSystemPackId 
  ? SYSTEM_PACKS.find(p => p.meta.id === activeSystemPackId)
  : null;

// Prioritize system pack profiles over generic profiles
const availableProfiles = useMemo(() => {
  if (!systemPack?.profiles || systemPack.profiles.length === 0) {
    return profiles; // Fallback to passed profiles
  }
  
  // Merge system pack profiles with passed profiles (system pack takes priority)
  const systemPackProfileIds = new Set(systemPack.profiles.map(p => p.id));
  const mergedProfiles = [
    ...systemPack.profiles, // System pack profiles first
    ...profiles.filter(p => !systemPackProfileIds.has(p.id)) // Add missing profiles
  ];
  
  return mergedProfiles;
}, [systemPack, profiles]);

// Use systemProfileSelections if available
const effectiveProfiles = useMemo(() => {
  if (!project?.systemProfileSelections || !systemPack) {
    return availableProfiles;
  }
  
  // Map systemProfileSelections to actual Profile objects
  const selectedProfiles: Profile[] = [];
  
  Object.entries(project.systemProfileSelections).forEach(([role, profileId]) => {
    const profile = availableProfiles.find(p => p.id === profileId);
    if (profile) {
      selectedProfiles.push(profile);
    } else {
      // Fallback: find by role in system pack
      const roleProfile = systemPack.profiles?.find(p => p.profileRole === role);
      if (roleProfile) {
        selectedProfiles.push(roleProfile);
      }
    }
  });
  
  // Add any missing required profiles from system pack
  const requiredRoles = ['frame', 'sash', 'glazing_bead'];
  requiredRoles.forEach(role => {
    if (!selectedProfiles.some(p => p.profileRole === role)) {
      const roleProfile = systemPack.profiles?.find(p => p.profileRole === role);
      if (roleProfile) {
        selectedProfiles.push(roleProfile);
      }
    }
  });
  
  return selectedProfiles.length > 0 ? selectedProfiles : availableProfiles;
}, [project?.systemProfileSelections, availableProfiles, systemPack]);

const { components, hardware } = generateComponentsFromGrid(
    project,
    currentGrid,
    effectiveProfiles, // Use system-aware profiles
    activeSystemPackId,
    systemPack // Pass system pack for glass allowances
);
```

#### 1.2 Update `generateComponentsFromGrid` to Accept System Pack

**File: `src/algorithms/smartDraw.ts`**

```typescript
export function generateComponentsFromGrid(
  project: WindowUnit | null,
  grid: WindowGrid,
  profiles: Profile[],
  systemPackId: string | null,
  systemPack?: SystemPack | null // NEW: Pass system pack
): { components: WindowComponent[]; hardware: any[] } {
  if (!project || !grid) {
    return { components: [], hardware: [] };
  }

  const components: WindowComponent[] = [];
  const hardware: any[] = [];

  // ENHANCED: Use systemProfileSelections if available
  const systemProfileSelections = project.systemProfileSelections || {};
  
  // Find profiles using systemProfileSelections first, then fallback
  const getProfileByRole = (role: string, fallbackRole?: string): Profile | null => {
    // 1. Try systemProfileSelections
    if (systemProfileSelections[role]) {
      const selectedProfile = profiles.find(p => p.id === systemProfileSelections[role]);
      if (selectedProfile) return selectedProfile;
    }
    
    // 2. Try system pack profiles
    if (systemPack?.profiles) {
      const systemProfile = systemPack.profiles.find(p => p.profileRole === role);
      if (systemProfile) {
        // Find matching profile in available profiles
        const matched = profiles.find(p => 
          p.id === systemProfile.id || 
          (p.name === systemProfile.name && p.profileRole === role)
        );
        if (matched) return matched;
      }
    }
    
    // 3. Fallback to generic search
    const found = profiles.find(p => 
      p.profileRole === role && 
      (!systemPackId || (p.systemPackIds && p.systemPackIds.includes(systemPackId)))
    );
    if (found) return found;
    
    // 4. Try fallback role
    if (fallbackRole) {
      return profiles.find(p => p.profileRole === fallbackRole) || null;
    }
    
    return null;
  };

  const frameProfile = getProfileByRole('frame') || profiles[0];
  const sashProfile = getProfileByRole('sash') || profiles.find(p => p.profileRole === 'sash') || profiles[0];
  const beadProfile = getProfileByRole('glazing_bead', 'bead');
  const mullionProfile = getProfileByRole('mullion', 'mullion_false');

  // ... rest of component generation logic
}
```

---

### Phase 2: Glass/Glazing System-Aware Sizing

#### 2.1 Use System Pack `glassAllowances`

**Current Issue:** Glass size calculated as `sash opening - 2×profile width`

**Gold Tier Solution:**

```typescript
// In generateComponentsFromGrid, when calculating glass dimensions:

// Get glass allowances from system pack
const glassAllowances = systemPack?.glassAllowances;

// Calculate glass size using system pack rules
const calculateGlassSize = (
  sashWidth: number,
  sashHeight: number,
  sashProfile: Profile
): { width: number; height: number } => {
  if (glassAllowances) {
    // Use system pack glass allowance rules
    // Example: { width: { left: 10, right: 10 }, height: { top: 10, bottom: 10 } }
    const widthDeduction = (glassAllowances.width?.left || 0) + (glassAllowances.width?.right || 0);
    const heightDeduction = (glassAllowances.height?.top || 0) + (glassAllowances.height?.bottom || 0);
    
    return {
      width: Math.max(0, sashWidth - widthDeduction),
      height: Math.max(0, sashHeight - heightDeduction)
    };
  } else {
    // Fallback: use profile width (current method)
    const profileWidth = sashProfile.width || 0;
    return {
      width: Math.max(0, sashWidth - (2 * profileWidth)),
      height: Math.max(0, sashHeight - (2 * profileWidth))
    };
  }
};

// Use in glass generation
const glassSize = calculateGlassSize(cellW, cellH, sashProfile);
const glassWidth = glassSize.width;
const glassHeight = glassSize.height;
```

#### 2.2 Add Glass Validation

```typescript
// Validate glass size against system pack constraints
const validateGlassSize = (
  glassWidth: number,
  glassHeight: number,
  systemPack: SystemPack | null
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!systemPack) return { valid: true, errors: [] };
  
  // Check minimum glass size
  if (systemPack.constraints?.minGlassWidthMm && glassWidth < systemPack.constraints.minGlassWidthMm) {
    errors.push(`Glass width ${glassWidth}mm is below minimum ${systemPack.constraints.minGlassWidthMm}mm`);
  }
  
  if (systemPack.constraints?.minGlassHeightMm && glassHeight < systemPack.constraints.minGlassHeightMm) {
    errors.push(`Glass height ${glassHeight}mm is below minimum ${systemPack.constraints.minGlassHeightMm}mm`);
  }
  
  // Check maximum glass size (if supported)
  if (systemPack.constraints?.maxGlassWidthMm && glassWidth > systemPack.constraints.maxGlassWidthMm) {
    errors.push(`Glass width ${glassWidth}mm exceeds maximum ${systemPack.constraints.maxGlassWidthMm}mm`);
  }
  
  return { valid: errors.length === 0, errors };
};
```

---

### Phase 3: Hardware Auto-Connection

#### 3.1 Connect Hardware Based on Window Type

**Create Hardware Connection Utility:**

```typescript
// File: src/lib/fabricator/hardwareConnector.ts

import { WindowUnit, WindowComponent } from '@/types/fabricator';
import { SystemPack } from '@/data/systemPacks';

export interface HardwareSpec {
  id: string;
  type: 'handle' | 'hinge' | 'lock' | 'roller' | 'gasket' | 'weather_strip' | 'reinforcement';
  name: string;
  quantity: number;
  position?: string;
  length?: number; // For gaskets, weather strips
  profileId?: string; // For reinforcement bars
}

export function connectHardwareForWindowType(
  windowUnit: WindowUnit,
  components: WindowComponent[],
  systemPack: SystemPack | null
): HardwareSpec[] {
  const hardware: HardwareSpec[] = [];
  
  if (!windowUnit || !components.length) return hardware;
  
  const windowType = windowUnit.type || 'casement';
  const hasSashes = components.some(c => c.type === 'sash');
  const sashCount = components.filter(c => c.type === 'sash').length;
  
  // Get hardware definitions from system pack
  const systemHardware = systemPack?.windowSystemSpec?.accessories_list || [];
  
  // Connect based on window type
  switch (windowType) {
    case 'sliding_window':
    case 'sliding_door':
      // Sliding windows need rollers and handles
      hardware.push({
        id: 'roller-1',
        type: 'roller',
        name: 'Sliding Roller',
        quantity: sashCount * 2, // 2 rollers per sash
      });
      
      hardware.push({
        id: 'handle-1',
        type: 'handle',
        name: 'Sliding Handle',
        quantity: sashCount,
      });
      
      // Add gaskets for sliding
      hardware.push({
        id: 'gasket-1',
        type: 'gasket',
        name: 'Sliding Gasket',
        quantity: sashCount * 4, // 4 sides per sash
        length: 1000, // Default length, will be calculated
      });
      break;
      
    case 'casement':
      // Casement windows need hinges and handles
      hardware.push({
        id: 'hinge-1',
        type: 'hinge',
        name: 'Casement Hinge',
        quantity: sashCount * 2, // 2 hinges per sash
      });
      
      hardware.push({
        id: 'handle-1',
        type: 'handle',
        name: 'Casement Handle',
        quantity: sashCount,
      });
      
      hardware.push({
        id: 'lock-1',
        type: 'lock',
        name: 'Casement Lock',
        quantity: sashCount,
      });
      break;
      
    case 'tilt_turn':
      // Tilt-turn needs special hardware
      hardware.push({
        id: 'tilt-turn-mechanism-1',
        type: 'hinge',
        name: 'Tilt-Turn Mechanism',
        quantity: sashCount,
      });
      
      hardware.push({
        id: 'handle-1',
        type: 'handle',
        name: 'Tilt-Turn Handle',
        quantity: sashCount,
      });
      break;
  }
  
  // Add reinforcement bars for large sashes
  components.forEach(comp => {
    if (comp.type === 'sash') {
      const sashArea = (comp.width * comp.height) / 1_000_000; // m²
      const maxSashArea = systemPack?.constraints?.maxSashAreaM2 || 2.0;
      
      if (sashArea > maxSashArea) {
        // Large sash needs reinforcement
        const frameProfile = components.find(c => c.type === 'frame' && c.profile);
        if (frameProfile?.profile) {
          hardware.push({
            id: `reinforcement-${comp.id}`,
            type: 'reinforcement',
            name: 'Sash Reinforcement Bar',
            quantity: 1,
            length: Math.max(comp.width, comp.height),
            profileId: frameProfile.profile.id,
          });
        }
      }
    }
  });
  
  // Add weather strips for all sashes
  if (hasSashes) {
    hardware.push({
      id: 'weather-strip-1',
      type: 'weather_strip',
      name: 'Weather Strip',
      quantity: sashCount * 4, // 4 sides per sash
      length: 1000, // Will be calculated from component dimensions
    });
  }
  
  return hardware;
}
```

#### 3.2 Integrate Hardware Connection in EngineeringBay

```typescript
// In EngineeringBay.tsx, update liveProject useMemo:

import { connectHardwareForWindowType } from '@/lib/fabricator/hardwareConnector';

const liveProject = useMemo<WindowUnit | null>(() => {
    if (!project) return null;

    // Generate components
    const { components, hardware: generatedHardware } = generateComponentsFromGrid(
        project,
        currentGrid,
        effectiveProfiles,
        activeSystemPackId,
        systemPack
    );
    
    // Get system pack for hardware connection
    const systemPack = activeSystemPackId 
      ? SYSTEM_PACKS.find(p => p.meta.id === activeSystemPackId)
      : null;
    
    // Auto-connect hardware based on window type
    const connectedHardware = connectHardwareForWindowType(
      { ...project, components },
      components,
      systemPack
    );
    
    // Merge generated hardware with connected hardware
    const allHardware = [
      ...generatedHardware,
      ...connectedHardware.map(hw => ({
        id: hw.id,
        name: hw.name,
        type: hw.type,
        quantity: hw.quantity,
        length: hw.length,
        profileId: hw.profileId,
        position: hw.position,
      }))
    ];

    return {
        ...project,
        grid: currentGrid,
        components,
        hardware: allHardware,
        systemPackId: activeSystemPackId,
        updatedAt: new Date(),
    };
}, [project, currentGrid, effectiveProfiles, activeSystemPackId, systemPack]);
```

---

### Phase 4: Component Relationship Validation

#### 4.1 Validate Component Chain

```typescript
// File: src/lib/fabricator/componentValidator.ts

export interface ComponentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingComponents: string[];
}

export function validateComponentChain(
  components: WindowComponent[],
  systemPack: SystemPack | null
): ComponentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingComponents: string[] = [];
  
  // Check required components
  const hasFrame = components.some(c => c.profile?.profileRole === 'frame');
  const hasSash = components.some(c => c.profile?.profileRole?.startsWith('sash'));
  const hasGlazingBead = components.some(c => c.profile?.profileRole === 'glazing_bead');
  
  if (!hasFrame) {
    errors.push('Missing frame profile');
    missingComponents.push('frame');
  }
  
  if (hasSash && !hasGlazingBead) {
    warnings.push('Sash detected but no glazing bead found');
    missingComponents.push('glazing_bead');
  }
  
  // Check system pack requirements
  if (systemPack?.profiles) {
    const requiredRoles = systemPack.profiles
      .filter(p => p.specifications?.required)
      .map(p => p.profileRole)
      .filter((role): role is string => !!role);
    
    requiredRoles.forEach(role => {
      if (!components.some(c => c.profile?.profileRole === role)) {
        warnings.push(`System pack requires ${role} profile but it's missing`);
        missingComponents.push(role);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    missingComponents,
  };
}
```

#### 4.2 Show Validation in 3D Preview

```typescript
// In Window3DGenerator, add validation display:

const validation = useMemo(() => {
  const designValidation = validateProjectWithConstraints(windowUnit, constraints);
  const componentValidation = validateComponentChain(
    windowUnit.components || [],
    systemPack
  );
  
  return {
    isValid: designValidation.isValid && componentValidation.isValid,
    errors: [
      ...designValidation.errors,
      ...componentValidation.errors,
    ],
    warnings: componentValidation.warnings,
    missingComponents: componentValidation.missingComponents,
  };
}, [windowUnit, constraints, systemPack]);
```

---

## Implementation Checklist

### Phase 1: System Pack Profile Integration
- [ ] Update `generateComponentsFromGrid` to accept `systemPack` parameter
- [ ] Use `systemProfileSelections` from project
- [ ] Prioritize system pack profiles over generic profiles
- [ ] Add profile fallback chain (systemProfileSelections → systemPack.profiles → generic)
- [ ] Test with various system packs

### Phase 2: Glass/Glazing System-Aware
- [ ] Extract `glassAllowances` from system pack
- [ ] Create `calculateGlassSize` function using system pack rules
- [ ] Update glass generation to use system-aware sizing
- [ ] Add glass size validation against system pack constraints
- [ ] Test with different glass allowance configurations

### Phase 3: Hardware Auto-Connection
- [ ] Create `hardwareConnector.ts` utility
- [ ] Implement hardware connection based on window type
- [ ] Connect hardware from system pack definitions
- [ ] Add reinforcement bars for large sashes
- [ ] Integrate hardware connection in EngineeringBay
- [ ] Test with sliding, casement, tilt-turn windows

### Phase 4: Component Validation
- [ ] Create `componentValidator.ts` utility
- [ ] Validate component chain (frame → sash → glazing → hardware)
- [ ] Check system pack requirements
- [ ] Display validation in 3D preview
- [ ] Add warnings for missing optional components

### Phase 5: Testing & Validation
- [ ] Test with ROCK 60 system pack
- [ ] Test with UPVC systems (FoxyWin, Caluminium)
- [ ] Test with Egyptian systems (Katra, EMAPEN)
- [ ] Verify glass sizing accuracy
- [ ] Verify hardware connections
- [ ] Verify 3D preview accuracy

---

## Expected Outcomes

### Gold Tier Accuracy
1. **Profile Selection**: 100% accurate - uses system pack profiles and user selections
2. **Glass Sizing**: System-aware - follows system pack `glassAllowances` rules
3. **Hardware Connection**: Auto-connected based on window type and system pack
4. **Component Chain**: Validated - all required components present
5. **3D Preview**: Accurate - reflects all connected components

### User Experience
- No manual profile selection needed (uses system pack)
- Glass dimensions automatically calculated correctly
- Hardware automatically connected
- Validation warnings for missing components
- 3D preview shows complete, accurate window

---

## Files to Modify

1. `src/components/fabricator/EngineeringBay.tsx`
   - Update `liveProject` useMemo
   - Add system pack profile prioritization
   - Integrate hardware connection

2. `src/algorithms/smartDraw.ts`
   - Update `generateComponentsFromGrid` signature
   - Use `systemProfileSelections`
   - Use system pack `glassAllowances`

3. `src/lib/fabricator/hardwareConnector.ts` (NEW)
   - Hardware connection logic

4. `src/lib/fabricator/componentValidator.ts` (NEW)
   - Component chain validation

5. `src/components/fabricator/Window3DGenerator.tsx`
   - Display component validation warnings
   - Show missing components in 3D

---

## Testing Strategy

### Unit Tests
- Test profile selection with systemProfileSelections
- Test glass sizing with different glassAllowances
- Test hardware connection for each window type
- Test component validation

### Integration Tests
- Test full flow: system pack selection → component generation → 3D preview
- Test with real system packs (ROCK 60, FoxyWin, etc.)
- Test edge cases (missing profiles, invalid glass sizes)

### Visual Tests
- Verify 3D preview shows all components
- Verify glass dimensions match calculations
- Verify hardware appears in correct positions

---

## Notes

- All changes should be backward compatible
- Fallback to current behavior if system pack data is missing
- Performance: Profile selection should be memoized
- Error handling: Graceful degradation if system pack data is invalid

