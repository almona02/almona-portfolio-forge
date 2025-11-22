/**
 * Profile Compatibility Engine
 * Matches profiles based on specifications, dimensions, and material properties
 */

import { Profile } from '@/types/fabricator';
import { getProfileById, getAllProfiles, getProfilesByMaterial } from './profileDatabase';
import { getMaterialSpec, MaterialSpec } from './materialSpecs';

export interface CompatibilityMatch {
  profile: Profile;
  compatibilityScore: number; // 0-100
  matchingCriteria: string[];
  mismatches: string[];
  priceDifference: number;
  availability: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export interface CompatibilityOptions {
  material?: string;
  width?: number;
  height?: number;
  color?: string;
  maxPriceDifference?: number;
  minCompatibilityScore?: number;
  requireStock?: boolean;
  tolerance?: {
    width?: number;
    height?: number;
    price?: number;
  };
}

export class CompatibilityEngine {
  /**
   * Find compatible profiles for a given profile
   */
  static findCompatibleProfiles(
    targetProfile: Profile,
    options: CompatibilityOptions = {}
  ): CompatibilityMatch[] {
    const tolerance = options.tolerance || { width: 5, height: 5, price: 20 };
    const minScore = options.minCompatibilityScore || 70;
    
    // Get candidate profiles
    let candidates = getAllProfiles();
    
    // Filter by material if specified
    if (options.material) {
      candidates = candidates.filter(p => 
        p.material.toLowerCase() === options.material!.toLowerCase()
      );
    } else {
      // Prefer same material
      candidates = candidates.filter(p => 
        p.material.toLowerCase() === targetProfile.material.toLowerCase()
      );
    }
    
    // Filter by stock if required
    if (options.requireStock) {
      candidates = candidates.filter(p => p.stockQuantity > 0);
    }
    
    // Calculate compatibility for each candidate
    const matches: CompatibilityMatch[] = candidates
      .filter(p => p.id !== targetProfile.id) // Exclude the target profile itself
      .map(candidate => this.calculateCompatibility(targetProfile, candidate, tolerance))
      .filter(match => match.compatibilityScore >= minScore)
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    
    return matches;
  }
  
  /**
   * Calculate compatibility score between two profiles
   */
  static calculateCompatibility(
    target: Profile,
    candidate: Profile,
    tolerance: { width?: number; height?: number; price?: number }
  ): CompatibilityMatch {
    const matchingCriteria: string[] = [];
    const mismatches: string[] = [];
    let score = 100;
    
    // Material match (critical)
    if (target.material.toLowerCase() === candidate.material.toLowerCase()) {
      matchingCriteria.push('Material');
    } else {
      mismatches.push('Material mismatch');
      score -= 50; // Heavy penalty for material mismatch
    }
    
    // Dimension matching
    const widthDiff = Math.abs(target.width - candidate.width);
    const heightDiff = Math.abs((target.height || target.width) - (candidate.height || candidate.width));
    const widthTolerance = tolerance.width || 5;
    const heightTolerance = tolerance.height || 5;
    
    if (widthDiff <= widthTolerance) {
      matchingCriteria.push(`Width (${widthDiff}mm difference)`);
    } else {
      mismatches.push(`Width difference: ${widthDiff}mm`);
      score -= Math.min(20, (widthDiff - widthTolerance) * 2);
    }
    
    if (heightDiff <= heightTolerance) {
      matchingCriteria.push(`Height (${heightDiff}mm difference)`);
    } else {
      mismatches.push(`Height difference: ${heightDiff}mm`);
      score -= Math.min(20, (heightDiff - heightTolerance) * 2);
    }
    
    // Color matching
    if (target.color.toLowerCase() === candidate.color.toLowerCase()) {
      matchingCriteria.push('Color');
      score += 5; // Bonus for exact color match
    } else {
      mismatches.push(`Color: ${target.color} vs ${candidate.color}`);
      score -= 5;
    }
    
    // Price comparison
    const priceDiff = Math.abs(target.costPerMeter - candidate.costPerMeter);
    const priceDiffPercent = (priceDiff / target.costPerMeter) * 100;
    const priceTolerance = tolerance.price || 20;
    
    if (priceDiffPercent <= priceTolerance) {
      matchingCriteria.push(`Price (${priceDiffPercent.toFixed(1)}% difference)`);
    } else {
      mismatches.push(`Price difference: ${priceDiffPercent.toFixed(1)}%`);
      score -= Math.min(15, priceDiffPercent - priceTolerance);
    }
    
    // Stock availability
    let availability: 'in_stock' | 'low_stock' | 'out_of_stock';
    if (candidate.stockQuantity === 0) {
      availability = 'out_of_stock';
      score -= 10;
      mismatches.push('Out of stock');
    } else if (candidate.stockQuantity < candidate.minStockLevel) {
      availability = 'low_stock';
      score -= 5;
      mismatches.push('Low stock');
    } else {
      availability = 'in_stock';
      matchingCriteria.push('In stock');
    }
    
    // System/Type matching
    if (target.type && candidate.type && target.type === candidate.type) {
      matchingCriteria.push('Profile type');
      score += 5;
    }
    
    if (target.system && candidate.system && target.system === candidate.system) {
      matchingCriteria.push('Profile system');
      score += 5;
    }
    
    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));
    
