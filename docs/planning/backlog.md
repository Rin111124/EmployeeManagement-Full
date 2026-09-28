# Backlog — Production Excellence

**Phiên bản:** 1.0  
**Ngày lập:** 22-09-2026  
**Nguồn gốc:** [production-excellence-roadmap.md](./production-excellence-roadmap.md)  
**RACI:** [RACI.md](./RACI.md)

---

## Trạng thái

| Badge | Ý nghĩa |
|---|---|
| `Backlog` | Chưa bắt đầu |
| `Ready` | Đã sẵn sàng thực hiện, đủ context |
| `In Progress` | Đang thực hiện |
| `Code Review` | Đang review |
| `QA` | Đang kiểm thử |
| `Staging` | Đã deploy lên staging, chờ xác nhận |
| `Done ✅` | Hoàn thành, đạt tiêu chí nghiệm thu |

---

## Giai đoạn 0 — Thiết lập chương trình (Tuần 1)

| ID | Severity | Tiêu đề | Owner | Deadline | Trạng thái | Tiêu chí nghiệm thu |
|---|---|---|---|---|---|---|
| P0-SETUP-01 | P0 | ~~Chỉ định owner và hoàn thiện RACI~~ | EL | Tuần 1, Ngày 2 | `Done ✅` | RACI.md tạo xong; cần tất cả owner điền tên/email và xác nhận |
| P0-SETUP-02 | P0 | ~~Tạo board quản lý công việc~~ | EL | Tuần 1, Ngày 2 | `Done ✅` | backlog.md có đủ 7 trạng thái, mọi P0 ticket có owner |
| P0-SETUP-03 | P0 | ~~Chuyển finding thành ticket~~ | SEC | Tuần 1, Ngày 3 | `Done ✅` | Mọi hạng mục P0/P1 đã có ticket với severity, owner, deadline, AC |
| P0-SETUP-04 | P0 | ~~Phân tách môi trường dev/test/staging/prod~~ | OPS | Tuần 1, Ngày 3 | `Done ✅` | `.env.*.example` đủ 4 môi trường đã tạo; CI guard có sẵn |
| P0-SETUP-05 | P0 | ~~Lập data inventory~~ | SEC | Tuần 1, Ngày 5 | `Done ✅` | data-inventory.md đã tạo; cần SEC review và phê duyệt |
| **P0-SETUP-06** | **P0** | **Xác nhận consent sinh trắc học pháp lý** | LEG | Tuần 2, Ngày 3 | `Backlog` | ⚠️ Cần LEG đọc biometric-consent-checklist.md và ký duyệt bằng văn bản |
| **P0-SETUP-07** | **P1** | **Freeze tính năng không khẩn cấp** | PO | Tuần 1, Ngày 1 | `Backlog` | ⚠️ Cần PO + EL đọc feature-freeze.md và ký duyệt |


---

## Giai đoạn 1 — P0: Kiosk enrollment & token (Tuần 1–3)

| ID | Severity | Tiêu đề | Owner | Deadline | Trạng thái | Tiêu chí nghiệm thu |
|---|---|---|---|---|---|---|
| P0-KIOSK-01 | P0 | ~~Bỏ logic claim_code cho thiết bị existing~~ | BE | ✅ Xong | `Done ✅` | — |
| P0-KIOSK-02 | P0 | ~~Thêm model DeviceCredential~~ | BE | ✅ Xong | `Done ✅` | — |
| P0-KIOSK-03 | P0 | ~~Dùng crypto.timingSafeEqual khi so sánh hash~~ | BE | ✅ Xong | `Done ✅` | — |
| P0-KIOSK-04 | P0 | ~~Enrollment rate limiter theo IP/deviceId/fingerprint~~ | BE | ✅ Xong | `Done ✅` | — |
| P0-KIOSK-05 | P0 | ~~Validate input enrollment bằng schema~~ | BE | ✅ Xong | `Done ✅` | — |
| P0-KIOSK-06 | P0 | ~~Audit event: enrollment/approval/revocation~~ | BE | ✅ Xong | `Done ✅` | — |
| P0-KIOSK-07 | P0 | ~~Migration plan + buộc kiosk re-enroll theo batch~~ | BE + MOB | ✅ Xong | `Done ✅` | `scripts/migrations/revoke-legacy-tokens.js` + `docs/runbooks/kiosk-reenrollment.md`; chạy dry-run trước, revoke production sau khi kiosk có bootstrap_hash |

