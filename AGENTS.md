# Repository Guidance

## Project Structure

```
EmployeeManagement/
├── admin-system/          # Phần mềm quản lý (backend + frontend)
│   ├── backend/
│   └── frontend/
├── attendance-system/     # Ứng dụng chấm công (AI + mobile)
│   ├── ai-service/        # Python AI service
│   ├── attendance-service/# Node.js attendance core
│   └── mobile-app/        # Expo/React Native kiosk terminal
└── [config files and docs]
```

## Backend (admin-system)

- The backend is a Node.js service using Express, MongoDB, and Mongoose.
- Located in `admin-system/backend/`
- The backend entrypoint is `admin-system/backend/server.js`; the Express app is defined in `admin-system/backend/app.js`.
- API routes are mounted under `/api/v1`; legacy aliases are kept in `admin-system/backend/routes/legacy.routes.js`.
- Keep backend documentation in `admin-system/backend/README.md` and request examples in `admin-system/backend/docs/api-examples.md`; link to those files instead of duplicating details here.

## Frontend (admin-system)

- React 19 + Vite + TypeScript application.
- Located in `admin-system/frontend/`
- Refer to `admin-system/frontend/README.md` for setup and structure.

## Attendance System

- Mobile and AI services for face recognition and check-in.
- Located in `attendance-system/`
- Contains an Expo/React Native app (`mobile-app`) and Python AI service.

## General Guidelines

- Do not guess build, test, or run commands. Derive them from project files such as `package.json`, README files, or lockfiles when they exist.
- Do not commit local environment files, dependency folders, logs, or generated build output.
