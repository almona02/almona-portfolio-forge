import { supabase } from '@/lib/supabase';
import 'dotenv/config'; // Load .env file
import { CacheHelper } from '../cacheHelper';

/**
 * RealityOS Caching Module
 * 
 * Caches:
 * - Events (10 sec TTL - very dynamic)
 * - QR code data (5 min TTL)
 * - Event counts by type (1 min TTL)
 */
export class RealityOSCache {
  private static readonly NAMESPACE = 'realityos';

  /**
   * Cache recent events for an entity (10 sec TTL)
   */
  static async getRecentEvents(entityId: string, limit: number = 50) {
    const cacheKey = `${this.NAMESPACE}:events:${entityId}:recent`;
    
    // Try cache first
    const cached = await CacheHelper.get<any[]>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const { data, error } = await supabase
      .from('reality_events')
      .select('*')
      .eq('entity_id', entityId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Cache for 10 seconds (events are very dynamic)
    if (data) {
      await CacheHelper.set(cacheKey, data, { 
        ttl: 10, // 10 seconds
        namespace: this.NAMESPACE 
      });
    }

    return data || [];
  }

  /**
   * Cache QR code data (5 min TTL)
   */
  static async getQRCodeData(qrCode: string) {
    const cacheKey = `${this.NAMESPACE}:qr:${qrCode}:data`;
    
    // Try cache first
    const cached = await CacheHelper.get<any>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const { data, error } = await supabase
      .from('qr_codes')
      .select(`
        *,
        linked_entity:entity_id (
          id,
          type,
          name,
          metadata
        )
      `)
      .eq('code', qrCode)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    // Cache for 5 minutes
    if (data) {
      await CacheHelper.set(cacheKey, data, { 
        ttl: 300, // 5 minutes
        namespace: this.NAMESPACE 
      });
    }

    return data;
  }

  /**
   * Cache event counts by type (1 min TTL)
   */
  static async getEventCountsByType(entityId: string) {
    const cacheKey = `${this.NAMESPACE}:events:${entityId}:count_by_type`;
    
    // Try cache first
    const cached = await CacheHelper.get<Record<string, number>>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const { data, error } = await supabase
      .from('reality_events')
      .select('event_type')
      .eq('entity_id', entityId);

    if (error) throw error;

    // Count by type
    const counts: Record<string, number> = {};
    data?.forEach((event: any) => {
      counts[event.event_type] = (counts[event.event_type] || 0) + 1;
    });

    // Cache for 1 minute
    await CacheHelper.set(cacheKey, counts, { 
      ttl: 60, // 1 minute
      namespace: this.NAMESPACE 
    });

    return counts;
  }

  /**
   * Cache events by type (10 sec TTL)
   */
  static async getEventsByType(entityId: string, eventType: string, limit: number = 50) {
    const cacheKey = `${this.NAMESPACE}:events:${entityId}:type:${eventType}`;
    
    // Try cache first
    const cached = await CacheHelper.get<any[]>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const { data, error } = await supabase
      .from('reality_events')
      .select('*')
      .eq('entity_id', entityId)
      .eq('event_type', eventType)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Cache for 10 seconds
    if (data) {
      await CacheHelper.set(cacheKey, data, { 
        ttl: 10, // 10 seconds
        namespace: this.NAMESPACE 
      });
    }

    return data || [];
  }

  /**
   * Cache entity metadata (5 min TTL)
   */
  static async getEntityMetadata(entityId: string) {
    const cacheKey = `${this.NAMESPACE}:entity:${entityId}:metadata`;
    
    // Try cache first
    const cached = await CacheHelper.get<any>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const { data, error } = await supabase
      .from('entities')
      .select('*')
      .eq('id', entityId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    // Cache for 5 minutes
    if (data) {
      await CacheHelper.set(cacheKey, data, { 
        ttl: 300, // 5 minutes
        namespace: this.NAMESPACE 
      });
    }

    return data;
  }

  // ============================================================================
  // Cache Invalidation
  // ============================================================================

  /**
   * Invalidate events cache for an entity
   */
  static async invalidateEvents(entityId: string) {
    await CacheHelper.invalidatePattern(`${this.NAMESPACE}:events:${entityId}:*`);
  }

  /**
   * Invalidate QR code cache
   */
  static async invalidateQRCode(qrCode: string) {
    await CacheHelper.delete(`${this.NAMESPACE}:qr:${qrCode}:data`);
  }

  /**
   * Invalidate entity metadata cache
   */
  static async invalidateEntity(entityId: string) {
    await CacheHelper.delete(`${this.NAMESPACE}:entity:${entityId}:metadata`);
    await this.invalidateEvents(entityId);
  }

  /**
   * Invalidate all RealityOS caches
   */
  static async invalidateAll() {
    await CacheHelper.invalidatePattern(`${this.NAMESPACE}:*`);
  }
}
