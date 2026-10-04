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
    templateSchema: {
      version: 1,
      status: 'selectable',
      evidenceStatus: 'illustrative',
      compatibleSystemPackIds: ['panda-50'],
      grid: {
        rows: 2,
        cols: 2,
        cells: [
          { id: '0-0', row: 0, col: 0, type: 'sash' },
          { id: '0-1', row: 0, col: 1, type: 'sash' },
          { id: '1-0', row: 1, col: 0, type: 'fixed' },
          { id: '1-1', row: 1, col: 1, type: 'fixed' },
        ],
        colWidths: [1, 1],
        rowHeights: [1, 1],
      },
    },
    architecturalDetails: {
      narrative: 'Balanced facade composition maximizing natural light while maintaining structural elegance. Ideal for residential developments.',
      architecturalStyle: 'Contemporary Residential',
      principles: [
        'Maximize natural light',
        'Maintain structural balance',
        'Cost-effective fabrication'
      ],
      bestFor: 'Residential developments, apartment complexes, standard housing',
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
    templateSchema: {
      version: 1,
      status: 'selectable',
      evidenceStatus: 'illustrative',
      compatibleSystemPackIds: ['caluminium-ps'],
      grid: {
        rows: 2,
        cols: 2,
        cells: [
          { id: '0-0', row: 0, col: 0, type: 'sash' },
          { id: '0-1', row: 0, col: 1, type: 'fixed' },
          { id: '1-0', row: 1, col: 0, type: 'fixed' },
          { id: '1-1', row: 1, col: 1, type: 'sash' },
        ],
        colWidths: [1, 1],
        rowHeights: [1, 1],
      },
    },
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
    templateSchema: {
      version: 1,
      status: 'selectable',
      evidenceStatus: 'illustrative',
      compatibleSystemPackIds: ['caluminium-ps'],
      grid: {
        rows: 3,
        cols: 1,
        cells: [
          { id: '0-0', row: 0, col: 0, type: 'sash' },
          { id: '1-0', row: 1, col: 0, type: 'sash' },
          { id: '2-0', row: 2, col: 0, type: 'fixed' },
        ],
        colWidths: [1],
        rowHeights: [1, 1, 1],
      },
    },
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
    templateSchema: {
      version: 1,
      status: 'blocked',
      evidenceStatus: 'illustrative',
      compatibleSystemPackIds: ['panda-50'],
      blockedReason: 'The source pattern contains two alternative layouts and has no approved cell schema.',
    },
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
    templateSchema: {
      version: 1,
      status: 'selectable',
      evidenceStatus: 'illustrative',
      compatibleSystemPackIds: ['panda-50', 'caluminium-ps'],
      grid: {
        rows: 2,
        cols: 1,
        cells: [
          { id: '0-0', row: 0, col: 0, type: 'sash' },
          { id: '1-0', row: 1, col: 0, type: 'fixed' },
        ],
        colWidths: [1],
        rowHeights: [1, 1],
      },
    },
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
    templateSchema: {
      version: 1,
      status: 'selectable',
      evidenceStatus: 'illustrative',
      compatibleSystemPackIds: ['asas-commercial'],
      grid: {
        rows: 3,
        cols: 2,
        cells: [
          { id: '0-0', row: 0, col: 0, type: 'sash' },
          { id: '0-1', row: 0, col: 1, type: 'sash' },
          { id: '1-0', row: 1, col: 0, type: 'sash' },
          { id: '1-1', row: 1, col: 1, type: 'sash' },
          { id: '2-0', row: 2, col: 0, type: 'fixed' },
          { id: '2-1', row: 2, col: 1, type: 'fixed' },
        ],
        colWidths: [1, 1],
        rowHeights: [1, 1, 1],
      },
    },
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
    templateSchema: {
      version: 1,
      status: 'blocked',
      evidenceStatus: 'illustrative',
      compatibleSystemPackIds: [],
      blockedReason: 'No explicit manufacturable eight-point cell schema or compatible approved system pack exists.',
    },
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

