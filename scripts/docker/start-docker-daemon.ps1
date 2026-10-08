# scripts/docker/start-docker-daemon.ps1
# Script khoi dong Docker Engine chay ngam (headless) khong can mo giao dien Docker Desktop

Write-Host "Dang kiem tra trang thai Docker daemon..." -ForegroundColor Cyan

# Kiem tra neu Docker da dang chay
$ErrorActionPreference = 'SilentlyContinue'
& docker ps 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host " Docker daemon da dang chay va san sang!" -ForegroundColor Green
    exit 0
}

Write-Host "Docker daemon chua chay. Dang khoi dong engine ngam (khong can GUI)..." -ForegroundColor Yellow

# Danh sach cac duong dan com.docker.backend kha di
$possiblePaths = @(
    "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\com.docker.backend.exe",
    "C:\Program Files\Docker\Docker\resources\com.docker.backend.exe",
    "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe",
    "C:\Program Files\Docker\Docker\Docker Desktop.exe"
)

$backendPath = $null
foreach ($p in $possiblePaths) {
    if (Test-Path $p) {
        $backendPath = $p
        break
    }
}

if (-not $backendPath) {
    Write-Error "Khong tim thay executable cua Docker Desktop tren he thong!"
    exit 1
}

Write-Host "Khoi chay: $backendPath" -ForegroundColor DarkGray
Start-Process -FilePath $backendPath -WindowStyle Hidden

Write-Host "Dang cho Docker daemon khoi tao ket noi..." -ForegroundColor Cyan
$maxAttempts = 30
$attempt = 0
$ready = $false

while ($attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 2
    $attempt++
    & docker ps 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $ready = $true
        break
    }
    Write-Host -NoNewline "."
}

Write-Host ""

if ($ready) {
    Write-Host " Docker daemon da khoi dong thanh cong va san sang hoat dong!" -ForegroundColor Green
    exit 0
} else {
    Write-Error "Khong the ket noi den Docker daemon sau $($maxAttempts * 2) giay. Vui long kiem tra lai trang thai WSL/Docker."
    exit 1
}