    return {
      profile: candidate,
      compatibilityScore: Math.round(score),
      matchingCriteria,
      mismatches,
      priceDifference: priceDiff,
      availability,
    };
  }
  
  /**
   * Find best matching profile
   */
  static findBestMatch(
    targetProfile: Profile,
    options: CompatibilityOptions = {}
  ): CompatibilityMatch | null {
    const matches = this.findCompatibleProfiles(targetProfile, {
      ...options,
      minCompatibilityScore: options.minCompatibilityScore || 80,
    });
    
    return matches.length > 0 ? matches[0] : null;
  }
  
  /**
   * Check if two profiles are compatible
   */
  static areCompatible(
    profile1: Profile,
    profile2: Profile,
    tolerance: { width?: number; height?: number; price?: number } = {}
  ): boolean {
    const match = this.calculateCompatibility(profile1, profile2, tolerance);
    return match.compatibilityScore >= 70;
  }
  
  /**
   * Find alternative profiles when primary is unavailable
   */
  static findAlternatives(
    unavailableProfile: Profile,
    options: CompatibilityOptions = {}
  ): CompatibilityMatch[] {
    return this.findCompatibleProfiles(unavailableProfile, {
      ...options,
      requireStock: true,
      minCompatibilityScore: 75,
    });
  }
  
  /**
   * Validate profile compatibility for a project
   */
  static validateProjectCompatibility(
    profiles: Profile[],
    requiredSpecs: {
      material?: string;
      minWidth?: number;
      maxWidth?: number;
      minHeight?: number;
      maxHeight?: number;
      colors?: string[];
    }
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    for (const profile of profiles) {
      // Material check
      if (requiredSpecs.material && 
          profile.material.toLowerCase() !== requiredSpecs.material.toLowerCase()) {
        issues.push(`Profile ${profile.name}: Material mismatch`);
      }
      
      // Dimension checks
      if (requiredSpecs.minWidth && profile.width < requiredSpecs.minWidth) {
        issues.push(`Profile ${profile.name}: Width too small (${profile.width}mm < ${requiredSpecs.minWidth}mm)`);
      }
      
      if (requiredSpecs.maxWidth && profile.width > requiredSpecs.maxWidth) {
        issues.push(`Profile ${profile.name}: Width too large (${profile.width}mm > ${requiredSpecs.maxWidth}mm)`);
      }
      
      if (requiredSpecs.minHeight && (profile.height || profile.width) < requiredSpecs.minHeight) {
        issues.push(`Profile ${profile.name}: Height too small`);
      }
      
      if (requiredSpecs.maxHeight && (profile.height || profile.width) > requiredSpecs.maxHeight) {
        issues.push(`Profile ${profile.name}: Height too large`);
      }
      
      // Color check
      if (requiredSpecs.colors && 
          !requiredSpecs.colors.some(c => c.toLowerCase() === profile.color.toLowerCase())) {
        issues.push(`Profile ${profile.name}: Color not in allowed list`);
      }
      
      // Stock check
      if (profile.stockQuantity === 0) {
        issues.push(`Profile ${profile.name}: Out of stock`);
      }
    }
    
    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

