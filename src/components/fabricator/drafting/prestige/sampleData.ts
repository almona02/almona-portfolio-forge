// src/components/fabricator/drafting/prestige/sampleData.ts
/**
 * Sample Prestige Data
 * 
 * Constitutional: All data is deterministic, rule-based
 * No ML: Recommendations are explicit rules
 */

import type { MaterialOption, SystemAuthority, PresetIntelligence } from './index';

export const PRESTIGE_MATERIALS: MaterialOption[] = [
  {
    id: 'aluminum',
    name: 'aluminum',
    title: 'Aerospace-Grade Aluminum',
    description: 'For architectural excellence and structural integrity. Premium finish with corrosion resistance.',
    features: [
      'Corrosion resistant',
      'Structural integrity',
      'Premium finish',
      'Long lifespan',
      'Low maintenance'
    ],
    applications: [
      'Luxury villas',
      'Commercial buildings',
      'Government projects',
      'High-rise facades'
    ],
    priceTier: 'Premium',
    badge: 'Industrial Grade'
  },
  {
    id: 'upvc',
    name: 'upvc',
    title: 'Engineered UPVC Systems',
    description: 'For energy-efficient solutions with excellent thermal insulation and cost-effectiveness.',
    features: [
      'Thermal insulation',
      'Low maintenance',
      'Cost effective',
      'Energy efficient',
      'Weather resistant'
    ],
    applications: [
      'Residential projects',
      'Renovations',
      'Budget projects',
      'Energy-efficient buildings'
    ],
    priceTier: 'Value',
    badge: 'Energy Optimized'
  }
];

export const PRESTIGE_SYSTEMS: SystemAuthority[] = [
  {
    id: 'caluminium_ps_v3',
    name: 'caluminium_ps_v3',
    title: 'Caluminium PS v3 Authority',
    description: 'Complete fabrication authority for high-end architectural projects. Industrial-grade system with maximum performance capabilities.',
    badge: 'Industrial Grade',
    capabilities: [
      { label: 'Maximum span', value: '6m' },
      { label: 'Wind load', value: 'Class 5' },
      { label: 'Water tightness', value: 'Class 9A' },
      { label: 'Air permeability', value: 'Class 4' },
      { label: 'Thermal break', value: 'Yes' },
      { label: 'Sound reduction', value: '42 dB' }
    ],
    recommendedFor: [
      'Luxury villas',
      'Government buildings',
      'Commercial facades',
      'High-rise projects'
    ],
    testimonials: [
      'Used in Burj Khalifa Annex projects',
      'Egyptian Ministry of Housing approved',
      'Certified for Class 5 wind loads'
    ],
    certifications: [
      'EN 14351-1',
      'Egyptian Housing Authority',
      'ISO 9001'
    ],
    selectLabel: 'Establish Authority'
  },
  {
    id: 'egyptian_standard_45',
    name: 'egyptian_standard_45',
    title: 'Egyptian Standard 45',
    description: 'Optimized for Egyptian market conditions and regulations. Local material optimization with climate adaptation.',
    badge: 'Market Optimized',
    capabilities: [
      { label: 'Maximum span', value: '4.5m' },
      { label: 'Wind load', value: 'Class 3' },
      { label: 'Water tightness', value: 'Class 7A' },
      { label: 'Air permeability', value: 'Class 3' },
      { label: 'Local optimization', value: 'Yes' },
      { label: 'Cost efficiency', value: 'High' }
    ],
    recommendedFor: [
      'Egyptian residential',
      'Local government projects',
      'Market-competitive bids',
      'Standard renovations'
    ],
    testimonials: [
      'Approved by Egyptian Housing Authority',
      'Used in 500+ Cairo projects',
      'Optimized for local suppliers'
    ],
    certifications: [
      'Egyptian Standard 45',
      'Local Authority Approved'
    ],
    selectLabel: 'Optimize for Market'
  },
  {
    id: 'yilmaz_heavy_duty',
    name: 'yilmaz_heavy_duty',
    title: 'YILMAZ Heavy Duty Authority',
    description: 'Heavy industrial system for maximum structural requirements. Designed for extreme conditions and large spans.',
    badge: 'Heavy Industrial',
    capabilities: [
      { label: 'Maximum span', value: '8m' },
      { label: 'Wind load', value: 'Class 6' },
      { label: 'Water tightness', value: 'Class 9A' },
      { label: 'Air permeability', value: 'Class 4' },
      { label: 'Structural load', value: 'Heavy' },
      { label: 'Frame depth', value: '100mm+' }
    ],
    recommendedFor: [
      'Industrial buildings',
      'Large commercial facades',
      'Extreme climate zones',
      'Structural applications'
    ],
    testimonials: [
      'Used in industrial complexes',
      'Certified for extreme conditions',
      'Maximum structural integrity'
    ],
    certifications: [
      'EN 14351-1',
      'Heavy Duty Certified',
      'Industrial Grade'
    ],
    selectLabel: 'Establish Heavy Duty Authority'
  }
];

