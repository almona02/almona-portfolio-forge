# Verify PostgreSQL Connection in Railway

## ✅ Database is Running!

Your PostgreSQL logs show:
- ✅ PostgreSQL 17.7 is running
- ✅ Listening on port 5432
- ✅ Database system ready to accept connections

---

## Step 1: Verify DATABASE_URL is Set

1. **Go to Railway Dashboard**
   - Select your **backend service** (not PostgreSQL service)
   - Click **"Variables"** tab

2. **Check for these variables:**
   - `DATABASE_URL` - Should be automatically set by Railway
   - Format: `postgresql://postgres:password@hostname:5432/railway`

3. **If DATABASE_URL is missing:**
   - Railway should auto-set it, but if not:
   - Go to PostgreSQL service → "Variables" tab
   - Copy the connection string
   - Go to backend service → "Variables" → Add `DATABASE_URL`

---

## Step 2: Check Backend Logs

1. **Go to your backend service** in Railway
2. **Click "Deployments"** → Latest deployment
3. **Check logs for:**
   - ✅ `Database connection pool initialized` (success!)
   - ❌ `Database connection pool initialization failed` (needs fixing)

---

## Step 3: Test Health Endpoint

1. **Get your backend URL:**
   - Railway Dashboard → Backend Service → "Settings" → "Networking"
   - Copy the public URL (e.g., `https://almona-backend.railway.app`)

2. **Test health endpoint:**
   ```bash
   curl https://your-backend-url.railway.app/health
   ```

   Or visit in browser:
   ```
   https://your-backend-url.railway.app/health
   ```

3. **Expected response:**
   ```json
   {
     "status": "healthy",
     "checks": {
       "database": {
         "status": "healthy",
         "message": "Check passed"
       }
     }
   }
   ```

---

## Step 4: Test Database Connection (Optional)

If you want to verify the connection directly:

1. **Use Railway Shell:**
   - Go to backend service → "Deployments" → Latest → "Shell"
   - Run:
     ```bash
     python -c "from core.connection_pool import get_connection_pool; import asyncio; asyncio.run(get_connection_pool().initialize()); print('✅ Database connected!')"
     ```

2. **Or use PostgreSQL service shell:**
   - Go to PostgreSQL service → "Data" tab
   - Use the built-in SQL editor to run:
     ```sql
     SELECT version();
     ```

---

## Troubleshooting

### Issue: Backend logs show "Database connection pool initialization failed"

**Check:**
1. Is `DATABASE_URL` set in backend service variables?
2. Is the connection string format correct?
3. Are both services in the same Railway project?

**Fix:**
- Railway automatically shares variables between services in the same project
- If not working, manually copy `DATABASE_URL` from PostgreSQL service to backend service

### Issue: Health endpoint shows database as "unhealthy"

**Possible causes:**
1. Database tables don't exist yet (need to run migrations)
2. Connection string is incorrect
3. Network connectivity issue

**Fix:**
- Run database migrations first
- Check connection string format
- Verify both services are in same project

### Issue: "Connection refused" or "Connection timeout"

**Check:**
- Both services must be in the same Railway project
- Railway automatically allows same-project services to communicate
- No firewall configuration needed

---

## Next Steps

Once connection is verified:

1. ✅ **Run Database Migrations**
   - Create your database tables
   - See migration guide in your project

2. ✅ **Update Healthcheck** (Optional)
   - Once database is working, you can change healthcheck back to `/health/live`
   - Or keep it at `/` for simplicity

3. ✅ **Test Full Workflow**
   - Import a DXF file
   - Create a profile
   - Verify data is saved to database

---

## Quick Verification Commands

**From Railway Shell (backend service):**

```bash
# Test Python can import database modules
python -c "from core.connection_pool import get_connection_pool; print('✅ Import successful')"

# Test connection (if you have async test script)
python -c "
import asyncio
from core.connection_pool import get_connection_pool

async def test():
    pool = get_connection_pool()
    await pool.initialize()
    print('✅ Database connection successful!')

asyncio.run(test())
"
```

**Check environment variables:**
```bash
echo $DATABASE_URL
```

---

## Success Indicators

✅ **Database is ready when you see:**
- PostgreSQL logs show "ready to accept connections"
- Backend logs show "Database connection pool initialized"
- Health endpoint returns `"database": {"status": "healthy"}`
- No connection errors in backend logs

Your database is running! Now just verify the connection and run migrations. 🚀

