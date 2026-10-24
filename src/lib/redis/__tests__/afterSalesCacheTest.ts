import { supabase } from '@/lib/supabase';
import 'dotenv/config'; // Load .env file
import { AfterSalesCache } from '../caches/afterSalesCache';
import redis from '../client';

/**
 * Test After Sales caching with real Supabase data
 */
async function testAfterSalesCaching() {
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  console.log('ðŸŽ« Testing After Sales Caching');
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');

  try {
    // Test 1: Get machine catalog (should fetch from DB first time)
    console.log('Test 1: Machine Catalog Caching');
    console.log('  ðŸ“Š First call (should fetch from Supabase)...');
    const start1 = Date.now();
    const machines1 = await AfterSalesCache.getMachineCatalog();
    const time1 = Date.now() - start1;
    console.log(`  âœ… Retrieved ${machines1?.length || 0} machines in ${time1}ms`);

    console.log('  ðŸ’¾ Second call (should be cached)...');
    const start2 = Date.now();
    const machines2 = await AfterSalesCache.getMachineCatalog();
    const time2 = Date.now() - start2;
    console.log(`  âœ… Retrieved ${machines2?.length || 0} machines in ${time2}ms`);
    console.log(`  ðŸš€ Speed improvement: ${Math.round((time1 / time2) * 100) / 100}x faster\n`);

    // Test 2: Get tickets by status
    console.log('Test 2: Tickets by Status Caching');
    const statuses = ['open', 'in_progress', 'resolved'];
    
    for (const status of statuses) {
      console.log(`  Testing status: ${status}`);
      const start = Date.now();
      const tickets = await AfterSalesCache.getTicketsByStatus(status);
      const time = Date.now() - start;
      console.log(`    âœ… Found ${tickets?.length || 0} tickets in ${time}ms`);
    }
    console.log('');

    // Test 3: Get specific ticket (if any exist)
    console.log('Test 3: Individual Ticket Caching');
    const { data: sampleTickets } = await supabase
      .from('service_tickets')
      .select('id')
      .limit(1);

    if (sampleTickets && sampleTickets.length > 0) {
      const ticketId = (sampleTickets[0] as any).id;
      console.log(`  Testing ticket: ${ticketId}`);
      
      const start1Time = Date.now();
      const ticket1 = await AfterSalesCache.getTicket(ticketId);
      const time1 = Date.now() - start1Time;
      console.log(`  ðŸ“Š First call: ${time1}ms (${ticket1 ? 'found' : 'not found'})`);

      const start2Time = Date.now();
      const ticket2 = await AfterSalesCache.getTicket(ticketId);
      const time2 = Date.now() - start2Time;
      console.log(`  ðŸ’¾ Cached call: ${time2}ms (${ticket2 ? 'found' : 'not found'})`);
      console.log(`  ðŸš€ Speed improvement: ${Math.round((time1 / time2) * 100) / 100}x faster\n`);
    } else {
      console.log('  âš ï¸ No tickets found in database\n');
    }

    // Test 4: Cache invalidation
    console.log('Test 4: Cache Invalidation');
    console.log('  ðŸ§¹ Invalidating all ticket caches...');
    await AfterSalesCache.invalidateAllTickets();
    console.log('  âœ… Cache invalidated\n');

    // Test 5: Verify cache keys
    console.log('Test 5: Verify Cache Keys');
    const keys = await redis.keys('aftersales:*');
    console.log(`  ðŸ“‹ Found ${keys.length} cache keys:`);
    keys.slice(0, 10).forEach(key => console.log(`    - ${key}`));
    if (keys.length > 10) {
      console.log(`    ... and ${keys.length - 10} more`);
    }
    console.log('');

    console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    console.log('âœ… After Sales caching tests completed successfully!');
    console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');

    return true;
  } catch (error) {
    console.error('âŒ After Sales caching test failed:', error);
    return false;
  }
}

/**
 * Test cache performance comparison
 */
async function testCachePerformance() {
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  console.log('âš¡ Cache Performance Benchmark');
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');

  try {
    const iterations = 10;
    
    // Benchmark: Direct Supabase query
    console.log(`Running ${iterations} direct Supabase queries...`);
    const supabaseStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await supabase
        .from('yilmaz_machines')
        .select('*')
        .eq('is_active', true);
    }
    const supabaseTime = Date.now() - supabaseStart;
    const supabaseAvg = supabaseTime / iterations;
    console.log(`âœ… Total: ${supabaseTime}ms, Average: ${Math.round(supabaseAvg)}ms per query\n`);

    // Benchmark: Cached query
    console.log(`Running ${iterations} cached queries...`);
    const cacheStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await AfterSalesCache.getMachineCatalog();
    }
    const cacheTime = Date.now() - cacheStart;
    const cacheAvg = cacheTime / iterations;
    console.log(`âœ… Total: ${cacheTime}ms, Average: ${Math.round(cacheAvg)}ms per query\n`);

    // Results
    const improvement = Math.round((supabaseAvg / cacheAvg) * 100) / 100;
    const reduction = Math.round(((supabaseTime - cacheTime) / supabaseTime) * 100);
    
    console.log('ðŸ“Š Performance Results:');
    console.log(`  Direct Supabase: ${Math.round(supabaseAvg)}ms average`);
    console.log(`  Cached: ${Math.round(cacheAvg)}ms average`);
    console.log(`  ðŸš€ Speed improvement: ${improvement}x faster`);
    console.log(`  ðŸ“‰ Query time reduction: ${reduction}%\n`);

    console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    console.log('âœ… Performance benchmark completed!');
    console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');

    return true;
  } catch (error) {
    console.error('âŒ Performance benchmark failed:', error);
    return false;
  }
}

/**
 * Run all After Sales tests
 */
async function runAfterSalesTests() {
  const cachingTest = await testAfterSalesCaching();
  
  if (cachingTest) {
    await testCachePerformance();
  }

  // Close connections
  await redis.quit();
  process.exit(cachingTest ? 0 : 1);
}

// Run tests if executed directly
if (require.main === module) {
  void runAfterSalesTests();
}

export { testAfterSalesCaching, testCachePerformance };
