// src/components/fabricator/drafting/prestige/simplePresetsData.ts
/**
 * Simple Preset Data - Details Toggle Approach
 * 
 * Constitutional: Rule-based, full audit trail
 * Philosophy: Speed by default, story on demand
 * 
 * Simple view: Basic info (workshop-friendly)
 * Detailed view: Architectural narrative (architect-friendly)
 */

import type { ArchitecturalPreset } from './ArchitecturalPresetSelector';

export const SIMPLE_PRESETS: ArchitecturalPreset[] = [
  // ============================================
  // RESIDENTIAL
  // ============================================
  {
    id: 'standard_residential_2x2',
    title: 'Standard 2x2 Grid',
    description: 'Perfect for standard apartments and budget renovations. Simple 2x2 grid, easy to fabricate.',
    icon: '🏠',
    complexity: 'Basic',
    intelligence: {
      gridPattern: '2x2 symmetrical',
      systemRecommendation: 'Egyptian Standard 45',
      materialRecommendation: 'UPVC',
      optimization: 'Standard residential openings, balanced light distribution'
    },
    applications: ['Standard apartments', 'Budget renovations', 'Normal residential'],
    pricingTier: 'Local',
    architecturalDetails: {
      narrative: 'Balanced facade composition maximizing natural light while maintaining structural elegance. Ideal for residential developments.',
      architecturalStyle: 'Contemporary Residential',
      principles: [
        'Maximize natural light',
        'Maintain structural balance',
        'Cost-effective fabrication'
      ],
      bestFor: 'Residential developments, apartment complexes, standard housing',
      testimonials: [
        'Used in 200+ apartment projects',
        'Recommended for budget-friendly developments'
      ],
      certifications: [
        'Egyptian Housing Authority Approved',
        'Standard Residential Grade'
      ]
    }
  },
  {
    id: 'luxury_villa_facade',
    title: 'Villa Asymmetrical Pattern',
    description: 'Asymmetrical 2x2 pattern for villas. Slightly more complex but manageable for experienced workshops.',
    icon: '🏛️',
    complexity: 'Advanced',
    intelligence: {
      gridPattern: '2x2 asymmetrical',
      systemRecommendation: 'Caluminium PS v3',
      materialRecommendation: 'Aerospace Aluminum',
      optimization: 'View maximization with privacy screening, north-facing for natural light'
    },
    applications: ['Villa projects', 'Better quality homes', 'Premium residential'],
    pricingTier: 'Premium',
    architecturalDetails: {
      narrative: 'Maximize Nile views while maintaining thermal comfort. Contemporary Egyptian Modern architecture with cultural adaptation.',
      architecturalStyle: 'Contemporary Egyptian Modern',
      principles: [
        'Maximize view corridors',
        'Maintain thermal comfort',
        'Cultural pattern integration',
        'Privacy without isolation'
      ],
      bestFor: 'Luxury villas, Nile-view properties, premium residential developments',
      testimonials: [
        'Used in 12 Nile-view villas in Zamalek',
        'Recommended by Egyptian Architects Association'
      ],
      certifications: [
        'Thermal Performance Verified',
        'Cultural Heritage Approved',
        'Premium Residential Grade'
      ]
    }
  },
  {
    id: 'penthouse_panorama',
    title: 'Large Window Pattern (3x1)',
    description: '3x1 pattern for large openings. Good for living rooms and main areas with panoramic views.',
    icon: '🏙️',
    complexity: 'Advanced',
    intelligence: {
      gridPattern: '3x1 vertical',
      systemRecommendation: 'Caluminium PS v3 Slimline',
      materialRecommendation: 'Aerospace Aluminum',
      optimization: 'Maximize view corridors, minimize visible framing, structural glazing integration'
    },
    applications: ['Large openings', 'Living room windows', 'Main facade', 'Panoramic views'],
    pricingTier: 'Premium',
    architecturalDetails: {
      narrative: 'Unobstructed city views with structural elegance. Floor-to-ceiling minimal frames with structural glazing integration.',
      architecturalStyle: 'Modern Minimalist',
      principles: [
        'Maximize view corridors',
        'Minimize visible framing',
        'Structural glazing integration',
        'Premium finish quality'
      ],
      bestFor: 'High-rise luxury apartments, penthouses, premium facades',
      testimonials: [
        'Used in luxury high-rise developments',
        'Architectural grade finish'
      ],
      certifications: [
        'High-Rise Certified',
        'Structural Glazing Approved'
      ]
    }
  },
  {
    id: 'apartment_renovation',
    title: 'Apartment Renovation Pattern',
    description: 'Standard pattern for apartment renovations. Cost-effective and fast to install.',
    icon: '🔧',
    complexity: 'Basic',
    intelligence: {
      gridPattern: '2x1 or 1x1 standard',
      systemRecommendation: 'Egyptian Standard 45',
      materialRecommendation: 'Thermal UPVC',
      optimization: 'Cost-effective, energy efficient, quick installation'
    },
    applications: ['Apartment renovations', 'Room replacements', 'Budget projects'],
    pricingTier: 'Local',
    architecturalDetails: {
      narrative: 'Cost-effective preset optimized for residential renovations with energy efficiency focus. Market-competitive solution.',
      architecturalStyle: 'Practical Renovation',
      principles: [
        'Cost-effectiveness',
        'Energy efficiency',
        'Quick installation',
        'Minimal disruption'
      ],
      bestFor: 'Renovation projects, residential upgrades, market-competitive bids',
      testimonials: [
        'Used in 500+ renovation projects',
        'Budget-friendly choice'
      ],
      certifications: [
        'Energy Efficiency Certified',
        'Renovation Grade Approved'
      ]
    }
  },

  // ============================================
  // COMMERCIAL
  // ============================================
  {
    id: 'storefront_basic',
    title: 'Shop Front Pattern',
    description: 'Simple shop front pattern. Easy to fabricate, good for retail shops and small businesses.',
    icon: '🏪',
    complexity: 'Moderate',
    intelligence: {
      gridPattern: '2x1 storefront',
      systemRecommendation: 'Egyptian Standard 45',
      materialRecommendation: 'UPVC or Aluminum',
      optimization: 'Maximum visibility, energy efficient, easy maintenance'
    },
    applications: ['Retail shops', 'Storefronts', 'Small businesses'],
    pricingTier: 'Standard',
    architecturalDetails: {
      narrative: 'Retail facade optimization balancing visibility with energy efficiency. Modern storefront design principles.',
      architecturalStyle: 'Commercial Retail',
      principles: [
        'Maximum visibility',
        'Energy efficiency',
        'Easy maintenance',
        'Cost-effective operation'
      ],
      bestFor: 'Retail chains, shopping centers, commercial strips',
      testimonials: [
        'Used in 100+ retail projects',
        'Commercial grade performance'
      ],
      certifications: [
        'Commercial Grade Approved',
        'Retail Standard Certified'
      ]
    }
  },
  {
    id: 'standard_commercial',
    title: 'Commercial Window Pattern',
    description: 'Standard commercial pattern. Good for shops, offices, and commercial buildings.',
    icon: '🏢',
    complexity: 'Expert',
    intelligence: {
      gridPattern: '3x2 commercial',
      systemRecommendation: 'YILMAZ Heavy Duty',
      materialRecommendation: 'Structural Aluminum Alloy',
      optimization: 'Maximum transparency, maintenance access integration, structural integrity at height'
    },
    applications: ['Shops', 'Offices', 'Commercial buildings'],
    pricingTier: 'Enterprise',
    architecturalDetails: {
      narrative: 'Institutional-grade facade for corporate headquarters. Maximum transparency with structural integrity at height.',
      architecturalStyle: 'Corporate Institutional',
      principles: [
        'Maximum transparency',
        'Structural integrity at height',
        'Maintenance access integration',
        'Institutional quality'
      ],
      bestFor: 'Corporate HQs, financial institutions, institutional buildings',
      testimonials: [
        'Used in corporate headquarters',
        'Institutional grade quality'
      ],
      certifications: [
        'LEED Gold compatible',
        'Class 5 wind load',
        '24-hour fire rating',
        'Institutional Grade'
      ]
    }
  },

  // ============================================
  // HERITAGE
  // ============================================
  {
    id: 'heritage_geometric',
    title: 'Traditional Geometric Pattern',
    description: 'Traditional geometric pattern. More complex but good for heritage projects and cultural buildings.',
    icon: '🌙',
    complexity: 'Bespoke',
    intelligence: {
      gridPattern: 'Custom geometric (8-pointed star)',
      systemRecommendation: 'Custom Caluminium Artisan Series',
      materialRecommendation: 'Custom-extruded Bronze Aluminum',
      optimization: 'Cultural pattern authenticity, modern thermal performance in traditional forms'
    },
    applications: ['Heritage homes', 'Traditional buildings', 'Cultural projects'],
    pricingTier: 'Bespoke',
    architecturalDetails: {
      narrative: 'Traditional Islamic patterns with modern engineering. Mathematical precision in geometry with cultural pattern authenticity.',
      architecturalStyle: 'Islamic Geometric Heritage',
      principles: [
        'Mathematical precision in geometry',
        'Cultural pattern authenticity',
        'Modern thermal performance in traditional forms',
        'Heritage preservation'
      ],
      bestFor: 'Mosques, cultural centers, heritage restoration projects',
      testimonials: [
        'Used in Al-Azhar restoration project',
        'Cultural Heritage Ministry approved'
      ],
      certifications: [
        'Heritage Preservation Certified',
        'Cultural Authenticity Verified',
        'Bespoke Artisan Grade'
      ]
    }
  }
];

