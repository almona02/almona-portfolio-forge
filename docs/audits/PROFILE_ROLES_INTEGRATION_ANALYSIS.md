# Profile Roles Integration Analysis & Recommendations

## Executive Summary

This document analyzes:
1. **Files not wired to UI** - Components and utilities that exist but aren't connected to user interfaces
2. **Profile Roles Learning** - How the system learns profile roles (e.g., "Glazing Bead (Standard)")
3. **Cut List Generator Integration** - How profile roles should integrate with cutting list generation
4. **Visualizer Integration** - How profile roles should integrate with visualization
5. **Unit Preset Profile Gathering** - Ensuring optimization considers ALL profiles, not just frame profiles

---

## 1. Files Not Wired to UI

### 🔴 Critical Missing Connections

#### A. Tuning Components (Partially Wired)
- ✅ **TuningWorkbench.tsx** - Wired to route `/tuning-workbench`
- ✅ **ValidationSandbox.tsx** - Used in TuningWorkbench
- ✅ **RoleManager.tsx** - Used in TuningWorkbench
- ⚠️ **MicronParameterPanel.tsx** - Used in TuningWorkbench but may need standalone route
- ❌ **NoDXFTuningStudio.tsx** - Wired but may need better integration with main workflow

#### B. Profile Role Utilities (Not Fully Utilized)
- ⚠️ **`src/lib/fabricator/profileRoleUtils.ts`** - Has role definitions but not used in all cut list generators
- ⚠️ **`src/lib/fabricator/roleDetection.ts`** - Has role detection logic but not consistently applied
- ❌ **`src/lib/fabricator/systemTuningUtils.ts`** - Utility functions not exposed in UI

#### C. Material Specs (Data Only)
- ⚠️ **`src/data/supplierProfiles/materialSpecs.ts`** - Data definitions but no UI to view/edit
- ❌ **`src/hooks/useMaalemEngines.ts`** - Used in MaalemDashboard but optimization only considers frame profiles

#### D. Cut List Generators (Partially Integrated)
- ✅ **`src/lib/fabricator/CuttingListGenerator.ts`** - Basic implementation, only handles frame/sash/bead
- ⚠️ **`src/lib/reports/CuttingListGenerator.ts`** - Report generator but doesn't group by all profile roles
- ❌ **`src/lib/fabricator/MicronOptimizationEngine.ts`** - Advanced engine but only handles basic roles

### 📋 Recommendations for Missing UI Connections

1. **Create Profile Role Management UI**
   - Add route `/fabricator/profile-roles` to manage role assignments
   - Integrate `profileRoleUtils.ts` into a visual role editor
   - Show role categories (frame, sash, structural, glazing, accessory)

2. **Enhance Cut List Generator UI**
   - Show ALL profile roles in cut list (not just frame/sash)
   - Group cuts by role category in visualizer
   - Add role-based filtering in cut list reports

3. **Material Specs Viewer**
   - Create UI to view/edit material specifications
   - Connect `materialSpecs.ts` to profile management

---

## 2. Profile Roles Learning from UI

### Current Implementation

The system learns profile roles from:

1. **NoDXFTuningStudio.tsx** (Lines 437-483)
   ```typescript
   <SelectItem value="glazing_bead">Glazing Bead (Standard)</SelectItem>
   <SelectItem value="glazing_bead_inner">Glazing Bead (Inner)</SelectItem>
   <SelectItem value="glazing_bead_outer">Glazing Bead (Outer)</SelectItem>
   ```

2. **RoleManager.tsx** - Imports DXF and assigns roles via RoleTagger

3. **SmartMeasuringInterface.tsx** (Lines 347-358)
   - Dynamically generates role options from system pack profiles
   - Filters profiles by `profileRole === 'glazing_bead'`

4. **Role Detection** (`src/lib/fabricator/roleDetection.ts`)
   - Auto-detects roles from profile names
   - Uses pattern matching (e.g., "bead" → `glazing_bead`)

### How AI/ML Should Learn Profile Roles

**Current State:**
- ✅ Role definitions exist in `Profile['profileRole']` type (25+ roles)
- ✅ Role detection from names (`detectRoleFromName`)
- ✅ UI selectors show all roles
- ❌ **Missing**: ML model to learn role patterns from user selections

**Recommended ML Learning Approach:**

1. **Collect Training Data**
   - Track user role selections in NoDXFTuningStudio
   - Store profile name → role mappings
   - Include context: system pack, profile dimensions, material type

2. **Feature Engineering**
   - Profile name patterns (e.g., "bead", "glazing", "sash")
   - Profile dimensions (width/height ratios)
   - System pack context
   - Material type (aluminum vs UPVC)

