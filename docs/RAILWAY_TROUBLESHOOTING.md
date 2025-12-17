# Railway Deployment Troubleshooting

## ✅ Build Success - Service Not Starting

Your build succeeded! ✅
- ✅ `click==8.1.7` installed successfully
- ✅ All dependencies installed
- ✅ Docker image built and pushed
- ❌ Service not responding to healthcheck

---

## Step 1: Check Deploy Logs (CRITICAL)

The healthcheck is failing because the service isn't starting. Check the actual error:

1. **Railway Dashboard** → Backend Service → "Deployments" → Latest
2. **Click "Deploy Logs"** (not Build Logs)
3. **Look for:**
   - ❌ Import errors
   - ❌ Port binding errors
   - ❌ Startup crashes
   - ❌ Database connection errors

**Common errors to look for:**
- `ModuleNotFoundError` - Missing import
- `Address already in use` - Port conflict
- `Connection refused` - Database connection issue
- `SyntaxError` - Code error

---

## Step 2: Verify Start Command

**Current start command:**
```bash
uvicorn apis.main:app --host 0.0.0.0 --port $PORT
```

**Railway automatically sets `$PORT`** - this should work.

**If you see port errors:**
- Railway sets `$PORT` automatically
- Make sure you're using `$PORT` (not hardcoded 8000)
- Check Railway service settings → Networking → Port

---

## Step 3: Test Locally (Optional)

If you want to test the Docker image locally:

```bash
# Build image
docker build -t almona-backend:test -f python_backend/Dockerfile.realistic python_backend/

# Run with Railway-like environment
docker run -p 8000:8000 -e PORT=8000 -e DATABASE_URL=postgresql://test:test@localhost/test almona-backend:test

# Test health endpoint
curl http://localhost:8000/
```

---

## Step 4: Common Fixes

### Fix 1: Import Errors

If you see `ModuleNotFoundError` in deploy logs:
- Check if the module exists in `requirements-prod.txt`
- Verify the import path is correct
- Make sure all dependencies are listed

### Fix 2: Port Issues

If you see port binding errors:
- Railway sets `$PORT` automatically
- Don't hardcode port 8000
- Use `$PORT` in start command (already done ✅)

### Fix 3: Startup Timeout

If service takes too long to start:
- Increase `healthcheckTimeout` in `railway.json` (currently 100s)
- Check if database connection is blocking startup
- Verify startup event isn't hanging

### Fix 4: Database Connection Blocking

If database connection is blocking:
- Startup event is already non-blocking ✅
- Check if `DATABASE_URL` is set correctly
- Verify Railway PostgreSQL is running

---

## Step 5: Quick Diagnostic Commands

**From Railway Shell** (Backend Service → Deployments → Latest → Shell):

```bash
# Test if Python can import the app
python -c "from apis.main import app; print('✅ Import successful')"

# Test if uvicorn can start (will fail if port in use, but shows import errors)
python -m uvicorn apis.main:app --host 0.0.0.0 --port 8000

# Check environment variables
echo $PORT
echo $DATABASE_URL
```

---

## What to Check Next

1. ✅ **Deploy Logs** - Most important! Shows actual error
2. ✅ **Environment Variables** - Verify `DATABASE_URL` is set
3. ✅ **Port Configuration** - Railway should auto-set `$PORT`
4. ✅ **Start Command** - Should use `$PORT` (already correct)

---

## Expected Behavior

**When service starts successfully, you should see:**
```
INFO:     Started server process [1]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**If you see errors instead, that's what we need to fix!**

---

## Next Steps

1. **Check Deploy Logs** (most important!)
2. **Share the error message** from deploy logs
3. **We'll fix the specific issue** based on the error

The build is working - now we just need to see why the service isn't starting! 🚀

