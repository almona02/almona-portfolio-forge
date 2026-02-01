# Redis Caching Implementation Guide
**ALMONA Multi-System Architecture**

## Overview

This guide provides a complete implementation plan for Redis caching across all 4 systems:
1. **After Sales** - Service ticketing & maintenance
2. **Fabricator Pro** - Manufacturing & optimization
3. **RealityOS** - Event ledger & QR lifecycle
4. **IOMS** - Industrial Operations Management

**Expected Performance Gains**:
- 50-70% reduction in database queries
- <100ms response time for cached data
- Support 10,000+ concurrent users
- 30-40% reduction in database CPU

---

## 1. Railway Redis Setup

### 1.1 Install Redis Client

```bash
npm install ioredis
npm install --save-dev @types/ioredis
```

### 1.2 Create Redis Client Configuration

**File**: `src/lib/redis/client.ts`

```typescript
import Redis from 'ioredis';

// Railway Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

export default redis;
```

### 1.3 Environment Variables

Add to `.env`:

```bash
# Railway Redis
REDIS_HOST=your-railway-redis-host.railway.app
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

---

## 2. Cache Key Naming Convention

**Pattern**: `{system}:{entity}:{id}:{field}`

```typescript
// After Sales
aftersales:ticket:123e4567:details
aftersales:machine:abc123:specs
aftersales:tech:user_456:availability

// Fabricator Pro
fabricator:optimization:proj_789:result
fabricator:remnants:warehouse_1:inventory
fabricator:systempack:pack_001:config

// RealityOS
realityos:event:evt_456:payload
realityos:qr:QR123456:data

// IOMS
ioms:operation:op_789:status
ioms:dashboard:user_123:metrics

// Shared
shared:product:prod_001:catalog
shared:pricing:tier_gold:rates
```

---

## 3. Cache Helper Utilities

**File**: `src/lib/redis/cacheHelper.ts`

```typescript
import redis from './client';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string; // System namespace
}

export class CacheHelper {
  /**
   * Get cached data
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  static async set(
    key: string,
    value: any,
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      const { ttl = 300 } = options; // Default 5 minutes
      const serialized = JSON.stringify(value);
      await redis.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      console.error(`Cache SET error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete cached data
   */
  static async delete(key: string): Promise<boolean> {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error(`Cache DELETE error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  static async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) return 0;
      
      await redis.del(...keys);
      return keys.length;
    } catch (error) {
      console.error(`Cache INVALIDATE error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Get or set cached data (cache-aside pattern)
   */
  static async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch from database
    const data = await fetchFn();

    // Store in cache
    await this.set(key, data, options);

    return data;
  }

  /**
   * Increment counter (for rate limiting)
   */
  static async increment(
    key: string,
    ttl: number = 60
  ): Promise<number> {
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, ttl);
      }
      return count;
    } catch (error) {
      console.error(`Cache INCREMENT error for key ${key}:`, error);
      return 0;
    }
  }
}
```

---

## 4. System-Specific Implementations

### 4.1 After Sales System

**File**: `src/lib/redis/caches/afterSalesCache.ts`

```typescript
import { CacheHelper } from '../cacheHelper';
import { supabase } from '@/lib/supabase';

export class AfterSalesCache {
  private static readonly NAMESPACE = 'aftersales';

  /**
   * Cache service ticket details (5 min TTL)
   */
  static async getTicket(ticketId: string) {
    const key = `${this.NAMESPACE}:ticket:${ticketId}:details`;
    
    return CacheHelper.getOrSet(
      key,
      async () => {
        const { data } = await supabase
          .from('service_tickets')
          .select('*')
          .eq('id', ticketId)
          .single();
        return data;
      },
      { ttl: 300 } // 5 minutes
    );
  }

  /**
   * Invalidate ticket cache on update
   */
  static async invalidateTicket(ticketId: string) {
    const key = `${this.NAMESPACE}:ticket:${ticketId}:details`;
    await CacheHelper.delete(key);
  }

