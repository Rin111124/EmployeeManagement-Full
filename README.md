# 🏢 EmployeeManagement & Biometric Edge Kiosk

<div align="center">

![CI Pipeline](https://img.shields.io/badge/CI%20Pipeline-Passing-success?style=for-the-badge&logo=githubactions&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22%20LTS-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Python%203.11-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Tests](https://img.shields.io/badge/Tests-176%2B%20Passing-brightgreen?style=for-the-badge&logo=jest&logoColor=white)
![Security](https://img.shields.io/badge/Security-AES--256--GCM-red?style=for-the-badge&logo=auth0&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)

<p align="center">
  <b>An Enterprise-Grade, Distributed Human Resource Management System (HRMS) & Biometric Edge Attendance Platform.</b><br/>
  Featuring Offline-First Edge Kiosks, InsightFace Vector Embeddings, Transactional Outbox DLQ Resilience, and AES-256-GCM Biometric Protection.
</p>

[Key Innovations](#-key-architectural-innovations) •
[Architecture](#-system-architecture) •
[Tech Stack](#-tech-stack-matrix) •
[Quickstart](#-quick-start) •
[Testing & QA](#-testing--quality-assurance) •
[Runbooks & Compliance](#-compliance--enterprise-runbooks)

---

</div>

## 🌟 Executive Summary

**EmployeeManagement** is not just another CRUD human resource tool; it is a full-scale, distributed production platform designed to bridge physical workplace terminals with enterprise-grade cloud management.

Built to address real-world network instability and strict privacy compliance, the platform provides **sub-second biometric facial check-ins** on Android edge kiosks with **guaranteed event delivery** via the Transactional Outbox Pattern, alongside a high-precision **Vietnamese Labor Code payroll calculation engine**.

---

## 🚀 Key Architectural Innovations

### 1. 🤖 AI Facial Recognition & Liveness Defense
- **512-Dimensional Deep Embeddings**: Powered by **FastAPI** and **InsightFace (MobileFaceNet)** for ultra-fast, robust facial recognition under varying lighting conditions.
- **Liveness Detection & Anti-Spoofing**: Built-in validation rejecting 2D printed photographs, mobile screen replays, and video spoofs.
- **Edge Latency**: Under **500ms** total latency from camera frame capture to attendance confirmation.

### 2. ⚡ Offline-First Resilience & Transactional Outbox
- **Network Partition Tolerance**: Kiosk terminals continue operating and recording check-ins even if the local Wi-Fi or central server is completely offline.
- **Transactional Outbox & DLQ**: Attendance records are committed to a local persistent outbox. A background relay worker syncs events to the central backend using exponential backoff with jitter.
- **Dead Letter Queue (DLQ)**: Permanently unresolvable sync failures are safely quarantined in a DLQ with manual inspection and one-click replay APIs.

### 3. 💰 Vietnamese Labor Code Payroll Engine
- **Automated Work-Hour Differentiation**: Automatically splits continuous shift hours into standard hours, night shift differential (`+30%` per Vietnam Labor Code), and tiered overtime (`150%` normal days, `200%` weekends, `300%` statutory holidays).
- **Contract Prorating**: Dynamically prorates base salaries and allowances based on active labor contracts and mid-month start dates.
- **Segregation of Duties (SoD)**: 2-step approval workflow for salary bonuses and deductions, preventing single-user financial tampering.

### 4. 🔐 Military-Grade Biometric Vault (AES-256-GCM)
- **Encryption at Rest**: Biometric vectors and sensitive Personally Identifiable Information (Citizen IDs, phone numbers) are encrypted using authenticated **AES-256-GCM** with dynamic initialization vectors (`iv`) and verification tags (`authTag`).
- **Zero-Trust Device Enrollment**: Kiosk devices authenticate using mutual **HMAC-SHA256 challenge-response proofs**. Instant device token revocation cuts off rogue or stolen kiosks within milliseconds.
- **Regulatory Privacy Compliance**: Fully compliant with **Decree 13/2023/ND-CP** and **GDPR**. Scheduled retention services automatically purge biometric templates upon employee termination.

### 5. 📡 Real-Time Telemetry & Async Worker Queues
- **Bidirectional WebSockets**: Admin console monitors real-time kiosk heartbeat, online status, battery levels, and live camera feed verification.
- **Redis BullMQ Workers**: Heavy batch operations (monthly payroll generation, bulk attendance recalculations) are offloaded to background job queues with Sentry tracing.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph EdgeDevice["Edge / On-Premise Kiosk"]
        Kiosk["📱 Kiosk Mobile Terminal\n(Expo / React Native)"]
        AI["🧠 AI Service\n(FastAPI / InsightFace)"]
        LocalCore["⚡ Attendance Core Service\n(Node.js / Express)"]
        LocalDB[("💾 Local SQLite / MongoDB\n(Outbox Table & Face Cache)")]
        
        Kiosk -->|"1. Frame Capture"| AI
        AI -->|"2. 512-D Vector"| Kiosk
        Kiosk -->|"3. Check-in Payload"| LocalCore
        LocalCore -->|"4. Atomic Write"| LocalDB
    end

    subgraph Gateway["Edge Gateway & Network"]
        LocalCore -->|"5. Outbox Sync Worker\n(HMAC Signature)"| Proxy["🛡️ Nginx Reverse Proxy\n(SSL Termination + Rate Limit)"]
    end

    subgraph CentralCloud["Enterprise Central Cloud"]
        Proxy -->|"6. Routed Request"| Backend["⚙️ Admin Backend\n(Express 5 / Node 22)"]
        Backend -->|"7. Encrypt PII & Biometrics"| Vault["🔐 CryptoVault\n(AES-256-GCM)"]
        Backend -->|"8. Async Jobs"| Redis[("⚡ Redis 7\n(BullMQ & Token Blacklist)")]
        Backend -->|"9. Persistent Data"| Mongo[("🍃 MongoDB 7\n(HRMS & Audit Logs)")]
        Redis -->|"10. Payroll Worker"| Worker["👷 Payroll Background Worker"]
        
        AdminUI["💻 Admin Web Portal\n(React 19 / Vite / Tailwind)"] -->|"REST API + WebSocket"| Proxy
    end

    classDef edge fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef cloud fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;
    classDef security fill:#ffebee,stroke:#c62828,stroke-width:2px;
    
    class Kiosk,AI,LocalCore,LocalDB edge;
    class Backend,Redis,Mongo,Worker,AdminUI cloud;
    class Vault,Proxy security;
```

---

## 💻 Tech Stack Matrix

| Domain | Technologies & Libraries |
| :--- | :--- |
| **Admin Frontend** | React 19, Vite, TypeScript, Tailwind CSS, TanStack Query, Lucide Icons, React Router v7, Playwright E2E |
| **Kiosk & Mobile App** | React Native, Expo SDK, Async Storage, React Native Reanimated, Socket.io Client |
| **Admin Backend** | Node.js 22, Express 5, Mongoose 9, Redis 7 (ioredis), BullMQ, Sentry, Helmet, Cookie Parser |
| **Attendance Service** | Node.js, Express, MongoDB Memory Server, Axios (HMAC Sync Client), Outbox Worker |
| **AI Facial Service** | Python 3.11, FastAPI, InsightFace, ONNX Runtime, NumPy, Pillow, OpenCV Headless |
| **DevOps & Infra** | Docker, Docker Compose, Nginx (Alpine), Bash Automation, GitHub Actions CI/CD |

---

## 📁 Monorepo Structure

```text
EmployeeManagement/
├── admin-system/
│   ├── backend/                  # Enterprise Express REST API + BullMQ workers
│   └── frontend/                 # React 19 + Vite admin management portal
├── attendance-system/
│   ├── ai-service/               # FastAPI face vector embedding service
│   ├── attendance-service/       # Node.js edge attendance core + Outbox DLQ
│   ├── mobile-app/               # Expo/React Native tablet kiosk terminal
│   └── employee-mobile-app/      # Expo employee self-service mobile app
├── deployment/
│   └── nginx/                    # Production reverse proxy configuration & SSL certs
├── docs/
│   ├── planning/                 # RACI, Biometric Consent, ISO 25010 Quality Matrix
│   └── runbooks/                 # Disaster Recovery, Cert Rotation, Device Verification
├── scripts/
│   ├── backup/                   # Encrypted MongoDB backup & restore utilities (AES)
│   └── check-env-separation.sh   # CI environment segregation guard
├── uml-diagrams/                 # Comprehensive PlantUML & SVG architecture diagrams
├── docker-compose.yml            # Multi-service container orchestration
├── package.json                  # Root monorepo workspace configuration
└── README.md
```

---

## ⚡ Quick Start

### Option A: One-Command Docker Compose (Recommended)

Run the full production stack inside isolated containers:

```bash
# 1. Clone repository
git clone https://github.com/Rin111124/EmployeeManagement-Full.git
cd EmployeeManagement-Full

# 2. Configure environment
cp .env.docker.example .env.docker

# 3. Build and launch all services
docker compose --env-file .env.docker up -d --build
```

Access the applications:
- **Admin Portal**: `http://localhost:3000` (or `https://your-domain` via Nginx)
- **Admin API**: `http://localhost:5000/api/v1`
- **Attendance Core**: `http://localhost:5001/api`
- **AI Service**: `http://localhost:8000/docs` (Swagger UI)

---

### Option B: Local Bare-Metal Development

1. **Install all dependencies across the monorepo:**
   ```bash
   npm install
   npm --prefix admin-system/backend install
   npm --prefix admin-system/frontend install
   npm --prefix attendance-system/attendance-service install
   npm --prefix attendance-system/mobile-app install
   npm --prefix attendance-system/employee-mobile-app install
   ```

2. **Initialize Environment Variables:**
   ```bash
   cp admin-system/backend/.env.example admin-system/backend/.env
   cp admin-system/frontend/.env.example admin-system/frontend/.env.local
   cp attendance-system/attendance-service/.env.example attendance-system/attendance-service/.env
   cp attendance-system/mobile-app/.env.example attendance-system/mobile-app/.env
   ```

3. **Start the AI Microservice (Python):**
   ```bash
   cd attendance-system/ai-service
   python -m venv .venv
   source .venv/bin/activate  # Or on Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   python main.py
   ```

4. **Launch all Node & Expo services concurrently:**
   ```bash
   # From root directory:
   npm run dev:all
   ```

---

## 🧪 Testing & Quality Assurance

The codebase enforces strict quality gates with over **176+ automated tests**:

```bash
# Run all unit & integration tests
npm run test:all

# Typecheck and lint all TypeScript & Expo workspaces
npm run lint:all

# Build frontend production bundle
npm run build:admin-frontend

# Validate environment separation and secret leak prevention
bash scripts/check-env-separation.sh
```

### Verified Test Suites Breakdown:
- **Admin Backend (`node --test`)**: 139 passing tests (Auth, Token family, CryptoVault, Payroll Engine, Kiosk Security, CSRF/XSS, Retention).
- **Attendance Core (`node --test`)**: 37 passing tests (Chaos recovery, Event Idempotency, Outbox DLQ retry, Face Matching).
- **Admin Frontend**: 0 TypeScript compilation errors (`tsc --noEmit`), Playwright E2E ready.
- **Mobile Kiosks**: 0 ESLint warnings (`expo lint`).

---

## 🛡️ Compliance & Enterprise Runbooks

This repository includes production operational runbooks and legal compliance documentation:

- [Disaster Recovery & Encrypted Backup Runbook](docs/runbooks/disaster-recovery.md)
- [Biometric Consent & Data Privacy Checklist](docs/planning/biometric-consent-checklist.md)
- [Device Verification & Kiosk Provisioning](docs/runbooks/device-verification.md)
- [Certificate Rotation & Key Management](docs/runbooks/certificate-rotation.md)
- [Data Classification & Inventory](docs/planning/data-classification.md)
- [ISO 25010 Software Quality Matrix](docs/planning/iso-25010-quality-matrix.md)

---

## 📄 License & Contribution

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

Contributions, issues, and feature requests are welcome! Feel free to check our [Contributing Guide](CONTRIBUTING.md) and [Security Policy](SECURITY.md).

<div align="center">
  <b>Built with ❤️ by Rin111124 and the EmployeeManagement Team.</b>
</div>
