param([switch]$SQLite, [switch]$Demo)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $projectRoot
if (!(Test-Path '.env')) { Copy-Item '.env.example' '.env' }
if ($SQLite) { $env:DB_ENGINE = 'sqlite'; $env:DEBUG = 'True' }
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
Write-Host 'Setup complete. For SQLite set $env:DB_ENGINE="sqlite" in the backend terminal, then follow README.md.'