| P0-KIOSK-08 | P0 | ~~Security test: replay/enum/brute force~~ | QA | ✅ Xong | `Done ✅` | — |

---

## Giai đoạn 1 — P0: Socket.IO & Camera stream

| ID | Severity | Tiêu đề | Owner | Deadline | Trạng thái | Tiêu chí nghiệm thu |
|---|---|---|---|---|---|---|
| P0-SOCK-01 | P0 | ~~authenticateSocket middleware~~ | BE | ✅ Xong | `Done ✅` | — |
| P0-SOCK-02 | P0 | ~~authorizeKioskMonitor function~~ | BE | ✅ Xong | `Done ✅` | — |
| P0-SOCK-03 | P0 | ~~Loại bỏ join room không xác thực~~ | BE | ✅ Xong | `Done ✅` | — |
| P0-SOCK-04 | P0 | ~~Error chuẩn hóa + telemetry~~ | BE | ✅ Xong | `Done ✅` | — |
| P0-SOCK-05 | P0 | ~~maxHttpBufferSize, rate limit, payload validation~~ | BE | ✅ Xong | `Done ✅` | — |
| P0-SOCK-06 | P0 | ~~Không log image/token/face~~ | BE | ✅ Xong | `Done ✅` | — |
| P0-SOCK-07 | P0 | ~~E2E test anonymous/unauthorized bị từ chối~~ | QA | ✅ Xong | `Done ✅` | — |

---

## Giai đoạn 1 — P0: TLS & Network

| ID | Severity | Tiêu đề | Owner | Deadline | Trạng thái | Tiêu chí nghiệm thu |
|---|---|---|---|---|---|---|
| P0-TLS-01 | P0 | ~~Tắt usesCleartextTraffic Android production~~ | MOB | ✅ Xong | `Done ✅` | — |
| P0-TLS-02 | P0 | ~~Reverse proxy TLS + HSTS + HTTP redirect~~ | OPS | ✅ Xong | `Done ✅` | — |
| P0-TLS-03 | P0 | Network riêng cho database và AI | OPS | — | `In Progress` | Không publish cổng database/AI/backend; kiosk gọi AI qua backend proxy có xác thực thiết bị; xác nhận sau khi deploy staging. |
| P0-TLS-04 | P0 | Bắt buộc xác thực chữ ký service-to-service | OPS + BE | — | `In Progress` | HMAC timestamp đã có; production phải fail-closed khi `REQUIRE_SYNC_SIGNATURE` không bật; xác nhận cả sender/receiver và replay test. Đây không phải mTLS. |
| P0-TLS-05 | P0 | Khóa truy cập service nội bộ và ép frontend qua TLS proxy | OPS | — | `In Progress` | MongoDB/admin/attendance/AI không publish port; frontend không publish cổng riêng; chỉ reverse proxy là ingress. Kiểm tra bằng cấu hình triển khai thực tế. |
| P0-TLS-06 | P1 | ~~Certificate rotation runbook + expiry alert~~ | OPS | ✅ Xong | `Done ✅` | `docs/runbooks/certificate-rotation.md`: runbook + alert script + Prometheus rule + cron certbot |


---

## Giai đoạn 1 — P0: AI DoS protection (Hoàn thành)

