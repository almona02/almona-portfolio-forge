@echo off
REM Kill all processes on port 8003 and restart backend

echo ==========================================
echo Killing all processes on port 8003
echo ==========================================

cd /d %~dp0

REM Kill all processes using port 8003
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8003 ^| findstr LISTENING') do (
    echo Killing process %%a...
    taskkill /F /PID %%a 2>nul
)

REM Wait for ports to be released
echo Waiting 3 seconds for ports to be released...
timeout /t 3 /nobreak >nul

REM Verify port is free
netstat -ano | findstr :8003 | findstr LISTENING
if %errorlevel% equ 0 (
    echo [WARNING] Port 8003 is still in use!
    echo Please manually kill the processes above
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Starting backend with apis.main:app
echo ==========================================
echo.

set REDIS_URL=redis://localhost:6379
python -m uvicorn apis.main:app --host 0.0.0.0 --port 8003 --reload

pause

