# Terra AI — Start Backend Server
# Run this script from the project root in PowerShell to boot the Flask engine.
# Usage: .\start_backend.ps1

Write-Host "`n[Terra AI] Starting backend engine..." -ForegroundColor Cyan

$backendDir = Join-Path $PSScriptRoot "backend"
Set-Location $backendDir

# Create venv if it doesn't exist
if (-not (Test-Path "venv")) {
    Write-Host "[Terra AI] Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate venv
Write-Host "[Terra AI] Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Install/upgrade dependencies
Write-Host "[Terra AI] Installing dependencies from requirements.txt..." -ForegroundColor Yellow
pip install -r requirements.txt --quiet

# Confirm .env exists (check backend dir first, then project root)
$envInBackend = Test-Path ".env"
$envInRoot    = Test-Path (Join-Path $PSScriptRoot ".env")

if (-not $envInBackend -and -not $envInRoot) {
    Write-Host "[Terra AI] ERROR: .env not found." -ForegroundColor Red
    Write-Host "Copy .env.example to .env at the project root and fill in your API keys." -ForegroundColor Red
    exit 1
}

if ($envInRoot -and -not $envInBackend) {
    Write-Host "[Terra AI] Using project-root .env (python-dotenv will auto-discover it)." -ForegroundColor Gray
}

# Start Flask
Write-Host "`n[Terra AI] Backend starting on http://localhost:5000" -ForegroundColor Green
Write-Host "[Terra AI] Press Ctrl+C to stop.`n" -ForegroundColor Gray
python app.py
