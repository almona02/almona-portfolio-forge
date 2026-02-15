@echo off
cd /d "%~dp0"
echo ============================================================
echo Almona02.com Live Testing - Installation and Execution
echo ============================================================
echo.
echo Current directory: %CD%
echo.

echo Step 1: Installing Python dependencies...
echo.
python -m pip install --upgrade pip
python -m pip install selenium webdriver-manager

echo.
echo ============================================================
echo Installation complete!
echo ============================================================
echo.

echo Step 2: Running live tests...
echo.
python "%~dp0test-almona02-live.py"

echo.
echo ============================================================
echo Testing complete! Check the following:
echo - test-screenshots/ folder for screenshots
echo - test-downloads/ folder for downloaded files
echo - test-report.json for detailed results
echo ============================================================
echo.

pause
