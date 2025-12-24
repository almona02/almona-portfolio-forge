@echo off
REM YDT Prestige Agent - Docker Start Script (Windows)

echo Starting YDT Prestige Agent with Docker...
echo ============================================

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Check for production environment
if exist ".env.production" (
    echo Using production environment...
    docker compose -f docker-compose.prod.yml up -d --build
) else (
    echo Using development environment...
    docker compose up -d --build
)

REM Wait for API to start
echo Waiting for API to start...
timeout /t 5 /nobreak >nul

REM Check health
curl -s http://localhost:8000/api/health >nul 2>&1
if errorlevel 1 (
    echo API might still be starting. Check logs with: docker logs ydt-prestige-api
) else (
    echo API is running!
    echo API URL: http://localhost:8000
    echo API Docs: http://localhost:8000/api/docs
    echo Health Check: http://localhost:8000/api/health
)

echo.
echo Container Status:
docker compose ps

echo.
echo Useful Commands:
echo   View logs: docker logs -f ydt-prestige-api
echo   Stop: docker compose down
echo   Restart: docker compose restart
echo   Shell: docker exec -it ydt-prestige-api bash

pause

