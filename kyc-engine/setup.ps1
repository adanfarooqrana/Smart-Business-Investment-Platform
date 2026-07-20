# SmartBiz KYC Engine setup (uses current Python — 3.11+ or 3.14)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (Test-Path venv) {
    Write-Host "Removing old venv..."
    Remove-Item -Recurse -Force venv
}

Write-Host "Creating virtual environment..."
python -m venv venv

Write-Host "Installing packages..."
& .\venv\Scripts\python.exe -m pip install --upgrade pip
& .\venv\Scripts\pip.exe install -r requirements.txt

Write-Host ""
Write-Host "Setup complete! Run:" -ForegroundColor Green
Write-Host "  .\start-server.bat"
Write-Host "  OR: .\venv\Scripts\activate ; python main.py"
