# Redis Caching - Quick Reference

## Cache Keys by System

### After Sales
```typescript
// Ticket list by status
aftersales:tickets:status:{status}           // TTL: 2 min
aftersales:tickets:user:{userId}:status:{status}  // TTL: 2 min

// Individual ticket
aftersales:ticket:{ticketId}:details         // TTL: 5 min

// Machine catalog
aftersales:machines:catalog                  // TTL: 1 hour

// Technician availability
aftersales:tech:{techId}:availability        // TTL: 1 min
```

### Fabricator Pro
```typescript
// Optimization results
fabricator:optimization:{projectId}:result   // TTL: 30 min

// Remnant inventory
fabricator:remnants:{warehouseId}:inventory  // TTL: 2 min

// System packs
fabricator:systempack:{packId}:config        // TTL: 1 day
fabricator:systempacks:active                // TTL: 1 day

// Fabricator profile
fabricator:profile:{profileId}:details       // TTL: 10 min
```

### RealityOS
```typescript
// Events
realityos:events:{entityId}:recent           // TTL: 10 sec

// QR codes
realityos:qr:{qrCode}:data                   // TTL: 5 min

// Event counts
realityos:events:{entityId}:count_by_type    // TTL: 1 min
```

### E-commerce
```typescript
// Products
shared:products:active                       // TTL: 1 hour
shared:product:{productId}:details           // TTL: 1 hour

// Pricing
shared:pricing:{productId}:tiers             // TTL: 1 day

// Search
shared:search:{query}                        // TTL: 10 min
shared:search:{query}:{category}             // TTL: 10 min
```

---

## Quick Commands

### Test Redis Connection
```bash
npx tsx env-check.ts
npx tsx src/lib/redis/simpleTest.ts
```

### Monitor Redis
```bash
# Real-time monitoring
redis-cli -h caboose.proxy.rlwy.net -p 26145 -a $REDIS_PASSWORD monitor

# View all cache keys
redis-cli -h caboose.proxy.rlwy.net -p 26145 -a $REDIS_PASSWORD keys "*"

# View After Sales keys only
redis-cli -h caboose.proxy.rlwy.net -p 26145 -a $REDIS_PASSWORD keys "aftersales:*"

# Get cache stats
redis-cli -h caboose.proxy.rlwy.net -p 26145 -a $REDIS_PASSWORD info stats

# Clear all cache (use with caution!)
redis-cli -h caboose.proxy.rlwy.net -p 26145 -a $REDIS_PASSWORD FLUSHDB
```

### Performance Testing
```bash
npx tsx test-cache-performance.ts
```

---

## Usage in Code

### Get Cached Data
```typescript
import { AfterSalesCache } from '@/lib/redis/caches/afterSalesCache';

// Get ticket (auto-caches if not cached)
const ticket = await AfterSalesCache.getTicket(ticketId);

// Get machine catalog
const machines = await AfterSalesCache.getMachineCatalog();

// Get tickets by status
const tickets = await AfterSalesCache.getTicketsByStatus('open');
```

### Invalidate Cache
```typescript
// Invalidate specific ticket
await AfterSalesCache.invalidateTicket(ticketId);

// Invalidate all tickets
await AfterSalesCache.invalidateAllTickets();
```

### Direct Cache Helper
```typescript
import { CacheHelper } from '@/lib/redis/cacheHelper';

// Get
const data = await CacheHelper.get<MyType>('my:cache:key');

// Set with TTL
await CacheHelper.set('my:cache:key', data, { ttl: 300 });

// Delete
await CacheHelper.delete('my:cache:key');

// Invalidate pattern
await CacheHelper.invalidatePattern('my:cache:*');
```

---

## Environment Variables

```bash
# .env
REDIS_HOST=caboose.proxy.rlwy.net
REDIS_PORT=26145
REDIS_PASSWORD=your-password-here
```

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Cache Read | <5ms | ~1ms ✅ |
| Cache Write | <10ms | ~1ms ✅ |
| Cache Hit Rate | >70% | TBD |
| DB Query Reduction | 50-70% | TBD |

---

**Last Updated**: 2026-02-01  
**Redis Version**: 8.2.1  
**Status**: Production Ready ✅