/**
 * Rule-based preset recommendation (deterministic, no ML)
 */
export function recommendPreset(
  projectType?: string,
  budget?: 'low' | 'medium' | 'high',
  _system?: string,
  _material?: string
): ArchitecturalPreset | null {
  const lowerProjectType = projectType?.toLowerCase() || '';
  
  // Budget projects
  if (budget === 'low' || lowerProjectType.includes('budget') || lowerProjectType.includes('standard') || lowerProjectType.includes('apartment')) {
    return SIMPLE_PRESETS.find(p => p.id === 'standard_residential_2x2') || null;
  }
  
  // Renovation projects
  if (lowerProjectType.includes('renovation')) {
    return SIMPLE_PRESETS.find(p => p.id === 'apartment_renovation') || null;
  }
  
  // Commercial projects
  if (lowerProjectType.includes('shop') || lowerProjectType.includes('retail')) {
    return SIMPLE_PRESETS.find(p => p.id === 'storefront_basic') || null;
  }
  
  // Large commercial
  if (lowerProjectType.includes('commercial') || lowerProjectType.includes('corporate') || lowerProjectType.includes('office')) {
    return SIMPLE_PRESETS.find(p => p.id === 'standard_commercial') || null;
  }
  
  // Villa/luxury
  if (lowerProjectType.includes('villa') || budget === 'high' || lowerProjectType.includes('luxury')) {
    return SIMPLE_PRESETS.find(p => p.id === 'luxury_villa_facade') || null;
  }
  
  // Heritage
  if (lowerProjectType.includes('heritage') || lowerProjectType.includes('islamic') || lowerProjectType.includes('cultural')) {
    return SIMPLE_PRESETS.find(p => p.id === 'heritage_geometric') || null;
  }
  
  // Default
  return SIMPLE_PRESETS.find(p => p.id === 'standard_residential_2x2') || null;
}

