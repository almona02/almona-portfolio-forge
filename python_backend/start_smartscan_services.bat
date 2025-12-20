@echo off
REM Start Redis, Celery Worker, and Backend Server for SmartScan (Windows)

echo ==========================================
echo Starting SmartScan Services
echo ==========================================
echo.

REM Set Redis URL
set REDIS_URL=redis://localhost:6379

REM 1. Start Redis (if not running)
echo 1. Starting Redis...
docker ps | findstr redis >nul
if %errorlevel% equ 0 (
    echo    [OK] Redis already running
) else (
    docker-compose up -d redis
    timeout /t 2 /nobreak >nul
    echo    [OK] Redis started
)

echo.
echo 2. Starting Celery Worker...
echo    Opening new terminal window for Celery worker...
start "Celery Worker" cmd /k "cd /d %~dp0 && set REDIS_URL=redis://localhost:6379 && celery -A core.celery_app worker --loglevel=info"

echo.
echo 3. Starting Backend Server...
echo    Opening new terminal window for backend server...
start "Backend Server" cmd /k "cd /d %~dp0 && set REDIS_URL=redis://localhost:6379 && uvicorn apis.v2.app:app --reload --port 8003"

echo.
echo ==========================================
echo Services starting in separate windows!
echo ==========================================
echo.
echo Wait a few seconds for services to start, then test with:
echo   python test_dxf_import.py
echo.
pause

