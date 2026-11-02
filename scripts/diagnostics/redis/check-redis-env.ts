/**
 * Check Redis environment variables
 */
import 'dotenv/config'; // Load .env file

console.log('🔍 Checking Redis Environment Variables:\n');

console.log('REDIS_HOST:', process.env.REDIS_HOST || '❌ NOT SET');
console.log('REDIS_PORT:', process.env.REDIS_PORT || '❌ NOT SET');
console.log('REDIS_PASSWORD:', process.env.REDIS_PASSWORD ? '✅ SET (hidden)' : '❌ NOT SET');
console.log('REDIS_URL:', process.env.REDIS_URL ? '✅ SET (hidden)' : '❌ NOT SET');

console.log('\n📋 Expected format in .env file:\n');
console.log('REDIS_HOST=your-redis-host.railway.app');
console.log('REDIS_PORT=6379');
console.log('REDIS_PASSWORD=your-password');
console.log('\nOR\n');
console.log('REDIS_URL=redis://default:password@host.railway.app:6379');

console.log('\n💡 To get credentials from Railway:');
console.log('1. Go to Railway dashboard');
console.log('2. Select your Redis service');
console.log('3. Click "Variables" tab');
console.log('4. Copy REDIS_HOST, REDIS_PORT, and REDIS_PASSWORD');
console.log('5. Add them to your .env file');

if (!process.env.REDIS_HOST && !process.env.REDIS_URL) {
  console.log('\n❌ Redis credentials not found in environment!');
  console.log('Please add them to your .env file and restart.');
  process.exit(1);
} else {
  console.log('\n✅ Redis credentials found!');
  console.log('Attempting connection...\n');
  
  // Try to connect
  import('ioredis').then(({ default: Redis }) => {
    const redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      connectTimeout: 5000,
      retryStrategy: () => null, // Don't retry for this test
    });

    redis.on('connect', () => {
      console.log('✅ Connected to Redis!');
      redis.ping().then(pong => {
        console.log(`✅ Ping response: ${pong}`);
        redis.quit();
        process.exit(0);
      });
    });

    redis.on('error', (err) => {
      console.error('❌ Connection failed:', err.message);
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Verify REDIS_HOST is correct (should end with .railway.app)');
      console.log('2. Verify REDIS_PORT is 6379');
      console.log('3. Verify REDIS_PASSWORD is correct');
      console.log('4. Check Railway Redis service is running');
      redis.quit();
      process.exit(1);
    });
  });
}
