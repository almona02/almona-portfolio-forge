/**
 * Price History Service
 * 
 * Service for managing system pricing history and audit trails.
 * Provides functionality for:
 * - Saving price changes to history
 * - Retrieving price history with filtering
 * - Comparing current vs historical pricing
 * - Rolling back to previous versions
 * 
 * @since Pricing Tuning Studio - Gold Tier Enhancement
 */

import { supabase } from '@/lib/supabase';
import type { SystemPricingState } from '@/types/pricing';

/**
 * Price history entry
 */
export interface PriceHistoryEntry {
  id: string;
  systemPackId: string;
  profileId: string;
  userId: string;
  pricingData: SystemPricingState;
  changeType: 'update' | 'bulk_update' | 'rollback' | 'initial_setup';
  reason?: string;
  versionNumber: number;
  createdAt: Date;
}

/**
 * Price history filter options
 */
export interface PriceHistoryFilter {
  profileId?: string;
  systemPackId?: string;
  userId?: string;
  changeType?: PriceHistoryEntry['changeType'];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Price comparison result
 */
export interface PriceComparison {
  current: SystemPricingState;
  historical: SystemPricingState;
  changes: Array<{
    field: string;
    oldValue: any;
    newValue: any;
    changeType: 'added' | 'removed' | 'modified';
  }>;
}

/**
 * PriceHistoryService - Service for managing pricing history
 */
export class PriceHistoryService {
  private static instance: PriceHistoryService;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PriceHistoryService {
    if (!PriceHistoryService.instance) {
      PriceHistoryService.instance = new PriceHistoryService();
    }
    return PriceHistoryService.instance;
  }

