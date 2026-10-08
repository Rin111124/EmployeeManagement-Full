# Employee Management API Examples

Base URL: `http://localhost:5000/api/v1`

## Auth

### Register

`POST /auth/register`

Header: `Authorization: Bearer <admin-token>`

Request:

```json
{
  "employee_id": "662b7c8b8b6d9f0012a12345",
  "username": "admin",
  "password": "<strong-password>",
  "roles": ["Admin"]
}
```

Response:

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "662b7e0a8b6d9f0012a12346",
      "employee_id": "662b7c8b8b6d9f0012a12345",
      "username": "admin",
      "roles": ["Admin"],
      "is_active": true
    },
    "token": "jwt-token"
  }
}
```

### Login

`POST /auth/login`

Request:

```json
{
  "username": "admin",
  "password": "<strong-password>"
}
```

Response:

```json
{
  "success": true,
  "message": "Login successfully",
  "data": {
    "user": {
      "_id": "662b7e0a8b6d9f0012a12346",
      "username": "admin",
      "roles": ["Admin"]
    },
    "access_token": "jwt-access-token",
    "token": "jwt-access-token",
    "refresh_token": "jwt-refresh-token",
    "refresh_expires_at": "2026-05-06T00:00:00.000Z"
  }
}
```

The response also sets HttpOnly cookies:

- `accessToken`
- `refreshToken`

### Refresh Token

`POST /auth/refresh`

Uses the `refreshToken` HttpOnly cookie. Non-browser clients may send:

```json
{
  "refresh_token": "jwt-refresh-token"
}
```

Response:

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "access_token": "new-jwt-access-token",
    "token": "new-jwt-access-token",
    "refresh_token": "new-jwt-refresh-token",
    "refresh_expires_at": "2026-05-06T00:00:00.000Z"
  }
}
```

Refresh tokens are rotated. Reusing an old refresh token revokes the active token family and returns `401`.

### Logout

`POST /auth/logout`

Header: `Authorization: Bearer <access-token>`

Response:

```json
{
  "success": true,
  "message": "Logout successfully"
}
```

Logout clears auth cookies, revokes the refresh token, and blacklists the current access token until it expires.

### Me

`GET /auth/me`

Header: `Authorization: Bearer <access-token>`

Browser clients may use the `accessToken` cookie instead of the Authorization header.

## Employees

Use header: `Authorization: Bearer <token>`

### Create Employee

`POST /employees`

Request:

```json
{
  "employee_code": "EMP001",
  "full_name": "Nguyen Van A",
  "date_of_birth": "1995-01-10",
  "gender": "Male",
  "contact": {
    "phone": "0900000000",
    "email": "a@example.com"
  },
  "position": "Backend Developer",
  "department": "Engineering",
  "hire_date": "2024-01-01",
  "face_data": [
    {
      "label": "front",
      "embedding": [0.12, 0.34, 0.56],
      "image_path": "/uploads/faces/emp001-front.jpg"
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "message": "Employee created successfully",
  "data": {
    "_id": "662b7c8b8b6d9f0012a12345",
    "employee_code": "EMP001",
    "full_name": "Nguyen Van A",
    "status": "Active"
  }
}
```

### List Employees

`GET /employees?page=1&limit=20&search=nguyen&status=Active`