  /**
   * Cache machine catalog (1 hour TTL)
   */
  static async getMachineCatalog() {
    const key = `${this.NAMESPACE}:machines:catalog`;
    
    return CacheHelper.getOrSet(
      key,
      async () => {
        const { data } = await supabase
          .from('yilmaz_machines')
          .select('*')
          .eq('is_active', true);
        return data;
      },
      { ttl: 3600 } // 1 hour
    );
  }

  /**
   * Cache technician availability (1 min TTL)
   */
  static async getTechnicianAvailability(techId: string) {
    const key = `${this.NAMESPACE}:tech:${techId}:availability`;
    
    return CacheHelper.getOrSet(
      key,
      async () => {
        // Query technician's assigned tickets
        const { data } = await supabase
          .from('service_tickets')
          .select('id, status, priority')
          .eq('assigned_to', techId)
          .in('status', ['open', 'in_progress']);
        
        return {
          techId,
          assignedTickets: data?.length || 0,
          isAvailable: (data?.length || 0) < 5,
          lastUpdated: new Date().toISOString()
        };
      },
      { ttl: 60 } // 1 minute
    );
  }

  /**
   * Cache ticket list by status (2 min TTL)
   */
  static async getTicketsByStatus(status: string, userId?: string) {
    const key = userId 
      ? `${this.NAMESPACE}:tickets:user:${userId}:status:${status}`
      : `${this.NAMESPACE}:tickets:status:${status}`;
    
    return CacheHelper.getOrSet(
      key,
      async () => {
        let query = supabase
          .from('service_tickets')
          .select('*')
          .eq('status', status)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (userId) {
          query = query.eq('user_id', userId);
        }
        
        const { data } = await query;
        return data;
      },
      { ttl: 120 } // 2 minutes
    );
  }

  /**
   * Invalidate all ticket caches
   */
  static async invalidateAllTickets() {
    await CacheHelper.invalidatePattern(`${this.NAMESPACE}:ticket:*`);
    await CacheHelper.invalidatePattern(`${this.NAMESPACE}:tickets:*`);
  }
}
```

### 4.2 Fabricator Pro System

**File**: `src/lib/redis/caches/fabricatorCache.ts`

```typescript
import { CacheHelper } from '../cacheHelper';
import { supabase } from '@/lib/supabase';

export class FabricatorCache {
  private static readonly NAMESPACE = 'fabricator';

  /**
   * Cache cutting optimization results (30 min TTL)
   */
  static async getOptimizationResult(projectId: string) {
    const key = `${this.NAMESPACE}:optimization:${projectId}:result`;
    
    return CacheHelper.getOrSet(
      key,
      async () => {
        const { data } = await supabase
          .from('cutting_optimizations')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        return data;
      },
      { ttl: 1800 } // 30 minutes
    );
  }

  /**
   * Cache remnant inventory (2 min TTL - high volatility)
   */
  static async getRemnantInventory(warehouseId?: string) {
    const key = warehouseId
      ? `${this.NAMESPACE}:remnants:${warehouseId}:inventory`
      : `${this.NAMESPACE}:remnants:all:inventory`;
    
    return CacheHelper.getOrSet(
      key,
      async () => {
        let query = supabase
          .from('remnants')
          .select('*')
          .eq('is_available', true);
        
        if (warehouseId) {
          query = query.eq('warehouse_id', warehouseId);
        }
        
        const { data } = await query;
        return data;
      },
      { ttl: 120 } // 2 minutes
    );
  }

  /**
   * Cache system pack configurations (1 day TTL)
   */
  static async getSystemPack(packId: string) {
    const key = `${this.NAMESPACE}:systempack:${packId}:config`;
    
    return CacheHelper.getOrSet(
      key,
      async () => {
        const { data } = await supabase
          .from('system_packs')
          .select('*')
          .eq('id', packId)
          .single();
        return data;
      },
      { ttl: 86400 } // 1 day
    );
  }

  /**
   * Cache all active system packs (1 day TTL)
   */
  static async getAllSystemPacks() {
    const key = `${this.NAMESPACE}:systempacks:active`;
    
    return CacheHelper.getOrSet(
      key,
      async () => {
        const { data } = await supabase
          .from('system_packs')
          .select('*')
          .eq('is_active', true);
        return data;
      },
      { ttl: 86400 } // 1 day
    );
  }

