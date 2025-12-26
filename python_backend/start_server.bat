@echo off
REM Start FastAPI server for testing Future Intelligence endpoints

echo ==========================================
echo Starting FastAPI Server
echo ==========================================
echo.
echo Server will start on http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo Future Intelligence Endpoints:
echo   GET  /api/v2/ydt/future-intelligence/morning-brief
echo   GET  /api/v2/ydt/future-intelligence/trends
echo   GET  /api/v2/ydt/future-intelligence/alerts
echo   POST /api/v2/ydt/future-intelligence/feedback
echo.
echo Press Ctrl+C to stop
echo.

cd /d %~dp0

REM Activate virtual environment if it exists
if exist ..\.venv\Scripts\activate.bat (
    call ..\.venv\Scripts\activate.bat
)

REM Start server
python -m uvicorn apis.main:app --host 0.0.0.0 --port 8000 --reload

pause