Response:

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "total_pages": 0
    }
  }
}
```

### Get Employee

`GET /employees/:id`

Response:

```json
{
  "success": true,
  "data": {
    "_id": "662b7c8b8b6d9f0012a12345",
    "employee_code": "EMP001",
    "full_name": "Nguyen Van A"
  }
}
```

### Update Employee

`PATCH /employees/:id`

Request:

```json
{
  "position": "Senior Backend Developer",
  "department": "Platform"
}
```

Response:

```json
{
  "success": true,
  "message": "Employee updated successfully",
  "data": {
    "_id": "662b7c8b8b6d9f0012a12345",
    "position": "Senior Backend Developer",
    "department": "Platform"
  }
}
```

### Delete Employee

`DELETE /employees/:id`

Response: `204 No Content`

### Add Face Data

`POST /employees/:id/face-data`

Request:

```json
{
  "face_data": {
    "label": "left",
    "embedding": [0.22, 0.44, 0.66],
    "image_path": "/uploads/faces/emp001-left.jpg"
  }
}
```

Response:

```json
{
  "success": true,
  "message": "Face data added successfully",
  "data": {
    "_id": "662b7c8b8b6d9f0012a12345",
    "face_data": []
  }
}
```

## Attendance

### Check-in By Face

`POST /attendance/check-in`

Request:

```json
{
  "face_embedding": [0.12, 0.34, 0.56],
  "face_image_path": "/uploads/checkin/emp001.jpg"
}
```

Response:

```json
{
  "success": true,
  "message": "Check-in successfully",
  "data": {
    "_id": "662b80008b6d9f0012a12347",
    "employee_id": {
      "_id": "662b7c8b8b6d9f0012a12345",
      "full_name": "Nguyen Van A"
    },
    "work_date": "2026-04-28T00:00:00.000Z",
    "check_in": "2026-04-28T02:00:00.000Z",
    "status": "CheckedIn"
  }
}
```

### Check-out

`POST /attendance/check-out`

Request:

```json
{
  "employee_id": "662b7c8b8b6d9f0012a12345",
  "face_image_path": "/uploads/checkout/emp001.jpg"
}
```

Response:

```json
{
  "success": true,
  "message": "Check-out successfully",
  "data": {
    "_id": "662b80008b6d9f0012a12347",
    "check_in": "2026-04-28T02:00:00.000Z",
    "check_out": "2026-04-28T10:00:00.000Z",
    "worked_hours": 8,
    "status": "CheckedOut"
  }
}
```

### Attendance History

`GET /attendance/history?employee_id=662b7c8b8b6d9f0012a12345&from=2026-04-01&to=2026-04-28`

Response:

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "total_pages": 0
    }
  }
}
```

Employee users can call this endpoint, but the backend forces `employee_id` to their own employee id.

### Get Attendance Record

`GET /attendance/:id`

Roles: `Admin`, `HR`

### Update Attendance Record

`PATCH /attendance/:id`

Roles: `Admin`, `HR`

Request:

```json
{
  "worked_hours": 8,
  "status": "CheckedOut"
}
```

### Delete Attendance Record

`DELETE /attendance/:id`

Roles: `Admin`, `HR`

Response: `204 No Content`

### Daily Report

`GET /attendance/reports/daily?date=2026-04-28`

Response:

```json
{
  "success": true,
  "data": {
    "period": {
      "date": "2026-04-28T00:00:00.000Z"
    },
    "total_records": 10,
    "checked_in": 2,
    "checked_out": 8,
    "total_worked_hours": 64,
    "records": []
  }
}
```

### Monthly Report

`GET /attendance/reports/monthly?year=2026&month=4`

Response:

```json
{
  "success": true,
  "data": {
    "period": {
      "year": 2026,
      "month": 4
    },
    "total_records": 200,
    "checked_in": 5,
    "checked_out": 195,
    "total_worked_hours": 1560,
    "records": []
  }
}
```

## Admin Resource CRUD

Use header: `Authorization: Bearer <admin-token>`

Roles: `Admin`, `HR`

The following modules share the same CRUD shape:

- `GET /<resource>?page=1&limit=20`
- `POST /<resource>`
- `GET /<resource>/:id`
- `PATCH /<resource>/:id`
- `DELETE /<resource>/:id`

