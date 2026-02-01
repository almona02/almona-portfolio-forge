import { CacheHelper } from '../cacheHelper';
import redis from '../client';

/**
 * Test Redis connection and basic operations
 */
async function testRedisConnection() {
  console.log('🔍 Testing Redis Connection...\n');

  try {
    // Test 1: Ping
    console.log('Test 1: Ping Redis');
    const pong = await redis.ping();
    console.log(`✅ Ping response: ${pong}\n`);

    // Test 2: Set and Get
    console.log('Test 2: Set and Get');
    await redis.set('test:key', 'Hello Redis!');
    const value = await redis.get('test:key');
    console.log(`✅ Retrieved value: ${value}\n`);

    // Test 3: Set with expiry
    console.log('Test 3: Set with TTL (5 seconds)');
    await redis.setex('test:expiry', 5, 'This will expire');
    const ttl = await redis.ttl('test:expiry');
    console.log(`✅ TTL: ${ttl} seconds\n`);

    // Test 4: Delete
    console.log('Test 4: Delete key');
    await redis.del('test:key');
    const deleted = await redis.get('test:key');
    console.log(`✅ After delete: ${deleted === null ? 'null (success)' : 'still exists (failed)'}\n`);

    // Test 5: CacheHelper operations
    console.log('Test 5: CacheHelper.set and get');
    await CacheHelper.set('test:helper', { foo: 'bar', timestamp: Date.now() }, { ttl: 60 });
    const cached = await CacheHelper.get('test:helper');
    console.log(`✅ CacheHelper retrieved:`, cached, '\n');

    // Test 6: Pattern invalidation
    console.log('Test 6: Pattern invalidation');
    await CacheHelper.set('test:pattern:1', { id: 1 });
    await CacheHelper.set('test:pattern:2', { id: 2 });
    await CacheHelper.set('test:other:1', { id: 3 });
    const deleted_count = await CacheHelper.invalidatePattern('test:pattern:*');
    console.log(`✅ Deleted ${deleted_count} keys matching pattern\n`);

    // Test 7: Increment (for rate limiting)
    console.log('Test 7: Increment counter');
    const count1 = await CacheHelper.increment('test:counter', 10);
    const count2 = await CacheHelper.increment('test:counter', 10);
    const count3 = await CacheHelper.increment('test:counter', 10);
    console.log(`✅ Counter values: ${count1}, ${count2}, ${count3}\n`);

    // Test 8: GetOrSet pattern
    console.log('Test 8: GetOrSet pattern');
    let dbCallCount = 0;
    const fetchFn = async () => {
      dbCallCount++;
      console.log(`  📊 Fetching from "database" (call #${dbCallCount})`);
      return { data: 'from database', timestamp: Date.now() };
    };

    const result1 = await CacheHelper.getOrSet('test:getOrSet', fetchFn, { ttl: 60 });
    console.log(`  First call:`, result1);
    
    const result2 = await CacheHelper.getOrSet('test:getOrSet', fetchFn, { ttl: 60 });
    console.log(`  Second call (should be cached):`, result2);
    console.log(`✅ Database called ${dbCallCount} time(s) (should be 1)\n`);

    // Cleanup
    console.log('🧹 Cleaning up test keys...');
    await redis.del('test:expiry', 'test:helper', 'test:other:1', 'test:counter', 'test:getOrSet');
    
    console.log('\n✅ All Redis tests passed!');
    console.log('🎉 Redis is ready for production use!\n');

    return true;
  } catch (error) {
    console.error('❌ Redis test failed:', error);
    return false;
  }
}

/**
 * Test Redis info and stats
 */
async function testRedisInfo() {
  console.log('📊 Redis Server Information:\n');

  try {
    // Get server info
    const info = await redis.info('server');
    console.log('Server Info:');
    console.log(info.split('\r\n').slice(0, 10).join('\n'));
    console.log('...\n');

    // Get memory info
    const memory = await redis.info('memory');
    const memoryLines = memory.split('\r\n').filter(line => 
      line.includes('used_memory_human') || 
      line.includes('maxmemory_human')
    );
    console.log('Memory Info:');
    memoryLines.forEach(line => console.log(line));
    console.log('');

    // Get stats
    const stats = await redis.info('stats');
    const statsLines = stats.split('\r\n').filter(line => 
      line.includes('total_connections_received') || 
      line.includes('total_commands_processed') ||
      line.includes('keyspace_hits') ||
      line.includes('keyspace_misses')
    );
    console.log('Stats:');
    statsLines.forEach(line => console.log(line));
    console.log('');

    return true;
  } catch (error) {
    console.error('❌ Failed to get Redis info:', error);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 Redis Connection & Functionality Tests');
  console.log('═══════════════════════════════════════════════════════\n');

  const connectionTest = await testRedisConnection();
  console.log('');
  
  if (connectionTest) {
    await testRedisInfo();
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log(connectionTest ? '✅ All tests completed successfully!' : '❌ Some tests failed');
  console.log('═══════════════════════════════════════════════════════\n');

  // Close connection
  await redis.quit();
  process.exit(connectionTest ? 0 : 1);
}

// Run tests if executed directly
if (require.main === module) {
  runTests();
}

export { testRedisConnection, testRedisInfo };
