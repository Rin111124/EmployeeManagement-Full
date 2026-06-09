# Backend Architecture

This backend follows a layered Express structure:

```text
backend/
  app.js                    # Creates the Express app and registers loaders
  server.js                 # Runtime bootstrap: database + HTTP server
  config/                   # Environment, CORS, cookies, security config
  constants/                # Shared enum-like constants
  controllers/              # HTTP request/response orchestration
  loaders/                  # App startup wiring
  middlewares/              # Express middlewares
  models/                   # Mongoose schemas and indexes
  routes/                   # Route declarations and route-level authorization
  services/                 # Business logic and database operations
  utils/                    # Cross-cutting helpers
  validators/               # Joi schemas
  scripts/                  # Operational and security scripts
  tests/                    # Integration tests
```

## Layer Rules

- Routes define URL shape, middleware order, and route-level roles.
- Validators sanitize request shape before controllers run.
- Controllers handle HTTP concerns and call services.
- Services own business logic and database access.
- Models only define persistence schema, indexes, defaults, and transforms.
- Loaders own app startup wiring such as Express middleware, routes, and database connection.
- Config files normalize environment variables and keep runtime options out of controllers/services.

## Adding A Module

For a new HRM module:

1. Add the Mongoose schema in `models/`.
2. Export it from `models/index.js`.
3. Add Joi schemas in `validators/`.
4. Add service methods in `services/`.
5. Add controller methods in `controllers/`.
6. Add routes in `routes/`.
7. Mount the routes from `routes/index.js`.
8. Add examples to `docs/api-examples.md`.
9. Add integration tests in `tests/`.

Use shared helpers when possible:

- `controllers/crud.controller.js`
- `services/crud.service.js`
- `routes/crud.routes.js`
- `constants/roles.js`
- `constants/auditActions.js`

## Security Structure

- JWT/cookie settings live in `config/env.js` and `config/cookie.js`.
- CORS whitelist logic lives in `config/cors.js`.
- Helmet, body parsing, cookie parsing, and request sanitization are registered by `loaders/express.loader.js`.
- Authentication, RBAC, and ownership checks live in `middlewares/auth.middleware.js`.
- Audit logging is centralized in `services/audit.service.js`.

## Runtime Flow

1. `server.js` loads the app and connects MongoDB through `loaders/database.loader.js`.
2. `app.js` registers Express middleware and routes through loaders.
3. Requests pass through security middleware, validators, auth middleware, controllers, and services.
4. Errors are normalized by `middlewares/error.middleware.js`.
