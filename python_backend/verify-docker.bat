@echo off
REM Quick Docker Verification Script (Windows)

echo Verifying Docker Setup...
echo ==============================

REM Check Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo Docker not found
    pause
    exit /b 1
) else (
    echo Docker installed
    docker --version
)

REM Check Docker Compose
docker compose version >nul 2>&1
if errorlevel 1 (
    docker-compose --version >nul 2>&1
    if errorlevel 1 (
        echo Docker Compose not found
        pause
        exit /b 1
    ) else (
        echo Docker Compose installed
        docker-compose --version
    )
) else (
    echo Docker Compose installed
    docker compose version
)

REM Check if Docker daemon is running
docker info >nul 2>&1
if errorlevel 1 (
    echo Docker daemon is not running. Please start Docker Desktop.
    pause
    exit /b 1
) else (
    echo Docker daemon is running
)

REM Check if Dockerfile exists
if exist "Dockerfile" (
    echo Dockerfile found
) else (
    echo Dockerfile not found
    pause
    exit /b 1
)

REM Check if docker-compose.yml exists
if exist "docker-compose.yml" (
    echo docker-compose.yml found
) else (
    echo docker-compose.yml not found
    pause
    exit /b 1
)

echo.
echo All checks passed! Ready to deploy.
echo.
echo Next steps:
echo   1. Run: docker-start.bat
echo   2. Wait for container to start
echo   3. Visit: http://localhost:8000/api/health

pause

