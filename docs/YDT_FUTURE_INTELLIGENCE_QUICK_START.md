# YDT Future Intelligence - Quick Start Guide

**Get the Industry Watchdog running in 5 minutes**

---

## 🚀 Quick Setup

### **Step 1: Install Dependencies**

**Windows:**
```bash
cd python_backend
scripts\setup_watchdog.bat
```

**Linux/Mac:**
```bash
cd python_backend
chmod +x scripts/setup_watchdog.sh
./scripts/setup_watchdog.sh
```

**Manual:**
```bash
cd python_backend
pip install feedparser httpx python-dateutil
```

### **Step 2: Run Integration Test**

```bash
cd python_backend
python scripts/test_watchdog_pipeline.py
```

**Expected Output:**
```
🚀 Industry Watchdog Pipeline Test
============================================================
✅ Components initialized
✅ Fetched 15 articles
✅ Analysis complete
✅ Processed 12 articles
✅ Morning brief generated
✅ Retrieved 8 trends
🎉 All components working correctly!
```

### **Step 3: Test API Endpoints**

Start your FastAPI server and test:

```bash
# Get morning brief
curl http://localhost:8000/api/v2/ydt/future-intelligence/morning-brief

# Get trends
curl http://localhost:8000/api/v2/ydt/future-intelligence/trends?topic=aluminum

# Get alerts
curl http://localhost:8000/api/v2/ydt/future-intelligence/alerts
```

### **Step 4: Add Widget to Dashboard**

```tsx
import { MorningBriefWidget } from '@/components/fabricator/MorningBriefWidget';

// In your dashboard:
<MorningBriefWidget workshopId={workshopId} />
```

---

## ✅ Validation Checklist

- [ ] Dependencies installed
- [ ] Integration test passes
- [ ] API endpoints return data
- [ ] Widget displays in dashboard
- [ ] Celery task scheduled (optional)

---

## 🐛 Troubleshooting

**"ModuleNotFoundError: No module named 'feedparser'"**
→ Run: `pip install feedparser httpx python-dateutil`

**"No articles fetched"**
→ Check internet connection and RSS feed URLs

**"API returns 404"**
→ Make sure router is registered in FastAPI app

---

## 📚 Next Steps

1. **Read:** `docs/YDT_FUTURE_INTELLIGENCE_IMPLEMENTATION.md` for full details
2. **Test:** Run integration tests
3. **Deploy:** Add to staging environment
4. **Iterate:** Gather user feedback

---

**Status:** ✅ Ready to test  
**Time to first test:** ~5 minutes

