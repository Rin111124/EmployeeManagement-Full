# Employee Management Frontend

React 19 + Vite frontend for the employee management backend.

## Requirements

- Node.js
- The backend API running locally or at the URL configured in `VITE_API_BASE`

## Environment

Copy [/.env.example](.env.example) to [/.env.local](.env.local) and adjust the API URL if needed.

```bash
VITE_API_BASE=http://localhost:5000/api/v1
VITE_APP_NAME=EmployeeManagement
```

## Run Locally

```bash
npm install
npm run dev
```

## Useful Scripts

```bash
npm run build
npm run lint
```

## Notes

- `src/App.tsx` is the active router for the app.
- `src/lib/api.ts` is the canonical API client used by the feature hooks and services.
