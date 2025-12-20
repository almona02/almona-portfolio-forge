@echo off
REM Force restart backend server with correct app
echo ==========================================
echo Force Restarting Backend Server
echo ==========================================
echo.

cd /d %~dp0

REM Kill any existing Python processes on port 8003
echo Checking for processes on port 8003...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8003') do (
    echo Killing process %%a...
    taskkill /F /PID %%a >nul 2>&1
)

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Start with correct app
echo.
echo Starting backend with apis.main:app...
echo.
python -m uvicorn apis.main:app --host 0.0.0.0 --port 8003 --reload

pause

