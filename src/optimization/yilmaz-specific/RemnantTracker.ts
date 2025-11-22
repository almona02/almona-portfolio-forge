/**
 * Remnant Tracker
 * Scrap utilization for DC series saws
 * Tracks and optimizes remnant usage for Yilmaz DC series machines
 */

import { CuttingPlan, Cut, Profile } from '@/types/fabricator';

export interface Remnant {
  id: string;
  profile: Profile;
  length: number;
  width?: number;
  thickness?: number;
  material: string;
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
  status: 'available' | 'reserved' | 'used' | 'scrapped';
  location?: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  cost: number;
  sourceOrder?: string;
  sourceCut?: string;
}

export interface RemnantMatch {
  remnant: Remnant;
  cuts: Cut[];
  utilization: number; // percentage
  waste: number;
  savings: number;
  efficiency: number;
}

export interface RemnantOptimizationResult {
  usedRemnants: RemnantMatch[];
  newStockRequired: CuttingPlan[];
  totalSavings: number;
  wasteReduction: number;
  remnantUtilization: number;
  recommendations: string[];
}

export class RemnantTracker {
  private remnants: Map<string, Remnant> = new Map();
  private minRemnantLength: number = 200; // Minimum usable remnant length in mm
  private maxRemnantAge: number = 90; // Days before remnant is considered old

  /**
   * Add remnant from cutting operation
   */
  addRemnant(remnant: Remnant): void {
    if (remnant.length >= this.minRemnantLength) {
      this.remnants.set(remnant.id, remnant);
    } else {
      // Too small, mark as scrapped
      remnant.status = 'scrapped';
    }
  }

