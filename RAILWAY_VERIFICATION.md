# Railway Connection Verification

## Railway Service Details

Based on the provided information:
- **Service Name**: `almona-portfolio-forge`
- **Internal URL**: `almona-portfolio-forge.railway.internal`
- **Proxy URL**: `yamanote.proxy.rlwy.net:57928`

## Current Configuration Status

### ✅ Configuration Files Present

1. **Railway Configuration** (`python_backend/railway.json`)
   - Dockerfile path: `python_backend/Dockerfile.realistic`
   - Health check path: `/health`
   - Start command: `bash start.sh`

2. **Database Adapter** (`python_backend/core/database_adapter.py`)
   - ✅ Configured to use Railway PostgreSQL as primary
   - ✅ Falls back to Supabase if Railway unavailable
   - ✅ Connection pooling configured (20 connections, 30 max overflow)

3. **Settings** (`python_backend/core/config.py`)
   - ✅ Reads `DATABASE_URL` from environment
   - ✅ Reads `REDIS_URL` from environment
   - ✅ Supports Railway service references

### 🔍 Verification Steps

#### 1. Check Railway Dashboard

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select project: `almona-portfolio-forge`
3. Verify services:
   - ✅ Backend service (`almona-portfolio-forge`)
   - ✅ PostgreSQL database service
   - ✅ Redis service (if added)

#### 2. Verify Environment Variables

In Railway Dashboard → Your Service → Variables, verify:

```bash
# Database (should reference Railway PostgreSQL)
DATABASE_URL=${{Postgres.DATABASE_URL}}
# OR direct connection string like:
# postgresql://postgres:password@yamanote.proxy.rlwy.net:57928/railway

# Redis (if added)
REDIS_URL=${{Redis.REDIS_URL}}
# OR direct connection string

# Other required variables
SECRET_KEY=your-secret-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

#### 3. Test Health Endpoint

Once deployed, test the health endpoint:

```bash
# Public URL (from Railway dashboard)
curl https://your-service.railway.app/health

# Should return:
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "timestamp": "..."
}
```

#### 4. Test Railway-Specific Health Endpoint

```bash
curl https://your-service.railway.app/health/railway

# Should return service recommendations and status
```

### 🔧 Connection Details

#### Internal Service Names

Railway provides internal service names for inter-service communication:
- `almona-portfolio-forge.railway.internal` - Internal service name
- `yamanote.proxy.rlwy.net:57928` - Proxy URL for external access

#### Database Connection

The application automatically:
1. Tries Railway PostgreSQL first (if `DATABASE_URL` contains `railway` or `rlwy.net`)
2. Falls back to Supabase if Railway unavailable
3. Uses connection pooling for performance

#### Redis Connection

Redis connection:
- Uses `REDIS_URL` if provided
- Falls back to `REDIS_HOST` and `REDIS_PORT` if URL not provided
- Handles Railway's internal service names automatically

### 📋 Verification Checklist

- [ ] Railway project exists and is linked to GitHub repo
- [ ] Backend service is deployed and running
- [ ] PostgreSQL service is added and connected
- [ ] Redis service is added (optional but recommended)
- [ ] Environment variables are set in Railway dashboard
- [ ] Health endpoint returns `200 OK`
- [ ] Database connection works (check logs)
- [ ] Redis connection works (if configured)

### 🚨 Common Issues

1. **Database Not Connecting**
   - Verify `DATABASE_URL` is set in Railway variables
   - Check if PostgreSQL service is running
   - Verify connection string format

2. **Redis Not Connecting**
   - Verify `REDIS_URL` is set (if using Redis)
   - Check if Redis service is added to Railway project
   - Verify internal service name resolution

3. **Health Check Failing**
   - Check Railway deployment logs
   - Verify health check path is `/health`
   - Check if port 8000 is exposed

### 📝 Next Steps

1. **Deploy to Railway** (if not already deployed)
   ```bash
   railway up
   ```

2. **Check Deployment Logs**
   ```bash
   railway logs
   ```

3. **Test Health Endpoint**
   - Use the public URL from Railway dashboard
   - Verify all services are healthy

4. **Monitor Service Status**
   - Check Railway dashboard for service metrics
   - Monitor connection pool usage
   - Check error rates

### 🔗 Useful Commands

```bash
# Railway CLI commands
railway login
railway link
railway status
railway logs
railway variables
railway connect postgres  # Connect to PostgreSQL
railway connect redis     # Connect to Redis (if added)
```

### ✅ Success Indicators

Your Railway setup is working correctly when:
- ✅ Health endpoint returns `200 OK`
- ✅ Database connection status shows "connected"
- ✅ No connection errors in logs
- ✅ Services can communicate internally
- ✅ Public URL is accessible

