# YDT Future Intelligence - Complete Integration Guide

**Status:** ✅ All Components Ready - Integration Steps

---

## 📋 Integration Checklist

### **✅ Step 1: API Router Registration**

**File:** `python_backend/apis/v2/routers/__init__.py`

**Status:** ✅ **COMPLETED**

The future intelligence router is already registered. Verify it's working:

```bash
# Test endpoint
curl http://localhost:8000/api/v2/ydt/future-intelligence/morning-brief
```

---

### **✅ Step 2: Celery Beat Schedule**

**File:** `python_backend/celery_app.py`

**Status:** ✅ **COMPLETED**

Daily scan is scheduled. To use Cairo time (6 AM), update to:

```python
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    'daily-industry-scan': {
        'task': 'tasks.industry_watchdog.daily_scan',
        'schedule': crontab(hour=4, minute=0),  # 4 AM UTC = 6 AM Cairo (UTC+2)
    },
}
```

**To Start Celery Beat:**

```bash
# Start Celery worker
celery -A celery_app worker --loglevel=info

# Start Celery beat (in separate terminal)
celery -A celery_app beat --loglevel=info
```

---

### **✅ Step 3: Dashboard Widget Integration**

**File:** `src/pages/FabricatorDashboard.tsx`

**Status:** ✅ **COMPLETED**

MorningBriefWidget is added to FabricatorDashboard. It will appear at the top of the dashboard.

**To Verify:**
1. Start frontend: `npm run dev`
2. Navigate to `/fabricator/dashboard`
3. Morning Brief should appear at the top

---

### **✅ Step 4: Feedback Loop Implementation**

**File:** `src/components/fabricator/MorningBriefWidget.tsx`

**Status:** ✅ **COMPLETED**

Feedback buttons (👍 "Sah" / 👎 "Faks") are added to:
- Critical alerts
- High priority alerts
- Price updates
- Tech news articles

**Backend:** `python_backend/apis/v2/feedback.py` - Ready to receive feedback

**Next:** Connect to database to store feedback for training

---

### **✅ Step 5: Integration Tests**

**File:** `python_backend/tests/integration/test_industry_watchdog.py`

**Status:** ✅ **READY TO RUN**

Run judgment logic tests:

```bash
cd python_backend
pytest tests/integration/test_industry_watchdog.py -v
```

Or run standalone:

```bash
python tests/integration/test_industry_watchdog.py
```

---

## 🧪 Run Integration Tests First

**CRITICAL:** Run the "Hallucination Check" tests before deploying:

```bash
cd python_backend
python tests/integration/test_industry_watchdog.py
```

**Expected Output:**
```
🧪 Maalem Judgment Logic Tests
============================================================

📋 Test 1: Irrelevant News Trap
✅ Irrelevant news correctly filtered: low

📋 Test 2: Price Surge Alert
✅ Price surge correctly identified: high
   Advice: اشتري النهاردة قبل ما يزيد أكتر

📋 Test 3: Tech Hype Filter
✅ Future tech correctly filtered: medium
   Advice: تابع الموضوع - ممكن يكون مفيد

✅ ALL JUDGMENT TESTS PASSED
```

**If tests fail:** Fix MaalemAnalyst logic before deploying.

---

## 🚀 Deployment Sequence

### **Phase 1: Testing (This Week)**

1. **Run Integration Tests**
   ```bash
   python tests/integration/test_industry_watchdog.py
   ```

2. **Test API Endpoints**
   ```bash
   # Start backend
   uvicorn apis.main:app --reload
   
   # Test endpoints
   curl http://localhost:8000/api/v2/ydt/future-intelligence/morning-brief
   curl http://localhost:8000/api/v2/ydt/future-intelligence/trends?topic=aluminum
   ```

3. **Test Widget**
   - Start frontend
   - Navigate to dashboard
   - Verify widget loads
   - Test feedback buttons

### **Phase 2: Beta Deployment (Week 2)**

1. **Deploy to Staging**
   - Deploy backend with new endpoints
   - Deploy frontend with widget
   - Test with 5-10 beta workshops

2. **Monitor**
   - Check daily scan execution
   - Monitor article relevance
   - Track user feedback

3. **Iterate**
   - Refine MaalemAnalyst based on feedback
   - Adjust relevance thresholds
   - Improve actionable advice

### **Phase 3: Production (Month 1)**

1. **Full Deployment**
   - Deploy to production
   - Enable Celery beat schedule
   - Monitor performance

2. **Enhancements**
   - Add LME price integration
   - Expand sources
   - Improve analysis

---

## 📊 Verification Steps

### **Backend Verification**

```bash
# 1. Check API endpoints
curl http://localhost:8000/api/v2/ydt/future-intelligence/morning-brief

# 2. Check Celery tasks
celery -A celery_app inspect registered

# 3. Test manual scan
curl -X POST http://localhost:8000/api/v2/ydt/future-intelligence/trigger-scan
```

### **Frontend Verification**

1. Open dashboard
2. Verify MorningBriefWidget appears
3. Check that articles load
4. Test feedback buttons
5. Verify Arabic text displays correctly

### **Celery Verification**

```bash
# Check beat schedule
celery -A celery_app inspect scheduled

# Check worker is running
celery -A celery_app inspect active
```

---

## 🔧 Configuration Files Updated

### **✅ Backend**

1. `python_backend/apis/v2/routers/__init__.py` - Router registered
2. `python_backend/celery_app.py` - Beat schedule added
3. `python_backend/apis/v2/feedback.py` - Feedback endpoint created
4. `python_backend/tests/integration/test_industry_watchdog.py` - Tests created

### **✅ Frontend**

1. `src/pages/FabricatorDashboard.tsx` - Widget added
2. `src/components/fabricator/MorningBriefWidget.tsx` - Feedback buttons added

---

## 🎯 Next Steps (Priority Order)

### **1. Run Integration Tests (CRITICAL - Do First)**
```bash
cd python_backend
python tests/integration/test_industry_watchdog.py
```

**Why:** Validates Maalem's judgment logic. Bad advice kills trust.

### **2. Test API Endpoints**
```bash
# Start backend
uvicorn apis.main:app --reload

# Test
curl http://localhost:8000/api/v2/ydt/future-intelligence/morning-brief
```

### **3. Test Widget in Dashboard**
- Start frontend
- Navigate to `/fabricator/dashboard`
- Verify widget loads and displays data

### **4. Set Up Celery Beat (Optional - For Scheduled Scans)**
```bash
# Terminal 1: Worker
celery -A celery_app worker --loglevel=info

# Terminal 2: Beat
celery -A celery_app beat --loglevel=info
```

### **5. Add LME Price Integration (Month 1)**
- Follow `docs/YDT_LME_API_INTEGRATION_GUIDE.md`
- Start with free Yahoo Finance API
- Upgrade to LME when ready

---

## 📝 Summary

**✅ Completed:**
- API router registered
- Celery beat schedule configured
- Widget added to dashboard
- Feedback buttons implemented
- Integration tests created

**⏭️ Next Actions:**
1. Run integration tests
2. Test API endpoints
3. Verify widget in dashboard
4. Deploy to staging
5. Gather beta feedback

**🎯 Goal:** Validate Maalem's judgment before user-facing deployment.

---

**Status:** ✅ Ready for integration testing  
**Critical:** Run judgment tests first!

