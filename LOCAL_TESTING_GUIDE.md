# Local Testing Guide - DXF Import

## Quick Start

Yes, you can test everything locally with `npm run dev`! Here's how:

## Step 1: Start the Backend

The DXF import uses the **direct import endpoint** (`/api/v2/profile-import/ingest`) which is **synchronous** and does **NOT require Celery/Redis**. However, if you want to test SmartScan (images/PDFs) too, you'll need them.

### Option A: Backend Only (for DXF import - recommended)

**Windows:**
```bash
cd python_backend
start_backend_simple.bat
```

**Linux/Mac:**
```bash
cd python_backend
./start_backend_simple.sh
```

**Or manually:**
```bash
cd python_backend
set REDIS_URL=redis://localhost:6379  # Windows
# export REDIS_URL=redis://localhost:6379  # Linux/Mac
python -m uvicorn apis.main:app --host 0.0.0.0 --port 8003 --reload
```

**Note:** Use `apis.main:app` (not `apis.v2.app:v2_app`) so routes are mounted under `/api/v2` prefix.

The backend will start on `http://localhost:8003`

### Option B: Full Stack (Backend + Redis + Celery - for SmartScan too)

**Windows:**
```bash
cd python_backend
start_smartscan_services.bat
```

**Linux/Mac:**
```bash
cd python_backend
./start_smartscan_services.sh
```

This starts:
- Redis (port 6379)
- Celery Worker
- Backend Server (port 8003)

## Step 2: Configure Frontend API URL

Create a `.env.local` file in the project root:

```env
VITE_API_URL=http://localhost:8003
```

**Note:** 
- If you don't set `VITE_API_URL`, the frontend will try to use `window.location.origin` (same origin), which won't work since frontend runs on port 3000/5173 and backend on 8003
- The vite.config.ts has a proxy configured for port 8002, but the backend runs on 8003, so setting `VITE_API_URL` is the recommended approach

## Step 3: Start Frontend

```bash
npm run dev
```

The frontend will start on `http://localhost:5173` (or another port if 5173 is busy).

## Step 4: Test DXF Import

1. Navigate to **Profile Tuning Studio** (e.g., `/fabricator/tuning-studio`)
2. Click on the **SmartScan** tab
3. Use the **"DXF/DWG Direct Import"** section (top card)
4. Upload a DXF file (e.g., `MC 103.dxf` or `MC 1250 .dxf` from `public/PROFILES/`)
5. You should see:
   - ✅ Immediate parsing (no "Failed to enqueue" error)
   - ✅ SVG preview displayed
   - ✅ Dimensions extracted (width × height)
   - ✅ Profile metrics (area, perimeter, weight)

## Testing Checklist

- [ ] Backend running on `http://localhost:8003`
- [ ] Frontend running (check console for port)
- [ ] `.env.local` file created with `VITE_API_URL=http://localhost:8003`
- [ ] DXF file uploads successfully
- [ ] SVG preview displays
- [ ] Dimensions are correct
- [ ] "Save to Library" button works

## Troubleshooting

### "Failed to fetch" or CORS errors
- Make sure backend is running on port 8003
- Check `.env.local` has correct `VITE_API_URL`
- Verify backend CORS allows your frontend origin

### "Failed to enqueue scan job"
- This error only happens with SmartScan (images/PDFs), not DXF direct import
- For DXF, use the "DXF/DWG Direct Import" section, not SmartScan
- If you see this with DXF, you're using the wrong uploader

### No SVG preview
- Check browser console for errors
- Verify backend response includes `svg_preview` field
- Check network tab - API call should return 200 OK

### Backend not starting
- Make sure Python dependencies are installed: `pip install -r requirements.txt`
- Check if port 8003 is already in use
- Verify Python version (3.9+)

## API Endpoints

- **DXF Direct Import:** `POST http://localhost:8003/api/v2/profile-import/ingest`
  - Synchronous, no Celery required
  - Returns: `{ svg_preview, profile_metrics, ... }`

- **SmartScan (async):** `POST http://localhost:8003/api/v2/smart-scan/single`
  - Requires Celery/Redis
  - Returns: `{ job_id, ... }` (async)

## Notes

- DXF import is **synchronous** - no Celery/Redis needed
- SmartScan (images/PDFs) is **async** - requires Celery/Redis
- The ProfileTuningStudio now has both options clearly separated