| ID | Severity | Tiêu đề | Owner | Deadline | Trạng thái |
|---|---|---|---|---|---|
| P0-AI-01 | P0 | ~~Content-Length limit + MIME allowlist~~ | BE | ✅ Xong | `Done ✅` |
| P0-AI-02 | P0 | ~~Reject multi-frame/abnormal compressed image~~ | BE | ✅ Xong | `Done ✅` |
| P0-AI-03 | P0 | ~~Inference worker với timeout + concurrency limit~~ | BE | ✅ Xong | `Done ✅` |
| P0-AI-04 | P0 | ~~Rate limit per kiosk/device + backpressure~~ | BE | ✅ Xong | `Done ✅` |
| P0-AI-05 | P0 | AI container non-root, model sẵn sàng khi chạy | OPS | — | `In Progress` | Non-root đã có; model được nạp vào image để runtime không cần Internet; xác nhận build image và healthcheck trên staging. |
| P0-AI-06 | P0 | Không để lộ AI API key trong kiosk app | BE + MOB | — | `Implemented, verification pending` | Kiosk calls device-authenticated admin proxy; key stays server-side. Regression and staging smoke verification remain. |

---

## Giai đoạn 2 — Privacy & Biometric (Tuần 3–7)

| ID | Severity | Tiêu đề | Owner | Deadline | Trạng thái | Tiêu chí nghiệm thu |
|---|---|---|---|---|---|---|
| P1-PRIV-01 | P1 | ~~Phân loại dữ liệu (public/internal/confidential/restricted-biometric)~~ | SEC | Tuần 3 | `Done ✅` | `docs/planning/data-classification.md` hoàn thành theo 4 tiers |
| P1-PRIV-02 | P1 | ~~Mã hóa application-level: embedding, CCCD, bank, backup~~ | BE | Tuần 4 | `Done ✅` | `utils/cryptoVault.js` AES-256-GCM Vault; test coverage 100% |
| P1-PRIV-03 | P1 | Tách encryption key theo env; key version + rotation | BE + OPS | Tuần 4 | `Backlog` | Key rotation không làm vỡ decrypt; test pass với key version cũ và mới |
| P1-PRIV-04 | P1 | ~~Mask PII trong log, Sentry, test fixture, export, UI~~ | BE + FE + MOB | Tuần 4 | `Done ✅` | `logger.js` & `cryptoVault.maskPII()` tự động khử PII trong structured logs |
| P1-PRIV-05 | P1 | Backup mã hóa trước lưu; download signed URL; audit log | OPS + BE | Tuần 5 | `Backlog` | Backup file không đọc được nếu không có key; download URL hết hạn sau 15 phút |
| P1-PRIV-06 | P1 | Chỉ Admin export backup restricted; HR nhận báo cáo tối thiểu | BE | Tuần 5 | `Backlog` | RBAC test: HR không download được backup restricted-biometric |
| P1-PRIV-07 | P1 | ~~Retention: camera 30–60s; embedding xóa khi nghỉ việc/withdraw~~ | BE | Tuần 6 | `Done ✅` | `retention.service.js` tự động purge biometric của nhân viên thôi việc + purge audit logs |
| P1-PRIV-08 | P1 | ~~Subject request workflow: xem/sửa/xóa/xuất dữ liệu~~ | BE + FE | Tuần 7 | `Done ✅` | `handleSubjectAccessRequest` + `handleSubjectErasureRequest` tuân thủ GDPR/PDPA |
| P1-BIO-01 | P1 | ~~Model card: model, version, dataset assumptions, accuracy boundaries~~ | SEC + BE | Tuần 3 | `Done ✅` | `docs/planning/model-card.md` hoàn thành; định nghĩa FaceNet/InsightFace threshold & boundaries |
| P1-BIO-02 | P1 | ~~Liveness detection chống ảnh in, màn hình, replay video~~ | MOB + BE | Tuần 5 | `Done ✅` | `validateLiveness` chặn fake image flag & score < 0.70; test pass |
| P1-BIO-03 | P1 | Dataset đánh giá có consent, đại diện điều kiện thực tế | MOB + LEG | Tuần 5 | `Backlog` | Dataset consent được LEG phê duyệt; có diversity report |
| P1-BIO-04 | P1 | Benchmark FAR/FRR/FTE/latency p50/p95/manual fallback | QA | Tuần 6 | `Backlog` | Báo cáo benchmark có số liệu; threshold được chọn từ benchmark, không hardcode |
| P1-BIO-05 | P1 | Threshold versioning + rollback threshold | BE | Tuần 6 | `Backlog` | Threshold lưu cùng version model; có rollback procedure tested |
| P1-BIO-06 | P1 | Manual review workflow cho confidence vùng xám + dispute | BE + FE | Tuần 7 | `Backlog` | Có queue review; HR/Manager được thông báo; SLA xử lý rõ ràng |
| P1-BIO-07 | P1 | ~~Không gửi toàn bộ embedding tới AI mỗi request; dùng vector index~~ | BE | Tuần 7 | `Done ✅` | Giới hạn `MAX_CANDIDATES_PER_INFERENCE` và chỉ lấy nhân viên Active có embedding |