3. **Model Training**
   - Use existing `CalibrationLearner.ts` as template
   - Train classifier: `Profile → ProfileRole`
   - Confidence scoring for role suggestions

4. **Integration Points**
   - Auto-suggest roles in RoleTagger
   - Validate role assignments in ValidationSandbox
   - Learn from corrections (user changes role → update model)

---

## 3. Cut List Generator Integration

### Current State Analysis

**`src/lib/fabricator/CuttingListGenerator.ts`** (Lines 16-200):
- ✅ Generates cuts for frame (4 pieces)
- ✅ Generates cuts for sash (4 pieces)
- ✅ Generates cuts for beads (4 pieces) - **BUT only if `includeBeads !== false`**
- ❌ **Missing**: Other profile roles (mullion, transom, interlock, etc.)
- ❌ **Missing**: Role-based cutting formulas from `roleDetection.ts`

**`src/lib/fabricator/OptimizationEngine.ts`** (Lines 73-164):
- ✅ Handles basic roles: `'frame' | 'sash' | 'mullion' | 'transom' | 'bead' | 'screen_sash'`
- ❌ **Missing**: All 25+ profile roles
- ❌ **Missing**: Role-specific cutting formulas

### Required Integration

#### A. Expand Cut Generation to All Roles

```typescript
// Current (only frame/sash/bead)
generateCuttingListFromSystemPack(systemPackId, width, height, { includeBeads: true })

// Required (all profiles from unit preset)
generateCuttingListFromUnitPreset(unitPreset: WindowUnit, systemPack: SystemPack): Cut[]
```

**Implementation Steps:**

1. **Gather ALL Profiles from Unit Preset**
   ```typescript
   function gatherAllProfilesFromUnit(unit: WindowUnit, systemPack: SystemPack): Profile[] {
     const profiles: Profile[] = [];
     
     // Frame profiles (all variants)
     profiles.push(...systemPack.profiles.filter(p => 
       p.profileRole?.startsWith('frame') || 
       p.profileRole === 'architrave' || 
       p.profileRole === 'threshold' || 
       p.profileRole === 'sill' || 
       p.profileRole === 'head' || 
       p.profileRole === 'jamb'
     ));
     
     // Sash profiles (all variants)
     profiles.push(...systemPack.profiles.filter(p => 
       p.profileRole?.startsWith('sash') || 
       p.profileRole === 'screen_sash'
     ));
     
     // Structural profiles
     profiles.push(...systemPack.profiles.filter(p => 
       p.profileRole === 'mullion' || 
       p.profileRole === 'mullion_false' || 
       p.profileRole === 'transom' || 
       p.profileRole === 'reinforcement' || 
       p.profileRole === 'corner_cleat'
     ));
     
     // Glazing profiles
     profiles.push(...systemPack.profiles.filter(p => 
       p.profileRole?.startsWith('glazing_bead')
     ));
     
     // Accessory profiles
     profiles.push(...systemPack.profiles.filter(p => 
       p.profileRole === 'interlock' || 
       p.profileRole === 'accessory' || 
       p.profileRole === 'screen_adapter' || 
       p.profileRole === 'panel' || 
       p.profileRole === 'gasket' || 
       p.profileRole === 'weather_strip'
     ));
     
     return profiles;
   }
   ```

2. **Apply Role-Specific Cutting Formulas**
   ```typescript
   import { getRoleCuttingFormula } from '@/lib/fabricator/roleDetection';
   
   function calculateCutLength(role: ProfileRole, dimension: number, systemType?: string): number {
     const formula = getRoleCuttingFormula(role, systemType);
     // Parse formula: "L + 50", "L - 167", etc.
     return parseCuttingFormula(formula, dimension);
   }
   ```

3. **Generate Cuts for Each Profile Role**
   ```typescript
   function generateCutsForProfile(
     profile: Profile, 
     unit: WindowUnit, 
     systemPack: SystemPack
   ): Cut[] {
     const role = profile.profileRole || 'frame';
     const cuts: Cut[] = [];
     
     // Use role-specific logic
     switch (role) {
       case 'glazing_bead':
       case 'glazing_bead_inner':
       case 'glazing_bead_outer':
         // Glazing beads: 4 pieces (2 horizontal, 2 vertical)
         const beadLength = calculateCutLength(role, unit.overallWidth, systemPack.systemType);
         const beadHeight = calculateCutLength(role, unit.overallHeight, systemPack.systemType);
         cuts.push(
           { id: 'bead-h1', label: 'Bead Horizontal 1', plannedLength: beadLength, role, profileId: profile.id, quantity: 1 },
           { id: 'bead-h2', label: 'Bead Horizontal 2', plannedLength: beadLength, role, profileId: profile.id, quantity: 1 },
           { id: 'bead-v1', label: 'Bead Vertical 1', plannedLength: beadHeight, role, profileId: profile.id, quantity: 1 },
           { id: 'bead-v2', label: 'Bead Vertical 2', plannedLength: beadHeight, role, profileId: profile.id, quantity: 1 }
         );
         break;
       
       case 'mullion':
       case 'mullion_false':
         // Mullions: vertical dividers
         const mullionHeight = calculateCutLength(role, unit.overallHeight, systemPack.systemType);
         cuts.push({ id: 'mullion', label: 'Mullion', plannedLength: mullionHeight, role, profileId: profile.id, quantity: unit.mullions?.length || 0 });
         break;
       
       case 'transom':
         // Transoms: horizontal dividers
         const transomWidth = calculateCutLength(role, unit.overallWidth, systemPack.systemType);
         cuts.push({ id: 'transom', label: 'Transom', plannedLength: transomWidth, role, profileId: profile.id, quantity: unit.transoms?.length || 0 });
         break;
       
       // ... handle all 25+ roles
     }
     
     return cuts;
   }
   ```

