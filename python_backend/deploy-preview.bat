@echo off
REM Preview/Staging Deployment Script (Windows)

echo YDT Prestige Agent - Preview Deployment
echo ==========================================

REM Check environment
if not exist ".env.preview" (
    echo .env.preview not found. Creating from example...
    copy .env.preview.example .env.preview
    echo Please edit .env.preview with your configuration
    pause
    exit /b 1
)

REM Run tests first
echo Running pre-deployment tests...
python tests/test_prestige_endpoints.py
if errorlevel 1 (
    echo Tests failed. Aborting deployment.
    pause
    exit /b 1
)

REM Build Docker image
echo Building Docker image...
docker build -t ydt-prestige-api:preview .

REM Stop existing container
echo Stopping existing preview container...
docker stop ydt-prestige-api-preview 2>nul
docker rm ydt-prestige-api-preview 2>nul

REM Start new container
echo Starting preview container...
docker run -d ^
    --name ydt-prestige-api-preview ^
    --env-file .env.preview ^
    -p 8000:8000 ^
    --restart unless-stopped ^
    ydt-prestige-api:preview

REM Wait for startup
echo Waiting for API to start...
timeout /t 5 /nobreak >nul

REM Verify deployment
curl -s http://localhost:8000/api/health >nul 2>&1
if errorlevel 1 (
    echo Deployment verification failed
    docker logs ydt-prestige-api-preview
    pause
    exit /b 1
) else (
    echo Preview deployment successful!
    echo API: http://localhost:8000
    echo Docs: http://localhost:8000/api/docs
)

echo.
echo Container Status:
docker ps | findstr ydt-prestige-api-preview

echo.
echo Useful Commands:
echo   View logs: docker logs -f ydt-prestige-api-preview
echo   Stop: docker stop ydt-prestige-api-preview
echo   Restart: docker restart ydt-prestige-api-preview

pause