  /**
   * Create remnant from cutting waste
   */
  createRemnantFromWaste(
    profile: Profile,
    length: number,
    sourceOrder?: string,
    sourceCut?: string
  ): Remnant | null {
    if (length < this.minRemnantLength) {
      return null; // Too small to be useful
    }

    const remnant: Remnant = {
      id: `remnant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      profile,
      length,
      material: profile.material,
      createdAt: new Date(),
      usageCount: 0,
      status: 'available',
      quality: this.assessQuality(length, profile),
      cost: (length / 1000) * profile.costPerMeter * 0.5, // Remnant cost is 50% of new material
      sourceOrder,
      sourceCut
    };

    this.addRemnant(remnant);
    return remnant;
  }

  /**
   * Find best remnant matches for cuts
   */
  findRemnantMatches(
    cuts: Cut[],
    profile: Profile,
    material: string
  ): RemnantMatch[] {
    const matches: RemnantMatch[] = [];
    const availableRemnants = this.getAvailableRemnants(profile, material);
    
    // Sort cuts by length (descending) for better matching
    const sortedCuts = [...cuts].sort((a, b) => b.length - a.length);
    const usedRemnantIds = new Set<string>();
    const matchedCuts = new Set<string>();

    for (const remnant of availableRemnants) {
      if (usedRemnantIds.has(remnant.id)) {
        continue;
      }

      const matchedCutsForRemnant: Cut[] = [];
      let totalCutLength = 0;

      for (const cut of sortedCuts) {
        if (matchedCuts.has(cut.componentId)) {
          continue;
        }

        if (cut.length <= remnant.length && totalCutLength + cut.length <= remnant.length) {
          matchedCutsForRemnant.push(cut);
          totalCutLength += cut.length;
          matchedCuts.add(cut.componentId);
        }
      }

      if (matchedCutsForRemnant.length > 0) {
        const waste = remnant.length - totalCutLength;
        const utilization = (totalCutLength / remnant.length) * 100;
        const savings = (remnant.length / 1000) * profile.costPerMeter * 0.5; // 50% savings vs new material
        const efficiency = this.calculateEfficiency(utilization, waste);

        matches.push({
          remnant,
          cuts: matchedCutsForRemnant,
          utilization,
          waste,
          savings,
          efficiency
        });

        usedRemnantIds.add(remnant.id);
      }
    }

    // Sort by efficiency (best first)
    return matches.sort((a, b) => b.efficiency - a.efficiency);
  }

  /**
   * Optimize cutting plan with remnants
   */
  optimizeWithRemnants(
    cuttingPlans: CuttingPlan[]
  ): RemnantOptimizationResult {
    const usedRemnants: RemnantMatch[] = [];
    const newStockRequired: CuttingPlan[] = [];
    let totalSavings = 0;
    let totalWasteReduction = 0;
    const recommendations: string[] = [];

    for (const plan of cuttingPlans) {
      // Find remnant matches
      const matches = this.findRemnantMatches(
        plan.cuts,
        plan.profile,
        plan.profile.material
      );

      if (matches.length > 0) {
        // Use remnants
        const usedCuts = new Set<string>();
        let planSavings = 0;
        let planWasteReduction = 0;

        matches.forEach(match => {
          usedRemnants.push(match);
          match.cuts.forEach(cut => usedCuts.add(cut.componentId));
          planSavings += match.savings;
          planWasteReduction += match.waste;
          this.useRemnant(match.remnant.id, match.cuts.reduce((sum, c) => sum + c.length, 0));
        });

        totalSavings += planSavings;
        totalWasteReduction += planWasteReduction;

        // Remaining cuts need new stock
        const remainingCuts = plan.cuts.filter(cut => !usedCuts.has(cut.componentId));
        if (remainingCuts.length > 0) {
          newStockRequired.push({
            ...plan,
            cuts: remainingCuts
          });
        }
      } else {
        // No remnant matches, need new stock
        newStockRequired.push(plan);
      }
    }

    // Calculate overall metrics
    const totalOriginalWaste = cuttingPlans.reduce((sum, plan) => sum + plan.totalWaste, 0);
    const remnantUtilization = usedRemnants.length > 0
      ? usedRemnants.reduce((sum, match) => sum + match.utilization, 0) / usedRemnants.length
      : 0;

    // Generate recommendations
    if (usedRemnants.length > 0) {
      recommendations.push(`Used ${usedRemnants.length} remnants, saving ${this.formatCurrency(totalSavings)}`);
    }

    if (totalWasteReduction > 0) {
      recommendations.push(`Reduced waste by ${this.formatLength(totalWasteReduction)}`);
    }

    const oldRemnants = this.getOldRemnants();
    if (oldRemnants.length > 0) {
      recommendations.push(`Warning: ${oldRemnants.length} remnants are older than ${this.maxRemnantAge} days`);
    }

    return {
      usedRemnants,
      newStockRequired,
      totalSavings,
      wasteReduction: totalWasteReduction,
      remnantUtilization,
      recommendations
    };
  }

  /**
   * Use remnant (mark as used or update length)
   */
  useRemnant(remnantId: string, usedLength: number): Remnant | null {
    const remnant = this.remnants.get(remnantId);
    if (!remnant || remnant.status !== 'available') {
      return null;
    }

    const remainingLength = remnant.length - usedLength;

    if (remainingLength >= this.minRemnantLength) {
      // Update remnant with remaining length
      remnant.length = remainingLength;
      remnant.lastUsed = new Date();
      remnant.usageCount += 1;
      this.remnants.set(remnantId, remnant);
      return remnant;
    } else {
      // Remnant is too small, mark as used
      remnant.status = 'used';
      remnant.lastUsed = new Date();
      remnant.usageCount += 1;
      this.remnants.set(remnantId, remnant);
      return null;
    }
  }

  /**
   * Get available remnants
   */
  getAvailableRemnants(profile?: Profile, material?: string): Remnant[] {
    return Array.from(this.remnants.values())
      .filter(remnant => {
        if (remnant.status !== 'available') {
          return false;
        }
        if (profile && remnant.profile.id !== profile.id) {
          return false;
        }
        if (material && remnant.material.toLowerCase() !== material.toLowerCase()) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.length - a.length); // Sort by length (longest first)
  }

  /**
   * Get old remnants (older than max age)
   */
  getOldRemnants(): Remnant[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.maxRemnantAge);

    return Array.from(this.remnants.values())
      .filter(remnant => 
        remnant.status === 'available' && 
        remnant.createdAt < cutoffDate
      );
  }

  /**
   * Scrap remnant
   */
  scrapRemnant(remnantId: string, reason?: string): boolean {
    const remnant = this.remnants.get(remnantId);
    if (!remnant) {
      return false;
    }

    remnant.status = 'scrapped';
    this.remnants.set(remnantId, remnant);
    return true;
  }

  /**
   * Get remnant statistics
   */
  getStatistics(): {
    total: number;
    available: number;
    used: number;
    scrapped: number;
    totalValue: number;
    averageLength: number;
    averageAge: number;
  } {
    const allRemnants = Array.from(this.remnants.values());
    const now = new Date();

    return {
      total: allRemnants.length,
      available: allRemnants.filter(r => r.status === 'available').length,
      used: allRemnants.filter(r => r.status === 'used').length,
      scrapped: allRemnants.filter(r => r.status === 'scrapped').length,
      totalValue: allRemnants.reduce((sum, r) => sum + r.cost, 0),
      averageLength: allRemnants.length > 0
        ? allRemnants.reduce((sum, r) => sum + r.length, 0) / allRemnants.length
        : 0,
      averageAge: allRemnants.length > 0
        ? allRemnants.reduce((sum, r) => {
            const age = (now.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24);
            return sum + age;
          }, 0) / allRemnants.length
        : 0
    };
  }

  /**
   * Assess remnant quality
   */
  private assessQuality(length: number, profile: Profile): Remnant['quality'] {
    const minLength = profile.stockLength * 0.1; // 10% of stock length
    const goodLength = profile.stockLength * 0.3; // 30% of stock length
    const excellentLength = profile.stockLength * 0.5; // 50% of stock length

    if (length >= excellentLength) {
      return 'excellent';
    } else if (length >= goodLength) {
      return 'good';
    } else if (length >= minLength) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  /**
   * Calculate efficiency score
   */
  private calculateEfficiency(utilization: number, waste: number): number {
    // Efficiency = utilization - (waste penalty)
    const wastePenalty = Math.min(waste / 100, 0.5); // Max 50% penalty
    return utilization - (wastePenalty * 100);
  }

  /**
   * Format currency
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Format length
   */
  private formatLength(length: number): string {
    return `${length.toFixed(0)}mm`;
  }
}

