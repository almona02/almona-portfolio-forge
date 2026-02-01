# Manual Browser Testing Guide - Redis Caching Verification

## Prerequisites

✅ Redis connection verified (caboose.proxy.rlwy.net:26145)  
✅ Dev server running (`npm run dev`)  
✅ Redis caching modules implemented

---

## Test Plan

### Test 1: After Sales Ticketing Dashboard

**Objective**: Verify ticket list caching

**Steps**:
1. Open browser to `http://localhost:5173`
2. Navigate to **Services** or **After Sales** section
3. Click on **Service Tickets** or **Ticketing Dashboard**
4. **First Load**: Note the loading time
5. **Refresh the page** (F5)
6. **Second Load**: Should be noticeably faster due to caching

**Expected Behavior**:
- First load: 50-200ms (database query)
- Second load: <10ms (Redis cache)
- No errors in console

**Cache Key Used**: `aftersales:tickets:status:{status}`

---

### Test 2: Individual Ticket Details

**Objective**: Verify individual ticket caching

**Steps**:
1. From the tickets dashboard, click on any ticket
2. **First Load**: Note the loading time
3. Go back to the list
4. Click on the **same ticket** again
5. **Second Load**: Should load instantly from cache

**Expected Behavior**:
- First load: Database query
- Second load: Instant (from Redis)
- Ticket details display correctly

**Cache Key Used**: `aftersales:ticket:{ticketId}:details`

---

### Test 3: Machine Catalog

**Objective**: Verify machine catalog caching

**Steps**:
1. Navigate to **Machines** or **YILMAZ Machines** section
2. **First Load**: Note the loading time
3. Refresh the page
4. **Second Load**: Should be much faster

**Expected Behavior**:
- First load: ~100-300ms
- Second load: <10ms
- All machines display correctly

**Cache Key Used**: `aftersales:machines:catalog`

---

### Test 4: Cache Invalidation

**Objective**: Verify cache updates when data changes

**Steps**:
1. Open a ticket and note its status
2. Update the ticket status (e.g., from "open" to "in_progress")
3. Go back to the ticket list
4. Verify the updated status shows immediately

**Expected Behavior**:
- Updated data shows immediately
- Cache is automatically invalidated
- No stale data displayed

**How It Works**: Supabase Realtime triggers cache invalidation

---

## Monitoring Redis Cache

### Option 1: Browser DevTools

Open DevTools (F12) → **Network** tab:
- Look for fast response times on repeated requests
- Check if data loads instantly on second visit

### Option 2: Redis CLI (if available)

```bash
# Monitor Redis commands in real-time
redis-cli -h caboose.proxy.rlwy.net -p 26145 -a $REDIS_PASSWORD monitor

# Check cache keys
redis-cli -h caboose.proxy.rlwy.net -p 26145 -a $REDIS_PASSWORD keys "aftersales:*"

# Get cache hit/miss stats
redis-cli -h caboose.proxy.rlwy.net -p 26145 -a $REDIS_PASSWORD info stats
```

### Option 3: Application Logs

Check the browser console for:
- No Redis connection errors
- Successful cache operations
- Fast response times

---

## Performance Comparison

### Before Redis Caching
- Ticket list load: ~100-200ms
- Individual ticket: ~50-100ms
- Machine catalog: ~200-300ms
- **Total for 3 operations**: ~350-600ms

### After Redis Caching (Second Load)
- Ticket list load: ~1-5ms
- Individual ticket: ~1-5ms
- Machine catalog: ~1-5ms
- **Total for 3 operations**: ~3-15ms

**Expected Improvement**: **~50-100x faster** on cached requests

---

## Troubleshooting

### Issue: No performance improvement

**Check**:
1. Redis connection is active: `npx tsx env-check.ts`
2. Dev server restarted after adding Redis env vars
3. No errors in browser console
4. Cache TTL hasn't expired (check TTL values in code)

### Issue: Stale data showing

**Check**:
1. Supabase Realtime is configured
2. Cache invalidation is working
3. TTL is appropriate for data volatility

### Issue: Redis connection errors

**Check**:
1. `.env` has correct credentials
2. Railway Redis service is running
3. Network connectivity to Railway

---

## Success Criteria

✅ **Performance**: Second page loads are 50-100x faster  
✅ **Functionality**: All features work correctly with caching  
✅ **Data Freshness**: Updates show immediately (cache invalidation works)  
✅ **No Errors**: No Redis errors in console  
✅ **User Experience**: Noticeably faster, smoother navigation

---

## Next Steps After Verification

1. ✅ Monitor cache hit rates in production
2. ✅ Implement remaining system caches (Fabricator Pro, RealityOS, E-commerce)
3. ✅ Set up Supabase Realtime cache invalidation
4. ✅ Add cache monitoring dashboard
5. ✅ Document cache strategy for team

---

**Test Date**: 2026-02-01  
**Redis Version**: 8.2.1  
**Status**: Ready for manual verification