#### B. Update Optimization Engine

**Current:** `OptimizationEngine.ts` only handles 6 roles
**Required:** Handle all 25+ roles with role-specific logic

```typescript
// Update Cut interface
export interface Cut {
  id: string;
  label: string;
  plannedLength: number;
  role: Profile['profileRole']; // Expand from 6 to 25+ roles
  profileId: string;
  quantity: number;
  // Add role-specific metadata
  cuttingFormula?: string; // e.g., "L - 167"
  requiresMiter?: boolean; // Frame roles need 45° miter
  requiresWelding?: boolean; // UPVC profiles need welding
}
```

---

## 4. Visualizer Integration

### Current State

**`src/modules/reporting/CuttingListReport.tsx`** (Lines 396-430):
- ✅ Groups cuts by role category (frame, sash, structural, glazing, accessory)
- ✅ Visualizes cuts in diagrams
- ⚠️ **Partial**: Only shows roles that exist in cuts, doesn't show all available roles

**`src/components/fabricator/CutSimulationViewer.tsx`**:
- ✅ Shows 2D visualization of cuts
- ❌ **Missing**: Role-based color coding
- ❌ **Missing**: Role legend/filtering

### Required Integration

#### A. Role-Based Visualization

```typescript
// Color scheme by role category
const ROLE_COLORS = {
  frame: '#3B82F6',      // Blue
  sash: '#10B981',       // Green
  structural: '#F59E0B', // Orange
  glazing: '#8B5CF6',    // Purple
  accessory: '#6B7280'    // Gray
};

function getRoleColor(role: ProfileRole): string {
  const category = getRoleCategory(role); // From profileRoleUtils.ts
  return ROLE_COLORS[category] || '#6B7280';
}
```

#### B. Enhanced Cut List Report

Update `CuttingListReport.tsx` to:
1. Show ALL profile roles in unit preset (even if quantity = 0)
2. Group by role category with collapsible sections
3. Show role-specific cutting formulas
4. Visual indicators for role types

#### C. Visualizer Filters

Add role-based filtering:
- Filter by role category (Frame, Sash, Structural, Glazing, Accessory)
- Filter by specific role (e.g., "Show only glazing_bead")
- Highlight selected roles in visualization

---

## 5. Unit Preset Profile Gathering

### Current Problem

**`useMaalemEngines.ts`** (Lines 125-140):
```typescript
// ❌ ONLY considers frame profiles
const frameCuts = [
  { length: dims.width + 50, quantity: 2 * inputs.count },
  { length: dims.height + 50, quantity: 2 * inputs.count }
];
setOptimization({
  cutsByProfile: [{
    profileId: 'frame',
    profileName: systemConfig.category === 'aluminum' ? 'Hulk (Frame)' : 'Frame Profile',
    // ... only frame cuts
  }]
});
```

**Issue:** Optimization only considers frame profiles, ignoring:
- Glazing beads
- Mullions/transoms
- Interlocks
- Accessories
- Other sash variants

### Required Solution

#### A. Gather ALL Profiles from System Pack

