import { supabase } from '@/lib/supabase';
import 'dotenv/config'; // Load .env file
import { CacheHelper } from '../cacheHelper';

/**
 * Fabricator Pro Caching Module
 * 
 * Caches:
 * - Optimization results (30 min TTL)
 * - Remnant inventory (2 min TTL)
 * - System packs (1 day TTL)
 * - Fabricator profiles (10 min TTL)
 */
export class FabricatorProCache {
  private static readonly NAMESPACE = 'fabricator';

  /**
   * Cache optimization result (30 min TTL)
   */
  static async getOptimizationResult(projectId: string) {
    const cacheKey = `${this.NAMESPACE}:optimization:${projectId}:result`;
    
    // Try cache first
    const cached = await CacheHelper.get<any>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const { data, error } = await supabase
      .from('optimization_results')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;

    // Cache for 30 minutes
    if (data) {
      await CacheHelper.set(cacheKey, data, { 
        ttl: 1800, // 30 minutes
        namespace: this.NAMESPACE 
      });
    }

    return data;
  }

  /**
   * Cache remnant inventory (2 min TTL)
   */
  static async getRemnantInventory(warehouseId?: string) {
    const cacheKey = warehouseId 
      ? `${this.NAMESPACE}:remnants:${warehouseId}:inventory`
      : `${this.NAMESPACE}:remnants:all`;
    
    // Try cache first
    const cached = await CacheHelper.get<any[]>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    let query = supabase
      .from('remnant_inventory')
      .select(`
        *,
        fabricator_profiles (
          id,
          name,
          material,
          width,
          height,
          color,
          cost_per_meter
        )
      `)
      .eq('is_available', true);

    if (warehouseId) {
      query = query.eq('warehouse_id', warehouseId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Cache for 2 minutes (inventory changes frequently)
    if (data) {
      await CacheHelper.set(cacheKey, data, { 
        ttl: 120, // 2 minutes
        namespace: this.NAMESPACE 
      });
    }

    return data || [];
  }

  /**
   * Cache system pack configuration (1 day TTL)
   */
  static async getSystemPack(packId: string) {
    const cacheKey = `${this.NAMESPACE}:systempack:${packId}:config`;
    
    // Try cache first
    const cached = await CacheHelper.get<any>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const { data, error } = await supabase
      .from('system_packs')
      .select(`
        *,
        system_pack_items (
          *,
          fabricator_profiles (*)
        )
      `)
      .eq('id', packId)
      .single();

    if (error) throw error;

    // Cache for 1 day (system packs rarely change)
    if (data) {
      await CacheHelper.set(cacheKey, data, { 
        ttl: 86400, // 1 day
        namespace: this.NAMESPACE 
      });
    }

    return data;
  }

  /**
   * Cache active system packs list (1 day TTL)
   */
  static async getActiveSystemPacks() {
    const cacheKey = `${this.NAMESPACE}:systempacks:active`;
    
    // Try cache first
    const cached = await CacheHelper.get<any[]>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const { data, error } = await supabase
      .from('system_packs')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    // Cache for 1 day
    if (data) {
      await CacheHelper.set(cacheKey, data, { 
        ttl: 86400, // 1 day
        namespace: this.NAMESPACE 
      });
    }

    return data || [];
  }

  /**
   * Cache fabricator profile details (10 min TTL)
   */
  static async getProfile(profileId: string) {
    const cacheKey = `${this.NAMESPACE}:profile:${profileId}:details`;
    
    // Try cache first
    const cached = await CacheHelper.get<any>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const { data, error } = await supabase
      .from('fabricator_profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    // Cache for 10 minutes
    if (data) {
      await CacheHelper.set(cacheKey, data, { 
        ttl: 600, // 10 minutes
        namespace: this.NAMESPACE 
      });
    }

    return data;
  }

  /**
   * Cache user's fabricator profiles (10 min TTL)
   */
  static async getUserProfiles(userId: string) {
    const cacheKey = `${this.NAMESPACE}:profiles:user:${userId}`;
    
    // Try cache first
    const cached = await CacheHelper.get<any[]>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const { data, error } = await supabase
      .from('fabricator_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) throw error;

    // Cache for 10 minutes
    if (data) {
      await CacheHelper.set(cacheKey, data, { 
        ttl: 600, // 10 minutes
        namespace: this.NAMESPACE 
      });
    }

    return data || [];
  }

  // ============================================================================
  // Cache Invalidation
  // ============================================================================

  /**
   * Invalidate optimization result cache
   */
  static async invalidateOptimization(projectId: string) {
    const cacheKey = `${this.NAMESPACE}:optimization:${projectId}:result`;
    await CacheHelper.delete(cacheKey);
  }

  /**
   * Invalidate remnant inventory cache
   */
  static async invalidateRemnants(warehouseId?: string) {
    if (warehouseId) {
      await CacheHelper.delete(`${this.NAMESPACE}:remnants:${warehouseId}:inventory`);
    } else {
      await CacheHelper.invalidatePattern(`${this.NAMESPACE}:remnants:*`);
    }
  }

  /**
   * Invalidate system pack cache
   */
  static async invalidateSystemPack(packId: string) {
    await CacheHelper.delete(`${this.NAMESPACE}:systempack:${packId}:config`);
    await CacheHelper.delete(`${this.NAMESPACE}:systempacks:active`);
  }

  /**
   * Invalidate profile cache
   */
  static async invalidateProfile(profileId: string) {
    await CacheHelper.delete(`${this.NAMESPACE}:profile:${profileId}:details`);
  }

  /**
   * Invalidate user profiles cache
   */
  static async invalidateUserProfiles(userId: string) {
    await CacheHelper.delete(`${this.NAMESPACE}:profiles:user:${userId}`);
  }

  /**
   * Invalidate all Fabricator Pro caches
   */
  static async invalidateAll() {
    await CacheHelper.invalidatePattern(`${this.NAMESPACE}:*`);
  }
}
