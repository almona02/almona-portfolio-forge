@echo off
REM Restart all SmartScan services and clean ports (Windows)

echo ==========================================
echo Cleaning Ports and Restarting Services
echo ==========================================
echo.

REM Kill processes on ports
echo 1. Cleaning ports...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8003"') do (
    echo    Killing PID %%a on port 8003
    taskkill //F //PID %%a >nul 2>&1
)

timeout /t 2 /nobreak >nul

REM Restart Redis
echo.
echo 2. Restarting Redis...
cd python_backend
docker-compose down redis
timeout /t 2 /nobreak >nul
docker-compose up -d redis
timeout /t 3 /nobreak >nul

REM Verify Redis
echo.
echo 3. Verifying Redis...
python -c "import redis; r = redis.Redis(host='localhost', port=6379); print('   [OK] Redis:', r.ping())" 2>nul || echo "   [WARN] Redis check failed"

echo.
echo ==========================================
echo Ports cleaned! Services ready to start.
echo ==========================================
echo.
echo Starting backend server in new window...
start "Backend Server" cmd /k "cd /d %~dp0 && set REDIS_URL=redis://localhost:6379 && python -m uvicorn apis.main:app --host 0.0.0.0 --port 8003"

echo.
echo Starting Celery worker in new window...
start "Celery Worker" cmd /k "cd /d %~dp0 && set REDIS_URL=redis://localhost:6379 && celery -A core.celery_app worker --loglevel=info"

echo.
echo Services starting in separate windows!
echo Wait 5-10 seconds for services to start, then test with:
echo   python test_dxf_import.py
echo.
pause

