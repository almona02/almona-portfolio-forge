# Dual Market Architectural Intelligence Guide

## Philosophy

> **"Same intelligence, different presentation. Works for 2-3 person workshops AND enterprise architects."**

## The Dual Market Strategy

### Local Workshop Market (2-3 people)
- **Language**: Practical, straightforward
- **Focus**: Fast, affordable, easy to use
- **Pricing**: Local/Standard tier
- **Examples**: "Standard 2x2 Window Pattern", "Apartment Renovation Pattern"

### Enterprise Market (Architects, Developers)
- **Language**: Architectural, prestigious
- **Focus**: Design authority, cultural context, performance
- **Pricing**: Premium/Enterprise/Bespoke tier
- **Examples**: "Cairo Luxury Villa Facade Authority", "Corporate Curtain Wall Commission"

## How It Works

### Same Intelligence, Different Presentation

```typescript
{
  id: 'luxury_villa_facade',
  
  // LOCAL WORKSHOP sees:
  title: {
    local: 'Villa Window Pattern (2x2 Asymmetrical)'
  },
  description: {
    local: 'Asymmetrical 2x2 pattern for villas. Slightly more complex but still manageable for small workshops.'
  },
  
  // ENTERPRISE CLIENT sees:
  title: {
    enterprise: 'Cairo Luxury Villa Facade Authority'
  },
  description: {
    enterprise: 'Maximize Nile views while maintaining thermal comfort. Contemporary Egyptian Modern architecture with cultural adaptation.'
  },
  
  // SAME INTELLIGENCE (core data):
  intelligence: {
    gridPattern: '2x2 asymmetrical',
    systemRecommendation: 'Caluminium PS v3',
    materialRecommendation: 'Aerospace Aluminum',
    complexity: 'Advanced'
  }
}
```

## Market Tier Detection

### Automatic Detection
```typescript
// Based on user profile/subscription
const marketTier = user.subscriptionTier === 'enterprise' ? 'enterprise' : 'local';

// Or based on project value
const marketTier = projectValue > 100000 ? 'enterprise' : 'local';
```

### Manual Selection
```typescript
<ArchitecturalIntelligencePresets
  marketTier="local" // or "enterprise"
  presets={ARCHITECTURAL_PRESETS}
  onSelect={handleSelect}
/>
```

## Preset Categories

### 1. Residential (Both Markets)

**Local**: "Standard 2x2 Window Pattern"
- For: Standard apartments, budget renovations
- Complexity: Basic
- Pricing: Local tier
- System: Egyptian Standard 45
- Material: UPVC

**Enterprise**: "Residential Facade Composition Authority"
- For: Residential developments, apartment complexes
- Complexity: Basic
- Pricing: Standard tier
- System: Egyptian Standard 45
- Material: UPVC

### 2. Luxury Residential (Both Markets)

**Local**: "Villa Window Pattern (2x2 Asymmetrical)"
- For: Villa projects, better quality homes
- Complexity: Advanced
- Pricing: Premium tier
- System: Caluminium PS v3
- Material: Aerospace Aluminum

**Enterprise**: "Cairo Luxury Villa Facade Authority"
- For: Luxury villas, Nile-view properties
- Complexity: Advanced
- Pricing: Premium tier
- System: Caluminium PS v3
- Material: Aerospace Aluminum
- Includes: Testimonials, certifications, architectural narrative

### 3. Commercial (Both Markets)

**Local**: "Shop Front Pattern"
- For: Retail shops, storefronts
- Complexity: Moderate
- Pricing: Standard tier
- System: Egyptian Standard 45
- Material: UPVC or Aluminum

**Enterprise**: "Retail Facade Intelligence"
- For: Retail chains, shopping centers
- Complexity: Moderate
- Pricing: Standard tier
- System: Egyptian Standard 45
- Material: UPVC or Aluminum
- Includes: Design principles, optimization details

## Pricing Tiers

| Tier | Local Market | Enterprise Market | Target |
|------|-------------|-------------------|--------|
| **Local** | Standard apartments, budget | Basic residential | 2-3 person workshops |
| **Standard** | Commercial, shops | Retail, standard commercial | Small businesses |
| **Premium** | Villas, better homes | Luxury residential | Premium projects |
| **Enterprise** | Large commercial | Corporate, institutional | Large projects |
| **Bespoke** | Heritage, custom | Cultural, bespoke | Specialized work |

## Usage Examples

### Local Workshop (2-3 people)
```typescript
import { 
  ArchitecturalIntelligencePresets,
  ARCHITECTURAL_PRESETS,
  recommendArchitecturalPreset
} from '@/components/fabricator/drafting/prestige';

// Auto-detect or set to local
const marketTier = 'local';

// Get recommendation
const recommended = recommendArchitecturalPreset(
  marketTier,
  'standard apartment',
  'low',
  'egyptian_standard_45',
  'upvc'
);

// Render
<ArchitecturalIntelligencePresets
  marketTier="local"
  presets={ARCHITECTURAL_PRESETS}
  selectedPreset={selectedPreset}
  onSelect={handleSelect}
/>
```

### Enterprise Client
```typescript
// Enterprise mode
const marketTier = 'enterprise';

// Get recommendation
const recommended = recommendArchitecturalPreset(
  marketTier,
  'luxury villa',
  'high',
  'caluminium_ps_v3',
  'aluminum'
);

// Render with full prestige
<ArchitecturalIntelligencePresets
  marketTier="enterprise"
  presets={ARCHITECTURAL_PRESETS}
  selectedPreset={selectedPreset}
  onSelect={handleSelect}
/>
```

## Constitutional Compliance

✅ **All presets maintain constitutional guarantees:**
- Full audit trail (logged as `architectural_intelligence_commissioned`)
- Rule-based recommendations (no ML)
- Deterministic matching
- Tier 0 separation

## Business Model

### Local Workshop Pricing
- **Basic**: $99/month
- **Standard**: $149/month
- **Premium**: $249/month (for villa projects)

### Enterprise Pricing
- **Standard**: $499/month
- **Premium**: $999/month
- **Enterprise**: $2,499/month
- **Bespoke**: Custom pricing

### Same Intelligence, Different Value
- Local: "Fast, affordable, easy"
- Enterprise: "Architectural authority, design confidence, cultural context"

## Implementation Checklist

- [x] Dual-market preset system
- [x] Market tier detection
- [x] Rule-based recommendations
- [x] Constitutional audit logging
- [ ] Auto-detect market tier from user profile
- [ ] Pricing tier filtering for local market
- [ ] Visual differentiation (local vs enterprise)
- [ ] Integration with EngineeringBay

## Key Differentiators

### For Local Workshops
- ✅ Simple language ("Window Pattern" not "Facade Authority")
- ✅ Practical focus (fast, affordable, easy)
- ✅ Basic to Moderate complexity
- ✅ Local/Standard pricing tiers

### For Enterprise
- ✅ Architectural language ("Facade Authority" not "Pattern")
- ✅ Prestige focus (design, culture, performance)
- ✅ Advanced to Bespoke complexity
- ✅ Premium/Enterprise pricing tiers
- ✅ Testimonials, certifications, narratives

## Next Steps

1. Integrate market tier detection from user profile
2. Add pricing tier filtering
3. Create visual differentiation
4. Add market-specific onboarding
5. Test with both user types

