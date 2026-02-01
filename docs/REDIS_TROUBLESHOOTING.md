# Redis Connection Troubleshooting Guide

## Issue: Connection Failed

The Redis connection test failed with an error. Here are the steps to troubleshoot:

### 1. Verify Environment Variables

Check that your `.env` file has the correct Railway Redis credentials:

```bash
# .env
REDIS_HOST=your-railway-redis-host.railway.app
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

**To get Railway Redis credentials**:
1. Go to Railway dashboard
2. Select your Redis service
3. Go to "Variables" tab
4. Copy `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD`

### 2. Test Connection Manually

Try connecting with redis-cli:

```bash
# Test connection
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping

# Should return: PONG
```

### 3. Check Network/Firewall

Railway Redis should be publicly accessible, but verify:
- Railway Redis is deployed and running
- No firewall blocking port 6379
- Correct host format (should end with `.railway.app`)

### 4. Verify Redis Client Configuration

The client configuration in `src/lib/redis/client.ts` should match:

```typescript
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});
```

### 5. Alternative: Use Redis URL

Railway also provides a `REDIS_URL`. Try this instead:

```typescript
// In src/lib/redis/client.ts
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
```

Then update `.env`:
```bash
REDIS_URL=redis://default:password@host:port
```

### 6. Test with Simple Script

Create a minimal test:

```typescript
// test-redis-simple.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis!');
  redis.ping().then(pong => {
    console.log('✅ Ping:', pong);
    redis.quit();
  });
});

redis.on('error', (err) => {
  console.error('❌ Redis Error:', err.message);
  process.exit(1);
});
```

Run with:
```bash
npx tsx test-redis-simple.ts
```

### 7. Common Issues

**Issue**: `ECONNREFUSED`
- **Solution**: Check REDIS_HOST and REDIS_PORT are correct

**Issue**: `NOAUTH Authentication required`
- **Solution**: Check REDIS_PASSWORD is set correctly

**Issue**: `Connection timeout`
- **Solution**: Railway Redis might not be deployed or network issue

**Issue**: `getaddrinfo ENOTFOUND`
- **Solution**: REDIS_HOST is incorrect or DNS issue

### 8. Railway Redis Status

Check Railway dashboard:
- Redis service is "Active" (green)
- No deployment errors
- Metrics show it's running

### Next Steps

Once you've verified the credentials:

1. Update `.env` with correct values
2. Restart your development server
3. Run the simple test again:
   ```bash
   npx tsx src/lib/redis/simpleTest.ts
   ```

4. If successful, proceed to After Sales caching test:
   ```bash
   npx tsx src/lib/redis/__tests__/afterSalesCacheTest.ts
   ```

---

**Need Help?**

Share the error message and I can help diagnose:
- Full error output from the test
- Railway Redis connection details (without password)
- Environment variable format you're using
