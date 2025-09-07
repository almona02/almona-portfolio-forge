# Almona API Testing Guide

## Overview
This guide provides comprehensive instructions for testing the Almona API endpoints and React integration.

## Quick Start

### 1. Run Smoke Tests
```bash
cd python_backend
python tests/run_tests.py
```

### 2. Manual CLI Testing
```bash
python tests/cli_test.py --base-url http://localhost:8000 --test all
```

### 3. React Integration Tests
```bash
npm test src/hooks/__tests__/usePythonAPI.test.ts
```

## Test Structure

### API Tests (`python_backend/tests/`)
- `test_api.py` - Smoke tests for all endpoints
- `benchmark.py` - Performance benchmarking
- `conftest.py` - Test configuration and fixtures
- `cli_test.py` - CLI testing utility
- `run_tests.py` - Automated test runner

### React Tests (`src/hooks/__tests/`)
- `usePythonAPI.test.ts` - React hook integration tests

## Test Cases Covered

### API Endpoints
1. **Health Check** (`GET /health`)
   - ✅ Returns 200 OK
   - ✅ Returns healthy status
   - ✅ Includes service info

2. **Part Identification** (`POST /api/v1/identify-part`)
   - ✅ Valid image upload
   - ✅ Invalid file type handling
   - ✅ Missing file validation
   - ✅ Large file handling
   - ✅ Confidence threshold parameter

3. **Image Preprocessing** (`POST /api/v1/preprocess-image`)
   - ✅ Valid image processing
   - ✅ Different operations support

4. **Models Info** (`GET /api/v1/models`)
   - ✅ Returns available models
   - ✅ Correct model structure

### React Integration
1. **File Upload Flow**
   - ✅ Progress tracking
   - ✅ Success handling
   - ✅ Error handling with toasts

2. **Error States**
   - ✅ Network disconnection
   - ✅ API errors
   - ✅ Invalid file types

3. **Performance**
   - ✅ Loading states
   - ✅ Memory management

## Performance Benchmarks

### Targets
- **Throughput**: ≥50 RPS
- **P95 Latency**: <800ms
- **Memory Usage**: <1GB/container

### Benchmark Results
Run performance tests:
```bash
cd python_backend
python -c "
from tests.benchmark import PerformanceBenchmark
benchmark = PerformanceBenchmark()
results = benchmark.run_full_benchmark()
import json
print(json.dumps(results, indent=2))
"
```

## Manual Testing Commands

### 1. Health Check
```bash
curl -X GET http://localhost:8000/health
```

### 2. Part Identification
```bash
# Create test image
python -c "
from PIL import Image
import tempfile
img = Image.new('RGB', (640, 480), color='red')
img.save('test.jpg', 'JPEG')
"

# Test endpoint
curl -X POST \
  -F "image=@test.jpg" \
  -F "confidence_threshold=0.7" \
  http://localhost:8000/api/v1/identify-part
```

### 3. Large File Test
```bash
# Create large image
python -c "
from PIL import Image
import numpy as np
large = Image.fromarray(np.random.randint(0, 255, (4000, 4000, 3), dtype=np.uint8))
large.save('large_test.jpg', 'JPEG', quality=95)
"

# Test large file
curl -X POST \
  -F "image=@large_test.jpg" \
  http://localhost:8000/api/v1/identify-part
```

## Environment Setup

### Required Environment Variables
```bash
# .env.test
VITE_PYTHON_API_URL=http://localhost:8000
```

### Test Dependencies
```bash
# Install test dependencies
cd python_backend
pip install -r requirements.txt  # Includes pytest
```

## Deployment Readiness Checklist

### ✅ Security Checks
- [ ] Run security linting
- [ ] Vulnerability scan
- [ ] Environment variables validation

### ✅ Performance Validation
- [ ] Load testing completed
- [ ] Memory profiling
- [ ] Response time monitoring

### ✅ Integration Testing
- [ ] API endpoints tested
- [ ] React hooks tested
- [ ] Error handling verified
- [ ] File upload flow tested

### ✅ Documentation
- [ ] API documentation updated
- [ ] Test results documented
- [ ] Deployment guide ready

## Troubleshooting

### Common Issues

1. **Model Loading Errors**
   ```bash
   # Check if model files exist
   ls -la python_backend/ai_services/part_detection/models/
   ```

2. **Memory Issues**
   ```bash
   # Monitor memory usage
   docker stats almona-python-api
   ```

3. **Network Issues**
   ```bash
   # Test connectivity
   curl -I http://localhost:8000/health
   ```

## Test Data

### Sample Images
Located in: `python_backend/tests/test_data/`
- `test_small.jpg` - 640x480 (Small file)
- `test_medium.jpg` - 1920x1080 (Medium file)
- `test_large.jpg` - 4000x4000 (Large file >15MB)

### Test Files
- `invalid.txt` - Invalid file type for testing
- `empty.jpg` - Empty file for edge cases

## Continuous Integration

### GitHub Actions Example
```yaml
name: API Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.9'
      - name: Install dependencies
        run: pip install -r python_backend/requirements.txt
      - name: Run tests
        run: cd python_backend && python -m pytest tests/ -v
```

## Support
For issues or questions, please check:
1. API logs: `docker logs almona-python-api`
2. Test logs: Check pytest output
3. Performance metrics: Use benchmark.py
