/**
 * Simple After Sales Cache Performance Test
 */
import 'dotenv/config';
import Redis from 'ioredis';

// Simple Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

async function testCachePerformance() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('⚡ Redis Cache Performance Demo');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    const iterations = 100;
    const testData = {
      id: '123',
      title: 'Test Ticket',
      status: 'open',
      priority: 'high',
      description: 'This is a test ticket with some data',
      created_at: new Date().toISOString(),
      metadata: {
        customer: 'ALMONA Industrial',
        machine: 'YILMAZ CNC',
        location: 'Cairo, Egypt'
      }
    };

    // Test 1: Write performance
    console.log(`Test 1: Writing ${iterations} cache entries...`);
    const writeStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await redis.setex(`aftersales:ticket:${i}`, 300, JSON.stringify(testData));
    }
    const writeTime = Date.now() - writeStart;
    console.log(`✅ Wrote ${iterations} entries in ${writeTime}ms (${Math.round(writeTime/iterations)}ms avg)\n`);

    // Test 2: Read performance (cache hits)
    console.log(`Test 2: Reading ${iterations} cached entries...`);
    const readStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      const data = await redis.get(`aftersales:ticket:${i}`);
      if (data) JSON.parse(data);
    }
    const readTime = Date.now() - readStart;
    console.log(`✅ Read ${iterations} entries in ${readTime}ms (${Math.round(readTime/iterations)}ms avg)\n`);

    // Test 3: Pattern matching
    console.log('Test 3: Pattern matching...');
    const patternStart = Date.now();
    const keys = await redis.keys('aftersales:ticket:*');
    const patternTime = Date.now() - patternStart;
    console.log(`✅ Found ${keys.length} keys in ${patternTime}ms\n`);

    // Test 4: Bulk delete
    console.log('Test 4: Bulk delete...');
    const deleteStart = Date.now();
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    const deleteTime = Date.now() - deleteStart;
    console.log(`✅ Deleted ${keys.length} keys in ${deleteTime}ms\n`);

    // Performance summary
    console.log('📊 Performance Summary:');
    console.log(`  Write: ${Math.round(writeTime/iterations)}ms per entry`);
    console.log(`  Read: ${Math.round(readTime/iterations)}ms per entry`);
    console.log(`  Pattern match: ${patternTime}ms for ${keys.length} keys`);
    console.log(`  Bulk delete: ${deleteTime}ms for ${keys.length} keys\n`);

    // Comparison with typical database query
    console.log('💡 Comparison:');
    console.log(`  Typical Supabase query: ~50-200ms`);
    console.log(`  Redis cache read: ~${Math.round(readTime/iterations)}ms`);
    const improvement = Math.round(100 / (readTime/iterations));
    console.log(`  🚀 Speed improvement: ~${improvement}x faster\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Performance test completed!');
    console.log('═══════════════════════════════════════════════════════\n');

    await redis.quit();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    await redis.quit();
    process.exit(1);
  }
}

testCachePerformance();
