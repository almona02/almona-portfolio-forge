import { supabase } from '@/lib/supabase';
import 'dotenv/config'; // Load .env file
import { CacheHelper } from '../cacheHelper';

/**
 * E-commerce / Shared Caching Module
 * 
 * Caches:
 * - Products (1 hour TTL)
 * - Pricing tiers (1 day TTL)
 * - Search results (10 min TTL)
 * - Product categories (1 day TTL)
 */
export class EcommerceCache {
  private static readonly NAMESPACE = 'shared';

  /**
   * Cache active products (1 hour TTL)
   */
  static async getActiveProducts() {
    const cacheKey = `${this.NAMESPACE}:products:active`;
    
    // Try cache first
    const cached = await CacheHelper.get<any[]>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    // Cache for 1 hour
    if (data) {
      await CacheHelper.set(cacheKey, data, { 
        ttl: 3600, // 1 hour
        namespace: this.NAMESPACE 
      });
    }

    return data || [];
  }

  /**
   * Cache product details (1 hour TTL)
   */
  static async getProduct(productId: string) {
    const cacheKey = `${this.NAMESPACE}:product:${productId}:details`;
    
    // Try cache first
    const cached = await CacheHelper.get<any>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images (*),
        product_specifications (*)
      `)
      .eq('id', productId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    // Cache for 1 hour
    if (data) {
      await CacheHelper.set(cacheKey, data, { 
        ttl: 3600, // 1 hour
        namespace: this.NAMESPACE 
      });
    }

    return data;
  }

  /**
   * Cache pricing tiers for a product (1 day TTL)
   */
  static async getPricingTiers(productId: string) {
    const cacheKey = `${this.NAMESPACE}:pricing:${productId}:tiers`;
    
    // Try cache first
    const cached = await CacheHelper.get<any[]>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const { data, error } = await supabase
      .from('pricing_tiers')
      .select('*')
      .eq('product_id', productId)
      .order('min_quantity');

    if (error) throw error;

    // Cache for 1 day (pricing rarely changes)
    if (data) {
      await CacheHelper.set(cacheKey, data, { 
        ttl: 86400, // 1 day
        namespace: this.NAMESPACE 
      });
    }

    return data || [];
  }

  /**
   * Cache search results (10 min TTL)
   */
  static async searchProducts(query: string, category?: string) {
    const cacheKey = category
      ? `${this.NAMESPACE}:search:${query}:${category}`
      : `${this.NAMESPACE}:search:${query}`;
    
    // Try cache first
    const cached = await CacheHelper.get<any[]>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    let dbQuery = supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`);

    if (category) {
      dbQuery = dbQuery.eq('category', category);
    }

    const { data, error } = await dbQuery.limit(50);

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

  /**
   * Cache product categories (1 day TTL)
   */
  static async getCategories() {
    const cacheKey = `${this.NAMESPACE}:categories:all`;
    
    // Try cache first
    const cached = await CacheHelper.get<any[]>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const { data, error } = await supabase
      .from('product_categories')
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
   * Cache products by category (1 hour TTL)
   */
  static async getProductsByCategory(category: string) {
    const cacheKey = `${this.NAMESPACE}:products:category:${category}`;
    
    // Try cache first
    const cached = await CacheHelper.get<any[]>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    // Cache for 1 hour
    if (data) {
      await CacheHelper.set(cacheKey, data, { 
        ttl: 3600, // 1 hour
        namespace: this.NAMESPACE 
      });
    }

    return data || [];
  }

  /**
   * Cache featured products (1 hour TTL)
   */
  static async getFeaturedProducts() {
    const cacheKey = `${this.NAMESPACE}:products:featured`;
    
    // Try cache first
    const cached = await CacheHelper.get<any[]>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_featured', true)
      .eq('is_active', true)
      .order('featured_order');

    if (error) throw error;

    // Cache for 1 hour
    if (data) {
      await CacheHelper.set(cacheKey, data, { 
        ttl: 3600, // 1 hour
        namespace: this.NAMESPACE 
      });
    }

    return data || [];
  }

  // ============================================================================
  // Cache Invalidation
  // ============================================================================

  /**
   * Invalidate product cache
   */
  static async invalidateProduct(productId: string) {
    await CacheHelper.delete(`${this.NAMESPACE}:product:${productId}:details`);
    await CacheHelper.delete(`${this.NAMESPACE}:products:active`);
    await CacheHelper.delete(`${this.NAMESPACE}:products:featured`);
  }

  /**
   * Invalidate pricing cache
   */
  static async invalidatePricing(productId: string) {
    await CacheHelper.delete(`${this.NAMESPACE}:pricing:${productId}:tiers`);
  }

  /**
   * Invalidate search cache
   */
  static async invalidateSearch() {
    await CacheHelper.invalidatePattern(`${this.NAMESPACE}:search:*`);
  }

  /**
   * Invalidate category cache
   */
  static async invalidateCategories() {
    await CacheHelper.delete(`${this.NAMESPACE}:categories:all`);
    await CacheHelper.invalidatePattern(`${this.NAMESPACE}:products:category:*`);
  }

  /**
   * Invalidate all e-commerce caches
   */
  static async invalidateAll() {
    await CacheHelper.invalidatePattern(`${this.NAMESPACE}:*`);
  }
}
