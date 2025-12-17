# Railway PostgreSQL Setup Guide

## Why Set Up PostgreSQL?

✅ **Yes, fixing the database connection is better!** Here's why:

1. **Application Functionality**: Your app needs a database to store:
   - User profiles
   - Window profiles
   - DXF files metadata
   - Optimization results
   - System configurations

2. **Better Health Checks**: With a working database, health checks will pass properly

3. **Production Ready**: Non-blocking startup is fine for initial deployment, but you need a real database for production

---

## Step-by-Step: Add PostgreSQL to Railway

### Step 1: Add PostgreSQL Service

1. **Go to your Railway project dashboard**
   - Visit: https://railway.app/dashboard
   - Select your project: `almona-portfolio-forge`

2. **Click "New" button** (top right)
   - Select **"Database"**
   - Choose **"Add PostgreSQL"**

3. **Railway will automatically:**
   - Create a PostgreSQL database
   - Generate connection credentials
   - Set up environment variables

---

### Step 2: Connect Database to Backend Service

1. **In your Railway project dashboard:**
   - You should now see two services:
     - `almona-portfolio-forge` (your backend)
     - `Postgres` (new database)

2. **Click on your backend service** (`almona-portfolio-forge`)

3. **Go to "Variables" tab**

4. **Railway automatically adds these variables:**
   - `DATABASE_URL` - Full PostgreSQL connection string
   - `PGHOST` - Database host
   - `PGPORT` - Database port
   - `PGUSER` - Database user
   - `PGPASSWORD` - Database password
   - `PGDATABASE` - Database name

   ✅ **These are automatically shared between services!**

---

### Step 3: Verify Connection String Format

Your `DATABASE_URL` should look like:
```
postgresql://postgres:password@hostname:5432/railway
```

Or for Supabase-style (if your app uses Supabase client):
```
postgresql://postgres:password@hostname:5432/railway?sslmode=require
```

---

### Step 4: Update Your App Configuration (If Needed)

Your app already reads `DATABASE_URL` from environment variables (see `core/config.py`):

```python
DATABASE_URL: str = Field(
    default_factory=lambda: os.getenv('DATABASE_URL', '')
)
```

✅ **No code changes needed!** Railway automatically injects the `DATABASE_URL`.

---

### Step 5: Run Database Migrations

After the database is connected, you need to create tables:

1. **Option A: Use Railway CLI** (Recommended)
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli
   
   # Login
   railway login
   
   # Connect to your project
   railway link
   
   # Run migrations (if you have a migration script)
   railway run python -m alembic upgrade head
   # OR
   railway run python scripts/init_db.py
   ```

2. **Option B: Use Railway Shell**
   - Go to your backend service in Railway dashboard
   - Click "Deployments" → Latest deployment → "Shell"
   - Run your migration commands

3. **Option C: Manual SQL** (if needed)
   - Go to PostgreSQL service → "Data" tab
   - Use the built-in SQL editor

---

## Railway PostgreSQL Features

### Automatic Backups
- Railway automatically backs up your PostgreSQL database
- Backups are retained for 7 days (on free tier)

### Connection Pooling
- Railway provides connection pooling automatically
- Max connections: 100 (on free tier)

### Monitoring
- View database metrics in Railway dashboard
- Monitor connection count, query performance, etc.

---

## Environment Variables Reference

Railway automatically creates these variables in your backend service:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Full connection string | `postgresql://user:pass@host:5432/db` |
| `PGHOST` | Database hostname | `containers-us-west-xxx.railway.app` |
| `PGPORT` | Database port | `5432` |
| `PGUSER` | Database username | `postgres` |
| `PGPASSWORD` | Database password | `xxxxx` |
| `PGDATABASE` | Database name | `railway` |

---

## Troubleshooting

### Issue: "Connection refused"
**Solution**: Make sure both services are in the same Railway project. Railway automatically allows services in the same project to communicate.

### Issue: "Database does not exist"
**Solution**: Railway creates the database automatically. Check the `PGDATABASE` variable matches.

### Issue: "SSL connection required"
**Solution**: Add `?sslmode=require` to your `DATABASE_URL`:
```
postgresql://user:pass@host:5432/db?sslmode=require
```

### Issue: "Too many connections"
**Solution**: Railway free tier allows 100 connections. Consider:
- Using connection pooling (already built into your app)
- Reducing connection pool size in your app config

---

## Next Steps After Setup

1. ✅ **Verify Connection**
   - Check backend logs in Railway
   - Should see: "Database connection pool initialized"

2. ✅ **Test Health Endpoint**
   - Visit: `https://your-railway-url.railway.app/health`
   - Database check should show "healthy"

3. ✅ **Run Migrations**
   - Create your database tables
   - Seed initial data if needed

4. ✅ **Update Healthcheck** (Optional)
   - Once database is working, you can change healthcheck back to `/health/live`
   - Or keep it at `/` for simplicity

---

## Cost

**Railway PostgreSQL Pricing:**
- **Free Tier**: $5 credit/month (usually enough for development)
- **Pro Tier**: Pay-as-you-go ($0.10/GB storage, $0.01/GB transfer)

For a pilot deployment, the free tier should be sufficient!

---

## Quick Checklist

- [ ] Added PostgreSQL service in Railway
- [ ] Verified `DATABASE_URL` is set in backend service variables
- [ ] Checked backend logs for connection success
- [ ] Ran database migrations
- [ ] Tested `/health` endpoint
- [ ] Verified database tables exist

---

## Need Help?

If you encounter issues:
1. Check Railway service logs
2. Verify environment variables are set
3. Test connection from Railway shell
4. Check your app's database connection code

Your app is already configured to use `DATABASE_URL` from environment variables, so once Railway sets it up, it should work automatically! 🚀

