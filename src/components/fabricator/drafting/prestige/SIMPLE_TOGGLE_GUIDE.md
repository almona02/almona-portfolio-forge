# Simple Toggle Approach - Speed by Default, Story on Demand

## Philosophy

> **"Workshops want speed. Architects want story. Give them speed by default, story on demand."**

## The Solution

**One interface, one toggle:**

- **Default (Simple)**: Basic info, fast selection
- **Toggle On (Detailed)**: Architectural narrative, testimonials, certifications

## How It Works

### Default View (Workshop-Friendly)
```typescript
<ArchitecturalPresetSelector
  presets={SIMPLE_PRESETS}
  selectedPreset={selectedPreset}
  onSelect={handleSelect}
  defaultShowDetails={false} // Simple by default
/>
```

**Shows:**
- ✅ Title: "Standard 2x2 Grid"
- ✅ Description: "Perfect for standard apartments..."
- ✅ Applications: Simple list
- ✅ System/Material: Basic info
- ✅ Complexity: Basic/Moderate/Advanced

**Hides:**
- ❌ Architectural narrative
- ❌ Design principles
- ❌ Testimonials
- ❌ Certifications

### Detailed View (Architect-Friendly)
```typescript
// User clicks "Show Details" toggle
<ArchitecturalPresetSelector
  presets={SIMPLE_PRESETS}
  selectedPreset={selectedPreset}
  onSelect={handleSelect}
  defaultShowDetails={true} // Or set from user preferences
/>
```

**Shows Everything:**
- ✅ Title: "Standard 2x2 Grid" (same)
- ✅ Description: "Perfect for standard apartments..." (same)
- ✅ **PLUS Architectural Narrative**: "Balanced facade composition..."
- ✅ **PLUS Design Principles**: List of principles
- ✅ **PLUS Testimonials**: "Used in 200+ projects..."
- ✅ **PLUS Certifications**: Badges and approvals
- ✅ **PLUS Optimization Details**: Full optimization description

## User Experience

### Workshop Owner (2-3 people)
1. Opens preset selector
2. Sees simple view (default)
3. Never touches toggle
4. Selects pattern quickly
5. Gets back to work

**Time to selection: 15 seconds**

### Architect
1. Opens preset selector
2. Sees simple view (default)
3. Clicks "Show Details" toggle
4. Sees full architectural narrative
5. Selects with confidence
6. Toggle stays on (saved in preferences)

**Time to selection: 30 seconds (first time), 15 seconds (after toggle saved)**

## Implementation

### Component
```typescript
import { ArchitecturalPresetSelector, SIMPLE_PRESETS } from '@/components/fabricator/drafting/prestige';

<ArchitecturalPresetSelector
  presets={SIMPLE_PRESETS}
  selectedPreset={selectedPreset}
  onSelect={handleSelect}
  defaultShowDetails={userPreferences.showArchitecturalDetails} // From user settings
/>
```

### Preset Data Structure
```typescript
{
  id: 'standard_residential_2x2',
  
  // Always shown
  title: 'Standard 2x2 Grid',
  description: 'Perfect for standard apartments...',
  icon: '🏠',
  complexity: 'Basic',
  intelligence: {
    gridPattern: '2x2 symmetrical',
    systemRecommendation: 'Egyptian Standard 45',
    materialRecommendation: 'UPVC',
    optimization: 'Standard residential openings...'
  },
  applications: ['Standard apartments', 'Budget renovations'],
  pricingTier: 'Local',
  
  // Only shown when showDetails = true
  architecturalDetails: {
    narrative: 'Balanced facade composition...',
    architecturalStyle: 'Contemporary Residential',
    principles: ['Maximize natural light', ...],
    testimonials: ['Used in 200+ projects', ...],
    certifications: ['Egyptian Housing Authority Approved', ...]
  }
}
```

## Toggle Behavior

### Visual Toggle
```typescript
<Button
  variant="outline"
  size="sm"
  onClick={() => setShowDetails(!showDetails)}
>
  {showDetails ? (
    <>
      <ChevronUp />
      Simple View
    </>
  ) : (
    <>
      <ChevronDown />
      Show Details
    </>
  )}
</Button>
```

### Saved Preference
```typescript
// Save to user preferences
const [showDetails, setShowDetails] = useState(
  localStorage.getItem('almona-show-details') === 'true' || false
);

const handleToggle = (value: boolean) => {
  setShowDetails(value);
  localStorage.setItem('almona-show-details', value.toString());
};
```

## Benefits

### ✅ For Workshops
- Fast selection (no clutter)
- Simple language
- Direct to work
- Never need to see details

### ✅ For Architects
- Full narrative when needed
- Design confidence
- Client presentation material
- One-time toggle, stays on

### ✅ For Development
- One component
- One data structure
- Simple conditional rendering
- Easy to maintain

## Presets Included

1. **Standard 2x2 Grid** - Basic residential
2. **Villa Asymmetrical Pattern** - Premium residential
3. **Large Window Pattern (3x1)** - Panoramic views
4. **Apartment Renovation Pattern** - Budget renovations
5. **Shop Front Pattern** - Retail commercial
6. **Commercial Window Pattern** - Institutional
7. **Traditional Geometric Pattern** - Heritage

## Constitutional Compliance

✅ **All presets maintain constitutional guarantees:**
- Full audit trail (logged as `architectural_preset_selected`)
- Rule-based recommendations (no ML)
- Deterministic matching
- Tier 0 separation

## Usage Example

```typescript
import { 
  ArchitecturalPresetSelector,
  SIMPLE_PRESETS,
  recommendPreset
} from '@/components/fabricator/drafting/prestige';

// Get recommendation
const recommended = recommendPreset(
  'standard apartment',
  'low',
  'egyptian_standard_45',
  'upvc'
);

// Render with toggle
<ArchitecturalPresetSelector
  presets={SIMPLE_PRESETS}
  selectedPreset={selectedPreset}
  onSelect={(id) => {
    setSelectedPreset(id);
    // Apply preset intelligence
    applyPresetIntelligence(id);
  }}
  defaultShowDetails={userPreferences.showDetails}
/>
```

## Key Insight

**Stop overthinking. One toggle solves both markets.**

- Workshops: Never touch it (simple by default)
- Architects: Turn it on once (saved in preferences)
- Everyone: Gets what they want

Simple. Elegant. Effective.

