/**
 * Enhanced Remnant Management System
 * Provides database-integrated remnant tracking with smart matching,
 * expiration tracking, value calculation, and consolidation suggestions
 */

import { supabase } from '../supabase';
import { Profile, CuttingPlan, Cut } from '@/types/fabricator';

export interface Remnant {
  id: string;
  userId: string;
  profileId: string;
  profile?: Profile;
  locationId?: string;
  locationName?: string;
  length: number;
  width?: number;
  height?: number;
  thickness?: number;
  sourceProjectId?: string;
  sourceCutId?: string;
  sourceStockLength?: number;
  createdAt: Date;
  usedAt?: Date;
  usedInProjectId?: string;
  lastCheckedAt: Date;
  status: 'available' | 'reserved' | 'used' | 'expired' | 'scrapped';
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  expirationDate?: Date;
  estimatedValue: number;
  usageCount: number;
  barcode?: string;
  qrCodeUrl?: string;
  notes?: string;
  tags?: string[];
}

export interface RemnantMatch {
  remnant: Remnant;
  cuts: Cut[];
  utilization: number;
  waste: number;
  savings: number;
  canFitMultiple: boolean;
}

export interface RemnantOptimizationResult {
  usedRemnants: RemnantMatch[];
  newStockRequired: CuttingPlan[];
  totalSavings: number;
  wasteReduction: number;
  remnantUtilization: number;
  recommendations: string[];
}

export interface RemnantConsolidationSuggestion {
  profileId: string;
  profileName: string;
  smallRemnantsCount: number;
  totalLength: number;
  suggestedAction: string;
  estimatedSavings: number;
}

export interface RemnantStatistics {
  totalRemnants: number;
  availableRemnants: number;
  totalLength: number;
  totalValue: number;
  byMaterial: Record<string, { count: number; length: number; value: number }>;
  byQuality: Record<string, number>;
  byStatus: Record<string, number>;
  expiringSoon: number; // Count of remnants expiring in next 30 days
  unusedRemnants: number; // Remnants older than 90 days
}

export class RemnantManager {
  private minRemnantLength: number = 200; // Minimum usable remnant length in mm
  private defaultExpirationDays: number = 90; // Default expiration period

  /**
   * Create a remnant from cutting waste
   */
  async createRemnantFromCut(
    userId: string,
    profileId: string,
    length: number,
    options: {
      sourceProjectId?: string;
      sourceCutId?: string;
      sourceStockLength?: number;
      locationId?: string;
      quality?: 'excellent' | 'good' | 'fair' | 'poor';
      notes?: string;
    } = {}
  ): Promise<Remnant | null> {
    if (length < this.minRemnantLength) {
      return null; // Too small to be useful
    }

    try {
      const { data, error } = await supabase.rpc('create_remnant_from_cut', {
        p_user_id: userId,
        p_profile_id: profileId,
        p_length: length,
        p_source_project_id: options.sourceProjectId || null,
        p_source_cut_id: options.sourceCutId || null,
        p_source_stock_length: options.sourceStockLength || null,
        p_location_id: options.locationId || null,
        p_min_remnant_length: this.minRemnantLength,
      });

      if (error) throw error;

      // Fetch the created remnant with full details
      return await this.getRemnantById(data);
    } catch (error) {
      console.error('Error creating remnant from cut:', error);
      return null;
    }
  }

  /**
   * Create remnants from cutting plan waste
   */
  async createRemnantsFromCuttingPlan(
    userId: string,
    cuttingPlan: CuttingPlan[],
    sourceProjectId?: string
  ): Promise<Remnant[]> {
    const newRemnants: Remnant[] = [];

    for (const plan of cuttingPlan) {
      const totalCutLength = plan.cuts.reduce((sum, cut) => sum + cut.length, 0);
      const waste = plan.stockLength - totalCutLength;

      if (waste >= this.minRemnantLength) {
        const remnant = await this.createRemnantFromCut(
          userId,
          plan.profile.id,
          waste,
          {
            sourceProjectId,
            sourceStockLength: plan.stockLength,
            quality: 'good',
            notes: `Auto-generated from cutting plan waste`,
          }
        );

        if (remnant) {
          newRemnants.push(remnant);
        }
      }
    }

    return newRemnants;
  }

