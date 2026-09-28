# RACI — Ownership Matrix

**Phiên bản:** 1.0  
**Ngày lập:** 22-09-2026  
**Cập nhật lần cuối:** 22-09-2026  
**Tài liệu gốc:** [production-excellence-roadmap.md](./production-excellence-roadmap.md)

---

## Giải thích ký hiệu

| Ký hiệu | Ý nghĩa |
|---|---|
| **R** | Responsible — người thực hiện công việc |
| **A** | Accountable — người chịu trách nhiệm cuối cùng, ký duyệt |
| **C** | Consulted — được hỏi ý kiến trước khi quyết định |
| **I** | Informed — được thông báo khi có kết quả |

---

## Danh sách vai trò

| Vai trò | Tên | Email |
|---|---|---|
| Engineering Lead (EL) | [TBD] | [TBD] |
| Security / Privacy Owner (SEC) | [TBD] | [TBD] |
| Backend Engineer (BE) | [TBD] | [TBD] |
| Mobile Engineer (MOB) | [TBD] | [TBD] |
| Frontend Engineer (FE) | [TBD] | [TBD] |
| DevOps / SRE (OPS) | [TBD] | [TBD] |
| QA / Security Tester (QA) | [TBD] | [TBD] |
| Product Owner (PO) | [TBD] | [TBD] |
| Privacy / Legal (LEG) | [TBD] | [TBD] |

> **Hành động:** Điền tên và email thật vào bảng trên sau khi team được xác nhận.

---

## RACI theo hạng mục

### Giai đoạn 0 — Thiết lập chương trình

| Hạng mục | EL | SEC | BE | MOB | FE | OPS | QA | PO | LEG |
|---|---|---|---|---|---|---|---|---|---|
| Chỉ định owner và lập RACI | A/R | C | I | I | I | I | I | C | I |
| Tạo board quản lý (backlog) | A | I | R | R | R | R | R | C | I |
| Chuyển finding thành ticket | A | R | C | C | C | C | C | I | I |
| Phân tách môi trường (dev/test/staging/prod) | A | C | R | R | R | R | I | I | I |
| Lập data inventory | A | A/R | C | C | C | C | I | I | C |
| Xác nhận consent sinh trắc học | A | C | I | I | I | I | I | C | A/R |
| Freeze tính năng không khẩn cấp | A | I | I | I | I | I | I | A/R | I |

---

### Giai đoạn 1 — P0: Kiosk enrollment & token

| Hạng mục | EL | SEC | BE | MOB | FE | OPS | QA | PO | LEG |
|---|---|---|---|---|---|---|---|---|---|
| Migration/revocation plan token cũ | A | C | R | R | I | I | C | I | I |
| mTLS / service credential rotation | A | C | R | I | I | R | C | I | I |
| Network policy giữa services | A | C | I | I | I | R | C | I | I |
| Certificate rotation runbook + alert | A | C | I | I | I | R | C | I | I |

---

### Giai đoạn 1 — P0: Socket.IO (đã hoàn thành)

| Hạng mục | EL | SEC | BE | MOB | FE | OPS | QA | PO | LEG |
|---|---|---|---|---|---|---|---|---|---|
| Socket auth middleware | I | C | R | I | I | I | A | I | I |
| Camera stream authorization | I | A | R | I | C | I | R | I | I |

---

### Giai đoạn 2 — Privacy & Biometric

| Hạng mục | EL | SEC | BE | MOB | FE | OPS | QA | PO | LEG |
|---|---|---|---|---|---|---|---|---|---|
| Phân loại dữ liệu | A | A/R | C | I | I | I | I | I | C |
| Mã hóa application-level (embedding, CCCD, bank) | A | A | R | I | I | I | C | I | C |
| Key management / KMS integration | A | C | R | I | I | R | I | I | I |
| Mask PII trong log, Sentry, export | A | C | R | R | R | C | R | I | C |
| Encrypted backup + signed URL | A | C | R | I | I | R | C | I | I |
| Retention policy (camera, embedding, audit log) | A | C | R | I | I | I | I | I | A/R |
| Subject request workflow (xem/sửa/xóa) | A | C | R | I | R | I | C | C | A/R |
| Liveness detection | A | C | R | R | I | I | R | C | I |
| Biometric benchmark (FAR/FRR/FTE/latency) | A | C | R | C | I | I | A/R | C | I |
| Threshold versioning và rollback | A | C | R | I | I | I | R | C | I |
| Manual review workflow (confidence xám) | A | I | R | I | R | I | C | A | I |

