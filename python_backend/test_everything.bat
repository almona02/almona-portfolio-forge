@echo off
REM test_everything.bat - Complete test suite for YDT Prestige Agent (Windows)

echo 🚀 YDT Prestige Agent - Complete Test Suite
echo ==========================================

REM Step 1: Check Python environment
echo ℹ️  Step 1: Checking Python environment...
python --version
pip --version

REM Step 2: Install dependencies if needed
echo ℹ️  Step 2: Checking dependencies...
if not exist venv (
    echo ⚠️  Virtual environment not found. Creating...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements_prestige.txt
    pip install -r tests\requirements_test.txt
) else (
    call venv\Scripts\activate.bat
)

REM Step 3: Start API server
echo ℹ️  Step 3: Starting API server...
start /B uvicorn api.prestige_endpoints:app --host 0.0.0.0 --port 8000 --reload > api.log 2>&1
timeout /t 5 /nobreak >nul

REM Check if API started
curl -s http://localhost:8000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ API server started successfully
) else (
    echo ❌ Failed to start API server
    type api.log
    exit /b 1
)

REM Step 4: Run quick verification
echo ℹ️  Step 4: Running quick verification...
bash tests\verify_prestige_api.sh
if %errorlevel% equ 0 (
    echo ✅ Quick verification passed
) else (
    echo ⚠️  Quick verification had issues
)

REM Step 5: Run comprehensive tests
echo ℹ️  Step 5: Running comprehensive tests...
python tests\run_tests_with_report.py

REM Step 6: Generate summary
echo.
echo 📊 TEST SUMMARY
echo ===============
if exist tests\test_report.json (
    python -c "import json; f=open('tests/test_report.json'); d=json.load(f); s=d.get('summary',{}); print(f'Total: {s.get(\"total_tests\",0)}, Passed: {s.get(\"passed_tests\",0)}, Failed: {s.get(\"failed_tests\",0)}, Rate: {s.get(\"success_rate\",0):.1f}%%')"
)

echo.
echo ==========================================
echo 🧪 Testing complete! Check test_report.html for details.
pause

