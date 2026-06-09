# Attendance System

Ứng dụng chấm công gồm ba phần:

- `attendance-service/`: Node.js service lưu dữ liệu chấm công cục bộ và nhận embedding khuôn mặt.
- `mobile-app/`: Expo kiosk terminal dùng camera, đăng ký thiết bị và gọi API chấm công.
- `ai-service/`: FastAPI service trích xuất embedding từ ảnh camera. Hiện tại service dùng fallback deterministic dựa trên ảnh, chưa phải model sinh trắc học chuyên dụng.

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

`ai-service/main.py` currently uses a deterministic image-feature fallback. Replace it with a real face model such as InsightFace or MediaPipe before using biometric attendance outside a controlled demo.

## Security Notes

- Attendance API endpoints now require `x-device-token` for:
	- `POST /api/attendance/recognize`
	- `POST /api/attendance/check-in`
	- `POST /api/attendance/check-out`
	- `POST /api/registration/enroll`
	- `POST /api/registration/match`
- Internal sync endpoints require `x-sync-secret` for:
	- `POST /api/sync/employees`
	- `PUT /api/sync/face/:id`
- Configure `SYNC_SECRET` in attendance-service environment to enable sync APIs.
