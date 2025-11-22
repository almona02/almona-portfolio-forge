/**
 * Remnant Management System
 * Optimizes scrap utilization and remnant tracking for material efficiency
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
}

export interface RemnantMatch {
  remnant: Remnant;
  cuts: Cut[];
  utilization: number;
  waste: number;
  savings: number;
}

export interface RemnantOptimizationResult {
  usedRemnants: RemnantMatch[];
  newStockRequired: CuttingPlan[];
  totalSavings: number;
  wasteReduction: number;
  remnantUtilization: number;
}

export class RemnantManager {
  private remnants: Map<string, Remnant> = new Map();
  private minRemnantLength: number = 200; // Minimum usable remnant length in mm

  /**
   * Add a remnant to the inventory
   */
  addRemnant(remnant: Remnant): void {
    if (remnant.length >= this.minRemnantLength) {
      this.remnants.set(remnant.id, remnant);
    }
  }

  /**
   * Remove or update remnant after use
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
   * Find best matching remnants for cuts
   */
  findRemnantMatches(
    cuts: Cut[],
    profile: Profile,
    material: string
  ): RemnantMatch[] {
    const matches: RemnantMatch[] = [];
    const availableRemnants = Array.from(this.remnants.values()).filter(
      (r) =>
        r.status === 'available' &&
        r.profile.id === profile.id &&
        r.material === material &&
        r.quality !== 'poor'
    );

    // Sort cuts by length (descending) for better matching
    const sortedCuts = [...cuts].sort((a, b) => b.length - a.length);
    const usedRemnantIds = new Set<string>();
    const assignedCuts = new Set<string>();

    for (const cut of sortedCuts) {
      if (assignedCuts.has(cut.componentId)) continue;

      // Find best matching remnant
      let bestMatch: RemnantMatch | null = null;
      let bestUtilization = 0;

      for (const remnant of availableRemnants) {
        if (usedRemnantIds.has(remnant.id)) continue;
        if (remnant.length < cut.length) continue;

        const waste = remnant.length - cut.length;
        const utilization = (cut.length / remnant.length) * 100;

        // Prefer remnants with high utilization and low waste
        if (utilization > bestUtilization && waste < remnant.length * 0.3) {
          const savings = (remnant.length / 1000) * profile.costPerMeter;
          bestMatch = {
            remnant,
            cuts: [cut],
            utilization,
            waste,
            savings,
          };
          bestUtilization = utilization;
        }
      }

      if (bestMatch) {
        matches.push(bestMatch);
        usedRemnantIds.add(bestMatch.remnant.id);
        assignedCuts.add(cut.componentId);
      }
    }

    return matches;
  }

  /**
   * Optimize cutting plan using remnants
   */
  optimizeWithRemnants(
    cuttingPlan: CuttingPlan[],
    allowRemnantUsage: boolean = true
  ): RemnantOptimizationResult {
    if (!allowRemnantUsage) {
      return {
        usedRemnants: [],
        newStockRequired: cuttingPlan,
        totalSavings: 0,
        wasteReduction: 0,
        remnantUtilization: 0,
      };
    }

    const usedRemnants: RemnantMatch[] = [];
    const newStockRequired: CuttingPlan[] = [];
    let totalSavings = 0;
    let totalWasteReduction = 0;
    let totalRemnantLength = 0;
    let usedRemnantLength = 0;

    for (const plan of cuttingPlan) {
      const matches = this.findRemnantMatches(
        plan.cuts,
        plan.profile,
        plan.profile.material
      );

      if (matches.length > 0) {
        // Use remnants for matched cuts
        const matchedCutIds = new Set(
          matches.flatMap((m) => m.cuts.map((c) => c.componentId))
        );
        const unmatchedCuts = plan.cuts.filter(
          (c) => !matchedCutIds.has(c.componentId)
        );

        for (const match of matches) {
          usedRemnants.push(match);
          totalSavings += match.savings;
          totalWasteReduction += match.waste;
          totalRemnantLength += match.remnant.length;
          usedRemnantLength += match.cuts.reduce((sum, c) => sum + c.length, 0);

          // Update remnant status
          const totalCutLength = match.cuts.reduce(
            (sum, c) => sum + c.length,
            0
          );
          this.useRemnant(match.remnant.id, totalCutLength);
        }

        // Create new cutting plan for unmatched cuts
        if (unmatchedCuts.length > 0) {
          const totalCutLength = unmatchedCuts.reduce(
            (sum, cut) => sum + cut.length,
            0
          );
          const stockLength = plan.stockLength || 6000;
          const utilization = (totalCutLength / stockLength) * 100;

          newStockRequired.push({
            profile: plan.profile,
            stockLength,
            cuts: unmatchedCuts,
            totalWaste: stockLength - totalCutLength,
            utilization,
          });
        }
      } else {
        // No remnants available, use new stock
        newStockRequired.push(plan);
      }
    }

    const remnantUtilization =
      totalRemnantLength > 0
        ? (usedRemnantLength / totalRemnantLength) * 100
        : 0;

    return {
      usedRemnants,
      newStockRequired,
      totalSavings,
      wasteReduction: totalWasteReduction,
      remnantUtilization,
    };
  }

  /**
   * Get all available remnants
   */
  getAvailableRemnants(
    profileId?: string,
    material?: string
  ): Remnant[] {
    return Array.from(this.remnants.values()).filter(
      (r) =>
        r.status === 'available' &&
        (!profileId || r.profile.id === profileId) &&
        (!material || r.material === material)
    );
  }

  /**
   * Get remnant statistics
   */
  getRemnantStatistics(): {
    totalRemnants: number;
    totalLength: number;
    totalValue: number;
    byMaterial: Record<string, { count: number; length: number }>;
    byQuality: Record<string, number>;
  } {
    const remnants = Array.from(this.remnants.values());
    const byMaterial: Record<string, { count: number; length: number }> = {};
    const byQuality: Record<string, number> = {};

    let totalLength = 0;
    let totalValue = 0;

    for (const remnant of remnants) {
      totalLength += remnant.length;
      totalValue += remnant.cost;

      // Group by material
      if (!byMaterial[remnant.material]) {
        byMaterial[remnant.material] = { count: 0, length: 0 };
      }
      byMaterial[remnant.material].count += 1;
      byMaterial[remnant.material].length += remnant.length;

      // Group by quality
      byQuality[remnant.quality] = (byQuality[remnant.quality] || 0) + 1;
    }

    return {
      totalRemnants: remnants.length,
      totalLength,
      totalValue,
      byMaterial,
      byQuality,
    };
  }

  /**
   * Clean up old or poor quality remnants
   */
  cleanupRemnants(maxAgeDays: number = 90): Remnant[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

    const removed: Remnant[] = [];

    for (const [id, remnant] of this.remnants.entries()) {
      if (
        remnant.status === 'available' &&
        (remnant.quality === 'poor' ||
          (remnant.lastUsed && remnant.lastUsed < cutoffDate))
      ) {
        remnant.status = 'scrapped';
        removed.push(remnant);
        this.remnants.set(id, remnant);
      }
    }

    return removed;
  }

  /**
   * Generate remnants from cutting plan waste
   */
  generateRemnantsFromWaste(
    cuttingPlan: CuttingPlan[],
    minRemnantLength: number = 200
  ): Remnant[] {
    const newRemnants: Remnant[] = [];

    for (const plan of cuttingPlan) {
      const totalCutLength = plan.cuts.reduce(
        (sum, cut) => sum + cut.length,
        0
      );
      const waste = plan.stockLength - totalCutLength;

      if (waste >= minRemnantLength) {
        const remnant: Remnant = {
          id: `remnant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          profile: plan.profile,
          length: waste,
          material: plan.profile.material,
          createdAt: new Date(),
          usageCount: 0,
          status: 'available',
          quality: 'good',
          cost: (waste / 1000) * plan.profile.costPerMeter * 0.5, // 50% of original cost
        };

        newRemnants.push(remnant);
        this.addRemnant(remnant);
      }
    }

    return newRemnants;
  }
}

