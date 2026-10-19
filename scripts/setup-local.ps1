param([switch]$SQLite, [switch]$Demo)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $projectRoot
if (!(Test-Path '.env')) { Copy-Item '.env.example' '.env' }
if ($SQLite) {
    $env:INTELLILMS_SQLITE_EVALUATION='1'
    $env:DB_ENGINE='sqlite'; $env:DEBUG='True'; $env:SQLITE_NAME='evaluation.sqlite3'
    $env:EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend'
}
if (!(Test-Path '.venv\Scripts\python.exe')) { python -m venv .venv }
& .\.venv\Scripts\python.exe -m pip install -r backend\requirements.lock.txt
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& .\.venv\Scripts\python.exe backend\manage.py migrate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
if ($Demo) {
    & .\.venv\Scripts\python.exe backend\manage.py seed_demo
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
npm.cmd --prefix frontend ci
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'Setup complete. Normal startup uses root .env. For isolated SQLite use start-backend.ps1 -SQLite -Port 8002.'
