# scripts/start-all-kiosk.ps1
# Lenh khoi chay tron goi: Docker Backend + May ao Android Studio + Kiosk Cham Cong

$ErrorActionPreference = 'Continue'
Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "   KHOI CHAY DOCKER BACKEND & MAY AO ANDROID STUDIO KIOSK CHAM CONG" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

$ProjectRoot = $PSScriptRoot | Split-Path -Parent
Set-Location $ProjectRoot

# -----------------------------------------------------------------
# BUOC 1: DAM BAO DOCKER DAEMON DANG CHAY & BAT TOAN BO CONTAINERS
# -----------------------------------------------------------------
Write-Host "[1/4] Kiem tra va khoi dong Docker services..." -ForegroundColor Yellow

$daemonScript = Join-Path $ProjectRoot "scripts\docker\start-docker-daemon.ps1"
if (Test-Path $daemonScript) {
    & powershell -ExecutionPolicy Bypass -File $daemonScript
}

Write-Host "Khoi chay toan bo container Docker..." -ForegroundColor DarkGray
& docker compose --env-file .env.docker up -d

Write-Host " Docker services da san sang!" -ForegroundColor Green
Write-Host ""

# -----------------------------------------------------------------
# BUOC 2: KHOI DONG MAY AO ANDROID STUDIO (NEU CHUA CHAY)
# -----------------------------------------------------------------
Write-Host "[2/4] Kiem tra may ao Android Studio (AVD)..." -ForegroundColor Yellow

$emulatorPath = "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe"
if (-not (Test-Path $emulatorPath)) {
    $emulatorCmd = Get-Command emulator.exe -ErrorAction SilentlyContinue
    if ($emulatorCmd) { $emulatorPath = $emulatorCmd.Source }
}

if (-not (Test-Path $emulatorPath)) {
    Write-Warning "Khong tim thay emulator.exe tai Android SDK. Vui long kiem tra lai duong dan Android Studio."
} else {
    # Kiem tra xem co may ao nao dang chay khong
    $runningDevices = & adb devices | Where-Object { $_ -match "emulator-\d+\s+device" }
    
    if (-not $runningDevices) {
        # Lay danh sach may ao co san
        $avds = & $emulatorPath -list-avds
        $avdToStart = $null
        if ($avds -contains "Pixel_7") {
            $avdToStart = "Pixel_7"
        } elseif ($avds -and $avds.Count -gt 0) {
            $avdToStart = $avds[0]
        }

        if (-not $avdToStart) {
            Write-Error "Khong tim thay AVD nao trong Android Studio! Hay tao mot may ao trong Device Manager truoc."
        } else {
            Write-Host "Dang khoi dong may ao: $avdToStart..." -ForegroundColor Cyan
            Start-Process -FilePath $emulatorPath -ArgumentList "-avd", $avdToStart
            
            Write-Host "Dang cho may ao khoi dong (boot completed)..." -ForegroundColor DarkGray
            & adb wait-for-device
            
            $booted = $false
            $timeout = 60
            $elapsed = 0
            while (-not $booted -and $elapsed -lt $timeout) {
                Start-Sleep -Seconds 3
                $elapsed += 3
                $bootStatus = & adb shell getprop sys.boot_completed 2>$null
                if ($bootStatus -match "1") {
                    $booted = $true
                    break
                }
                Write-Host -NoNewline "."
            }
            Write-Host ""
            if ($booted) {
                Write-Host " May ao $avdToStart da khoi dong thanh cong!" -ForegroundColor Green
            } else {
                Write-Host "May ao dang mo, tiep tuc thiet lap ket noi..." -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host " May ao Android da dang chay san!" -ForegroundColor Green
    }
}
Write-Host ""

# -----------------------------------------------------------------
# BUOC 3: CAU NOI MANG ADB REVERSE
# -----------------------------------------------------------------
Write-Host "[3/4] Cau hinh ADB reverse port forwarding..." -ForegroundColor Yellow

& adb reverse tcp:8082 tcp:8082 2>$null
& adb reverse tcp:8081 tcp:8082 2>$null
& adb reverse tcp:5000 tcp:5000 2>$null
& adb reverse tcp:5001 tcp:5001 2>$null
& adb reverse tcp:8000 tcp:8000 2>$null
& adb reverse tcp:80 tcp:80 2>$null

Write-Host " Cau noi mang (5000: Admin API, 5001: Attendance, 8000: AI, 8082: Metro) hoan tat!" -ForegroundColor Green
Write-Host ""

# -----------------------------------------------------------------
# BUOC 4: BUILD VA CHAY KIOSK MOBILE APP TREN MAY AO
# -----------------------------------------------------------------
Write-Host "[4/4] Khoi chay Kiosk Cham Cong (mobile-app)..." -ForegroundColor Yellow
Write-Host "Ung dung se duoc tu dong cai dat va mo tren may ao." -ForegroundColor DarkGray
Write-Host ""

npm --prefix attendance-system/mobile-app run android
