# Port Configuration Analysis - December 19, 2024

## 🔍 Current Configuration Status

### Backend Configuration

**Internal Container Port:** `8000` (always)
- `Dockerfile.prod.slim:115` - `EXPOSE 8000`
- `Dockerfile.prod.slim:118` - `CMD ["uvicorn", "apis.main:app", "--host", "0.0.0.0", "--port", "8000"]`
- `start.sh:5` - `PORT=${PORT:-8000}` (defaults to 8000)

**External Port Mapping:**
- `python_backend/docker-compose.yml:8` - `"8000:8000"` (host:container)
- `pilot-deployment/docker-compose.yml:9` - `"8002:8000"` (host:container)

### Frontend Configuration

**Current:** `src/services/smartScanApi.ts:7`
```typescript
if (import.meta.env.DEV) return "http://localhost:8002";
```

**Environment Variable:** Uses `VITE_API_URL` if set, otherwise defaults to 8002 in dev.

---

## 📊 Port Usage Summary

| Context | Port | Notes |
|---------|------|-------|
| **Backend Internal** | 8000 | Always (inside container) |
| **docker-compose.yml** | 8000 | Maps 8000:8000 |
| **pilot-deployment** | 8002 | Maps 8002:8000 (external:internal) |
| **Frontend Default** | 8002 | smartScanApi.ts defaults to 8002 |
| **README.md** | 8000 | Documentation says 8000 |

---

## 🧪 Test Results

**Port 8000:** ❌ Not responding (backend not running)
**Port 8002:** ❌ Not responding (backend not running)

**Note:** Backend is not currently running, so we can't test which port works.

---

## 🎯 Recommendation

### Option 1: Standardize on Port 8000 (Recommended for Development)
**Pros:**
- Matches README.md documentation
- Matches `docker-compose.yml` default
- Simpler configuration

**Changes Needed:**
- Update `smartScanApi.ts` to use 8000 instead of 8002
- Keep README.md as-is (already 8000)

### Option 2: Standardize on Port 8002 (Current Frontend Default)
**Pros:**
- Frontend already configured for 8002
- Matches pilot-deployment configuration
- Avoids conflicts with other services on 8000

**Changes Needed:**
- Update README.md to use 8002
- Update `docker-compose.yml` to map 8002:8000

---

## 🔧 Next Steps

1. **Start Backend** to test which port actually works:
   ```bash
   cd python_backend
   uvicorn apis.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Test Both Ports:**
   ```bash
   curl http://localhost:8000/health
   curl http://localhost:8002/health
   ```

3. **Decide on Standard:**
   - If 8000 works → Update frontend to use 8000
   - If 8002 works → Update README to use 8002

4. **Update Configuration:**
   - Ensure all configs match the chosen port
   - Update documentation
   - Update environment variables

---

## 📝 Current State (Rolled Back)

✅ **README.md** - Reverted to port 8000
✅ **vite.config.ts** - Worker configuration added (kept)
⏳ **Backend** - Not running (can't test)

**Action Required:** Start backend and test which port works before making final decision.

