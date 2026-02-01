/**
 * Simple Redis Connection Test
 * Run with: node --loader tsx src/lib/redis/simpleTest.ts
 * Or: npx tsx src/lib/redis/simpleTest.ts
 */

import 'dotenv/config'; // Load .env file
import Redis from 'ioredis';

async function testRedis() {
  console.log('🔍 Testing Railway Redis Connection...\n');

  // Create Redis client
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: 0,
  });

  try {
    // Test 1: Ping
    console.log('Test 1: Ping');
    const pong = await redis.ping();
    console.log(`✅ ${pong}\n`);

    // Test 2: Set and Get
    console.log('Test 2: Set and Get');
    await redis.set('test:hello', 'Hello from ALMONA!');
    const value = await redis.get('test:hello');
    console.log(`✅ Value: ${value}\n`);

    // Test 3: Set with expiry
    console.log('Test 3: Set with TTL');
    await redis.setex('test:expiry', 10, 'Expires in 10 seconds');
    const ttl = await redis.ttl('test:expiry');
    console.log(`✅ TTL: ${ttl} seconds\n`);

    // Test 4: JSON data
    console.log('Test 4: Store JSON');
    const data = { system: 'aftersales', ticket: 123, status: 'open' };
    await redis.setex('test:json', 60, JSON.stringify(data));
    const retrieved = JSON.parse(await redis.get('test:json') || '{}');
    console.log(`✅ Retrieved:`, retrieved, '\n');

    // Test 5: Increment (rate limiting)
    console.log('Test 5: Counter');
    const count1 = await redis.incr('test:counter');
    const count2 = await redis.incr('test:counter');
    const count3 = await redis.incr('test:counter');
    console.log(`✅ Counts: ${count1}, ${count2}, ${count3}\n`);

    // Test 6: Pattern matching
    console.log('Test 6: Pattern Keys');
    await redis.set('aftersales:ticket:1', 'data1');
    await redis.set('aftersales:ticket:2', 'data2');
    await redis.set('fabricator:project:1', 'data3');
    const keys = await redis.keys('aftersales:*');
    console.log(`✅ Found ${keys.length} keys matching 'aftersales:*':`);
    keys.forEach(key => console.log(`   - ${key}`));
    console.log('');

    // Test 7: Delete
    console.log('Test 7: Cleanup');
    await redis.del('test:hello', 'test:expiry', 'test:json', 'test:counter');
    await redis.del(...keys);
    await redis.del('fabricator:project:1');
    console.log(`✅ Cleaned up test keys\n`);

    // Server info
    console.log('📊 Redis Server Info:');
    const info = await redis.info('server');
    const version = info.match(/redis_version:(.+)/)?.[1];
    const mode = info.match(/redis_mode:(.+)/)?.[1];
    console.log(`   Version: ${version}`);
    console.log(`   Mode: ${mode}\n`);

    console.log('✅ All tests passed!');
    console.log('🎉 Railway Redis is ready for production!\n');

    await redis.quit();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    await redis.quit();
    process.exit(1);
  }
}

testRedis();