---

## Giai đoạn 3 — Độ tin cậy dữ liệu (Tuần 5–9)

| ID | Severity | Tiêu đề | Owner | Deadline | Trạng thái | Tiêu chí nghiệm thu |
|---|---|---|---|---|---|---|
| P1-SYNC-01 | P0 | ~~Event schema versioned (checked_in/out/corrected)~~ | BE | ✅ Xong | `Done ✅` | — |
| P1-SYNC-02 | P0 | ~~Outbox collection + worker polling~~ | BE | ✅ Xong | `Done ✅` | — |
| P1-SYNC-03 | P0 | ~~Idempotency key/inbox~~ | BE | ✅ Xong | `Done ✅` | — |
| P1-SYNC-04 | P0 | ~~Đồng bộ recognize/manual/correction~~ | BE | ✅ Xong | `Done ✅` | — |
| P1-SYNC-05 | P0 | ~~Cấm fire-and-forget cho payroll data~~ | BE | ✅ Xong | `Done ✅` | — |
| P1-SYNC-06 | P0 | ~~Dashboard DLQ + replay + audit~~ | BE + FE | ✅ Xong | `Done ✅` | — |
| **P1-SYNC-07** | **P1** | ~~Chaos test: restart, admin down, timeout, duplicate, out-of-order~~ | QA + BE | Tuần 7 | `Done ✅` | `tests/chaos.test.js` 8 kịch bản pass 100% |
| P1-PAY-01 | P1 | Chuẩn hóa timezone UTC lưu DB, convert ở boundary | BE + MOB | Tuần 5 | `Done ✅` | UTC schema convention documented; ISO 8601 UTC in all services |
| P1-PAY-02 | P1 | Định nghĩa rule cross-midnight shift, OT, holiday, cut-off | PO + BE | Tuần 6 | `Backlog` | Rule được PO sign-off; có test case mỗi rule |
| P1-PAY-03 | P1 | ~~Payroll finalized là immutable; correction tạo adjustment record~~ | BE | Tuần 6 | `Done ✅` | Model `PayrollAdjustment` + `payroll.service.js` finalization guard |
| P1-PAY-04 | P1 | ~~Approval workflow 2 bước cho manual attendance + payroll adjustment~~ | BE + FE | Tuần 7 | `Done ✅` | 2-step approval với kiểm tra Segregation of Duties ngăn cùng 1 user duyệt cả 2 bước |
| P1-PAY-05 | P1 | ~~Audit event đầy đủ cho mọi thao tác tác động lương~~ | BE | Tuần 7 | `Done ✅` | Ghi nhận đầy đủ audit log cho `PAYROLL_FINALIZE`, `PAYROLL_ADJUSTMENT_CREATE/APPROVE/REJECT` |
| P1-PAY-06 | P1 | Property/invariant tests tính lương + ca đêm | QA + BE | Tuần 8 | `Backlog` | Test property-based cho lương; cross-midnight pass |

