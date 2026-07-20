@echo off
cd /d "%~dp0"

set "KYC_ROOT=%~dp0"
set "TMP=%KYC_ROOT%.temp"
set "TEMP=%KYC_ROOT%.temp"
set "PIP_CACHE_DIR=%KYC_ROOT%.pip-cache"

if not exist "%TMP%" mkdir "%TMP%"
call venv\Scripts\activate.bat
echo KYC server: http://localhost:8000
echo Health:   http://localhost:8000/health
python main.py
