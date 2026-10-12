$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location (Join-Path $projectRoot 'backend')
$env:DEBUG = 'True'
$env:SECRET_KEY = 'isolated-e2e-only-secret'
$env:DB_ENGINE = 'sqlite'
$env:SQLITE_NAME = 'e2e.sqlite3'
$env:CSRF_TRUSTED_ORIGINS = 'http://127.0.0.1:5174'
$python = Join-Path $projectRoot '.venv\Scripts\python.exe'
& $python manage.py migrate --noinput
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
# This flush targets the explicitly named, isolated e2e.sqlite3 database only.
& $python manage.py flush --noinput
& $python manage.py seed_demo
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $python manage.py runserver 127.0.0.1:8001 --noreload
