# PowerShell script để kích hoạt xác thực an toàn cho MongoDB trên Windows Service (Chạy với quyền Administrator)

$cfgPath = "C:\Program Files\MongoDB\Server\8.3\bin\mongod.cfg"
if (-not (Test-Path $cfgPath)) {
    Write-Host "[ERROR] Không tìm thấy file cấu hình tại: $cfgPath" -ForegroundColor Red
    exit 1
}

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " KÍCH HOẠT AUTHENTICATION CHO MONGODB TRÊN WINDOWS  " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Sao lưu cấu hình
$bakPath = "$cfgPath.bak_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item -Path $cfgPath -Destination $bakPath
Write-Host "[1/3] Đã sao lưu file cấu hình sang: $bakPath" -ForegroundColor Green

# 2. Đọc nội dung và bật security.authorization: enabled
$content = Get-Content $cfgPath -Raw

if ($content -match "security:\s*`r?`n\s*authorization:\s*enabled") {
    Write-Host "[2/3] MongoDB đã được kích hoạt authorization từ trước." -ForegroundColor Yellow
} else {
    # Thay thế #security: hoặc bổ sung
    if ($content -match "#security:") {
        $content = $content -replace "#security:", "security:`r`n  authorization: enabled"
    } else {
        $content = $content + "`r`nsecurity:`r`n  authorization: enabled`r`n"
    }
    Set-Content -Path $cfgPath -Value $content -Encoding utf8
    Write-Host "[2/3] Đã cấu hình 'security.authorization: enabled' trong mongod.cfg." -ForegroundColor Green
}

# 3. Khởi động lại service
Write-Host "[3/3] Đang khởi động lại dịch vụ Windows MongoDB..." -ForegroundColor Cyan
try {
    Restart-Service -Name "MongoDB" -Force
    Write-Host "[SUCCESS] Dịch vụ MongoDB đã khởi động lại thành công với chế độ bảo mật!" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Không thể khởi động lại dịch vụ: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Vui lòng mở PowerShell bằng quyền Run as Administrator và chạy lại script." -ForegroundColor Yellow
}
