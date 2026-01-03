# Prestige UX Implementation Guide

## Philosophy

> **"ALMONA isn't just software. It's an industrial authority."**

The selection experience should feel like choosing the Rolls-Royce of fabrication systems, not picking parts from a catalog.

## Constitutional Compliance

✅ **All prestige components maintain constitutional guarantees:**
- Full audit trail for every selection
- Rule-based recommendations (no ML)
- Deterministic matching logic
- Tier 0 separation preserved

## Components

### 1. MaterialGallery

**Purpose**: Replace boring dropdowns with luxurious material selection

**Usage**:
```typescript
import { MaterialGallery, MaterialOption } from './prestige';

const materials: MaterialOption[] = [
  {
    id: 'aluminum',
    name: 'aluminum',
    title: 'Aerospace-Grade Aluminum',
    description: 'For architectural excellence',
    features: ['Corrosion resistant', 'Structural integrity', 'Premium finish'],
    applications: ['Luxury villas', 'Commercial buildings', 'Government projects'],
    priceTier: 'Premium',
    badge: 'Industrial Grade'
  },
  // ...
];

<MaterialGallery
  materials={materials}
  selectedMaterial={selectedMaterial}
  onSelect={handleSelect}
  recommendedFor="Luxury villa projects"
/>
```

**Constitutional Features**:
- ✅ Audit logging on selection
- ✅ Rule-based recommendations
- ✅ No ML/confidence scores

### 2. SystemAuthorityCard

**Purpose**: "Establish Authority" not "Select System"

**Usage**:
```typescript
import { SystemAuthorityCard, SystemAuthority } from './prestige';

const system: SystemAuthority = {
  id: 'caluminium_ps_v3',
  name: 'caluminium_ps_v3',
  title: 'Caluminium PS v3 Authority',
  description: 'Complete fabrication authority for high-end architectural projects',
  badge: 'Industrial Grade',
  capabilities: [
    { label: 'Maximum span', value: '6m' },
    { label: 'Wind load', value: 'Class 5' },
    // ...
  ],
  recommendedFor: ['Luxury villas', 'Government buildings'],
  selectLabel: 'Establish Authority'
};

<SystemAuthorityCard
  system={system}
  selected={selectedSystem === system.id}
  onSelect={handleSelect}
  recommendationReason="Recommended for projects requiring Class 5 wind load"
/>
```

**Constitutional Features**:
- ✅ Action logged as `system_authority_established` (not "selected")
- ✅ Rule-based recommendation reasons
- ✅ Full audit trail

### 3. PresetIntelligencePanel

**Purpose**: "Apply Intelligence" not "Select Template"

**Usage**:
```typescript
import { PresetIntelligencePanel, PresetIntelligence } from './prestige';

const presets: PresetIntelligence[] = [
  {
    id: 'egyptian_luxury_villa',
    title: 'Egyptian Luxury Villa Authority',
    description: 'Optimized for luxury residential projects',
    applications: ['Main facade windows', 'Garden view openings'],
    systemRecommendation: 'Caluminium PS v3',
    materialRecommendation: 'Aerospace Aluminum',
    optimization: 'Maximum light, premium finish',
    selectCount: 'Used in 47 similar projects',
    ruleBasedReason: 'Matches your system/material selection'
  },
  // ...
];

<PresetIntelligencePanel
  presets={presets}
  selectedPreset={selectedPreset}
  onSelect={handleSelect}
  currentSystem={currentSystem}
  currentMaterial={currentMaterial}
/>
```

**Constitutional Features**:
- ✅ Deterministic matching (no ML)
- ✅ Rule-based recommendations
- ✅ Full audit trail

## Prestige Language

### ❌ Avoid (CAD-like)
- "Select system"
- "Choose material"
- "Pick template"
- "Configuration"

### ✅ Use (Authority-like)
- "Establish Authority"
- "Choose Your Foundation"
- "Apply Intelligence"
- "Commission Fabrication"

## Visual Design Principles

### 1. Luxury Interactions
- Smooth transitions (300ms cubic-bezier)
- Hover effects (translateY, shadow)
- Selection animations
- Prestige color palette (amber/gold accents)