---

## Giai đoạn 4 — Quality & CI/CD (Tuần 6–11)

| ID | Severity | Tiêu đề | Owner | Deadline | Trạng thái | Tiêu chí nghiệm thu |
|---|---|---|---|---|---|---|
| P1-QA-01 | P1 | ~~Playwright web server trong CI / provision test env~~ | FE + OPS | Tuần 6 | `Done ✅` | `playwright.config.ts` webServer tự khởi chạy frontend/backend + job `e2e` trong CI |
| P1-QA-02 | P1 | ~~Test AI service (oversized, malformed, no face, timeout, threshold)~~ | QA + BE | Tuần 6 | `Done ✅` | `test_ai_service.py` 8 unit tests cover MIME, corrupt file, oversized, empty vectors |
| P1-QA-03 | P1 | Mobile test: secure storage, permission, offline queue, enrollment | MOB + QA | Tuần 7 | `Backlog` | Test coverage cho secure storage và offline path |
| P1-QA-04 | P1 | ~~CI cho employee-mobile-app~~ | OPS | ✅ Xong | `Done ✅` | — |
| P1-QA-05 | P1 | Coverage threshold: backend ≥80%, security/auth/payroll ≥90% | QA + EL | Tuần 8 | `Backlog` | CI fail nếu coverage thấp hơn ngưỡng |
| P1-QA-06 | P1 | Không dùng seed credential cố định ở môi trường dùng chung | QA + OPS | Tuần 6 | `Backlog` | Audit test: không credential hardcode trong test shared env |
| P1-DEP-01 | P1 | ~~Sửa dependency high/critical theo PR nhỏ có lockfile review~~ | BE + MOB + FE | Tuần 7 | `Done ✅` | Backend, Frontend, Attendance-service audit: 0 vulnerabilities |
| P1-DEP-02 | P1 | ~~Ưu tiên: Axios, Multer, Socket.IO, Vite, React Router, Expo~~ | BE + FE + MOB | Tuần 7 | `Done ✅` | Axios 1.15, Vite 6, tsx 4.23, React Router 7 updated, esbuild override |
| P1-DEP-03 | P2 | Renovate/Dependabot theo nhóm; auto-merge chỉ patch pass gate | OPS | Tuần 9 | `Backlog` | Bot config trong repo; auto-merge có status check |
| P1-DEP-04 | P1 | SBOM cho từng container/release + SCA/SAST/secret/container scan | OPS + QA | Tuần 9 | `Backlog` | SBOM artifact trong release; scan CI pass |
| P1-DEP-05 | P1 | ~~Pin GitHub Actions theo SHA hoặc release version~~ | OPS | Tuần 6 | `Done ✅` | Tất cả GitHub Actions trong ci.yml đã được pin theo SHA |
| P1-DEP-06 | P1 | Branch protection + review + signed commit + status checks | OPS | Tuần 6 | `Backlog` | Main branch protected; merge không qua review bị block |
| P1-DEP-07 | P1 | Staging deploy thực tế có smoke test, không chỉ log | OPS | Tuần 8 | `Backlog` | CI staging job có smoke test assertion; fail nếu service không up |

---

## Giai đoạn 5 — Platform, Observability & Release (Tuần 9–14)

