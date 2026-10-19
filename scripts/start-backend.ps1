param([switch]$SQLite, [int]$Port = 8000)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $projectRoot
if ($SQLite) {
    if ($Port -eq 8000) { throw 'Use a separate port for SQLite evaluation, for example -SQLite -Port 8002.' }
    $env:INTELLILMS_SQLITE_EVALUATION='1'
    $env:DB_ENGINE='sqlite'; $env:DEBUG='True'; $env:SQLITE_NAME='evaluation.sqlite3'
    $env:EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend'
}
& .\.venv\Scripts\python.exe -u backend\manage.py runserver "127.0.0.1:$Port"
exit $LASTEXITCODE
