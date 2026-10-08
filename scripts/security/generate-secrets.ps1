# scripts/security/generate-secrets.ps1
# Script tao bo khoa bi mat ngau nhien (cryptographically secure) danh cho moi truong Production

$ErrorActionPreference = 'Stop'

function Get-SecureHexToken([int]$bytes = 32) {
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $buff = New-Object byte[] $bytes
    $rng.GetBytes($buff)
    return ($buff | ForEach-Object { '{0:x2}' -f $_ }) -join ''
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     SINH BO KHOA BI MAT BAO MAT CAO (PRODUCTION SECRETS)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$jwtSecret = Get-SecureHexToken 32
$jwtAccess = Get-SecureHexToken 32
$jwtRefresh = Get-SecureHexToken 32
$appEncryption = Get-SecureHexToken 32
$backupKey = Get-SecureHexToken 32
$syncSecret = Get-SecureHexToken 32
$aiAttestation = Get-SecureHexToken 16
$aiApiKey = Get-SecureHexToken 16

Write-Host "# Copy cac khoa nay vao file .env.docker hoac backend/.env cua moi truong Production:" -ForegroundColor Yellow
Write-Host ""
Write-Host "JWT_SECRET=$jwtSecret"
Write-Host "JWT_ACCESS_SECRET=$jwtAccess"
Write-Host "JWT_REFRESH_SECRET=$jwtRefresh"
Write-Host "APP_ENCRYPTION_KEY=$appEncryption"
Write-Host "APP_ENCRYPTION_KEY_V1=$appEncryption"
Write-Host "APP_ENCRYPTION_KEY_VERSION=v1"
Write-Host "BACKUP_ENCRYPTION_KEY=$backupKey"
Write-Host "SYNC_SECRET=$syncSecret"
Write-Host "AI_ATTESTATION_SECRET=$aiAttestation"
Write-Host "AI_API_KEY=$aiApiKey"
Write-Host ""
Write-Host " LUU Y: Khong commit cac khoa nay vao Git repository!" -ForegroundColor Red
