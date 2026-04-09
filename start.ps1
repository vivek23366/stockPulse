# Stock Pulse — Start Script
# Starts FastAPI backend (port 8000) and Vite frontend (port 5173)

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "  ╔══════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║        STOCK PULSE STARTER       ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── Install backend deps if needed ──
Write-Host "▶ Checking backend dependencies..." -ForegroundColor Yellow
pip install -q fastapi uvicorn[standard] python-multipart yfinance pandas colorama numpy

# ── Start FastAPI backend ──
Write-Host "▶ Starting FastAPI backend on http://localhost:8000 ..." -ForegroundColor Green
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; cd '$root'; python -m uvicorn backend.main:app --reload --port 8000" -PassThru

Start-Sleep -Seconds 3

# ── Start Vite frontend ──
Write-Host "▶ Starting Vite frontend on http://localhost:5173 ..." -ForegroundColor Green
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; `$env:PATH = [System.Environment]::GetEnvironmentVariable('PATH','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('PATH','User'); cd '$root\frontend'; npm run dev" -PassThru

Write-Host ""
Write-Host "  ✓ Backend  → http://localhost:8000"  -ForegroundColor Cyan
Write-Host "  ✓ Frontend → http://localhost:5173"  -ForegroundColor Cyan
Write-Host "  ✓ API Docs → http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Press Ctrl+C or close windows to stop." -ForegroundColor Gray
Write-Host ""

# Open browser after short delay
Start-Sleep -Seconds 4
Start-Process "http://localhost:5173"

Wait-Process -Id $backend.Id -ErrorAction SilentlyContinue
