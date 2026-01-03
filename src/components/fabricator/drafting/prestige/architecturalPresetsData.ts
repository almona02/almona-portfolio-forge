// src/components/fabricator/drafting/prestige/architecturalPresetsData.ts
/**
 * Architectural Intelligence Presets - Dual Market Data
 * 
 * Same intelligence, different presentation for:
 * - Local workshops (2-3 people, cheap windows, normal apartments)
 * - Enterprise clients (architects, luxury developers)
 */

import type { ArchitecturalIntelligence } from './ArchitecturalIntelligencePresets';

export const ARCHITECTURAL_PRESETS: ArchitecturalIntelligence[] = [
  // ============================================
  // RESIDENTIAL - Dual Market
  // ============================================
  {
    id: 'standard_residential_2x2',
    title: {
      local: 'Standard 2x2 Window Pattern',
      enterprise: 'Residential Facade Composition Authority'
    },
    description: {
      local: 'Perfect for standard apartments and budget renovations. Simple 2x2 grid, easy to fabricate.',
      enterprise: 'Balanced facade composition maximizing natural light while maintaining structural elegance. Ideal for residential developments.'
    },
    intelligence: {
      gridPattern: '2x2 symmetrical',
      optimization: 'Standard residential openings, balanced light distribution',
      systemRecommendation: 'Egyptian Standard 45',
      materialRecommendation: 'UPVC',
      complexity: 'Basic'
    },
    applications: {
      local: ['Standard apartments', 'Budget renovations', 'Normal residential'],
      enterprise: ['Residential developments', 'Apartment complexes', 'Standard housing']
    },
    pricingTier: 'Local',
    icon: '🏠',
    bestFor: {
      local: '2-3 person workshops, standard projects, budget-friendly',
      enterprise: 'Residential developers, standard housing projects'
    }
  },
  {
    id: 'luxury_villa_facade',
    title: {
      local: 'Villa Window Pattern (2x2 Asymmetrical)',
      enterprise: 'Cairo Luxury Villa Facade Authority'
    },
    description: {
      local: 'Asymmetrical 2x2 pattern for villas. Slightly more complex but still manageable for small workshops.',
      enterprise: 'Maximize Nile views while maintaining thermal comfort. Contemporary Egyptian Modern architecture with cultural adaptation.'
    },
    intelligence: {
      gridPattern: '2x2 asymmetrical',
      optimization: 'View maximization with privacy screening, north-facing for natural light',
      systemRecommendation: 'Caluminium PS v3',
      materialRecommendation: 'Aerospace Aluminum',
      complexity: 'Advanced'
    },
    applications: {
      local: ['Villa projects', 'Better quality homes', 'Upgrade projects'],
      enterprise: ['Luxury villas', 'Nile-view properties', 'Premium residential']
    },
    pricingTier: 'Premium',
    icon: '🏛️',
    testimonials: [
      'Used in 12 Nile-view villas in Zamalek',
      'Recommended by Egyptian Architects Association'
    ],
    certifications: [
      'Thermal Performance Verified',
      'Cultural Heritage Approved'
    ],
    bestFor: {
      local: 'Workshops doing villa projects, premium residential',
      enterprise: 'Luxury developers, architectural firms, high-end residential'
    }
  },
  {
    id: 'penthouse_panorama',
    title: {
      local: 'Large Window Pattern (3x1)',
      enterprise: 'Penthouse Panorama Authority'
    },
    description: {
      local: '3x1 pattern for large openings. Good for living rooms and main areas.',
      enterprise: 'Unobstructed city views with structural elegance. Floor-to-ceiling minimal frames with structural glazing integration.'
    },
    intelligence: {
      gridPattern: '3x1 vertical',
      optimization: 'Maximize view corridors, minimize visible framing',
      systemRecommendation: 'Caluminium PS v3 Slimline',
      materialRecommendation: 'Aerospace Aluminum',
      complexity: 'Advanced'
    },
    applications: {
      local: ['Large openings', 'Living room windows', 'Main facade'],
      enterprise: ['High-rise luxury apartments', 'Penthouses', 'Premium facades']
    },
    pricingTier: 'Premium',
    icon: '🏙️',
    bestFor: {
      local: 'Workshops handling larger projects',
      enterprise: 'Luxury high-rise developments, architectural firms'
    }
  },

  // ============================================
  // COMMERCIAL - Dual Market
  // ============================================
  {
    id: 'standard_commercial',
    title: {
      local: 'Commercial Window Pattern',
      enterprise: 'Corporate Curtain Wall Commission'
    },
    description: {
      local: 'Standard commercial pattern. Good for shops and small offices.',
      enterprise: 'Institutional-grade facade for corporate headquarters. Maximum transparency with structural integrity at height.'
    },
    intelligence: {
      gridPattern: '3x2 commercial',
      optimization: 'Maximum transparency, maintenance access integration',
      systemRecommendation: 'YILMAZ Heavy Duty',
      materialRecommendation: 'Structural Aluminum Alloy',
      complexity: 'Expert'
    },
    applications: {
      local: ['Shops', 'Small offices', 'Commercial buildings'],
      enterprise: ['Corporate HQs', 'Financial institutions', 'Institutional buildings']
    },
    pricingTier: 'Enterprise',
    icon: '🏢',
    certifications: [
      'LEED Gold compatible',
      'Class 5 wind load',
      '24-hour fire rating'
    ],
    bestFor: {
      local: 'Workshops doing commercial projects',
      enterprise: 'Contractors, developers, institutional clients'
    }
  },
  {
    id: 'storefront_basic',
    title: {
      local: 'Shop Front Pattern',
      enterprise: 'Retail Facade Intelligence'
    },
    description: {
      local: 'Simple shop front pattern. Easy to fabricate, good for retail shops.',
      enterprise: 'Retail facade optimization balancing visibility with energy efficiency. Modern storefront design principles.'
    },
    intelligence: {
      gridPattern: '2x1 storefront',
      optimization: 'Maximum visibility, energy efficient, easy maintenance',
      systemRecommendation: 'Egyptian Standard 45',
      materialRecommendation: 'UPVC or Aluminum',
      complexity: 'Moderate'
    },
    applications: {
      local: ['Retail shops', 'Storefronts', 'Small businesses'],
      enterprise: ['Retail chains', 'Shopping centers', 'Commercial strips']
    },
    pricingTier: 'Standard',
    icon: '🏪',
    bestFor: {
      local: 'Workshops doing shop fronts',
      enterprise: 'Retail developers, commercial contractors'
    }
  },

  // ============================================
  // HERITAGE - Dual Market
  // ============================================
  {
    id: 'heritage_geometric',
    title: {
      local: 'Traditional Pattern (Geometric)',
      enterprise: 'Islamic Geometric Intelligence'
    },
    description: {
      local: 'Traditional geometric pattern. More complex but good for heritage projects.',
      enterprise: 'Traditional Islamic patterns with modern engineering. Mathematical precision in geometry with cultural pattern authenticity.'
    },
    intelligence: {
      gridPattern: 'Custom geometric (8-pointed star)',
      optimization: 'Cultural pattern authenticity, modern thermal performance',
      systemRecommendation: 'Custom Caluminium Artisan Series',
      materialRecommendation: 'Custom-extruded Bronze Aluminum',
      complexity: 'Bespoke'
    },
    applications: {
      local: ['Heritage homes', 'Traditional buildings', 'Cultural projects'],
      enterprise: ['Mosques', 'Cultural centers', 'Heritage restoration']
    },
    pricingTier: 'Bespoke',
    icon: '🌙',
    testimonials: [
      'Used in Al-Azhar restoration project',
      'Cultural Heritage Ministry approved'
    ],
    certifications: [
      'Heritage Preservation Certified',
      'Cultural Authenticity Verified'
    ],
    bestFor: {
      local: 'Workshops specializing in heritage work',
      enterprise: 'Heritage restoration firms, cultural institutions'
    }
  },
  {
    id: 'apartment_renovation',
    title: {
      local: 'Apartment Renovation Pattern',
      enterprise: 'Cairo Apartment Renovation Intelligence'
    },
    description: {
      local: 'Standard pattern for apartment renovations. Cost-effective and fast.',
      enterprise: 'Cost-effective preset optimized for residential renovations with energy efficiency focus. Market-competitive solution.'
    },
    intelligence: {
      gridPattern: '2x1 or 1x1 standard',
      optimization: 'Cost-effective, energy efficient, quick installation',
      systemRecommendation: 'Egyptian Standard 45',
      materialRecommendation: 'Thermal UPVC',
      complexity: 'Basic'
    },
    applications: {
      local: ['Apartment renovations', 'Room replacements', 'Budget projects'],
      enterprise: ['Renovation projects', 'Residential upgrades', 'Market-competitive bids']
    },
    pricingTier: 'Local',
    icon: '🔧',
    bestFor: {
      local: 'Small workshops, renovation specialists, budget projects',
      enterprise: 'Renovation contractors, residential developers'
    }
  }
];