### 2. Information Hierarchy
- Clear visual hierarchy
- Badge system for status
- Capability displays
- Application contexts

### 3. Trust Building
- Certification badges
- Testimonials/proof
- Usage statistics
- Recommendation reasons

## Rule-Based Recommendations

### Material Recommendations
```typescript
// Deterministic rules (no ML)
function recommendMaterial(context: string): string {
  if (context.includes('luxury') || context.includes('villa')) {
    return 'aluminum'; // Premium tier
  }
  if (context.includes('residential') || context.includes('budget')) {
    return 'upvc'; // Value tier
  }
  return 'aluminum'; // Default
}
```

### System Recommendations
```typescript
// Rule-based matching
function recommendSystem(material: string, projectType: string): string {
  if (material === 'aluminum' && projectType === 'commercial') {
    return 'caluminium_ps_v3'; // Industrial grade
  }
  if (material === 'upvc' && projectType === 'residential') {
    return 'egyptian_standard_45'; // Market optimized
  }
  return 'caluminium_ps_v3'; // Default
}
```

### Preset Matching
```typescript
// Deterministic preset matching
function getMatchingPresets(
  system: string,
  material: string,
  presets: PresetIntelligence[]
): PresetIntelligence[] {
  return presets.filter(preset => {
    // Exact string matching (deterministic)
    return preset.systemRecommendation.toLowerCase().includes(system.toLowerCase()) ||
           preset.materialRecommendation.toLowerCase().includes(material.toLowerCase());
  });
}
```

## Audit Trail

All prestige selections are logged:

```typescript
// Material selection
logDraftingAction(
  'material_selected',
  { previousMaterial, newMaterial, recommendationContext },
  { materialId },
  `CHECKPOINT-MATERIAL-SELECT-${timestamp}`
);

// System authority establishment
logDraftingAction(
  'system_authority_established',
  { systemId, systemName, recommendationReason },
  { systemId },
  `CHECKPOINT-SYSTEM-AUTHORITY-${timestamp}`
);

// Preset intelligence application
logDraftingAction(
  'preset_intelligence_applied',
  { presetId, presetTitle, currentSystem, currentMaterial, ruleBasedReason },
  { presetId },
  `CHECKPOINT-PRESET-INTELLIGENCE-${timestamp}`
);
```

## Integration Example

```typescript
import { 
  MaterialGallery, 
  SystemAuthorityCard, 
  PresetIntelligencePanel 
} from '@/components/fabricator/drafting/prestige';

export const PrestigeSelectionFlow: React.FC = () => {
  const [material, setMaterial] = useState<string>();
  const [system, setSystem] = useState<string>();
  const [preset, setPreset] = useState<string>();

  return (
    <div className="space-y-12">
      {/* Tier 1: Material Foundation */}
      <MaterialGallery
        materials={MATERIALS}
        selectedMaterial={material}
        onSelect={setMaterial}
        recommendedFor={getMaterialRecommendation()}
      />

      {/* Tier 2: System Authority */}
      {material && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SYSTEMS.map(sys => (
            <SystemAuthorityCard
              key={sys.id}
              system={sys}
              selected={system === sys.id}
              onSelect={setSystem}
              recommendationReason={getSystemRecommendationReason(material, sys)}
            />
          ))}
        </div>
      )}

      {/* Tier 3: Preset Intelligence */}
      {material && system && (
        <PresetIntelligencePanel
          presets={PRESETS}
          selectedPreset={preset}
          onSelect={setPreset}
          currentSystem={system}
          currentMaterial={material}
        />
      )}
    </div>
  );
};
```

## Next Steps

1. ✅ Prestige components created
2. 🔄 Integrate into EngineeringBay
3. 📋 Add 3D visualizations (using existing Window3DGenerator)
4. 📋 Add micro-interactions
5. 📋 Add loading states with prestige branding

## Constitutional Verification

Run tests to verify compliance:
```bash
npm test -- src/components/fabricator/drafting/__tests__/ConstitutionalCompliance.test.ts
```

All prestige components maintain:
- ✅ Tier 0 separation
- ✅ No execution logic
- ✅ Full audit trail
- ✅ Deterministic recommendations

