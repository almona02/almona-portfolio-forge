# 🐳 YDT Dockerfile - Rebuilt

## ✅ What's New

The Dockerfile has been completely rebuilt with:

### 1. **Optimized Layer Caching**
- Requirements installed in separate layer
- Better cache utilization for faster rebuilds

### 2. **Proper Path Configuration**
- `PYTHONPATH` set correctly for imports
- All YDT modules accessible

### 3. **Complete File Structure**
- API code: `python_backend/api/`
- YDT agent: `ai_agents/ydt_agent/*.py`
- Knowledge base: `ai_agents/ydt_agent/knowledge/`
- Tests: `python_backend/tests/`

### 4. **Railway Compatibility**
- Uses `PORT` environment variable (Railway auto-sets)
- Falls back to 8000 if not set
- Configurable workers via `API_WORKERS`

### 5. **Health Check**
- 40s start period (gives time for app to initialize)
- Checks `/api/health` endpoint
- Retries 3 times

## 📋 Build Context

**Important**: Build from **project root**, not from `python_backend/`

```bash
# Correct way (from project root)
docker build -f python_backend/Dockerfile -t ydt-prestige-api .

# Wrong way (don't do this)
cd python_backend
docker build -f Dockerfile .
```

## 🚂 Railway Configuration

In Railway Dashboard for YDT service:

- **Root Directory**: `/` (project root)
- **Dockerfile Path**: `python_backend/Dockerfile`
- **Build Command**: (leave empty)
- **Start Command**: (leave empty)

## ✅ What Gets Included

1. **Python Dependencies**
   - FastAPI, Uvicorn, Pydantic
   - Google Generative AI
   - All requirements from `requirements_prestige.txt`

2. **YDT Agent Code**
   - `ydt_chatbot_engine.py`
   - `gcode_ydt_integration.py`
   - `arabic_support.py`
   - `university_curriculum.py`
   - All other YDT modules

3. **Knowledge Base**
   - Processed JSON files
   - Specifications
   - Wiring diagrams
   - Spare parts
   - All AIM 7510 knowledge

4. **API Code**
   - `api/prestige_endpoints.py`
   - All API routes
   - Test files

## 🔍 Verification

After building, verify the image:

```bash
# Build the image
docker build -f python_backend/Dockerfile -t ydt-test .

# Check if YDT code is included
docker run --rm ydt-test ls -la /app/ai_agents/ydt_agent/

# Check if knowledge base is included
docker run --rm ydt-test ls -la /app/knowledge/processed/aim-7510/

# Test the API
docker run -p 8000:8000 -e PORT=8000 ydt-test
curl http://localhost:8000/api/health
```

## 📊 Image Size Optimization

- Uses `python:3.11-slim` (smaller base image)
- Removes apt cache after installation
- No unnecessary files copied
- Multi-stage build not needed (simple app)

## 🚀 Ready for Deployment

The Dockerfile is now:
- ✅ Optimized for caching
- ✅ Railway compatible
- ✅ Includes all YDT code
- ✅ Includes knowledge base
- ✅ Health check configured
- ✅ PORT environment variable support

---

**Status**: ✅ Ready for Railway Deployment