/**
 * Rule-based preset recommendation (deterministic, no ML)
 */
export function recommendArchitecturalPreset(
  marketTier: 'local' | 'enterprise',
  projectType?: string,
  budget?: 'low' | 'medium' | 'high',
  _system?: string,
  _material?: string
): ArchitecturalIntelligence | null {
  const lowerProjectType = projectType?.toLowerCase() || '';
  
  // Local market recommendations
  if (marketTier === 'local') {
    // Budget projects
    if (budget === 'low' || lowerProjectType.includes('budget') || lowerProjectType.includes('standard')) {
      return ARCHITECTURAL_PRESETS.find(p => p.id === 'standard_residential_2x2') || null;
    }
    
    // Renovation projects
    if (lowerProjectType.includes('renovation') || lowerProjectType.includes('apartment')) {
      return ARCHITECTURAL_PRESETS.find(p => p.id === 'apartment_renovation') || null;
    }
    
    // Commercial projects
    if (lowerProjectType.includes('shop') || lowerProjectType.includes('commercial')) {
      return ARCHITECTURAL_PRESETS.find(p => p.id === 'storefront_basic') || null;
    }
    
    // Villa projects
    if (lowerProjectType.includes('villa') || budget === 'high') {
      return ARCHITECTURAL_PRESETS.find(p => p.id === 'luxury_villa_facade') || null;
    }
  }
  
  // Enterprise market recommendations
  if (marketTier === 'enterprise') {
    // Luxury residential
    if (lowerProjectType.includes('luxury') || lowerProjectType.includes('villa') || lowerProjectType.includes('penthouse')) {
      return ARCHITECTURAL_PRESETS.find(p => p.id === 'luxury_villa_facade') || null;
    }
    
    // Commercial/Corporate
    if (lowerProjectType.includes('corporate') || lowerProjectType.includes('commercial') || lowerProjectType.includes('institutional')) {
      return ARCHITECTURAL_PRESETS.find(p => p.id === 'standard_commercial') || null;
    }
    
    // Heritage
    if (lowerProjectType.includes('heritage') || lowerProjectType.includes('islamic') || lowerProjectType.includes('cultural')) {
      return ARCHITECTURAL_PRESETS.find(p => p.id === 'heritage_geometric') || null;
    }
  }
  
  // Default
  return ARCHITECTURAL_PRESETS.find(p => p.id === 'standard_residential_2x2') || null;
}

/**
 * Get presets filtered by market tier and pricing
 */
export function getPresetsForMarket(
  marketTier: 'local' | 'enterprise',
  maxPricingTier?: 'Local' | 'Standard' | 'Premium' | 'Enterprise' | 'Bespoke'
): ArchitecturalIntelligence[] {
  let filtered = ARCHITECTURAL_PRESETS;
  
  // Filter by pricing tier for local market
  if (marketTier === 'local' && maxPricingTier) {
    const tierOrder = ['Local', 'Standard', 'Premium', 'Enterprise', 'Bespoke'];
    const maxIndex = tierOrder.indexOf(maxPricingTier);
    filtered = filtered.filter(p => {
      const presetIndex = tierOrder.indexOf(p.pricingTier);
      return presetIndex <= maxIndex;
    });
  }
  
  return filtered;
}

