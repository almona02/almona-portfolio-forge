# YDT Prestige API Test Suite

Comprehensive test suite for verifying YDT Prestige Agent API functionality.

## Quick Start

### 1. Run All Tests
```bash
cd python_backend
python tests/run_tests_with_report.py
```

### 2. Run Specific Test Suite
```bash
# API endpoint tests
python tests/test_prestige_endpoints.py

# Performance load tests
python tests/load_test.py

# Quick verification
bash tests/verify_prestige_api.sh
```

### 3. Run with pytest
```bash
pytest tests/test_prestige_endpoints.py -v
```

## Test Coverage

### ✅ API Endpoint Tests
- Health check
- Chat endpoint (all personas, all languages)
- G-code validation
- Learning modules
- Diagnosis endpoint
- Knowledge stats
- Machine capabilities
- Error handling
- Performance metrics

### ✅ Performance Tests
- Response time under load
- Concurrent request handling
- Success rate monitoring
- Confidence score validation

### ✅ Integration Tests
- API connectivity
- Frontend-backend integration
- Session management

## Expected Results

### Passing Criteria
- ✅ All API endpoints: HTTP 200 OK
- ✅ Response time: < 1.2 seconds average
- ✅ Success rate: > 95%
- ✅ Confidence score: > 90% average
- ✅ All personas working: 5/5 personas responding
- ✅ All languages: 4/4 languages supported

### Gold Tier Certification
- ✅ Accuracy: 92-95% average confidence
- ✅ Performance: < 1.2s response time
- ✅ Reliability: 99%+ success rate
- ✅ Completeness: All features working
- ✅ Multilingual: 4 languages with RTL
- ✅ Documentation: Complete API docs

## Test Reports

After running tests, you'll find:
- `test_report.html` - Visual HTML report
- `test_report.json` - Detailed JSON report
- `load_test_detailed.json` - Performance metrics

## Troubleshooting

### API not running
```bash
# Start API first
cd python_backend
uvicorn api.prestige_endpoints:app --host 0.0.0.0 --port 8000 --reload
```

### Import errors
```bash
# Install dependencies
pip install -r requirements_prestige.txt
pip install pytest aiohttp requests
```

### Port conflicts
```bash
# Check if port 8000 is in use
lsof -i :8000  # Linux/Mac
netstat -ano | findstr :8000  # Windows
```

## One-Line Commands

```bash
# Quick health check
curl -s http://localhost:8000/api/health | python -m json.tool

# Run all tests
cd python_backend && python tests/run_tests_with_report.py

# Performance test
cd python_backend && python tests/load_test.py

# Verification script
bash python_backend/tests/verify_prestige_api.sh
```

## Continuous Testing

For development, use watch mode:
```bash
# Install entr (Linux/Mac)
# Then run:
find python_backend -name "*.py" -type f | entr -c python -m pytest tests/ -v
```

## Test Results Interpretation

### ✅ Excellent
- Response time < 0.5s
- Success rate >= 99%
- Confidence >= 95%

### ✅ Good
- Response time < 1.0s
- Success rate >= 95%
- Confidence >= 90%

### ⚠️ Acceptable
- Response time < 1.5s
- Success rate >= 90%
- Confidence >= 85%

### ❌ Poor
- Response time > 1.5s
- Success rate < 90%
- Confidence < 85%

