@echo off
REM Start YDT Prestige Agent API (Windows)

echo 🚀 Starting YDT Prestige Agent API...

REM Activate virtual environment if it exists
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)

REM Install dependencies if needed
if not exist venv (
    echo 📦 Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements_prestige.txt
)

REM Set environment variables
set PYTHONPATH=%PYTHONPATH%;%CD%\..

REM Start FastAPI server
echo ⚡ Starting FastAPI server on http://localhost:8000
echo 📚 API Docs: http://localhost:8000/api/docs
uvicorn api.prestige_endpoints:app --host 0.0.0.0 --port 8000 --reload

pause

