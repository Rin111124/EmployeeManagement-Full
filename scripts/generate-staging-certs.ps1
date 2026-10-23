# PowerShell script to generate self-signed TLS certificates for local staging / Docker Compose
param(
    [string]$CertDir = "deployment/nginx/certs",
    [int]$Days = 365
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $CertDir)) {
    New-Item -ItemType Directory -Path $CertDir -Force | Out-Null
}

$opensslPath = "openssl"
if (!(Get-Command openssl -ErrorAction SilentlyContinue)) {
    if (Test-Path "C:\Program Files\Git\usr\bin\openssl.exe") {
        $opensslPath = "C:\Program Files\Git\usr\bin\openssl.exe"
    } else {
        Write-Error "OpenSSL is not found on PATH or in Git usr/bin."
    }
}

$keyFile = Join-Path $CertDir "privkey.pem"
$certFile = Join-Path $CertDir "fullchain.pem"

Write-Host "[CERT] Generating self-signed TLS certificates using $opensslPath..."
& $opensslPath req -x509 -nodes -days $Days -newkey rsa:2048 -keyout $keyFile -out $certFile -subj "/CN=localhost/O=EmployeeManagement/C=VN"

if (Test-Path $certFile -and Test-Path $keyFile) {
    Write-Host "[CERT] Success: Certificates generated at $keyFile and $certFile" -ForegroundColor Green
} else {
    Write-Error "Failed to generate certificates."
}
