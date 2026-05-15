# Admin System

Phần mềm quản lý nhân viên toàn diện với backend API và giao diện web.

## Project Structure

```text
admin-system/
├── backend/   # Express + MongoDB API
└── frontend/  # React 19 + Vite web application
```

## Components

### Backend (`backend/`)

Node.js/Express API service with MongoDB database.

- **Location**: `backend/`
- **Technology**: Express.js, MongoDB, Mongoose
- **API**: RESTful API under `/api/v1`
- **Key Features**:
  - Employee management (CRUD, positions, assignments)
  - Authentication & Authorization (JWT)
  - Attendance tracking
  - Leave and overtime management
  - Payroll management
  - Audit logging
  - Dashboard analytics

For detailed information, see [backend/README.md](backend/README.md)

### Frontend (`frontend/`)

React 19 web application with TypeScript and Tailwind CSS.

- **Location**: `frontend/`
- **Technology**: React 19, TypeScript, Vite, Tailwind CSS
- **Port**: 5173 (development)
- **Features**:
  - Employee management interface
  - Attendance dashboard
  - Leave request workflow
  - Payroll management
  - System settings and configuration

For detailed information, see [frontend/README.md](frontend/README.md)

## Quick Start

### Prerequisites

- Node.js 16+ and npm
- MongoDB running locally or connection string to remote instance

### Setup Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

The API will run on `http://localhost:5000`

### Setup Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local if backend is not on localhost:5000
npm run dev
```

The app will run on `http://localhost:5173`

### Run Both Services

From the repository root:

```bash
npm install
npm run dev:all
```

This uses `concurrently` to run both frontend and backend simultaneously.

## Environment Configuration

- **Backend**: See `backend/.env.example` for required environment variables
  - Database URI
  - JWT secrets
  - CORS origins
  - Admin credentials
  
- **Frontend**: See `frontend/.env.example` for configuration
  - API base URL
  - App name

## API Documentation

Detailed API documentation and examples are available in [backend/docs/api-examples.md](backend/docs/api-examples.md)

Common endpoints:
- `POST /api/v1/auth/login` - User authentication
- `GET /api/v1/employees` - List employees
- `POST /api/v1/employees` - Create employee
- `GET /api/v1/attendance` - Get attendance records
- `GET /api/v1/dashboard` - Dashboard data

## Security

- JWT-based authentication
- Password hashing with bcryptjs
- Rate limiting on login attempts
- CORS protection
- Security headers via Helmet
- Request sanitization

For security details, see `backend/docs/architecture.md`

## Scripts

### Backend Scripts

- `npm start` - Start development server
- `npm run test` - Run tests
- `npm run security:test` - Run security checks

### Frontend Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run linter

## Troubleshooting

### Backend won't start

- Check MongoDB connection: `mongod` should be running
- Verify `.env` file is created and configured
- Check if port 5000 is available

### Frontend development issues

- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf .vite` then `npm run dev`
- Check if port 5173 is available

## Integration

The admin system integrates with the [attendance-system](../attendance-system/) for:
- Employee data syncing
- Face recognition features
- Check-in/check-out recording
