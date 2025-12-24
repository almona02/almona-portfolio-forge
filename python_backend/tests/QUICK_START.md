# Quick Start - Testing YDT Prestige API

## 🚀 Fastest Way to Test

### Step 1: Start the API
```bash
cd python_backend
uvicorn api.prestige_endpoints:app --host 0.0.0.0 --port 8000 --reload
```

### Step 2: Run Tests (in another terminal)
```bash
cd python_backend
python tests/run_tests_with_report.py
```

That's it! You'll get:
- ✅ All tests run
- ✅ HTML report generated
- ✅ JSON report generated
- ✅ Performance metrics

---

## 📋 Individual Test Commands

### Quick Health Check
```bash
curl http://localhost:8000/api/health
```

### Run API Tests Only
```bash
python tests/test_prestige_endpoints.py
```

### Run Performance Tests
```bash
python tests/load_test.py
```

### Quick Verification
```bash
bash tests/verify_prestige_api.sh
```

---

## 🎯 What to Expect

### Successful Test Run
```
🧪 YDT PRESTIGE API TEST SUITE
============================================================
✅ Health check passed
✅ Chat endpoint basic test passed - Confidence: 96.2%
✅ Persona 'professor' test passed
✅ Persona 'doctor' test passed
✅ Persona 'tour-guide' test passed
✅ Persona 'code-master' test passed
✅ Persona 'nervous-system' test passed
✅ Language 'tr' test passed
✅ Language 'en' test passed
✅ Language 'ru' test passed
✅ Language 'ar' test passed
✅ G-code validation test passed
✅ Learning modules test passed - Found 5 modules
✅ Diagnosis endpoint test passed
✅ Knowledge stats test passed
✅ Machine capabilities test passed
✅ Error handling test passed
✅ Performance test passed

📈 SUMMARY: 11 passed, 0 failed out of 11 tests
🎉 ALL TESTS PASSED! API is ready for production!
```

---

## ⚠️ Troubleshooting

### API Not Running
```bash
# Check if API is running
curl http://localhost:8000/api/health

# If not, start it:
cd python_backend
uvicorn api.prestige_endpoints:app --host 0.0.0.0 --port 8000 --reload
```

### Missing Dependencies
```bash
pip install -r tests/requirements_test.txt
```

### Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000  # Linux/Mac
netstat -ano | findstr :8000  # Windows

# Kill process or use different port
```

---

## 📊 Test Reports Location

After running tests, check:
- `python_backend/tests/test_report.html` - Visual report
- `python_backend/tests/test_report.json` - JSON data
- `python_backend/tests/load_test_detailed.json` - Performance data

---

## ✅ Success Criteria

Your tests pass if:
- ✅ All endpoints return 200 OK
- ✅ Response time < 1.2s average
- ✅ Success rate > 95%
- ✅ Confidence > 90% average
- ✅ All 5 personas work
- ✅ All 4 languages work

**Gold Tier Status**: ✅ PASS if all above criteria met!

