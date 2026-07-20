@echo off
cd /d "%~dp0"

set "KYC_ROOT=%~dp0"
set "TMP=%KYC_ROOT%.temp"
set "TEMP=%KYC_ROOT%.temp"
set "PIP_CACHE_DIR=%KYC_ROOT%.pip-cache"
set "PYTHONUTF8=1"

if not exist "%TMP%" mkdir "%TMP%"
if not exist "%PIP_CACHE_DIR%" mkdir "%PIP_CACHE_DIR%"

echo === SmartBiz KYC Install (all on D: drive) ===
echo Cache: %PIP_CACHE_DIR%
echo Temp:  %TMP%
echo.

if exist venv (
    echo Removing old venv...
    rmdir /s /q venv 2>nul
)

python -m venv venv
if errorlevel 1 (
    echo Failed to create venv. Check Python is installed.
    pause
    exit /b 1
)

call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install --cache-dir "%PIP_CACHE_DIR%" -r requirements.txt

if errorlevel 1 (
    echo Install failed. Free space on D: drive and retry.
    pause
    exit /b 1
)

echo.
echo === SUCCESS! Start server with start-server.bat ===
pause
