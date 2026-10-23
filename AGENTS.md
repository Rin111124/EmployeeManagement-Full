# Repository Guidance

## Project Structure

```
EmployeeManagement/
├── packages/              # Phần mềm quản lý HRMS
│   ├── backend/           # Node.js backend API
│   └── frontend/          # React 19 + TypeScript portal
├── attendance/            # Hệ thống chấm công sinh trắc học
│   ├── ai-service/        # Python InsightFace AI service
│   ├── attendance-service/# Node.js attendance core engine
│   ├── mobile-app/        # Expo/React Native kiosk terminal
│   └── employee-mobile-app/# Expo employee mobile app
└── [config files and docs]
```

## Backend (packages/backend)

- The backend is a Node.js service using Express, MongoDB, and Mongoose.
- Located in `packages/backend/`
- The backend entrypoint is `packages/backend/server.js`; the Express app is defined in `packages/backend/app.js`.
- API routes are mounted under `/api/v1`; legacy aliases are kept in `packages/backend/routes/legacy.routes.js`.

## Frontend (packages/frontend)

- React 19 + Vite + TypeScript application.
- Located in `packages/frontend/`

## Attendance System (attendance/)

- Mobile, core engine and AI services for face recognition and check-in.
- Located in `attendance/`
- Contains an Expo/React Native app (`attendance/mobile-app`), employee app (`attendance/employee-mobile-app`), Node.js core (`attendance/attendance-service`), and Python AI service (`attendance/ai-service`).

## General Guidelines

- Do not guess build, test, or run commands. Derive them from project files such as `package.json`, README files, or lockfiles when they exist.
- Do not commit local environment files, dependency folders, logs, or generated build output.
