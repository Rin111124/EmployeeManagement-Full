# Authentication Flow - Frontend & Backend Guide

## Overview

The authentication system uses JWT tokens (access + refresh) with HttpOnly cookies for secure browser-based authentication.

### Architecture

**Backend:**
- Issues access tokens (15 min) and refresh tokens (7 days)
- Sets HttpOnly, Secure cookies (in production)
- Also returns tokens in response body for flexibility
- Routes require authentication via middleware
- Implements refresh token rotation and reuse detection
- Logout blacklists tokens and clears cookies

**Frontend:**
- AuthContext manages user state and token lifecycle
- Stores tokens in localStorage as fallback
- Relies on browser cookies for actual HTTP requests
- ProtectedRoute prevents unauthorized access
- Auto-redirects authenticated users away from login/register

## Setup & Running

### Backend Prerequisites
1. MongoDB running locally (or set `MONGODB_URI` in `.env`)
2. Node.js 18+

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env and set:
# - MONGODB_URI (default: mongodb://127.0.0.1:27017/employee_management)
# - JWT_SECRET, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET (strong random strings)
# - ADMIN_PASSWORD (strong password for initial admin)
# - CORS_ORIGIN (add http://localhost:5173 for frontend)

npm run seed:admin      # Creates initial admin account
npm start               # Starts on http://localhost:5000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev             # Starts on http://localhost:5173
```

## Test Workflow

### 1. Login as Admin
1. Navigate to http://localhost:5173/login
2. Username: `admin` (default from seed script)
3. Password: Value from `ADMIN_PASSWORD` in backend `.env`
4. Click "Engage Workspace"
5. Should redirect to `/dashboard` and show authenticated state

**What happens:**
- Frontend calls `POST /api/v1/auth/login`
- Backend validates credentials
- Backend returns user info + tokens + sets cookies
- AuthContext stores user and tokens
- ProtectedRoute allows navigation

### 2. Check Authentication Persists
1. Refresh the page (F5)
2. Should stay on dashboard (not redirect to login)
3. AuthContext queries `/auth/me` on mount to validate token

### 3. Test Protected Routes
1. Copy dashboard URL
2. Logout (click Logout button or clear localStorage)
3. Paste URL and press Enter
4. Should redirect to /login automatically

### 4. Test Logout
1. Click "Logout" button in top-right
2. Should clear tokens and redirect to login
3. Backend: Access token blacklisted, refresh token revoked

### 5. Test Register (Admin Only)
1. Login as admin (see step 1)
2. Navigate to http://localhost:5173/register
3. Fill form:
   - Username: `testuser`
   - Employee: Select from dropdown
   - Password: `Test@12345` (min 8 chars)
   - Confirm: `Test@12345`
4. Click "Create User Account"
5. Should redirect to `/employees` page

**Note:** Register endpoint requires admin authentication. Non-admins are redirected to login.

## Token Refresh

The frontend doesn't have built-in refresh token rotation yet. The `refreshAccessToken` method is available in AuthContext for future implementation.

To test refresh:
1. Call `await authContext.refreshAccessToken()`
2. Backend issues new token pair and rotates refresh token
3. Detects reuse and revokes entire token family on misuse

## API Integration Notes

### Cookie-Based Requests
All API calls via `lib/api.ts` use `credentials: 'include'`:
```typescript
const init: RequestInit = {
    credentials: 'include',  // Always send cookies
    headers: { ...defaultHeaders },
    ...opts,
};
```

### Fallback for SPA Clients
The response body includes tokens for SPA clients that can't rely solely on cookies:
```typescript
{
    "success": true,
    "message": "Login successfully",
    "data": {
        "user": { ... },
        "access_token": "eyJhbGc...",
        "refresh_token": "eyJhbGc...",
        "refresh_expires_at": "2026-05-07T14:30:00Z"
    }
}
```

### Bearer Token Alternative
For mobile/API clients:
```bash
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"
```

## File Structure

**Frontend Auth Files:**
- `src/contexts/AuthContext.tsx` - Auth state & methods
- `src/lib/api.ts` - API client with credentials
- `src/lib/auth.ts` - Token persistence (legacy, kept for compatibility)
- `src/components/ProtectedRoute.tsx` - Route guard
- `src/pages/Login.tsx` - Login form
- `src/pages/Register.tsx` - Register form (admin-only)
- `src/components/Topbar.tsx` - Logout button

**Backend Auth Files:**
- `controllers/auth.controller.js` - HTTP layer (now sets cookies)
- `services/auth.service.js` - Business logic
- `middlewares/auth.middleware.js` - Token validation & RBAC
- `config/cookie.js` - HttpOnly cookie options
- `models/user.js` - User schema with login attempts
- `models/refreshToken.js` - Token family tracking

## Security Features Implemented

✅ Short-lived access tokens (15 min)
✅ Long-lived refresh tokens (7 days)
✅ Refresh token rotation
✅ Token reuse detection (revokes entire family)
✅ Account lockout after 5 failed logins (15 min)
✅ Login history tracking
✅ Logout token blacklisting
✅ HttpOnly cookie option for browser security
✅ CORS whitelist validation
✅ Request body sanitization
✅ Rate limiting on login endpoint

## Troubleshooting

### Login fails with "Invalid username or password"
- Check `ADMIN_PASSWORD` matches what you used in seed
- Verify backend is running on port 5000
- Check MongoDB is connected

### Frontend shows "Checking authentication..." forever
- Check browser console for API errors
- Verify backend CORS_ORIGIN includes `http://localhost:5173`
- Check network tab to see if `/auth/me` request succeeds

### Logout doesn't work
- Check localStorage.clear() runs
- Verify cookies are cleared in DevTools
- Should redirect to /login automatically

### Register page redirects to login
- Only admins can register new users
- Must login as admin first
- Check `ADMIN_PASSWORD` in backend `.env`

## Next Steps

1. **Auto Token Refresh:** Implement 401 interceptor to refresh token before expiry
2. **Employee Integration:** Load real employees for register form dropdown
3. **Password Reset:** Add forgot-password flow with email verification
4. **2FA/MFA:** Implement additional security layers
5. **Session Management:** Build session list and logout all other sessions
6. **Role-Based UI:** Conditionally show register/admin features based on user roles
