$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $projectRoot 'backend'
$frontend = Join-Path $projectRoot 'frontend'
$python = Join-Path (Split-Path -Parent $projectRoot) '.venv\Scripts\python.exe'

if (-not (Test-Path $python)) {
    throw "Windows virtual environment not found at $python"
}

Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$backend'; & '$python' manage.py runserver 127.0.0.1:8000"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$frontend'; npm run dev -- --host 0.0.0.0 --port 5173"

Write-Host 'Backend:  http://127.0.0.1:8000/'
Write-Host 'Frontend: http://localhost:5173/'
