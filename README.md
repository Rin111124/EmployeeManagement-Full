# EmployeeManagement

Monorepo cho hệ thống quản lý nhân sự và chấm công bằng thiết bị kiosk.

## Project Structure

```text
EmployeeManagement/
├── admin-system/
│   ├── backend/                  # Express + MongoDB API
│   └── frontend/                 # React 19 + Vite admin web app
├── attendance-system/
│   ├── ai-service/               # FastAPI face feature service
│   ├── attendance-service/       # Node.js attendance core service
│   ├── mobile-app/               # Expo/React Native kiosk terminal
│   └── employee-mobile-app/      # Expo employee self-service app
├── docs/
├── scripts/
├── uml-diagrams/
├── docker-compose.yml
├── package.json
└── README.md
```

## Local Development

Install dependencies in each service you plan to run:

```bash
npm install
npm --prefix admin-system/backend install
npm --prefix admin-system/frontend install
npm --prefix attendance-system/attendance-service install
npm --prefix attendance-system/mobile-app install
npm --prefix attendance-system/employee-mobile-app install
```

Start admin backend and frontend:

```bash
npm run dev:admin
```

Start attendance core service and kiosk mobile app:

```bash
npm run dev:attendance
```

Start the employee mobile app:

```bash
npm run dev:employee-mobile
```

Start all Node/Expo services:

```bash
npm run dev:all
```

Run the AI service separately:

```bash
cd attendance-system/ai-service
py -3.11 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Use `Remove-Item -Recurse -Force .venv` when deleting the virtual environment in PowerShell.

## Environment Files

- Copy `admin-system/backend/.env.example` to `admin-system/backend/.env`.
- Copy `admin-system/frontend/.env.example` to `admin-system/frontend/.env.local`.
- Copy `attendance-system/attendance-service/.env.example` to `attendance-system/attendance-service/.env`.
- Copy `attendance-system/mobile-app/.env.example` to `attendance-system/mobile-app/.env`.
- For Docker, copy `.env.docker.example` to `.env.docker` and fill in new secrets.
- Do not commit local `.env` files, dependency folders, logs, uploads, or build output.

## Verification

```bash
npm run test:admin-backend
npm run test:attendance-service
npm run lint:admin-frontend
npm run build:admin-frontend
npm run lint:mobile
```

Clean generated output when the workspace gets noisy:

```bash
npm run clean:generated
```

## Documentation
## 🛠️ Testing & Diagnostics

Hệ thống đi kèm với bộ công cụ kiểm thử và chẩn đoán toàn diện. Xem chi tiết tại [Hướng dẫn chạy Scripts Test](docs/testing-guide.md).

Các lệnh nhanh:
- `npm test` (trong `admin-system/backend`): Chạy unit tests.
- `npm run security:test`: Kiểm tra an ninh.
- `node scripts/recalculateAllAttendance.js`: Cập nhật lại giờ làm việc theo cấu hình nghỉ mới.

- Documentation index: [docs/README.md](docs/README.md)
- Admin backend: [admin-system/backend/README.md](admin-system/backend/README.md)
- Backend API examples: [admin-system/backend/docs/api-examples.md](admin-system/backend/docs/api-examples.md)
- Admin frontend: [admin-system/frontend/README.md](admin-system/frontend/README.md)
- Attendance system: [attendance-system/README.md](attendance-system/README.md)
- Improvement plan: [docs/planning/project-improvement-plan.md](docs/planning/project-improvement-plan.md)
- Production deployment: [PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md)