export const PRESTIGE_PRESETS: PresetIntelligence[] = [
  {
    id: 'egyptian_luxury_villa',
    title: 'Egyptian Luxury Villa Authority',
    description: 'Optimized preset for luxury residential projects with premium finishes and maximum light.',
    applications: [
      'Main facade windows',
      'Garden view openings',
      'Poolside enclosures',
      'Terrace doors'
    ],
    systemRecommendation: 'Caluminium PS v3',
    materialRecommendation: 'Aerospace Aluminum',
    optimization: 'Maximum light, premium finish',
    selectCount: 'Used in 47 similar projects',
    ruleBasedReason: 'Matches premium system and material selection for luxury applications'
  },
  {
    id: 'cairo_apartment_renovation',
    title: 'Cairo Apartment Renovation',
    description: 'Cost-effective preset optimized for residential renovations with energy efficiency focus.',
    applications: [
      'Balcony replacements',
      'Room dividers',
      'Kitchen extensions',
      'Standard windows'
    ],
    systemRecommendation: 'Egyptian Standard 45',
    materialRecommendation: 'Engineered UPVC',
    optimization: 'Cost-effective, energy efficient',
    selectCount: 'Budget-friendly choice',
    ruleBasedReason: 'Optimized for residential renovations with value-tier materials'
  },
  {
    id: 'commercial_facade',
    title: 'Commercial Facade Authority',
    description: 'Industrial-grade preset for commercial buildings with high performance requirements.',
    applications: [
      'Storefront windows',
      'Office facades',
      'Shopping centers',
      'Public buildings'
    ],
    systemRecommendation: 'Caluminium PS v3',
    materialRecommendation: 'Aerospace Aluminum',
    optimization: 'High performance, durability',
    selectCount: 'Used in 23 commercial projects',
    ruleBasedReason: 'Matches industrial system for commercial applications'
  },
  {
    id: 'industrial_complex',
    title: 'Industrial Complex Authority',
    description: 'Heavy-duty preset for industrial applications with maximum structural requirements.',
    applications: [
      'Factory windows',
      'Warehouse openings',
      'Industrial doors',
      'Large spans'
    ],
    systemRecommendation: 'YILMAZ Heavy Duty',
    materialRecommendation: 'Aerospace Aluminum',
    optimization: 'Maximum structural integrity',
    selectCount: 'Heavy industrial applications',
    ruleBasedReason: 'Matches heavy-duty system for industrial requirements'
  }
];

/**
 * Rule-based material recommendation (deterministic, no ML)
 */
export function recommendMaterial(context?: string): string {
  if (!context) return 'aluminum'; // Default
  
  const lowerContext = context.toLowerCase();
  
  // Premium tier rules
  if (lowerContext.includes('luxury') || 
      lowerContext.includes('villa') || 
      lowerContext.includes('commercial') ||
      lowerContext.includes('government')) {
    return 'aluminum';
  }
  
  // Value tier rules
  if (lowerContext.includes('residential') || 
      lowerContext.includes('budget') ||
      lowerContext.includes('renovation') ||
      lowerContext.includes('apartment')) {
    return 'upvc';
  }
  
  return 'aluminum'; // Default to premium
}

/**
 * Rule-based system recommendation (deterministic, no ML)
 */
export function recommendSystem(material: string, projectType?: string): {
  systemId: string;
  reason: string;
} {
  const lowerProjectType = projectType?.toLowerCase() || '';
  
  // Heavy industrial
  if (lowerProjectType.includes('industrial') || 
      lowerProjectType.includes('factory') ||
      lowerProjectType.includes('warehouse')) {
    return {
      systemId: 'yilmaz_heavy_duty',
      reason: 'Heavy-duty system required for industrial applications'
    };
  }
  
  // Premium/Commercial
  if (material === 'aluminum' && (
      lowerProjectType.includes('commercial') ||
      lowerProjectType.includes('luxury') ||
      lowerProjectType.includes('government'))) {
    return {
      systemId: 'caluminium_ps_v3',
      reason: 'Industrial-grade system matches premium material for high-end projects'
    };
  }
  
  // Market optimized
  if (material === 'upvc' || lowerProjectType.includes('residential') || lowerProjectType.includes('egyptian')) {
    return {
      systemId: 'egyptian_standard_45',
      reason: 'Market-optimized system for residential and local projects'
    };
  }
  
  // Default
  return {
    systemId: 'caluminium_ps_v3',
    reason: 'Default industrial-grade system'
  };
}

