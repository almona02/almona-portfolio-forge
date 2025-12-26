# Testing Future Intelligence API Endpoints

## 🚀 Quick Start

### **Step 1: Start the FastAPI Server**

**Option A: Using the batch script (Windows)**
```bash
cd python_backend
start_server.bat
```

**Option B: Manual start**
```bash
cd python_backend
python -m uvicorn apis.main:app --host 0.0.0.0 --port 8000 --reload
```

**Option C: Using PowerShell**
```powershell
cd python_backend
python -m uvicorn apis.main:app --host 0.0.0.0 --port 8000 --reload
```

The server will start on `http://localhost:8000`

---

## 🧪 Test Endpoints

### **1. Morning Brief**

```bash
curl http://localhost:8000/api/v2/ydt/future-intelligence/morning-brief
```

**PowerShell:**
```powershell
Invoke-WebRequest -Uri "http://localhost:8000/api/v2/ydt/future-intelligence/morning-brief" | Select-Object -ExpandProperty Content
```

**Expected Response:**
```json
{
  "date": "2025-01-XX",
  "summary": "صباح الخير يا ريس! X خبر جديد اليوم",
  "alerts": [...],
  "price_updates": [...],
  "tech_news": [...],
  "total_articles": X,
  "critical_alerts": X
}
```

---

### **2. Latest Trends**

```bash
curl "http://localhost:8000/api/v2/ydt/future-intelligence/trends?topic=aluminum&limit=5"
```

**PowerShell:**
```powershell
Invoke-WebRequest -Uri "http://localhost:8000/api/v2/ydt/future-intelligence/trends?topic=aluminum&limit=5" | Select-Object -ExpandProperty Content
```

---

### **3. Active Alerts**

```bash
curl http://localhost:8000/api/v2/ydt/future-intelligence/alerts
```

**PowerShell:**
```powershell
Invoke-WebRequest -Uri "http://localhost:8000/api/v2/ydt/future-intelligence/alerts" | Select-Object -ExpandProperty Content
```

---

### **4. Search Articles**

```bash
curl "http://localhost:8000/api/v2/ydt/future-intelligence/search?keyword=thermal+break&limit=5"
```

**PowerShell:**
```powershell
Invoke-WebRequest -Uri "http://localhost:8000/api/v2/ydt/future-intelligence/search?keyword=thermal+break&limit=5" | Select-Object -ExpandProperty Content
```

---

### **5. Submit Feedback**

```bash
curl -X POST http://localhost:8000/api/v2/ydt/future-intelligence/feedback \
  -H "Content-Type: application/json" \
  -d "{\"item_id\":\"article_1\",\"feedback\":\"useful\",\"workshop_id\":\"test_workshop\"}"
```

**PowerShell:**
```powershell
$body = @{
    item_id = "article_1"
    feedback = "useful"
    workshop_id = "test_workshop"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8000/api/v2/ydt/future-intelligence/feedback" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

---

### **6. Trigger Manual Scan**

```bash
curl -X POST http://localhost:8000/api/v2/ydt/future-intelligence/trigger-scan
```

**PowerShell:**
```powershell
Invoke-WebRequest -Uri "http://localhost:8000/api/v2/ydt/future-intelligence/trigger-scan" -Method POST
```

---

## 📚 API Documentation

Once the server is running, visit:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

Navigate to the **"Future Intelligence"** section to see all endpoints.

---

## 🔍 Troubleshooting

### **Error: "Could not connect to server"**

**Solution:** Make sure the server is running:
```bash
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Or check if uvicorn process is running
tasklist | findstr python
```

### **Error: "Module not found"**

**Solution:** Make sure you're in the `python_backend` directory and virtual environment is activated:
```bash
cd python_backend
# Activate venv
..\.venv\Scripts\activate  # Windows
source ../.venv/bin/activate  # Linux/Mac
```

### **Error: "Import error"**

**Solution:** Install dependencies:
```bash
pip install -r requirements-watchdog.txt
```

---

## ✅ Success Indicators

When the server is running correctly, you should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

And the API endpoints should return JSON responses (not connection errors).

---

## 🎯 Next Steps

1. ✅ Start server
2. ✅ Test morning-brief endpoint
3. ✅ Verify widget in dashboard loads data
4. ✅ Test feedback buttons
5. ✅ Deploy to staging