  /**
   * Cache fabricator profile (10 min TTL)
   */
  static async getFabricatorProfile(profileId: string) {
    const key = `${this.NAMESPACE}:profile:${profileId}:details`;
    
    return CacheHelper.getOrSet(
      key,
      async () => {
        const { data } = await supabase
          .from('fabricator_profiles')
          .select('*')
          .eq('id', profileId)
          .single();
        return data;
      },
      { ttl: 600 } // 10 minutes
    );
  }

  /**
   * Invalidate optimization cache
   */
  static async invalidateOptimization(projectId: string) {
    const key = `${this.NAMESPACE}:optimization:${projectId}:result`;
    await CacheHelper.delete(key);
  }

  /**
   * Invalidate remnant inventory
   */
  static async invalidateRemnants(warehouseId?: string) {
    if (warehouseId) {
      await CacheHelper.delete(`${this.NAMESPACE}:remnants:${warehouseId}:inventory`);
    } else {
      await CacheHelper.invalidatePattern(`${this.NAMESPACE}:remnants:*`);
    }
  }
}
```

### 4.3 RealityOS System

**File**: `src/lib/redis/caches/realityOSCache.ts`

```typescript
import { CacheHelper } from '../cacheHelper';
import { supabase } from '@/lib/supabase';

export class RealityOSCache {
  private static readonly NAMESPACE = 'realityos';

  /**
   * Cache event queries (10 sec TTL - near real-time)
   */
  static async getRecentEvents(entityId: string, limit: number = 50) {
    const key = `${this.NAMESPACE}:events:${entityId}:recent`;
    
    return CacheHelper.getOrSet(
      key,
      async () => {
        const { data } = await supabase
          .from('event_ledger')
          .select('*')
          .eq('entity_id', entityId)
          .order('created_at', { ascending: false })
          .limit(limit);
        return data;
      },
      { ttl: 10 } // 10 seconds (near real-time)
    );
  }

  /**
   * Cache QR code lookups (5 min TTL)
   */
  static async getQRData(qrCode: string) {
    const key = `${this.NAMESPACE}:qr:${qrCode}:data`;
    
    return CacheHelper.getOrSet(
      key,
      async () => {
        const { data } = await supabase
          .from('qr_lifecycle')
          .select('*')
          .eq('qr_code', qrCode)
          .single();
        return data;
      },
      { ttl: 300 } // 5 minutes
    );
  }

