@echo off
echo Adding Redis to Railway...
echo.

REM Add npm global bin to PATH
set PATH=%PATH%;%APPDATA%\npm

echo Linking to project (if needed)...
railway link

echo.
echo Adding Redis service...
railway add redis

echo.
echo Checking services...
railway service list

echo.
echo Done! Check your Railway dashboard for Redis service.
echo If you don't see Redis, try refreshing the page.
pause
