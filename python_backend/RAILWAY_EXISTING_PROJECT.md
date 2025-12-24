# 🚂 Adding YDT Prestige Agent to Existing Railway Project

## ✅ Recommended: Add as New Service

Since you already have a Railway project with Redis and Postgres, **add the YDT Prestige Agent as a new service** to the same project.

## 🎯 Benefits

- ✅ Reuse existing Redis for session management
- ✅ Reuse existing Postgres (if needed for future features)
- ✅ All services in one project
- ✅ Easier monitoring and management
- ✅ Shared environment variables

## 📋 Step-by-Step Instructions

### Step 1: Add New Service

1. **Go to your Railway project dashboard**
   - https://railway.app/project/[your-project]

2. **Click "New Service"** (or "+" button)
   - Select "GitHub Repo"
   - Choose your repository

3. **Configure the Service**
   - **Name**: `ydt-prestige-api` (or your preferred name)
   - **Root Directory**: `python_backend`
   - **Build Command**: (auto-detected from Dockerfile)
   - **Start Command**: (auto-detected)

### Step 2: Connect to Existing Services

#### Option A: Use Existing Redis (Recommended)

1. **In YDT service settings**, go to "Variables"
2. **Add variable**:
   ```
   REDIS_URL=${{redis.REDIS_URL}}
   ```
   (Replace `redis` with your Redis service name)

3. **Or use Railway's service reference**:
   - Click "Add Variable"
   - Select "Reference Variable"
   - Choose your Redis service
   - Select `REDIS_URL`

#### Option B: Use Existing Postgres (Optional)

If you want to use Postgres for future features:

1. **Add variable**:
   ```
   DATABASE_URL=${{postgres.DATABASE_URL}}
   ```
   (Replace `postgres` with your Postgres service name)

### Step 3: Set Environment Variables

Add these to your YDT service:

**Required:**
```
GOOGLE_GEMINI_API_KEY=your-gemini-api-key-here
SECRET_KEY=your-secret-key-here
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:3000
```

**Optional:**
```
API_WORKERS=4
LOG_LEVEL=INFO
REDIS_URL=${{redis.REDIS_URL}}  # If using Redis
DATABASE_URL=${{postgres.DATABASE_URL}}  # If using Postgres
```

**Note**: `PORT` is auto-set by Railway - don't override it!

### Step 4: Deploy

1. Railway will automatically:
   - Build the Docker image
   - Deploy the service
   - Assign a public URL

2. **Get your service URL**:
   - Click on the YDT service
   - Go to "Settings" → "Domains"
   - Copy the generated URL (e.g., `ydt-prestige-api-production.up.railway.app`)

### Step 5: Verify Deployment

```bash
# Test health endpoint
curl https://your-ydt-service.railway.app/api/health

# Test chat endpoint
curl -X POST https://your-ydt-service.railway.app/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "persona": "professor",
    "language": "en"
  }'
```

## 🔗 Service Communication

### Accessing Other Services

If you need to connect to Redis or Postgres from YDT:

**Redis Example:**
```python
import os
import redis

redis_url = os.getenv("REDIS_URL")
r = redis.from_url(redis_url)
```

**Postgres Example:**
```python
import os
from sqlalchemy import create_engine

database_url = os.getenv("DATABASE_URL")
engine = create_engine(database_url)
```

### Internal Service URLs

Railway services can communicate using:
- **Service name** (e.g., `redis:6379`)
- **Environment variables** (recommended)

## 📊 Project Structure

Your Railway project will look like:

```
Your Project
├── redis (existing)
│   └── REDIS_URL
├── postgres (existing)
│   └── DATABASE_URL
└── ydt-prestige-api (new)
    ├── PORT (auto-set)
    ├── GOOGLE_GEMINI_API_KEY
    ├── SECRET_KEY
    ├── ALLOWED_ORIGINS
    ├── REDIS_URL=${{redis.REDIS_URL}} (optional)
    └── DATABASE_URL=${{postgres.DATABASE_URL}} (optional)
```

## 🔧 Configuration Tips

### 1. Custom Domain (Optional)

If you want a custom domain:
- Go to YDT service → Settings → Domains
- Add your custom domain
- Update `ALLOWED_ORIGINS` to include it

### 2. Resource Limits

Railway auto-scales, but you can set limits:
- Go to service → Settings → Resources
- Adjust CPU/Memory if needed

### 3. Environment-Specific Variables

You can set different variables for:
- **Production**: Default environment
- **Preview**: For preview deployments (if using branches)

## 🚨 Important Notes

1. **Port Configuration**: Railway sets `PORT` automatically. The Dockerfile uses `${PORT:-8000}`, so it will work correctly.

2. **Service Names**: When referencing other services, use the exact service name as shown in Railway dashboard.

3. **Build Context**: Railway builds from project root, so the Dockerfile paths work correctly.

4. **YDT Agent Code**: All YDT modules are included in the Docker image, so no external dependencies needed.

## ✅ Checklist

- [ ] New service added to existing project
- [ ] Root directory set to `python_backend`
- [ ] Environment variables configured
- [ ] Redis connected (if using)
- [ ] Postgres connected (if using)
- [ ] Service deployed successfully
- [ ] Health check passing
- [ ] Chat endpoint working

## 🎉 Done!

Your YDT Prestige Agent is now running alongside your existing services!

---

**Quick Reference:**
- Service Name: `ydt-prestige-api`
- Root Directory: `python_backend`
- Port: Auto-set by Railway
- URL: `https://your-service.railway.app`

