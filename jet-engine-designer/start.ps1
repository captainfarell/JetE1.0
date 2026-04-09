# Jet Engine Designer — dev environment launcher
# Usage: right-click -> "Run with PowerShell", or: pwsh -File start.ps1

Write-Host "Stopping any existing backend/frontend processes..." -ForegroundColor Yellow

# Kill anything on ports 8000 and 5173
$ports = @(8000, 5173)
foreach ($port in $ports) {
    $pids = (netstat -ano | Select-String ":$port\s" | ForEach-Object {
        ($_ -split '\s+')[-1]
    } | Sort-Object -Unique)
    foreach ($p in $pids) {
        if ($p -match '^\d+$' -and $p -ne '0') {
            try { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } catch {}
        }
    }
}

Start-Sleep -Seconds 1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting backend on port 8000..." -ForegroundColor Cyan
Start-Process -FilePath "python" `
    -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" `
    -WorkingDirectory "$root\backend" `
    -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "Starting frontend on port 5173..." -ForegroundColor Cyan
Start-Process -FilePath "cmd" `
    -ArgumentList "/k npm run dev" `
    -WorkingDirectory "$root\frontend" `
    -WindowStyle Normal

Write-Host ""
Write-Host "Done! Open http://localhost:5173 in your browser." -ForegroundColor Green
Write-Host "Close the two terminal windows to stop the servers." -ForegroundColor Gray