  /**
   * Get remnant by ID
   */
  async getRemnantById(remnantId: string): Promise<Remnant | null> {
    try {
      const { data, error } = await supabase
        .from('material_remnants')
        .select(`
          *,
          fabricator_profiles (*),
          inventory_locations (name, code)
        `)
        .eq('id', remnantId)
        .single();

      if (error) throw error;
      if (!data) return null;

      return this.mapRemnantFromDb(data);
    } catch (error) {
      console.error('Error fetching remnant:', error);
      return null;
    }
  }

  /**
   * Find best matching remnants for cuts
   */
  async findRemnantMatches(
    cuts: Cut[],
    profile: Profile,
    material: string,
    options: {
      useRemnantsFirst?: boolean;
      minUtilization?: number;
      maxWastePercentage?: number;
    } = {}
  ): Promise<RemnantMatch[]> {
    const {
      useRemnantsFirst = true,
      minUtilization = 70,
      maxWastePercentage = 30,
    } = options;

    if (!useRemnantsFirst) {
      return [];
    }

    try {
      // Get available remnants for this profile
      const { data: remnants, error } = await supabase
        .from('material_remnants')
        .select(`
          *,
          fabricator_profiles (*),
          inventory_locations (name, code)
        `)
        .eq('user_id', profile.userId || '')
        .eq('profile_id', profile.id)
        .eq('status', 'available')
        .gte('length', Math.min(...cuts.map(c => c.length)))
        .order('length', { ascending: false });

      if (error) throw error;
      if (!remnants || remnants.length === 0) return [];

      const matches: RemnantMatch[] = [];
      const usedRemnantIds = new Set<string>();
      const assignedCuts = new Set<string>();

      // Sort cuts by length (descending) for better matching
      const sortedCuts = [...cuts].sort((a, b) => b.length - a.length);

      for (const cut of sortedCuts) {
        if (assignedCuts.has(cut.componentId)) continue;

        let bestMatch: RemnantMatch | null = null;
        let bestUtilization = 0;

        for (const remnantData of remnants) {
          const remnant = this.mapRemnantFromDb(remnantData);
          if (usedRemnantIds.has(remnant.id)) continue;
          if (remnant.length < cut.length) continue;

          const waste = remnant.length - cut.length;
          const utilization = (cut.length / remnant.length) * 100;
          const wastePercentage = (waste / remnant.length) * 100;

          // Check if match meets criteria
          if (
            utilization >= minUtilization &&
            wastePercentage <= maxWastePercentage &&
            utilization > bestUtilization
          ) {
            const savings = (remnant.length / 1000) * profile.costPerMeter;
            bestMatch = {
              remnant,
              cuts: [cut],
              utilization,
              waste,
              savings,
              canFitMultiple: false,
            };
            bestUtilization = utilization;
          }
        }

        if (bestMatch) {
          // Check if we can fit multiple cuts in this remnant
          const remainingLength = bestMatch.remnant.length - bestMatch.cuts[0].length;
          const additionalCuts: Cut[] = [];

          for (const otherCut of sortedCuts) {
            if (
              otherCut.componentId !== cut.componentId &&
              !assignedCuts.has(otherCut.componentId) &&
              otherCut.length <= remainingLength
            ) {
              additionalCuts.push(otherCut);
              assignedCuts.add(otherCut.componentId);
            }
          }

          if (additionalCuts.length > 0) {
            bestMatch.cuts.push(...additionalCuts);
            bestMatch.canFitMultiple = true;
            // Recalculate metrics
            const totalCutLength = bestMatch.cuts.reduce((sum, c) => sum + c.length, 0);
            bestMatch.utilization = (totalCutLength / bestMatch.remnant.length) * 100;
            bestMatch.waste = bestMatch.remnant.length - totalCutLength;
          }

          matches.push(bestMatch);
          usedRemnantIds.add(bestMatch.remnant.id);
          assignedCuts.add(cut.componentId);
        }
      }

      return matches;
    } catch (error) {
      console.error('Error finding remnant matches:', error);
      return [];
    }
  }

