param([switch]$SQLite)
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $projectRoot
if ($SQLite) { $env:DB_ENGINE='sqlite'; $env:DEBUG='True' }
& .\.venv\Scripts\python.exe backend\manage.py runserver 127.0.0.1:8000