  /**
   * Cache event count by type (1 min TTL)
   */
  static async getEventCountByType(entityId: string) {
    const key = `${this.NAMESPACE}:events:${entityId}:count_by_type`;
    
    return CacheHelper.getOrSet(
      key,
      async () => {
        const { data } = await supabase
          .from('event_ledger')
          .select('event_type')
          .eq('entity_id', entityId);
        
        // Count by type
        const counts = (data || []).reduce((acc, event) => {
          acc[event.event_type] = (acc[event.event_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        return counts;
      },
      { ttl: 60 } // 1 minute
    );
  }

  /**
   * Invalidate event cache
   */
  static async invalidateEvents(entityId: string) {
    await CacheHelper.invalidatePattern(`${this.NAMESPACE}:events:${entityId}:*`);
  }

  /**
   * Invalidate QR cache
   */
  static async invalidateQR(qrCode: string) {
    const key = `${this.NAMESPACE}:qr:${qrCode}:data`;
    await CacheHelper.delete(key);
  }
}
```

### 4.4 E-commerce (Shared) System

**File**: `src/lib/redis/caches/ecommerceCache.ts`

```typescript
import { CacheHelper } from '../cacheHelper';
import { supabase } from '@/lib/supabase';

export class EcommerceCache {
  private static readonly NAMESPACE = 'shared';

  /**
   * Cache product catalog (1 hour TTL)
   */
  static async getActiveProducts() {
    const key = `${this.NAMESPACE}:products:active`;
    
    return CacheHelper.getOrSet(
      key,
      async () => {
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        return data;
      },
      { ttl: 3600 } // 1 hour
    );
  }

  /**
   * Cache single product (1 hour TTL)
   */
  static async getProduct(productId: string) {
    const key = `${this.NAMESPACE}:product:${productId}:details`;
    
    return CacheHelper.getOrSet(
      key,
      async () => {
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();
        return data;
      },
      { ttl: 3600 } // 1 hour
    );
  }

  /**
   * Cache pricing tiers (1 day TTL)
   */
  static async getPricingTiers(productId: string) {
    const key = `${this.NAMESPACE}:pricing:${productId}:tiers`;
    
    return CacheHelper.getOrSet(
      key,
      async () => {
        const { data } = await supabase
          .from('pricing_tiers')
          .select('*')
          .eq('product_id', productId)
          .order('min_quantity', { ascending: true });
        return data;
      },
      { ttl: 86400 } // 1 day
    );
  }

  /**
   * Cache product search results (10 min TTL)
   */
  static async searchProducts(query: string, category?: string) {
    const key = category
      ? `${this.NAMESPACE}:search:${query}:${category}`
      : `${this.NAMESPACE}:search:${query}`;
    
    return CacheHelper.getOrSet(
      key,
      async () => {
        let dbQuery = supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .or(`name_ar.ilike.%${query}%,name_en.ilike.%${query}%`)
          .limit(50);
        
        if (category) {
          dbQuery = dbQuery.eq('category', category);
        }
        
        const { data } = await dbQuery;
        return data;
      },
      { ttl: 600 } // 10 minutes
    );
  }

  /**
   * Invalidate product cache
   */
  static async invalidateProduct(productId: string) {
    await CacheHelper.delete(`${this.NAMESPACE}:product:${productId}:details`);
    await CacheHelper.delete(`${this.NAMESPACE}:pricing:${productId}:tiers`);
    await CacheHelper.delete(`${this.NAMESPACE}:products:active`);
  }

  /**
   * Invalidate search cache
   */
  static async invalidateSearch() {
    await CacheHelper.invalidatePattern(`${this.NAMESPACE}:search:*`);
  }
}
```

---

## 5. Integration with Supabase Realtime

**File**: `src/lib/redis/realtimeSync.ts`

```typescript
import { supabase } from '@/lib/supabase';
import { AfterSalesCache } from './caches/afterSalesCache';
import { FabricatorCache } from './caches/fabricatorCache';
import { RealityOSCache } from './caches/realityOSCache';
import { EcommerceCache } from './caches/ecommerceCache';

/**
 * Set up Supabase Realtime to invalidate Redis cache on changes
 */
export function setupRealtimeCacheInvalidation() {
  // After Sales: Invalidate ticket cache on updates
  supabase
    .channel('cache:aftersales:tickets')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'service_tickets' },
      (payload) => {
        const ticketId = payload.new?.id || payload.old?.id;
        if (ticketId) {
          AfterSalesCache.invalidateTicket(ticketId);
        }
      }
    )
    .subscribe();

  // Fabricator: Invalidate optimization cache on updates
  supabase
    .channel('cache:fabricator:optimizations')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'cutting_optimizations' },
      (payload) => {
        const projectId = payload.new?.project_id || payload.old?.project_id;
        if (projectId) {
          FabricatorCache.invalidateOptimization(projectId);
        }
      }
    )
    .subscribe();

  // Fabricator: Invalidate remnants on updates
  supabase
    .channel('cache:fabricator:remnants')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'remnants' },
      (payload) => {
        const warehouseId = payload.new?.warehouse_id || payload.old?.warehouse_id;
        FabricatorCache.invalidateRemnants(warehouseId);
      }
    )
    .subscribe();

  // RealityOS: Invalidate events on inserts
  supabase
    .channel('cache:realityos:events')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'event_ledger' },
      (payload) => {
        const entityId = payload.new?.entity_id;
        if (entityId) {
          RealityOSCache.invalidateEvents(entityId);
        }
      }
    )
    .subscribe();

  // E-commerce: Invalidate products on updates
  supabase
    .channel('cache:ecommerce:products')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'products' },
      (payload) => {
        const productId = payload.new?.id || payload.old?.id;
        if (productId) {
          EcommerceCache.invalidateProduct(productId);
        }
      }
    )
    .subscribe();

  console.log('✅ Realtime cache invalidation setup complete');
}
```

---

## 6. Rate Limiting with Redis

**File**: `src/lib/redis/rateLimiter.ts`

```typescript
import { CacheHelper } from './cacheHelper';

