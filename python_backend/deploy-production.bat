@echo off
REM Production Deployment Script (Windows)

setlocal enabledelayedexpansion

echo YDT Prestige Agent - Production Deployment
echo ==============================================

REM Safety check
set /p confirm="Are you deploying to PRODUCTION? (yes/no): "
if /i not "%confirm%"=="yes" (
    echo Deployment cancelled.
    pause
    exit /b 1
)

REM Check environment
if not exist ".env.production" (
    echo .env.production not found!
    echo Please create .env.production from .env.production.example
    pause
    exit /b 1
)

REM Verify Git status
echo Checking Git status...
git diff-index --quiet HEAD --
if errorlevel 1 (
    set /p confirm="You have uncommitted changes. Continue anyway? (yes/no): "
    if /i not "!confirm!"=="yes" (
        exit /b 1
    )
)

REM Get current branch
for /f "tokens=2" %%a in ('git branch --show-current') do set CURRENT_BRANCH=%%a
echo Current branch: %CURRENT_BRANCH%

REM Run comprehensive tests
echo Running production tests...
python tests/test_prestige_endpoints.py
if errorlevel 1 (
    echo Tests failed. Aborting deployment.
    pause
    exit /b 1
)

REM Build production image
echo Building production Docker image...
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do set mydate=%%c-%%a-%%b
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set mytime=%%a%%b
set mytime=!mytime: =0!
docker build -t ydt-prestige-api:latest -t ydt-prestige-api:%mydate%-%mytime% .

REM Stop existing production container
echo Stopping existing production container...
docker stop ydt-prestige-api-prod 2>nul
docker rm ydt-prestige-api-prod 2>nul

REM Start production container
echo Starting production container...
docker run -d ^
    --name ydt-prestige-api-prod ^
    --env-file .env.production ^
    -p 8000:8000 ^
    --restart always ^
    --memory="2g" ^
    --cpus="2" ^
    ydt-prestige-api:latest

REM Wait for startup
echo Waiting for API to start...
timeout /t 10 /nobreak >nul

REM Verify deployment
set MAX_RETRIES=5
set RETRY=0
:verify_loop
curl -s http://localhost:8000/api/health >nul 2>&1
if errorlevel 1 (
    set /a RETRY+=1
    if !RETRY! lss %MAX_RETRIES% (
        echo Retry !RETRY!/%MAX_RETRIES%...
        timeout /t 5 /nobreak >nul
        goto verify_loop
    ) else (
        echo Deployment verification failed
        docker logs ydt-prestige-api-prod
        pause
        exit /b 1
    )
) else (
    echo Production deployment successful!
)

echo.
echo Final Verification:
echo ======================
curl -s http://localhost:8000/api/health

echo.
echo Production deployment complete!
echo API: http://localhost:8000
echo Docs: http://localhost:8000/api/docs
echo.
echo Monitoring Commands:
echo   View logs: docker logs -f ydt-prestige-api-prod
echo   Check status: docker ps ^| findstr ydt-prestige-api-prod
echo   View stats: docker stats ydt-prestige-api-prod

pause