```typescript
function gatherAllProfilesForUnit(
  systemPack: SystemPack, 
  unit: WindowUnit
): { profile: Profile; requiredCuts: Cut[] }[] {
  const profilesWithCuts: Array<{ profile: Profile; requiredCuts: Cut[] }> = [];
  
  // 1. Frame profiles (required)
  const frameProfiles = systemPack.profiles.filter(p => 
    p.profileRole === 'frame' || 
    p.profileRole === 'frame_architrave' ||
    p.profileRole === 'architrave' ||
    p.profileRole === 'threshold' ||
    p.profileRole === 'sill' ||
    p.profileRole === 'head' ||
    p.profileRole === 'jamb'
  );
  
  frameProfiles.forEach(profile => {
    profilesWithCuts.push({
      profile,
      requiredCuts: generateFrameCuts(profile, unit)
    });
  });
  
  // 2. Sash profiles (required)
  const sashProfiles = systemPack.profiles.filter(p => 
    p.profileRole?.startsWith('sash') || 
    p.profileRole === 'screen_sash'
  );
  
  sashProfiles.forEach(profile => {
    profilesWithCuts.push({
      profile,
      requiredCuts: generateSashCuts(profile, unit)
    });
  });
  
  // 3. Glazing bead profiles (required for glazed units)
  if (unit.glazingType !== 'none') {
    const beadProfiles = systemPack.profiles.filter(p => 
      p.profileRole?.startsWith('glazing_bead')
    );
    
    beadProfiles.forEach(profile => {
      profilesWithCuts.push({
        profile,
        requiredCuts: generateBeadCuts(profile, unit)
      });
    });
  }
  
  // 4. Structural profiles (if unit has mullions/transoms)
  if (unit.mullions && unit.mullions.length > 0) {
    const mullionProfiles = systemPack.profiles.filter(p => 
      p.profileRole === 'mullion' || 
      p.profileRole === 'mullion_false'
    );
    
    mullionProfiles.forEach(profile => {
      profilesWithCuts.push({
        profile,
        requiredCuts: generateMullionCuts(profile, unit)
      });
    });
  }
  
  if (unit.transoms && unit.transoms.length > 0) {
    const transomProfiles = systemPack.profiles.filter(p => 
      p.profileRole === 'transom'
    );
    
    transomProfiles.forEach(profile => {
      profilesWithCuts.push({
        profile,
        requiredCuts: generateTransomCuts(profile, unit)
      });
    });
  }
  
  // 5. Accessory profiles (interlocks, adapters, etc.)
  const accessoryProfiles = systemPack.profiles.filter(p => 
    p.profileRole === 'interlock' || 
    p.profileRole === 'screen_adapter' ||
    p.profileRole === 'accessory'
  );
  
  accessoryProfiles.forEach(profile => {
    profilesWithCuts.push({
      profile,
      requiredCuts: generateAccessoryCuts(profile, unit)
    });
  });
  
  return profilesWithCuts;
}
```

#### B. Update Optimization to Use All Profiles

```typescript
// In useMaalemEngines.ts or OptimizationEngine.ts
const allProfilesWithCuts = gatherAllProfilesForUnit(systemPack, unit);

// Aggregate all cuts by profile
const cutsByProfile = allProfilesWithCuts.map(({ profile, requiredCuts }) => ({
  profileId: profile.id,
  profileName: profile.name,
  profileRole: profile.profileRole,
  barsNeeded: calculateBarsNeeded(requiredCuts, profile),
  cutCount: requiredCuts.length,
  cuts: requiredCuts
}));

setOptimization({
  cutsByProfile,
  wastePercentage: calculateWastePercentage(cutsByProfile),
  totalBars: cutsByProfile.reduce((sum, p) => sum + p.barsNeeded, 0),
  totalWaste: calculateTotalWaste(cutsByProfile)
});
```

---

## 6. Implementation Priority

### Phase 1: Critical (Immediate)
1. ✅ Update `CuttingListGenerator.ts` to gather ALL profiles from unit preset
2. ✅ Apply role-specific cutting formulas from `roleDetection.ts`
3. ✅ Update `OptimizationEngine.ts` to handle all 25+ roles
4. ✅ Fix `useMaalemEngines.ts` to consider all profiles, not just frame

### Phase 2: High Priority (Next Sprint)
1. ✅ Enhance `CuttingListReport.tsx` to show all profile roles
2. ✅ Add role-based color coding to visualizer
3. ✅ Create profile role management UI
4. ✅ Add role-based filtering to cut list reports

### Phase 3: ML Enhancement (Future)
1. ✅ Implement ML model to learn role patterns
2. ✅ Auto-suggest roles in RoleTagger
3. ✅ Validate role assignments with confidence scores

---

## 7. Key Takeaways

1. **Profile Roles Are Defined** - 25+ roles exist in type system
2. **Cut List Generator Is Incomplete** - Only handles frame/sash/bead, missing 20+ roles
3. **Optimization Is Limited** - Only considers frame profiles, ignores glazing beads, mullions, etc.
4. **Visualizer Needs Enhancement** - Should show all roles with color coding
5. **Unit Preset Must Gather ALL Profiles** - Not just frame, but glazing beads, mullions, transoms, interlocks, accessories

**Critical Fix:** Update optimization to gather and optimize ALL profiles from unit preset, not just frame profiles.

