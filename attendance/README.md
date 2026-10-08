# Attendance System

Ứng dụng chấm công gồm ba phần:

- `attendance-service/`: Node.js service lưu dữ liệu chấm công cục bộ và nhận embedding khuôn mặt.
- `mobile-app/`: Expo kiosk terminal dùng camera, đăng ký thiết bị và gọi API chấm công.
- `ai-service/`: FastAPI service trích xuất embedding 512 chiều bằng InsightFace `buffalo_l`. Điểm liveness hiện là heuristic dựa trên độ nét ảnh, chưa phải mô hình anti-spoof đã được kiểm định.

## Ports

- Admin backend: `5000`
- Attendance service: `5001`
- AI service: `8000`
- Expo mobile app: managed by Expo CLI

## Setup

```bash
cd attendance-service
npm install
npm start
```

`attendance-service` requires a fixed MongoDB URI in `attendance-service/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/attendance
```

Do not switch this value between different database names. Face embeddings are stored in this database, and the service now refuses to start outside tests when `MONGODB_URI` is missing.

```bash
cd mobile-app
npm install
npm start
```

```bash
cd ai-service
rmdir /s /q .venv 2>nul
py -3.11 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Use `Remove-Item -Recurse -Force .venv` instead of `rmdir /s /q .venv 2>nul` when running these commands in PowerShell.

## Kiosk Flow

1. Mobile app requests device access from Admin API.
2. Admin approves the device in the web portal.
3. Mobile app receives/stores `device_token`.
4. Kiosk fetches employees without face data from Admin API.
5. Registration stores face embedding in attendance-service and confirms biometrics in Admin API.
6. Recognition posts embedding to attendance-service and creates check-in/check-out records.

## Production Gap

`ai-service/main.py` uses InsightFace `buffalo_l` for face embeddings. Its liveness score is a basic image-sharpness heuristic, not a validated anti-spoofing model; do not rely on it as the sole spoof defense.

## Security Notes

- Attendance API endpoints now require `x-device-token` for:
	- `POST /api/attendance/recognize`
	- `POST /api/attendance/check-in`
	- `POST /api/attendance/check-out`
	- `POST /api/registration/enroll`
	- `POST /api/registration/match`
- Internal sync endpoints require service authentication for:
	- `POST /api/sync/employees`
	- `PUT /api/sync/face/:id`
- Production sync requests use timestamped HMAC signatures derived from `SYNC_SECRET`; legacy `x-sync-secret` is accepted only outside production during migration.
- In production, set the same `AI_ATTESTATION_SECRET` and `APP_ENCRYPTION_KEY` in admin backend and attendance-service. The first signs AI results and the second encrypts biometric vectors at rest.

## Database Preparation Before Production

Back up both databases before running any migration. Preview and then encrypt existing biometrics in both databases:

```bash
npm --prefix admin-system/backend run db:migrate-biometric-encryption:dry-run
npm --prefix attendance-system/attendance-service run db:migrate-biometric-encryption:dry-run
```

After reviewing the counts and confirming a tested backup, apply each migration by using the corresponding script without `:dry-run`. Check for duplicate open attendance records before deploying the new unique index:

```bash
npm --prefix attendance-system/attendance-service run db:check-open-attendance
```

The liveness calculation currently uses image sharpness as a heuristic. Signed results prevent the kiosk from changing the AI response, but this does not make the heuristic a validated anti-spoofing system.
