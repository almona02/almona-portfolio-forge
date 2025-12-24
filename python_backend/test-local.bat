@echo off
REM Local Testing Script - Comprehensive Test Suite (Windows)

echo Testing YDT Prestige Agent - Local Testing
echo ======================================

REM Check Python
echo Checking Python environment...
python --version >nul 2>&1
if errorlevel 1 (
    echo Python not found
    pause
    exit /b 1
)
python --version

REM Check dependencies
echo.
echo Checking dependencies...
if not exist "requirements_prestige.txt" (
    echo requirements_prestige.txt not found
    pause
    exit /b 1
)

REM Install dependencies if needed
python -c "import fastapi" >nul 2>&1
if errorlevel 1 (
    echo Installing dependencies...
    pip install -r requirements_prestige.txt
)

REM Check environment file
if not exist ".env.local" (
    echo Creating .env.local from example...
    copy .env.local.example .env.local
    echo Please edit .env.local with your configuration
)

REM Start API in background
echo.
echo Starting API server...
start /B uvicorn api.prestige_endpoints:app --host 0.0.0.0 --port 8000 --reload > api.log 2>&1
timeout /t 5 /nobreak >nul

REM Check if API started
curl -s http://localhost:8000/api/health >nul 2>&1
if errorlevel 1 (
    echo API failed to start. Check api.log
    pause
    exit /b 1
) else (
    echo API is running
)

REM Run tests
echo.
echo Running test suite...
python tests/test_prestige_endpoints.py
set TEST_RESULT=%ERRORLEVEL%

REM Run load test
echo.
echo Running load test...
python tests/load_test.py
set LOAD_RESULT=%ERRORLEVEL%

REM Stop API (find and kill)
echo.
echo Stopping API server...
for /f "tokens=2" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

REM Summary
echo.
echo ======================================
echo TEST SUMMARY
echo ======================================
if %TEST_RESULT% equ 0 if %LOAD_RESULT% equ 0 (
    echo All tests passed!
    echo Ready for preview deployment
    exit /b 0
) else (
    echo Some tests failed
    exit /b 1
)

pause