  /**
   * Optimize cutting plan using remnants
   */
  async optimizeWithRemnants(
    userId: string,
    cuttingPlan: CuttingPlan[],
    options: {
      useRemnantsFirst?: boolean;
      minUtilization?: number;
      maxWastePercentage?: number;
    } = {}
  ): Promise<RemnantOptimizationResult> {
    const {
      useRemnantsFirst = true,
      minUtilization = 70,
      maxWastePercentage = 30,
    } = options;

    if (!useRemnantsFirst) {
      return {
        usedRemnants: [],
        newStockRequired: cuttingPlan,
        totalSavings: 0,
        wasteReduction: 0,
        remnantUtilization: 0,
        recommendations: [],
      };
    }

    const usedRemnants: RemnantMatch[] = [];
    const newStockRequired: CuttingPlan[] = [];
    let totalSavings = 0;
    let totalWasteReduction = 0;
    const recommendations: string[] = [];

    for (const plan of cuttingPlan) {
      const matches = await this.findRemnantMatches(plan.cuts, plan.profile, plan.profile.material, {
        useRemnantsFirst,
        minUtilization,
        maxWastePercentage,
      });

      if (matches.length > 0) {
        const matchedCutIds = new Set(
          matches.flatMap((m) => m.cuts.map((c) => c.componentId))
        );
        const unmatchedCuts = plan.cuts.filter((c) => !matchedCutIds.has(c.componentId));

        for (const match of matches) {
          usedRemnants.push(match);
          totalSavings += match.savings;
          totalWasteReduction += match.waste;

          // Use the remnant
          const totalCutLength = match.cuts.reduce((sum, c) => sum + c.length, 0);
          await this.useRemnant(match.remnant.id, totalCutLength, undefined, userId);
        }

        // Create new cutting plan for unmatched cuts
        if (unmatchedCuts.length > 0) {
          const totalCutLength = unmatchedCuts.reduce((sum, cut) => sum + cut.length, 0);
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

        recommendations.push(
          `Used ${matches.length} remnant(s) for ${plan.profile.name}, saving ${totalSavings.toFixed(2)}`
        );
      } else {
        newStockRequired.push(plan);
      }
    }

    const totalRemnantLength = usedRemnants.reduce((sum, m) => sum + m.remnant.length, 0);
    const usedRemnantLength = usedRemnants.reduce(
      (sum, m) => sum + m.cuts.reduce((s, c) => s + c.length, 0),
      0
    );
    const remnantUtilization =
      totalRemnantLength > 0 ? (usedRemnantLength / totalRemnantLength) * 100 : 0;

    return {
      usedRemnants,
      newStockRequired,
      totalSavings,
      wasteReduction: totalWasteReduction,
      remnantUtilization,
      recommendations,
    };
  }

  /**
   * Use a remnant (mark as used or update remaining length)
   */
  async useRemnant(
    remnantId: string,
    usedLength: number,
    projectId?: string,
    userId?: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('use_remnant', {
        p_remnant_id: remnantId,
        p_used_length: usedLength,
        p_project_id: projectId || null,
        p_user_id: userId || null,
      });

      if (error) throw error;
      return data === true;
    } catch (error) {
      console.error('Error using remnant:', error);
      return false;
    }
  }

