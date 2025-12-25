# 🧪 YDT Agent - Local Testing Guide

## Quick Answer

**YES, you can test on localhost:3000!** Here's how:

## 📋 Setup Steps

### Step 1: Start the Backend API (Port 8000)

**Windows:**
```bash
cd python_backend
start_prestige_api.bat
```

**Linux/Mac:**
```bash
cd python_backend
chmod +x start_prestige_api.sh
./start_prestige_api.sh
```

**Or manually:**
```bash
cd python_backend
uvicorn api.prestige_endpoints:app --host 0.0.0.0 --port 8000 --reload
```

✅ **Verify it's running:**
- Open: http://localhost:8000/api/health
- Should see: `{"status":"healthy","service":"YDT Prestige Agent API"}`

### Step 2: Start the Frontend (Port 3000)

**In a new terminal:**
```bash
cd /c/projects/almona-portfolio-forge
npm run dev
```

✅ **Frontend will automatically connect to:**
- `http://localhost:8000` (in development mode)
- Production URL only if `VITE_YDT_API_URL` is set

### Step 3: Test the Agent

1. Open: http://localhost:3000/prestige-agent
2. Try asking: "Teach me how to operate the machine"
3. Check the backend terminal for logs

## 🔍 Troubleshooting

### Backend not starting?
- Check if port 8000 is already in use
- Verify Python dependencies: `pip install -r python_backend/requirements_prestige.txt`
- Check logs in the terminal

### Frontend can't connect?
- Verify backend is running: http://localhost:8000/api/health
- Check browser console for errors
- Make sure CORS is enabled (it should be by default)

### Getting generic responses?
- Check backend logs for initialization errors
- Verify knowledge base exists: `ai_agents/ydt_agent/knowledge/processed/aim-7510/`
- Look for: `✅ YDT Chatbot Engine initialized successfully` in logs

## 🚀 Production Testing

**When ready for production:**
1. Backend is already deployed: `https://ydt-production.up.railway.app`
2. Frontend will automatically use production URL when:
   - `VITE_YDT_API_URL` is set, OR
   - Running in production mode (not development)

**To test production:**
- Just deploy frontend to Vercel
- It will connect to Railway backend automatically

## ✅ Current Configuration

- **Local Development**: Frontend (3000) → Backend (8000)
- **Production**: Frontend (Vercel) → Backend (Railway)

Both work! Start with localhost for faster iteration.
