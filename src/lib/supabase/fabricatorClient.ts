/**
 * Robust Supabase Client for Fabricator Operations
 * 
 * Features:
 * - Row Level Security (RLS) enforcement
 * - User-based data isolation
 * - Audit trails for sensitive operations
 * - Real-time subscriptions for live updates
 * - Connection pooling and performance monitoring
 * - Batch operations for bulk data
 * - Error handling and retry logic
 */

import { supabase } from '../supabase';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type {
  Profile,
  FabricatorAccessory,
  ProfileAccessoryCompatibility,
} from '@/types/fabricator';

// ============================================================================
// Types
// ============================================================================

export interface FabricatorClientConfig {
  enableRealtime?: boolean;
  enableAuditLogging?: boolean;
  enablePerformanceMonitoring?: boolean;
  batchSize?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface BatchOperationResult<T, TInput = T> {
  success: T[];
  failed: Array<{ item: TInput; error: Error }>;
  total: number;
}

export interface AuditLogEntry {
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';
  table_name: string;
  record_id: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  user_id: string;
  ip_address?: string;
  user_agent?: string;
}

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

// ============================================================================
// Fabricator Client Class
// ============================================================================

export class FabricatorClient {
  private client: SupabaseClient<Database>;
  private config: Required<FabricatorClientConfig>;
  private realtimeChannels: Map<string, RealtimeChannel> = new Map();
  private performanceMetrics: PerformanceMetrics[] = [];
  private userId: string | null = null;

  constructor(config: FabricatorClientConfig = {}) {
    this.client = supabase as SupabaseClient<Database>;
    this.config = {
      enableRealtime: config.enableRealtime ?? true,
      enableAuditLogging: config.enableAuditLogging ?? true,
      enablePerformanceMonitoring: config.enablePerformanceMonitoring ?? true,
      batchSize: config.batchSize ?? 100,
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 1000,
    };

    // Initialize user ID
    this.initializeUser();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private async initializeUser() {
    try {
      const { data: { user } } = await this.client.auth.getUser();
      this.userId = user?.id || null;
    } catch (error) {
      console.warn('[FabricatorClient] Failed to get user:', error);
    }
  }

  private async getUserId(): Promise<string> {
    if (this.userId) return this.userId;
    
    const { data: { user }, error } = await this.client.auth.getUser();
    if (error || !user) {
      throw new Error('User not authenticated');
    }
    
    this.userId = user.id;
    return user.id;
  }

  // ============================================================================
  // Performance Monitoring
  // ============================================================================

  private async measurePerformance<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    if (!this.config.enablePerformanceMonitoring) {
      return fn();
    }

    const startTime = performance.now();
    let success = true;
    let error: string | undefined;

    try {
      const result = await fn();
      return result;
    } catch (e) {
      success = false;
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      const duration = performance.now() - startTime;
      const metric: PerformanceMetrics = {
        operation,
        duration,
        timestamp: Date.now(),
        success,
        error,
      };

      this.performanceMetrics.push(metric);

      // Keep only last 100 metrics
      if (this.performanceMetrics.length > 100) {
        this.performanceMetrics.shift();
      }

      // Log slow operations
      if (duration > 3000) {
        console.warn(`[FabricatorClient] Slow operation: ${operation} took ${duration.toFixed(2)}ms`);
      }
    }
  }

  getPerformanceMetrics(): PerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  clearPerformanceMetrics(): void {
    this.performanceMetrics = [];
  }

  // ============================================================================
  // Audit Logging
  // ============================================================================

  private async logAuditEntry(entry: Omit<AuditLogEntry, 'user_id'>): Promise<void> {
    if (!this.config.enableAuditLogging) return;

    try {
      const userId = await this.getUserId();
      const ipAddress = await this.getClientIP();
      const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : undefined;

      await (this.client.from('audit_logs') as any).insert({
        ...entry,
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
    } catch (error) {
      console.error('[FabricatorClient] Failed to log audit entry:', error);
      // Don't throw - audit logging should not break operations
    }
  }

  private async getClientIP(): Promise<string | undefined> {
    // In a real implementation, you might get this from headers or a service
    return undefined;
  }

  // ============================================================================
  // Retry Logic
  // ============================================================================

  private async withRetry<T>(
    operation: string,
    fn: () => Promise<T>,
    attempts = this.config.retryAttempts
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on authentication errors
        if (lastError.message.includes('JWT') || lastError.message.includes('auth')) {
          throw lastError;
        }

        if (i < attempts - 1) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * (i + 1)));
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  // ============================================================================
  // Profile Operations
  // ============================================================================

  async getProfiles(options: QueryOptions = {}): Promise<Profile[]> {
    return this.measurePerformance('getProfiles', async () => {
      const userId = await this.getUserId();
      
      let query = this.client
        .from('fabricator_profiles')
        .select('*')
        .eq('user_id', userId);

      // Apply filters
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.orderDirection !== 'desc',
        });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Log audit
      await this.logAuditEntry({
        action: 'SELECT',
        table_name: 'fabricator_profiles',
        record_id: 'multiple',
      });

      return (data || []).map(this.mapProfileFromDB);
    });
  }

