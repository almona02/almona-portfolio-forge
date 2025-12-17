# Railway PostgreSQL Setup - Simple Guide

## ✅ Why Railway PostgreSQL?

- ✅ **Already created and connected** to your project
- ✅ **Same network** = faster connection
- ✅ **No IP whitelisting** needed
- ✅ **Included in your $5 Hobby plan**
- ✅ **Automatic backups** (7 days retention)
- ✅ **Easy to scale** when needed

---

## Step 1: Verify PostgreSQL is Running

Your PostgreSQL service is already active! ✅

You can see in Railway Dashboard:
- Service: **Postgres**
- Status: **Active**
- Logs show: "database system is ready to accept connections"

---

## Step 2: Verify DATABASE_URL is Set

Railway **automatically** shares `DATABASE_URL` with your backend service.

### Check if it's set:

1. **Go to Railway Dashboard**
   - Select your **backend service** (not PostgreSQL)
   - Click **"Variables"** tab
   - Look for `DATABASE_URL`

2. **If you see `DATABASE_URL`:**
   - ✅ **You're done!** Railway already connected it
   - Format: `postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway`
   - No action needed!

3. **If `DATABASE_URL` is missing:**
   - Go to **PostgreSQL service** → "Variables" tab
   - Copy the `DATABASE_URL` value
   - Go to **backend service** → "Variables" → Click "New Variable"
   - Name: `DATABASE_URL`
   - Value: Paste the connection string
   - Click "Add"

---

## Step 3: Verify Connection Works

After Railway redeploys (after fixing the `click` dependency):

### Check Backend Logs:

1. **Railway Dashboard** → Backend Service → "Deployments" → Latest
2. **Look for:**
   - ✅ `Database connection pool initialized` (success!)
   - ✅ `INFO: Application startup complete`
   - ❌ `Database connection pool initialization failed` (if you see this, check `DATABASE_URL`)

### Test Health Endpoint:

Visit your backend URL:
```
https://your-backend-url.railway.app/health
```

Expected response:
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

## Step 4: Run Database Migrations

After connection is verified, create your database tables:

### Option A: Railway Shell (Easiest)

1. **Railway Dashboard** → Backend Service → "Deployments" → Latest → "Shell"
2. **Run your migration command:**
   ```bash
   # If you have Alembic:
   python -m alembic upgrade head
   
   # OR if you have init script:
   python scripts/init_db.py
   
   # OR if you have SQL file:
   psql $DATABASE_URL -f migrations/init.sql
   ```

### Option B: Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run python -m alembic upgrade head
```

### Option C: SQL Editor (Manual)

1. **Railway Dashboard** → PostgreSQL Service → "Data" tab
2. **Use built-in SQL editor** to run your table creation SQL

---

## Environment Variables Checklist

Make sure these are set in your **backend service**:

| Variable | Source | Status |
|----------|--------|--------|
| `DATABASE_URL` | ✅ Auto-set by Railway | Check Variables tab |
| `SUPABASE_URL` | Supabase Dashboard → Settings → API | Add if needed |
| `SUPABASE_KEY` | Supabase Dashboard → Settings → API | Add if needed |
| `JWT_SECRET_KEY` | Generate random string | Add if needed |
| `TZ` | Set to `Africa/Cairo` | Optional |
| `LANG` | Set to `ar_EG.UTF-8` | Optional |

---

## Troubleshooting

### Issue: "DATABASE_URL not found"

**Solution:**
- Railway should auto-set it, but if missing:
- Copy from PostgreSQL service → Variables → `DATABASE_URL`
- Paste into backend service → Variables

### Issue: "Connection refused"

**Check:**
- Both services must be in the **same Railway project**
- Railway automatically allows same-project communication
- No firewall configuration needed

### Issue: "Database does not exist"

**Solution:**
- Railway creates database automatically
- Check `PGDATABASE` variable (should be `railway`)
- Or create manually: `CREATE DATABASE railway;`

### Issue: Backend logs show "Database connection pool initialization failed"

**Check:**
1. Is `DATABASE_URL` set correctly?
2. Is connection string format correct?
3. Are both services in same project?

---

## Quick Verification

**From Railway Dashboard:**

1. ✅ PostgreSQL service is **Active**
2. ✅ Backend service has `DATABASE_URL` in Variables
3. ✅ Backend logs show "Database connection pool initialized"
4. ✅ Health endpoint returns database as "healthy"

---

## Cost

**Railway PostgreSQL:**
- ✅ **Included in $5 Hobby plan**
- ✅ Free tier: $5 credit/month (usually enough for development)
- ✅ Pro tier: Pay-as-you-go ($0.10/GB storage, $0.01/GB transfer)

For pilot deployment, the free tier is sufficient! 🎉

---

## Summary

**Railway PostgreSQL Setup:**
1. ✅ PostgreSQL service already created
2. ✅ Check backend Variables for `DATABASE_URL` (should be auto-set)
3. ✅ Verify connection in backend logs
4. ✅ Run migrations to create tables
5. ✅ Test health endpoint

**That's it!** Railway handles the connection automatically. No IP whitelisting, no manual configuration needed. 🚀