  /**
   * Get all available remnants
   */
  async getAvailableRemnants(
    userId: string,
    filters: {
      profileId?: string;
      material?: string;
      locationId?: string;
      minLength?: number;
      maxLength?: number;
      quality?: 'excellent' | 'good' | 'fair' | 'poor';
    } = {}
  ): Promise<Remnant[]> {
    try {
      let query = supabase
        .from('material_remnants')
        .select(`
          *,
          fabricator_profiles (*),
          inventory_locations (name, code)
        `)
        .eq('user_id', userId)
        .eq('status', 'available')
        .order('created_at', { ascending: false });

      if (filters.profileId) {
        query = query.eq('profile_id', filters.profileId);
      }

      if (filters.material) {
        query = query.eq('fabricator_profiles.material', filters.material);
      }

      if (filters.locationId) {
        query = query.eq('location_id', filters.locationId);
      }

      if (filters.minLength) {
        query = query.gte('length', filters.minLength);
      }

      if (filters.maxLength) {
        query = query.lte('length', filters.maxLength);
      }

      if (filters.quality) {
        query = query.eq('quality', filters.quality);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map((r) => this.mapRemnantFromDb(r));
    } catch (error) {
      console.error('Error fetching available remnants:', error);
      return [];
    }
  }

  /**
   * Get remnant statistics
   */
  async getRemnantStatistics(userId: string): Promise<RemnantStatistics> {
    try {
      const { data: remnants, error } = await supabase
        .from('material_remnants')
        .select(`
          *,
          fabricator_profiles (material, cost_per_meter)
        `)
        .eq('user_id', userId);

      if (error) throw error;

      const stats: RemnantStatistics = {
        totalRemnants: remnants?.length || 0,
        availableRemnants: 0,
        totalLength: 0,
        totalValue: 0,
        byMaterial: {},
        byQuality: {},
        byStatus: {},
        expiringSoon: 0,
        unusedRemnants: 0,
      };

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      for (const remnantData of remnants || []) {
        const remnant = this.mapRemnantFromDb(remnantData);
        const material = remnant.profile?.material || 'unknown';

        if (remnant.status === 'available') {
          stats.availableRemnants++;
        }

        stats.totalLength += remnant.length;
        stats.totalValue += remnant.estimatedValue;

        // Group by material
        if (!stats.byMaterial[material]) {
          stats.byMaterial[material] = { count: 0, length: 0, value: 0 };
        }
        stats.byMaterial[material].count++;
        stats.byMaterial[material].length += remnant.length;
        stats.byMaterial[material].value += remnant.estimatedValue;

        // Group by quality
        stats.byQuality[remnant.quality] = (stats.byQuality[remnant.quality] || 0) + 1;

        // Group by status
        stats.byStatus[remnant.status] = (stats.byStatus[remnant.status] || 0) + 1;

        // Check expiration
        if (remnant.expirationDate && remnant.expirationDate <= thirtyDaysFromNow) {
          stats.expiringSoon++;
        }

        // Check unused
        if (remnant.createdAt < ninetyDaysAgo && remnant.status === 'available') {
          stats.unusedRemnants++;
        }
      }

      return stats;
    } catch (error) {
      console.error('Error getting remnant statistics:', error);
      return {
        totalRemnants: 0,
        availableRemnants: 0,
        totalLength: 0,
        totalValue: 0,
        byMaterial: {},
        byQuality: {},
        byStatus: {},
        expiringSoon: 0,
        unusedRemnants: 0,
      };
    }
  }

  /**
   * Get consolidation suggestions
   */
  async getConsolidationSuggestions(
    userId: string,
    profileId?: string
  ): Promise<RemnantConsolidationSuggestion[]> {
    try {
      const { data, error } = await supabase.rpc('get_remnant_consolidation_suggestions', {
        p_user_id: userId,
        p_profile_id: profileId || null,
      });

      if (error) throw error;
      return (data || []) as RemnantConsolidationSuggestion[];
    } catch (error) {
      console.error('Error getting consolidation suggestions:', error);
      return [];
    }
  }

  /**
   * Check and update expiring remnants
   */
  async checkExpiringRemnants(userId: string, daysBeforeExpiration: number = 30): Promise<number> {
    try {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + daysBeforeExpiration);

      const { data, error } = await supabase
        .from('material_remnants')
        .update({ status: 'expired' })
        .eq('user_id', userId)
        .eq('status', 'available')
        .lte('expiration_date', expirationDate.toISOString())
        .select('id');

      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      console.error('Error checking expiring remnants:', error);
      return 0;
    }
  }