export class RateLimiter {
  /**
   * Check if request is within rate limit
   * @param key - Unique identifier (e.g., userId, IP)
   * @param limit - Maximum requests allowed
   * @param window - Time window in seconds
   */
  static async checkLimit(
    key: string,
    limit: number = 100,
    window: number = 60
  ): Promise<{ allowed: boolean; remaining: number }> {
    const rateLimitKey = `ratelimit:${key}`;
    
    const count = await CacheHelper.increment(rateLimitKey, window);
    
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count)
    };
  }

  /**
   * Rate limit by system and user
   */
  static async checkSystemLimit(
    system: 'aftersales' | 'fabricator' | 'realityos' | 'ioms',
    userId: string,
    endpoint: string,
    limit: number = 100
  ) {
    const key = `${system}:${userId}:${endpoint}`;
    return this.checkLimit(key, limit, 60);
  }
}
```

---

## 7. Usage Examples

### Example 1: After Sales Ticket API

```typescript
import { AfterSalesCache } from '@/lib/redis/caches/afterSalesCache';
import { RateLimiter } from '@/lib/redis/rateLimiter';

export async function getTicketDetails(ticketId: string, userId: string) {
  // Rate limiting
  const { allowed } = await RateLimiter.checkSystemLimit(
    'aftersales',
    userId,
    'get_ticket',
    100
  );
  
  if (!allowed) {
    throw new Error('Rate limit exceeded');
  }

  // Get from cache (or database if not cached)
  const ticket = await AfterSalesCache.getTicket(ticketId);
  
  return ticket;
}

export async function updateTicket(ticketId: string, updates: any) {
  // Update in database
  const { data } = await supabase
    .from('service_tickets')
    .update(updates)
    .eq('id', ticketId)
    .select()
    .single();
  
  // Invalidate cache
  await AfterSalesCache.invalidateTicket(ticketId);
  
  return data;
}
```

### Example 2: Fabricator Optimization

```typescript
import { FabricatorCache } from '@/lib/redis/caches/fabricatorCache';

export async function getOptimizationResult(projectId: string) {
  // Try cache first
  const cached = await FabricatorCache.getOptimizationResult(projectId);
  
  if (cached) {
    console.log('✅ Optimization result from cache');
    return cached;
  }
  
  // If not in cache, it was fetched from DB by getOrSet
  console.log('⚠️ Optimization result from database (now cached)');
  return cached;
}
```

### Example 3: Product Search

```typescript
import { EcommerceCache } from '@/lib/redis/caches/ecommerceCache';

export async function searchProducts(query: string, category?: string) {
  // Search with caching
  const results = await EcommerceCache.searchProducts(query, category);
  
  return results;
}
```

---

## 8. Monitoring & Metrics

**File**: `src/lib/redis/monitoring.ts`

```typescript
import redis from './client';