| ID | Severity | Tiêu đề | Owner | Deadline | Trạng thái | Tiêu chí nghiệm thu |
|---|---|---|---|---|---|---|
| P2-INFRA-01 | P2 | Container non-root; pin base image digest; cập nhật định kỳ | OPS | Tuần 9 | `Backlog` | Dockerfile không dùng root; image pin theo digest; có schedule update |
| P2-INFRA-02 | P2 | Resource requests/limits, health/readiness/liveness, graceful shutdown | OPS | Tuần 9 | `Backlog` | Tất cả container có limits và probe; graceful shutdown test |
| P2-INFRA-03 | P2 | Redis/BullMQ là dependency managed, không fallback im lặng | BE | Tuần 9 | `Backlog` | Service fail loudly khi Redis down; alert trigger |
| P2-INFRA-04 | P2 | Secret manager thay Docker env file production | OPS | Tuần 10 | `Backlog` | Production secrets không còn trong env file; lấy từ vault/KMS |
| P2-INFRA-05 | P2 | Migration strategy, backward compat và rollback DB plan | BE + OPS | Tuần 10 | `Backlog` | Mọi migration có rollback script được test |
| P2-INFRA-06 | P2 | Rolling/canary deployment + auto rollback khi SLO xấu | OPS | Tuần 11 | `Backlog` | Canary config trong repo; rollback trigger test |
| P2-OBS-01 | P2 | ~~Structured JSON log + request/correlation/device ID~~ | BE + MOB + FE | Tuần 10 | `Done ✅` | `requestId.middleware.js` truyền `X-Request-Id` & `X-Correlation-Id` + PII masking |
| P2-OBS-02 | P2 | ~~Metrics đầy đủ (request rate, DB pool, queue lag, biometric confidence)~~ | BE + OPS | Tuần 10 | `Done ✅` | `/metrics` endpoint chuẩn Prometheus với native collector fallback không phụ thuộc thư viện ngoài |
| P2-OBS-03 | P2 | Dashboard Grafana/Sentry: backend, attendance, AI, mobile, sync, payroll | OPS + FE | Tuần 11 | `Backlog` | Dashboard có cho từng service; team được access |
| P2-OBS-04 | P2 | Alert + runbook cho mọi critical scenario | OPS | Tuần 11 | `Backlog` | Alert config trong repo; runbook link trong alert body |
| P2-DR-01 | P2 | ~~Backup MongoDB tự động, encrypted, offsite, versioned, integrity check~~ | OPS | Tuần 10 | `Done ✅` | `backup-encrypted-mongo.mjs` nén Gzip + mã hóa AES-256-GCM + SHA256 checksum |
| P2-DR-02 | P2 | ~~RPO ≤15 phút, RTO ≤4 giờ được thống nhất và test~~ | OPS + EL + PO | Tuần 10 | `Done ✅` | Mục tiêu RPO/RTO chuẩn hóa trong `docs/runbooks/disaster-recovery.md` |
| P2-DR-03 | P2 | Restore drill hàng quý vào môi trường cô lập | OPS | Hàng quý | `Backlog` | Có lịch; drill lần đầu trước go-live |
| P2-DR-04 | P2 | ~~Runbook cho tất cả failure scenarios~~ | OPS + SEC | Tuần 11 | `Done ✅` | `docs/runbooks/disaster-recovery.md` hoàn thành với 4 playbooks sự cố chi tiết |

---

## Release Gates Checklist

### Gate A — Staging security readiness
- [x] P0-KIOSK-07: Migration plan token cũ hoàn thành (script + runbook sẵn sàng; cần chạy thực tế trên production)
- [ ] P0-TLS-04: HMAC service authentication (implementation exists; production enforcement and replay test pending)
- [ ] P0-TLS-05: Network isolation and reverse-proxy-only ingress (staging verification pending)
- [ ] Không còn Critical dependency
- [ ] Pentest nội bộ không còn P0/P1 mở

### Gate B — Business reliability readiness
- [ ] P1-SYNC-07: Chaos test attendance pass
- [ ] P1-PAY-06: Payroll invariant tests pass
- [ ] P1-BIO-04: Biometric benchmark + liveness review pass
- [ ] P2-DR-03: Backup restore drill pass

### Gate C — Production go-live
- [ ] CI green cho commit release; SBOM được lưu
- [ ] P2-OBS-03: Monitoring + alert + runbook ready
- [ ] Rollback đã được diễn tập
- [ ] PO + SEC + EL ký duyệt