---

### Giai đoạn 3 — Độ tin cậy dữ liệu

| Hạng mục | EL | SEC | BE | MOB | FE | OPS | QA | PO | LEG |
|---|---|---|---|---|---|---|---|---|---|
| Chaos test attendance sync | A | I | R | I | I | C | R | I | I |
| Chuẩn hóa timezone UTC / Asia/Ho_Chi_Minh | A | I | R | R | R | I | C | I | I |
| Payroll rule definition (OT, holiday, cut-off) | A | I | C | I | I | I | C | A/R | I |
| Immutable payroll + adjustment record | A | I | R | I | R | I | C | C | I |
| Approval workflow payroll adjustment | A | I | R | I | R | I | C | A | I |
| Property/invariant tests payroll | A | I | R | I | I | I | R | I | I |

---

### Giai đoạn 4 — Quality & CI/CD

| Hạng mục | EL | SEC | BE | MOB | FE | OPS | QA | PO | LEG |
|---|---|---|---|---|---|---|---|---|---|
| Playwright + CI web server | A | I | C | I | R | R | R | I | I |
| Test AI service (oversized, malformed, timeout) | A | C | R | I | I | I | R | I | I |
| Mobile test (secure storage, offline, enrollment) | A | C | I | R | I | I | R | I | I |
| Coverage threshold (≥80% / ≥90% security) | A | C | R | R | R | I | A/R | I | I |
| Dependency audit / Renovate | A | C | R | R | R | R | C | I | I |
| SBOM + SAST + container scan | A | C | I | I | I | R | R | I | I |
| Branch protection + signed commit | A | C | I | I | I | R | C | I | I |

---

### Giai đoạn 5 — Platform & Observability

| Hạng mục | EL | SEC | BE | MOB | FE | OPS | QA | PO | LEG |
|---|---|---|---|---|---|---|---|---|---|
| Container non-root, resource limits | A | C | C | C | C | R | C | I | I |
| Secret manager thay Docker env | A | C | R | I | I | R | I | I | I |
| Rolling/canary deployment | A | I | C | I | I | R | C | I | I |
| Structured JSON log + correlation ID | A | C | R | R | R | R | C | I | I |
| Metrics + Grafana dashboard | A | C | R | I | C | R | C | I | I |
| Alert + runbook (service down, DLQ, cert expiry) | A | C | R | I | I | R | R | I | I |
| Backup MongoDB encrypted + offsite | A | C | I | I | I | R | C | I | I |
| Restore drill hàng quý | A | C | I | I | I | R | R | I | I |
| DR runbook (Mongo, Redis, AI, token leak, biometric leak) | A | A | R | C | C | R | C | I | C |

---

## Release Gates

| Gate | Accountable | Người ký duyệt bắt buộc |
|---|---|---|
| Gate A — Staging security readiness | EL | EL + SEC |
| Gate B — Business reliability readiness | EL | EL + SEC + PO |
| Gate C — Production go-live | EL | PO + SEC + EL |

---

## Lịch review RACI

- **Review lần 1:** Sau khi hoàn thành Giai đoạn 0 (Tuần 1)
- **Review lần 2:** Trước Gate A
- **Review lần 3:** Trước Gate C (go-live)

> [!NOTE]
> RACI này phải được tất cả owner liên quan đọc và xác nhận hiểu trách nhiệm trong vòng 3 ngày làm việc kể từ ngày lập.