export class CacheMonitoring {
  /**
   * Get cache statistics
   */
  static async getStats() {
    const info = await redis.info('stats');
    const keyspace = await redis.info('keyspace');
    
    return {
      info,
      keyspace,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get cache hit rate
   */
  static async getHitRate() {
    const info = await redis.info('stats');
    const lines = info.split('\r\n');
    
    let hits = 0;
    let misses = 0;
    
    for (const line of lines) {
      if (line.startsWith('keyspace_hits:')) {
        hits = parseInt(line.split(':')[1]);
      }
      if (line.startsWith('keyspace_misses:')) {
        misses = parseInt(line.split(':')[1]);
      }
    }
    
    const total = hits + misses;
    const hitRate = total > 0 ? (hits / total) * 100 : 0;
    
    return {
      hits,
      misses,
      total,
      hitRate: hitRate.toFixed(2) + '%'
    };
  }

  /**
   * Get keys by pattern
   */
  static async getKeysByPattern(pattern: string) {
    const keys = await redis.keys(pattern);
    return keys;
  }

  /**
   * Get memory usage
   */
  static async getMemoryUsage() {
    const info = await redis.info('memory');
    return info;
  }
}
```

---

## 9. Testing

**File**: `src/lib/redis/__tests__/cacheHelper.test.ts`

```typescript
import { CacheHelper } from '../cacheHelper';
import redis from '../client';

describe('CacheHelper', () => {
  afterEach(async () => {
    // Clean up test keys
    await redis.flushdb();
  });

  it('should set and get cached data', async () => {
    const key = 'test:key';
    const value = { foo: 'bar' };
    
    await CacheHelper.set(key, value, { ttl: 60 });
    const cached = await CacheHelper.get(key);
    
    expect(cached).toEqual(value);
  });

  it('should return null for non-existent key', async () => {
    const cached = await CacheHelper.get('non:existent');
    expect(cached).toBeNull();
  });

  it('should delete cached data', async () => {
    const key = 'test:delete';
    await CacheHelper.set(key, { data: 'test' });
    await CacheHelper.delete(key);
    
    const cached = await CacheHelper.get(key);
    expect(cached).toBeNull();
  });

  it('should invalidate by pattern', async () => {
    await CacheHelper.set('test:1', { id: 1 });
    await CacheHelper.set('test:2', { id: 2 });
    await CacheHelper.set('other:1', { id: 3 });
    
    const deleted = await CacheHelper.invalidatePattern('test:*');
    expect(deleted).toBe(2);
    
    const remaining = await CacheHelper.get('other:1');
    expect(remaining).toEqual({ id: 3 });
  });

  it('should use getOrSet pattern', async () => {
    const key = 'test:getOrSet';
    let dbCallCount = 0;
    
    const fetchFn = async () => {
      dbCallCount++;
      return { data: 'from db' };
    };
    
    // First call - should fetch from DB
    const result1 = await CacheHelper.getOrSet(key, fetchFn);
    expect(result1).toEqual({ data: 'from db' });
    expect(dbCallCount).toBe(1);
    
    // Second call - should get from cache
    const result2 = await CacheHelper.getOrSet(key, fetchFn);
    expect(result2).toEqual({ data: 'from db' });
    expect(dbCallCount).toBe(1); // DB not called again
  });
});
```

---

## 10. Deployment Checklist

### Pre-Deployment

- [ ] Railway Redis instance provisioned
- [ ] Environment variables configured
- [ ] Redis client tested in development
- [ ] Cache helper utilities implemented
- [ ] System-specific caches implemented

### Deployment

- [ ] Deploy to staging environment
- [ ] Test cache hit/miss rates
- [ ] Monitor memory usage
- [ ] Test cache invalidation
- [ ] Load test with caching enabled

### Post-Deployment

- [ ] Monitor cache hit rate (target: >70%)
- [ ] Monitor database query reduction (target: 50-70%)
- [ ] Monitor response times (target: <100ms for cached)
- [ ] Set up alerts for Redis errors
- [ ] Document cache TTL decisions

---

## 11. Performance Targets

| Metric | Before Caching | Target | Measurement |
|--------|---------------|--------|-------------|
| Avg Response Time | 50-100ms | <50ms | Application logs |
| Database Queries/sec | 1000 | 300-500 | pg_stat_statements |
| Cache Hit Rate | 0% | >70% | Redis INFO stats |
| P95 Response Time | 200ms | <100ms | Application metrics |
| Database CPU | 40-60% | <30% | Supabase dashboard |

---

## 12. Troubleshooting

### Issue: Cache not invalidating

**Solution**: Check Supabase Realtime subscriptions
```typescript
// Verify subscriptions are active
const channels = supabase.getChannels();
console.log('Active channels:', channels);
```

### Issue: High memory usage

**Solution**: Reduce TTL or implement LRU eviction
```bash
# Set max memory and eviction policy
redis-cli CONFIG SET maxmemory 256mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Issue: Cache stampede

**Solution**: Implement cache warming or locking
```typescript
// Use getOrSet with mutex to prevent stampede
```

---

**Created**: 2026-02-01  
**Status**: Ready for Implementation  
**Priority**: HIGH (50-70% performance gain)
