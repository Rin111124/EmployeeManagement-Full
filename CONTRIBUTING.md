# Contributing Guide

Thank you for your interest in contributing to the **EmployeeManagement** project! This document outlines the guidelines and workflow for contributing code, tests, and documentation.

---

## 🛠️ Development Setup

The project is structured as a monorepo containing multiple decoupled microservices:

1. **Prerequisites**:
   - Node.js `>= 20.x` (LTS recommended, tested on Node 22)
   - Python `3.11+`
   - MongoDB `7.x` & Redis `7.x`
   - Docker & Docker Compose (optional for containerized environment)

2. **Installation**:
   ```bash
   npm install
   npm --prefix admin-system/backend install
   npm --prefix admin-system/frontend install
   npm --prefix attendance-system/attendance-service install
   npm --prefix attendance-system/mobile-app install
   npm --prefix attendance-system/employee-mobile-app install
   ```

3. **Running the Full Stack**:
   ```bash
   # Run all Node & React services concurrently
   npm run dev:all
   ```

---

## 🧪 Testing & Quality Standards

Before submitting any Pull Request, ensure that all linting and test suites pass locally:

```bash
# 1. Typecheck and lint all workspaces (Frontend, Mobile, Employee App)
npm run lint:all

# 2. Run backend test suite (139+ tests)
npm run test:admin-backend

# 3. Run attendance service test suite (37+ tests)
npm run test:attendance-service

# 4. Run environment separation security guard
bash scripts/check-env-separation.sh
```

---

## 🌿 Git Branching & Commit Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat(scope)`: A new feature for a specific service or component.
- `fix(scope)`: A bug fix.
- `docs(scope)`: Documentation changes.
- `refactor(scope)`: Code refactoring without changing functionality.
- `test(scope)`: Adding or fixing tests.
- `chore(scope)`: Maintenance, dependencies, or build tool adjustments.

### Example Commit Messages:
```bash
feat(payroll): support night shift overtime multipliers per labor code
fix(attendance): resolve race condition in dead letter queue replay
docs(runbook): add disaster recovery and restore verification guide
```

---

## 🔐 Security & Confidentiality

- **Never commit `.env` or credential files**. Always use `.env.example` templates.
- **Biometric vectors**: Any modifications to biometric processing must maintain AES-256-GCM encryption at rest and respect data retention policies.
