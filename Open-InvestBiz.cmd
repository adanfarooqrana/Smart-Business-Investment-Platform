@echo off
setlocal
where py.exe >nul 2>nul
if errorlevel 1 (
    python -B "%~dp0Preview-InvestBiz.py" --open
) else (
    py -3 -B "%~dp0Preview-InvestBiz.py" --open
)
if errorlevel 1 pause
