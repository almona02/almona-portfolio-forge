@echo off
echo Setting up Railway Redis...
echo.

REM Add npm global bin to PATH for this session
set PATH=%PATH%;%APPDATA%\npm

echo Step 1: Login to Railway (this will open browser)
railway login

echo.
echo Step 2: Link to your project (if needed)
railway link

echo.
echo Step 3: Add Redis service
railway add redis

echo.
echo Step 4: Verify Redis was added
railway service list

echo.
echo Redis setup complete!
echo Check your Railway dashboard to confirm Redis service is listed.
pause