List responses use:

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "total_pages": 0
    }
  }
}
```

Create and update responses use:

```json
{
  "success": true,
  "message": "Resource created successfully",
  "data": {}
}
```

Delete responses return `204 No Content`.

### Departments

Resource: `/departments`

Query:

- `search`
- `parent_id`

Create request:

```json
{
  "department_name": "Engineering",
  "parent_id": null
}
```

### Employee Positions

Resource: `/employee-positions`

Query:

- `search`
- `employee_id`
- `department_id`
- `is_current`

Create request:

```json
{
  "employee_id": "662b7c8b8b6d9f0012a12345",
  "department_id": "662b7c8b8b6d9f0012a12348",
  "position_name": "Backend Developer",
  "start_date": "2026-04-01",
  "end_date": null,
  "is_current": true
}
```

### Shifts

Resource: `/shifts`

Query:

- `search`
- `is_night_shift`

Create request:

```json
{
  "shift_name": "Office",
  "start_time": "08:00",
  "end_time": "17:00",
  "is_night_shift": false,
  "standard_hours": 8
}
```

### Shift Assignments

Resource: `/shift-assignments`

Query:

- `employee_id`
- `shift_id`
- `from`
- `to`

Create request:

```json
{
  "employee_id": "662b7c8b8b6d9f0012a12345",
  "shift_id": "662b7c8b8b6d9f0012a12349",
  "work_date": "2026-04-28"
}
```

### Leave Requests

Resource: `/leave-requests`

Query:

- `employee_id`
- `status`: `Pending`, `Approved`, `Rejected`, `Cancelled`
- `from`
- `to`

Create request:

```json
{
  "employee_id": "662b7c8b8b6d9f0012a12345",
  "type": "Annual",
  "start_date": "2026-05-01",
  "end_date": "2026-05-02",
  "total_days": 2,
  "status": "Pending"
}
```

Employee submit own leave request:

`POST /leave-requests/mine`

```json
{
  "type": "Annual",
  "start_date": "2026-05-01",
  "end_date": "2026-05-02",
  "total_days": 2,
  "reason": "Family event"
}
```

Approve leave request:

`POST /leave-requests/:id/approve`

Roles: `Admin`, `HR`

```json
{
  "review_note": "Approved"
}
```

Reject leave request:

`POST /leave-requests/:id/reject`

Roles: `Admin`, `HR`

```json
{
  "review_note": "Insufficient balance"
}
```

Cancel own pending leave request:

`POST /leave-requests/:id/cancel`

### Overtime

Resource: `/overtime`

Query:

- `employee_id`
- `status`: `Pending`, `Approved`, `Rejected`, `Cancelled`
- `from`
- `to`

Create request:

```json
{
  "employee_id": "662b7c8b8b6d9f0012a12345",
  "work_date": "2026-05-03",
  "hours": 2,
  "type": "Weekday",
  "status": "Pending"
}
```

Employee submit own overtime request:

`POST /overtime/mine`

```json
{
  "work_date": "2026-05-03",
  "hours": 2,
  "type": "Weekday",
  "reason": "Release support"
}
```

Approve overtime request:

`POST /overtime/:id/approve`

Roles: `Admin`, `HR`

```json
{
  "review_note": "Approved for payroll"
}
```

Reject overtime request:

`POST /overtime/:id/reject`

Roles: `Admin`, `HR`

```json
{
  "review_note": "Not eligible"
}
```

Cancel own pending overtime request:

`POST /overtime/:id/cancel`

### Contracts

Resource: `/contracts`

Query:

- `employee_id`
- `from`
- `to`

Create request:

```json
{
  "employee_id": "662b7c8b8b6d9f0012a12345",
  "type": "Full-time",
  "start_date": "2026-01-01",
  "end_date": null,
  "base_salary": 1000,
  "allowances": [
    {
      "name": "Lunch",
      "amount": 50
    }
  ]
}
```

### Payroll

Resource: `/payroll`

Query:

- `employee_id`
- `month`
- `year`

Create request:

```json
{
  "employee_id": "662b7c8b8b6d9f0012a12345",
  "month": 4,
  "year": 2026,
  "total_work_hours": 176,
  "total_overtime_hours": 8,
  "basic_salary": 1000,
  "overtime_salary": 100,
  "allowance": 50,
  "deduction": 0,
  "net_salary": 1150
}
```

Generate payroll from HRM data:

`POST /payroll/generate`

Roles: `Admin`, `HR`

The calculation uses:

- active contract in the selected month
- checked-out attendance records in the selected month
- approved overtime records in the selected month
- contract allowances

Request:

```json
{
  "employee_id": "662b7c8b8b6d9f0012a12345",
  "month": 4,
  "year": 2026,
  "standard_month_hours": 176,
  "overtime_rate": 1.5,
  "deduction": 10,
  "finalize": false
}
```

Response:

```json
{
  "success": true,
  "message": "Payroll generated successfully",
  "data": {
    "employee_id": "662b7c8b8b6d9f0012a12345",
    "month": 4,
    "year": 2026,
    "total_work_hours": 176,
    "total_overtime_hours": 8,
    "basic_salary": 1000,
    "overtime_salary": 68.18,
    "allowance": 50,
    "deduction": 10,
    "net_salary": 1108.18,
    "status": "Draft"
  }
}
```

### Assets

Resource: `/assets`

Query:

- `search`
- `status`: `Available`, `Assigned`, `Maintenance`, `Retired`
- `assigned_to`

Create request:

```json
{
  "asset_name": "Laptop Dell",
  "status": "Assigned",
  "assigned_to": "662b7c8b8b6d9f0012a12345",
  "assigned_date": "2026-04-28"
}
```

### Training

Resource: `/training`

Query:

- `search`

Create request:

```json
{
  "course_name": "Security Basics",
  "sessions": [
    {
      "start_date": "2026-06-01",
      "end_date": "2026-06-01",
      "employees": [
        {
          "employee_id": "662b7c8b8b6d9f0012a12345",
          "status": "Completed",
          "score": 90
        }
      ]
    }
  ]
}
```

### Face Logs

Resource: `/face-logs`

Query:

- `employee_id`
- `status`
- `from`
- `to`

Create request:

```json
{
  "employee_id": "662b7c8b8b6d9f0012a12345",
  "confidence": 0.95,
  "captured_image": "/captures/emp001.jpg",
  "detected_at": "2026-04-28T08:00:00.000Z",
  "status": "Matched"
}
```

## Errors

Validation error:

```json
{
  "success": false,
  "message": "Request validation failed",
  "details": [
    {
      "field": "employee_id",
      "message": "\"employee_id\" is required"
    }
  ]
}
```

Locked account:

```json
{
  "success": false,
  "message": "Account is temporarily locked. Try again later."
}
```

## Audit Logs

`GET /audit-logs?page=1&limit=20&action=AUTH_LOGIN&target_type=User`

Role: `Admin`

Query:

- `user_id`
- `action`
- `target_type`
- `from`
- `to`

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "662b7e0a8b6d9f0012a12350",
        "user_id": "662b7e0a8b6d9f0012a12346",
        "action": "AUTH_LOGIN",
        "target": {
          "type": "User",
          "id": "662b7e0a8b6d9f0012a12346"
        },
        "ip": "::1",
        "user_agent": "Mozilla/5.0",
        "timestamp": "2026-04-29T08:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

## Security Flow

1. User logs in with username and password.
2. Backend validates input, checks lock status, compares bcrypt password hash, and logs IP/user-agent.
3. Backend issues a short-lived access token and a refresh token, both stored as HttpOnly cookies.
4. Refresh token hash is stored in MongoDB. The raw token is never stored.
5. Protected routes verify access token, blacklist status, active user, role, and ownership when required.
6. Refresh rotates the refresh token. Reusing an old refresh token revokes the token family.
7. Logout revokes refresh token, blacklists access token, clears cookies, and writes an audit log.
