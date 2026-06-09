# Employee Management Backend

Backend cham cong va quan ly nhan vien dung Node.js, Express, MongoDB va Mongoose.

## Structure

```text
backend/
  app.js
  server.js
  config/
  constants/
  controllers/
  loaders/
  middlewares/
  models/
  routes/
  services/
  validators/
  utils/
  docs/
```

See [docs/architecture.md](docs/architecture.md) for the production structure and module layering rules.

## Requirements

- Node.js and npm
- MongoDB running locally or a MongoDB connection string

## Environment

Create `backend/.env` from `backend/.env.example` and adjust values as needed.

Important variables:

```text
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/employee_management
JWT_SECRET=replace-with-a-long-random-secret
JWT_ACCESS_SECRET=replace-with-a-long-random-access-secret
JWT_REFRESH_SECRET=replace-with-a-long-random-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-with-a-strong-admin-password
```

Do not commit `backend/.env`. Use a strong `JWT_SECRET` and admin password outside local development.
When `NODE_ENV=production`, `MONGODB_URI` and `JWT_SECRET` must be set explicitly.

## Local Run

Install dependencies:

```bash
npm install
```

Seed the initial admin account:

```bash
npm run seed:admin
```

Start the API:

```bash
npm start
```

The API runs on `http://localhost:5000` by default.

Health check:

```text
GET /health
GET /health/ready
```

## Security Test Scripts

Run the full automated test suite:

```bash
npm test
```

Run security environment checks and security smoke tests:

```bash
npm run security:test
```

Run only environment checks:

```bash
npm run security:env
```

In development, weak secrets are reported as warnings. To fail on warnings, run:

```bash
$env:SECURITY_ENV_STRICT='true'; npm run security:env
```

Run only the isolated security smoke test:

```bash
npm run security:smoke
```

The smoke test uses an in-memory MongoDB instance and does not modify the local database.

## API

The current API uses the `/api/v1` prefix:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/register`
- `GET /api/v1/auth/me`
- `GET /api/v1/employees`
- `POST /api/v1/employees`
- `GET /api/v1/employees/:id`
- `PATCH /api/v1/employees/:id`
- `DELETE /api/v1/employees/:id`
- `POST /api/v1/employees/:id/face-data`
- `POST /api/v1/attendance/check-in`
- `POST /api/v1/attendance/check-out`
- `GET /api/v1/attendance/history`
- `GET /api/v1/attendance/:id`
- `PATCH /api/v1/attendance/:id`
- `DELETE /api/v1/attendance/:id`
- `GET /api/v1/attendance/reports/daily`
- `GET /api/v1/attendance/reports/monthly`
- `GET /api/v1/audit-logs`
- `GET|POST /api/v1/departments`
- `GET|PATCH|DELETE /api/v1/departments/:id`
- `GET|POST /api/v1/employee-positions`
- `GET|PATCH|DELETE /api/v1/employee-positions/:id`
- `GET|POST /api/v1/shifts`
- `GET|PATCH|DELETE /api/v1/shifts/:id`
- `GET|POST /api/v1/shift-assignments`
- `GET|PATCH|DELETE /api/v1/shift-assignments/:id`
- `GET|POST /api/v1/leave-requests`
- `GET|PATCH|DELETE /api/v1/leave-requests/:id`
- `POST /api/v1/leave-requests/mine`
- `POST /api/v1/leave-requests/:id/approve`
- `POST /api/v1/leave-requests/:id/reject`
- `POST /api/v1/leave-requests/:id/cancel`
- `GET|POST /api/v1/overtime`
- `GET|PATCH|DELETE /api/v1/overtime/:id`
- `POST /api/v1/overtime/mine`
- `POST /api/v1/overtime/:id/approve`
- `POST /api/v1/overtime/:id/reject`
- `POST /api/v1/overtime/:id/cancel`
- `GET|POST /api/v1/contracts`
- `GET|PATCH|DELETE /api/v1/contracts/:id`
- `GET|POST /api/v1/payroll`
- `GET|PATCH|DELETE /api/v1/payroll/:id`
- `POST /api/v1/payroll/generate`
- `GET|POST /api/v1/assets`
- `GET|PATCH|DELETE /api/v1/assets/:id`
- `GET|POST /api/v1/training`
- `GET|PATCH|DELETE /api/v1/training/:id`
- `GET|POST /api/v1/face-logs`
- `GET|PATCH|DELETE /api/v1/face-logs/:id`

See [docs/api-examples.md](docs/api-examples.md) for request and response examples.

Legacy aliases are available for compatibility through `routes/legacy.routes.js`.

## Security

Authentication uses bcrypt password hashes, short-lived JWT access tokens, rotating refresh tokens, and HttpOnly cookies. Login returns the tokens for API clients, but browser clients should rely on the `accessToken` and `refreshToken` cookies and send requests with credentials enabled.

RBAC roles:

- `Admin`: full access.
- `HR`: manages employees, departments, shifts, attendance, payroll-related HR resources, and reports.
- `Employee`: can read only their own employee profile and attendance history.

Security controls included:

- Helmet security headers.
- CORS whitelist from `CORS_ORIGIN`; comma-separated origins are supported.
- Login rate limiting.
- Five failed logins lock the account for 15 minutes.
- Refresh token rotation with reuse detection.
- Logout blacklists the current access token and revokes the refresh token.
- Request sanitization for XSS and NoSQL operator injection.
- Audit logs for login, employee changes, attendance actions, and admin resource changes.

Production HRM workflows included:

- Employees can submit and cancel their own pending leave/overtime requests.
- HR/Admin can approve or reject pending leave/overtime requests.
- Payroll can be generated from the active contract, checked-out attendance, and approved overtime.
- `/health/ready` returns `503` when MongoDB is not connected, suitable for readiness probes.

