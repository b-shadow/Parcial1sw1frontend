$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if (-not (Test-Path ".\node_modules")) {
    Write-Host "Instalando dependencias npm..." -ForegroundColor Cyan
    npm install
}

Write-Host "Iniciando frontend en http://localhost:4200 ..." -ForegroundColor Cyan
npm run start