  async getProfile(id: string): Promise<Profile | null> {
    return this.measurePerformance('getProfile', async () => {
      const userId = await this.getUserId();
      
      const { data, error } = await this.client
        .from('fabricator_profiles')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      if (!data) return null;

      await this.logAuditEntry({
        action: 'SELECT',
        table_name: 'fabricator_profiles',
        record_id: id,
      });

      return this.mapProfileFromDB(data);
    });
  }

  async createProfile(profile: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>): Promise<Profile> {
    return this.measurePerformance('createProfile', async () => {
      const userId = await this.getUserId();
      
      const profileData = this.mapProfileToDB(profile);

      const { data, error } = await this.withRetry('createProfile', async () => {
        return await this.client
          .from('fabricator_profiles')
          .insert({
            ...profileData,
            user_id: userId,
          })
          .select()
          .single();
      });

      if (error) throw error;
      if (!data) throw new Error('Failed to create profile');

      await this.logAuditEntry({
        action: 'INSERT',
        table_name: 'fabricator_profiles',
        record_id: (data as any).id,
        new_values: data as any,
      });

      return this.mapProfileFromDB(data);
    });
  }

  async updateProfile(
    id: string,
    updates: Partial<Omit<Profile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Profile> {
    return this.measurePerformance('updateProfile', async () => {
      const userId = await this.getUserId();
      
      // Get old values for audit
      const oldProfile = await this.getProfile(id);
      if (!oldProfile) throw new Error('Profile not found');

      const updateData = this.mapProfileToDB(updates as Partial<Profile>);

      const { data, error } = await this.withRetry('updateProfile', async () => {
        return await (this.client
          .from('fabricator_profiles') as any)
          .update(updateData)
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single();
      });

      if (error) throw error;
      if (!data) throw new Error('Failed to update profile');

      await this.logAuditEntry({
        action: 'UPDATE',
        table_name: 'fabricator_profiles',
        record_id: id,
        old_values: oldProfile as any,
        new_values: data as any,
      });

      return this.mapProfileFromDB(data);
    });
  }

  async deleteProfile(id: string): Promise<void> {
    return this.measurePerformance('deleteProfile', async () => {
      const userId = await this.getUserId();
      
      // Get old values for audit
      const oldProfile = await this.getProfile(id);
      if (!oldProfile) throw new Error('Profile not found');

      const { error } = await this.withRetry('deleteProfile', async () => {
        return await this.client
          .from('fabricator_profiles')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);
      });

      if (error) throw error;

      await this.logAuditEntry({
        action: 'DELETE',
        table_name: 'fabricator_profiles',
        record_id: id,
        old_values: oldProfile,
      });
    });
  }

  // ============================================================================
  // Accessory Operations
  // ============================================================================