  /**
   * Clean up old or poor quality remnants
   */
  async cleanupRemnants(
    userId: string,
    options: {
      maxAgeDays?: number;
      includePoorQuality?: boolean;
    } = {}
  ): Promise<number> {
    const { maxAgeDays = 90, includePoorQuality = true } = options;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

      let query = supabase
        .from('material_remnants')
        .update({ status: 'scrapped' })
        .eq('user_id', userId)
        .eq('status', 'available')
        .lt('created_at', cutoffDate.toISOString());

      if (includePoorQuality) {
        query = query.or('created_at.lt.' + cutoffDate.toISOString() + ',quality.eq.poor');
      }

      const { data, error } = await query.select('id');

      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      console.error('Error cleaning up remnants:', error);
      return 0;
    }
  }

  /**
   * Generate barcode/QR code for remnant
   */
  async generateBarcode(remnantId: string): Promise<{ barcode: string; qrCodeUrl: string } | null> {
    try {
      // Generate barcode if not exists
      const { data: remnant, error: fetchError } = await supabase
        .from('material_remnants')
        .select('barcode')
        .eq('id', remnantId)
        .single();

      if (fetchError) throw fetchError;

      let barcode = remnant?.barcode;
      if (!barcode) {
        barcode = `RM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const { error: updateError } = await supabase
          .from('material_remnants')
          .update({ barcode })
          .eq('id', remnantId);

        if (updateError) throw updateError;
      }

      // Generate QR code URL (using a QR code service or local generation)
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(barcode)}`;

      return { barcode, qrCodeUrl };
    } catch (error) {
      console.error('Error generating barcode:', error);
      return null;
    }
  }

  /**
   * Map database record to Remnant interface
   */
  private mapRemnantFromDb(data: any): Remnant {
    return {
      id: data.id,
      userId: data.user_id,
      profileId: data.profile_id,
      profile: data.fabricator_profiles
        ? {
            id: data.fabricator_profiles.id,
            name: data.fabricator_profiles.name,
            material: data.fabricator_profiles.material,
            width: data.fabricator_profiles.width,
            height: data.fabricator_profiles.height,
            color: data.fabricator_profiles.color || '#C0C0C0',
            costPerMeter: data.fabricator_profiles.cost_per_meter,
            stockQuantity: data.fabricator_profiles.stock_quantity || 0,
            minStockLevel: data.fabricator_profiles.min_stock_level || 0,
            supplier: data.fabricator_profiles.supplier,
            userId: data.fabricator_profiles.user_id,
          }
        : undefined,
      locationId: data.location_id,
      locationName: data.inventory_locations?.name,
      length: parseFloat(data.length),
      width: data.width ? parseFloat(data.width) : undefined,
      height: data.height ? parseFloat(data.height) : undefined,
      thickness: data.thickness ? parseFloat(data.thickness) : undefined,
      sourceProjectId: data.source_project_id,
      sourceCutId: data.source_cut_id,
      sourceStockLength: data.source_stock_length ? parseFloat(data.source_stock_length) : undefined,
      createdAt: new Date(data.created_at),
      usedAt: data.used_at ? new Date(data.used_at) : undefined,
      usedInProjectId: data.used_in_project_id,
      lastCheckedAt: new Date(data.last_checked_at || data.created_at),
      status: data.status,
      quality: data.quality,
      expirationDate: data.expiration_date ? new Date(data.expiration_date) : undefined,
      estimatedValue: parseFloat(data.estimated_value || 0),
      usageCount: data.usage_count || 0,
      barcode: data.barcode,
      qrCodeUrl: data.qr_code_url,
      notes: data.notes,
      tags: data.tags || [],
    };
  }
}

// Export singleton instance
export const remnantManager = new RemnantManager();