  /**
   * Save pricing change to history
   */
  async savePriceHistory(
    profileId: string,
    systemPackId: string,
    userId: string,
    pricingData: SystemPricingState,
    changeType: PriceHistoryEntry['changeType'] = 'update',
    reason?: string
  ): Promise<PriceHistoryEntry> {
    try {
      const db = supabase as any;

      // Get next version number by querying max version
      const { data: versionData, error: versionError } = await db
        .from('system_pricing_history')
        .select('version_number')
        .eq('profile_id', profileId)
        .eq('system_pack_id', systemPackId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      // If no history exists, start at version 1, otherwise increment
      const versionNumber = versionError?.code === 'PGRST116' 
        ? 1 
        : ((versionData?.version_number || 0) + 1);

      // Insert history entry
      const { data, error } = await db
        .from('system_pricing_history')
        .insert({
          profile_id: profileId,
          system_pack_id: systemPackId,
          user_id: userId,
          pricing_data: pricingData,
          change_type: changeType,
          reason: reason || null,
          version_number: versionNumber,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return this.mapDatabaseRowToEntry(data);
    } catch (error) {
      console.error('Error saving price history:', error);
      throw error;
    }
  }

  /**
   * Get price history with filtering
   */
  async getPriceHistory(filter: PriceHistoryFilter): Promise<PriceHistoryEntry[]> {
    try {
      const db = supabase as any;
      let query = db.from('system_pricing_history').select('*');

      // Apply filters
      if (filter.profileId) {
        query = query.eq('profile_id', filter.profileId);
      }

      if (filter.systemPackId) {
        query = query.eq('system_pack_id', filter.systemPackId);
      }

      if (filter.userId) {
        query = query.eq('user_id', filter.userId);
      }

      if (filter.changeType) {
        query = query.eq('change_type', filter.changeType);
      }

      if (filter.startDate) {
        query = query.gte('created_at', filter.startDate.toISOString());
      }

      if (filter.endDate) {
        query = query.lte('created_at', filter.endDate.toISOString());
      }

      // Order by created_at descending (newest first)
      query = query.order('created_at', { ascending: false });

      // Apply pagination
      if (filter.limit) {
        query = query.limit(filter.limit);
      }

      if (filter.offset) {
        query = query.range(filter.offset, filter.offset + (filter.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data || []).map((row: any) => this.mapDatabaseRowToEntry(row));
    } catch (error) {
      console.error('Error retrieving price history:', error);
      throw error;
    }
  }

  /**
   * Get specific version by ID
   */
  async getPriceHistoryById(entryId: string): Promise<PriceHistoryEntry | null> {
    try {
      const db = supabase as any;
      const { data, error } = await db
        .from('system_pricing_history')
        .select('*')
        .eq('id', entryId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      return this.mapDatabaseRowToEntry(data);
    } catch (error) {
      console.error('Error retrieving price history entry:', error);
      throw error;
    }
  }

  /**
   * Get latest version for a profile/system pack
   */
  async getLatestVersion(
    profileId: string,
    systemPackId: string
  ): Promise<PriceHistoryEntry | null> {
    try {
      const db = supabase as any;
      const { data, error } = await db
        .from('system_pricing_history')
        .select('*')
        .eq('profile_id', profileId)
        .eq('system_pack_id', systemPackId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return this.mapDatabaseRowToEntry(data);
    } catch (error) {
      console.error('Error retrieving latest version:', error);
      throw error;
    }
  }

  /**
   * Compare current pricing with historical version
   */
  comparePrices(
    current: SystemPricingState,
    historical: SystemPricingState
  ): PriceComparison {
    const changes: PriceComparison['changes'] = [];

    // Compare profile prices
    const currentProfiles = current.profilePrices || {};
    const historicalProfiles = historical.profilePrices || {};
    const allProfileCodes = new Set([
      ...Object.keys(currentProfiles),
      ...Object.keys(historicalProfiles),
    ]);

    allProfileCodes.forEach((code) => {
      const currentPrice = currentProfiles[code];
      const historicalPrice = historicalProfiles[code];

      if (currentPrice === undefined) {
        changes.push({
          field: `profilePrices.${code}`,
          oldValue: historicalPrice,
          newValue: undefined,
          changeType: 'removed',
        });
      } else if (historicalPrice === undefined) {
        changes.push({
          field: `profilePrices.${code}`,
          oldValue: undefined,
          newValue: currentPrice,
          changeType: 'added',
        });
      } else if (currentPrice !== historicalPrice) {
        changes.push({
          field: `profilePrices.${code}`,
          oldValue: historicalPrice,
          newValue: currentPrice,
          changeType: 'modified',
        });
      }
    });

    // Compare hardware prices
    const currentHardware = current.hardware || {};
    const historicalHardware = historical.hardware || {};
    const allHardwareCodes = new Set([
      ...Object.keys(currentHardware),
      ...Object.keys(historicalHardware),
    ]);

    allHardwareCodes.forEach((code) => {
      const currentPrice = currentHardware[code];
      const historicalPrice = historicalHardware[code];

      if (currentPrice === undefined) {
        changes.push({
          field: `hardware.${code}`,
          oldValue: historicalPrice,
          newValue: undefined,
          changeType: 'removed',
        });
      } else if (historicalPrice === undefined) {
        changes.push({
          field: `hardware.${code}`,
          oldValue: undefined,
          newValue: currentPrice,
          changeType: 'added',
        });
      } else if (currentPrice !== historicalPrice) {
        changes.push({
          field: `hardware.${code}`,
          oldValue: historicalPrice,
          newValue: currentPrice,
          changeType: 'modified',
        });
      }
    });

    // Compare gaskets
    const currentGaskets = current.gaskets || {};
    const historicalGaskets = historical.gaskets || {};
    const allGasketCodes = new Set([
      ...Object.keys(currentGaskets),
      ...Object.keys(historicalGaskets),
    ]);

    allGasketCodes.forEach((code) => {
      const currentPrice = currentGaskets[code];
      const historicalPrice = historicalGaskets[code];

      if (currentPrice === undefined) {
        changes.push({
          field: `gaskets.${code}`,
          oldValue: historicalPrice,
          newValue: undefined,
          changeType: 'removed',
        });
      } else if (historicalPrice === undefined) {
        changes.push({
          field: `gaskets.${code}`,
          oldValue: undefined,
          newValue: currentPrice,
          changeType: 'added',
        });
      } else if (currentPrice !== historicalPrice) {
        changes.push({
          field: `gaskets.${code}`,
          oldValue: historicalPrice,
          newValue: currentPrice,
          changeType: 'modified',
        });
      }
    });

    // Compare glazing types (simplified - compare arrays)
    const currentGlazing = current.glazingTypes || [];
    const historicalGlazing = historical.glazingTypes || [];
    if (JSON.stringify(currentGlazing) !== JSON.stringify(historicalGlazing)) {
      changes.push({
        field: 'glazingTypes',
        oldValue: historicalGlazing,
        newValue: currentGlazing,
        changeType: 'modified',
      });
    }

    // Compare aluminum price
    if (current.aluminumPricePerKg !== historical.aluminumPricePerKg) {
      changes.push({
        field: 'aluminumPricePerKg',
        oldValue: historical.aluminumPricePerKg,
        newValue: current.aluminumPricePerKg,
        changeType: 'modified',
      });
    }

    // Compare currency
    if (current.currency !== historical.currency) {
      changes.push({
        field: 'currency',
        oldValue: historical.currency,
        newValue: current.currency,
        changeType: 'modified',
      });
    }

    return {
      current,
      historical,
      changes,
    };
  }

  /**
   * Map database row to PriceHistoryEntry
   */
  private mapDatabaseRowToEntry(row: any): PriceHistoryEntry {
    return {
      id: row.id,
      systemPackId: row.system_pack_id,
      profileId: row.profile_id,
      userId: row.user_id,
      pricingData: row.pricing_data as SystemPricingState,
      changeType: row.change_type,
      reason: row.reason || undefined,
      versionNumber: row.version_number,
      createdAt: new Date(row.created_at),
    };
  }
}

// Export singleton instance getter
export const priceHistoryService = PriceHistoryService.getInstance();