  async getAccessories(options: QueryOptions = {}): Promise<FabricatorAccessory[]> {
    return this.measurePerformance('getAccessories', async () => {
      const userId = await this.getUserId();
      
      let query = this.client
        .from('fabricator_accessories')
        .select('*')
        .eq('user_id', userId);

      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      if (options.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.orderDirection !== 'desc',
        });
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      await this.logAuditEntry({
        action: 'SELECT',
        table_name: 'fabricator_accessories',
        record_id: 'multiple',
      });

      return (data || []).map(this.mapAccessoryFromDB);
    });
  }

  async getAccessory(id: string): Promise<FabricatorAccessory | null> {
    return this.measurePerformance('getAccessory', async () => {
      const userId = await this.getUserId();
      
      const { data, error } = await this.client
        .from('fabricator_accessories')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      if (!data) return null;

      await this.logAuditEntry({
        action: 'SELECT',
        table_name: 'fabricator_accessories',
        record_id: id,
      });

      return this.mapAccessoryFromDB(data);
    });
  }

  async createAccessory(
    accessory: Omit<FabricatorAccessory, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<FabricatorAccessory> {
    return this.measurePerformance('createAccessory', async () => {
      const userId = await this.getUserId();
      
      const accessoryData = this.mapAccessoryToDB(accessory);

      const { data, error } = await this.withRetry('createAccessory', async () => {
        return await this.client
          .from('fabricator_accessories')
          .insert({
            ...accessoryData,
            user_id: userId,
          })
          .select()
          .single();
      });

      if (error) throw error;
      if (!data) throw new Error('Failed to create accessory');

      await this.logAuditEntry({
        action: 'INSERT',
        table_name: 'fabricator_accessories',
        record_id: (data as any).id,
        new_values: data as any,
      });

      return this.mapAccessoryFromDB(data);
    });
  }

  async updateAccessory(
    id: string,
    updates: Partial<Omit<FabricatorAccessory, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<FabricatorAccessory> {
    return this.measurePerformance('updateAccessory', async () => {
      const userId = await this.getUserId();
      
      const oldAccessory = await this.getAccessory(id);
      if (!oldAccessory) throw new Error('Accessory not found');

      const updateData = this.mapAccessoryToDB(updates as Partial<FabricatorAccessory>);

      const { data, error } = await this.withRetry('updateAccessory', async () => {
        return await (this.client
          .from('fabricator_accessories') as any)
          .update(updateData)
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single();
      });

      if (error) throw error;
      if (!data) throw new Error('Failed to update accessory');

      await this.logAuditEntry({
        action: 'UPDATE',
        table_name: 'fabricator_accessories',
        record_id: id,
        old_values: oldAccessory as any,
        new_values: data as any,
      });

      return this.mapAccessoryFromDB(data);
    });
  }

  async deleteAccessory(id: string): Promise<void> {
    return this.measurePerformance('deleteAccessory', async () => {
      const userId = await this.getUserId();
      
      const oldAccessory = await this.getAccessory(id);
      if (!oldAccessory) throw new Error('Accessory not found');

      const { error } = await this.withRetry('deleteAccessory', async () => {
        return await this.client
          .from('fabricator_accessories')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);
      });

      if (error) throw error;

      await this.logAuditEntry({
        action: 'DELETE',
        table_name: 'fabricator_accessories',
        record_id: id,
        old_values: oldAccessory,
      });
    });
  }

  // ============================================================================
  // Compatibility Operations
  // ============================================================================

  async getCompatibleAccessories(profileId: string): Promise<FabricatorAccessory[]> {
    return this.measurePerformance('getCompatibleAccessories', async () => {
      const userId = await this.getUserId();
      
      const { data, error } = await this.client
        .from('profile_accessory_compatibility')
        .select(`
          accessory_id,
          fabricator_accessories (*)
        `)
        .eq('profile_id', profileId);

      if (error) throw error;

      // Filter by user_id (RLS should handle this, but double-check)
      const accessories = (data || [])
        .map((item: any) => item.fabricator_accessories)
        .filter((acc: any) => acc && acc.user_id === userId)
        .map(this.mapAccessoryFromDB);

      return accessories;
    });
  }

  async addCompatibility(profileId: string, accessoryId: string): Promise<void> {
    return this.measurePerformance('addCompatibility', async () => {
      const { error } = await (this.client
        .from('profile_accessory_compatibility') as any)
        .insert({
          profile_id: profileId,
          accessory_id: accessoryId,
        });

      if (error) throw error;

      await this.logAuditEntry({
        action: 'INSERT',
        table_name: 'profile_accessory_compatibility',
        record_id: `${profileId}-${accessoryId}`,
        new_values: { profile_id: profileId, accessory_id: accessoryId },
      });
    });
  }

  async removeCompatibility(profileId: string, accessoryId: string): Promise<void> {
    return this.measurePerformance('removeCompatibility', async () => {
      const { error } = await this.client
        .from('profile_accessory_compatibility')
        .delete()
        .eq('profile_id', profileId)
        .eq('accessory_id', accessoryId);

      if (error) throw error;

      await this.logAuditEntry({
        action: 'DELETE',
        table_name: 'profile_accessory_compatibility',
        record_id: `${profileId}-${accessoryId}`,
      });
    });
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  async batchCreateProfiles(
    profiles: Array<Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<BatchOperationResult<Profile, Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>>> {
    return this.measurePerformance('batchCreateProfiles', async () => {
      const userId = await this.getUserId();
      const success: Profile[] = [];
      const failed: Array<{ item: typeof profiles[0]; error: Error }> = [];

      // Process in batches
      for (let i = 0; i < profiles.length; i += this.config.batchSize) {
        const batch = profiles.slice(i, i + this.config.batchSize);
        
        const batchData = batch.map(profile => ({
          ...this.mapProfileToDB(profile),
          user_id: userId,
        }));

        const { data, error } = await (this.client
          .from('fabricator_profiles') as any)
          .insert(batchData)
          .select();

        if (error) {
          // All failed
          batch.forEach(item => {
            failed.push({ item, error: new Error(error.message) });
          });
        } else if (data) {
          // All succeeded
          data.forEach(dbProfile => {
            success.push(this.mapProfileFromDB(dbProfile));
          });
        }
      }

      await this.logAuditEntry({
        action: 'INSERT',
        table_name: 'fabricator_profiles',
        record_id: 'batch',
        new_values: { count: success.length },
      });

      return { success, failed, total: profiles.length };
    });
  }

  async batchUpdateProfiles(
    updates: Array<{ id: string; data: Partial<Omit<Profile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> }>
  ): Promise<BatchOperationResult<Profile, { id: string; data: Partial<Omit<Profile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> }>> {
    return this.measurePerformance('batchUpdateProfiles', async () => {
      const success: Profile[] = [];
      const failed: Array<{ item: typeof updates[0]; error: Error }> = [];

      // Process individually to handle partial failures
      for (const update of updates) {
        try {
          const updated = await this.updateProfile(update.id, update.data);
          success.push(updated);
        } catch (error) {
          failed.push({
            item: update,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      }

      return { success, failed, total: updates.length };
    });
  }

  // ============================================================================
  // Real-time Subscriptions
  // ============================================================================

  subscribeToProfiles(
    callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: Profile; old?: Profile }) => void
  ): () => void {
    if (!this.config.enableRealtime) {
      console.warn('[FabricatorClient] Realtime is disabled');
      return () => {};
    }

    const channel = this.client
      .channel('fabricator-profiles')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fabricator_profiles',
        },
        (payload) => {
          callback({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new ? this.mapProfileFromDB(payload.new as any) : undefined,
            old: payload.old ? this.mapProfileFromDB(payload.old as any) : undefined,
          });
        }
      )
      .subscribe();

    this.realtimeChannels.set('fabricator-profiles', channel);

    return () => {
      channel.unsubscribe();
      this.realtimeChannels.delete('fabricator-profiles');
    };
  }

  subscribeToAccessories(
    callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: FabricatorAccessory; old?: FabricatorAccessory }) => void
  ): () => void {
    if (!this.config.enableRealtime) {
      console.warn('[FabricatorClient] Realtime is disabled');
      return () => {};
    }

    const channel = this.client
      .channel('fabricator-accessories')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fabricator_accessories',
        },
        (payload) => {
          callback({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new ? this.mapAccessoryFromDB(payload.new as any) : undefined,
            old: payload.old ? this.mapAccessoryFromDB(payload.old as any) : undefined,
          });
        }
      )
      .subscribe();

    this.realtimeChannels.set('fabricator-accessories', channel);

    return () => {
      channel.unsubscribe();
      this.realtimeChannels.delete('fabricator-accessories');
    };
  }

  unsubscribeAll(): void {
    this.realtimeChannels.forEach((channel) => {
      channel.unsubscribe();
    });
    this.realtimeChannels.clear();
  }

  // ============================================================================
  // Data Mapping
  // ============================================================================

  private mapProfileFromDB(data: any): Profile {
    const specs = data.specifications || {};

    return {
      id: data.id,
      name: data.name,
      material: data.material,
      width: parseFloat(data.width),
      height: data.height ? parseFloat(data.height) : undefined,
      thickness: data.thickness ? parseFloat(data.thickness) : undefined,
      color: data.color || '#C0C0C0',
      costPerMeter: parseFloat(data.cost_per_meter || 0),
      cuttingAllowance: parseFloat(data.cutting_allowance || 3.0),
      stockQuantity: parseFloat(data.stock_quantity || 0),
      minStockLevel: parseFloat(data.min_stock_level || 0),
      maxStockLevel: data.max_stock_level ? parseFloat(data.max_stock_level) : undefined,
      supplier: data.supplier,
      systemBrand: data.system_brand,
      weightPerMeter:
        typeof specs.weightPerMeterKg === 'number'
          ? specs.weightPerMeterKg
          : undefined,
      specifications: specs,
      grainDirection: data.grain_direction || null,
      userId: data.user_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapProfileToDB(profile: Partial<Profile>): any {
    const dbProfile: any = {};

    if (profile.name !== undefined) dbProfile.name = profile.name;
    if (profile.material !== undefined) dbProfile.material = profile.material;
    if (profile.width !== undefined) dbProfile.width = profile.width;
    if (profile.height !== undefined) dbProfile.height = profile.height;
    if (profile.thickness !== undefined) dbProfile.thickness = profile.thickness;
    if (profile.color !== undefined) dbProfile.color = profile.color;
    if (profile.costPerMeter !== undefined) dbProfile.cost_per_meter = profile.costPerMeter;
    if (profile.cuttingAllowance !== undefined) dbProfile.cutting_allowance = profile.cuttingAllowance;
    if (profile.stockQuantity !== undefined) dbProfile.stock_quantity = profile.stockQuantity;
    if (profile.minStockLevel !== undefined) dbProfile.min_stock_level = profile.minStockLevel;
    if (profile.maxStockLevel !== undefined) dbProfile.max_stock_level = profile.maxStockLevel;
    if (profile.supplier !== undefined) dbProfile.supplier = profile.supplier;
    if (profile.systemBrand !== undefined) dbProfile.system_brand = profile.systemBrand;
    if (profile.specifications !== undefined) dbProfile.specifications = profile.specifications;
    if (profile.grainDirection !== undefined) dbProfile.grain_direction = profile.grainDirection;

    return dbProfile;
  }

  private mapAccessoryFromDB(data: any): FabricatorAccessory {
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      category: data.category,
      unitPrice: parseFloat(data.unit_price || 0),
      baseCost: parseFloat(data.base_cost || 0),
      markupPercentage: parseFloat(data.markup_percentage || 30.0),
      supplier: data.supplier,
      sku: data.sku,
      description: data.description,
      compatibleMaterials: data.compatible_materials || [],
      region: data.region || ['global'],
      imageUrl: data.image_url,
      specifications: data.specifications || {},
      userId: data.user_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapAccessoryToDB(accessory: Partial<FabricatorAccessory>): any {
    const dbAccessory: any = {};

    if (accessory.name !== undefined) dbAccessory.name = accessory.name;
    if (accessory.type !== undefined) dbAccessory.type = accessory.type;
    if (accessory.category !== undefined) dbAccessory.category = accessory.category;
    if (accessory.unitPrice !== undefined) dbAccessory.unit_price = accessory.unitPrice;
    if (accessory.baseCost !== undefined) dbAccessory.base_cost = accessory.baseCost;
    if (accessory.markupPercentage !== undefined) dbAccessory.markup_percentage = accessory.markupPercentage;
    if (accessory.supplier !== undefined) dbAccessory.supplier = accessory.supplier;
    if (accessory.sku !== undefined) dbAccessory.sku = accessory.sku;
    if (accessory.description !== undefined) dbAccessory.description = accessory.description;
    if (accessory.compatibleMaterials !== undefined) dbAccessory.compatible_materials = accessory.compatibleMaterials;
    if (accessory.region !== undefined) dbAccessory.region = accessory.region;
    if (accessory.imageUrl !== undefined) dbAccessory.image_url = accessory.imageUrl;
    if (accessory.specifications !== undefined) dbAccessory.specifications = accessory.specifications;

    return dbAccessory;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let fabricatorClientInstance: FabricatorClient | null = null;

export function getFabricatorClient(config?: FabricatorClientConfig): FabricatorClient {
  if (!fabricatorClientInstance) {
    fabricatorClientInstance = new FabricatorClient(config);
  }
  return fabricatorClientInstance;
}

// ============================================================================
// Export Types (already exported above, no need to re-export)
// ============================================================================

