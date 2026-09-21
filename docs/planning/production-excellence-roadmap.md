# Lộ trình nâng cấp EmployeeManagement lên chuẩn production

**Phiên bản:** 1.0  
**Ngày lập:** 21-09-2026  
**Phạm vi:** `admin-system`, `attendance-system`, hạ tầng Docker, CI/CD và vận hành.  
**Trạng thái hiện tại:** Không được phép production với dữ liệu nhân sự thật cho đến khi hoàn thành toàn bộ hạng mục P0.

## 1. Mục tiêu và nguyên tắc

Mục tiêu của roadmap là xây dựng một hệ thống quản lý nhân sự và chấm công có thể vận hành an toàn với dữ liệu thật: bảo mật kiosk/camera, bảo vệ dữ liệu sinh trắc học, không mất dữ liệu chấm công, phát hành lặp lại được và có khả năng giám sát/khôi phục.

Các nguyên tắc bắt buộc:

- **Security by default:** mọi API, socket và service nội bộ đều phải có xác thực, ủy quyền và giới hạn tốc độ phù hợp.
- **Least privilege:** thiết bị, người dùng và service chỉ có đúng quyền cần thiết.
- **Privacy by design:** embedding khuôn mặt, CCCD, ngân hàng và lương là dữ liệu nhạy cảm; chỉ thu thập/lưu trữ khi có mục đích và thời hạn rõ ràng.
- **Reliable by design:** một lần chấm công phải được ghi nhận tối đa một lần, có thể retry an toàn, không mất khi mạng lỗi.
- **Automate the gate:** không phát hành nếu test, security scan, migration, build hoặc rollback chưa được kiểm chứng.
- **Không sửa nóng production:** mọi thay đổi đều đi qua source control, review, CI và staging.

## 2. Baseline và tiêu chí thành công

### Baseline đã xác minh

- Backend admin: 115 tests pass.
- Attendance service: 24 tests pass.
- Frontend: typecheck và production build pass.
- Kiosk app: lint pass.
- Dependency scan hiện còn nhiều cảnh báo high/critical ở backend, frontend và employee mobile app.
- Có hai rủi ro P0: chiếm quyền kiosk qua luồng claim token và xem camera stream Socket.IO không xác thực.

### Definition of Done cấp production

Một release chỉ được gọi là production-ready khi đồng thời đạt tất cả điều kiện sau:

- Không còn finding Critical/High đã biết mà chưa có biện pháp giảm thiểu được Security Owner phê duyệt.
- 100% traffic bên ngoài dùng HTTPS; MongoDB, Redis và AI service không public Internet.
- Kiosk claim, socket join và camera stream có authentication + authorization test tự động.
- Có benchmark liveness/face matching bằng dữ liệu đã được chấp thuận và có ngưỡng FAR/FRR rõ ràng.
- Attendance sync có outbox, retry, idempotency và dashboard theo dõi bản ghi lỗi.
- CI chạy unit, integration, contract, E2E, dependency scan, SAST, container scan và build cho tất cả ứng dụng.
- Staging đã chạy smoke/load test; backup restore drill và rollback deployment đã được diễn tập.

## 3. Thứ tự ưu tiên

| Mức | Ý nghĩa | Điều kiện triển khai |
|---|---|---|
| P0 | Chặn production hoặc có thể dẫn đến lộ dữ liệu/chiếm quyền | Phải hoàn thành trước khi có dữ liệu thật |
| P1 | Ảnh hưởng cao đến tính đúng đắn, độ tin cậy, vận hành | Hoàn thành trước public rollout |
| P2 | Tăng khả năng mở rộng, quản trị và trải nghiệm | Thực hiện sau khi P0/P1 ổn định |
| P3 | Nâng cấp dài hạn | Đưa vào backlog có đánh giá ROI |

## 4. Giai đoạn 0 — Thiết lập chương trình (Tuần 1)

### Mục tiêu

Thiết lập ownership, backlog, môi trường và cách ra quyết định trước khi thay đổi kiến trúc.

### Công việc

- [ ] Chỉ định các owner: Engineering Lead, Security/Privacy Owner, Backend, Mobile, Frontend, DevOps/QA và Product Owner.
- [ ] Tạo board quản lý công việc với các trạng thái: Backlog, Ready, In progress, Code review, QA, Staging, Done.
- [ ] Chuyển mọi finding trong tài liệu này thành ticket có severity, owner, deadline và tiêu chí nghiệm thu.
- [ ] Phân tách môi trường `development`, `test`, `staging`, `production`; cấm dùng production secret/database ở development và CI.
- [ ] Lập data inventory: nguồn, nơi lưu, nơi truyền, quyền truy cập và retention cho PII, payroll, biometric, camera frame và audit log.
- [ ] Xác nhận cơ sở pháp lý/consent cho dữ liệu sinh trắc học với bộ phận pháp chế hoặc đơn vị có thẩm quyền.
- [ ] Freeze các thay đổi tính năng không khẩn cấp cho đến khi P0 hoàn thành.

### Nghiệm thu

- Có RACI/owner cho từng hạng mục P0/P1.
- Có sơ đồ data flow được review.
- Secrets staging/production không còn nằm trong `.env` cá nhân hay source control.

## 5. Giai đoạn 1 — Đóng lỗ hổng P0 (Tuần 1–3)

### 5.1 Thiết kế lại enrollment và token kiosk

**Vấn đề cần giải quyết:** device token hiện có thể bị cấp lại dựa trên thông tin định danh dễ đoán của kiosk.

#### Thiết kế đích

- Mỗi kiosk khi provisioning nhận một `device_id` bất biến và một bootstrap credential bí mật, sinh ngẫu nhiên tối thiểu 256 bit.
- Bootstrap credential chỉ được lưu trong Android Keystore/Expo SecureStore; không in log, không xuất hiện trong QR/public environment.
- Enrollment tạo challenge ngắn hạn; server lưu hash challenge, kiosk ký/chứng minh sở hữu bootstrap credential để đổi lấy token.
- Challenge có TTL 5 phút, one-time use, giới hạn 3 lần thử, gắn với device ID và fingerprint đã đăng ký.
- Device access token có `jti`, expiry ngắn, audience riêng và scope tối thiểu (`attendance:write`, `biometric:request`); refresh/rotation theo chính sách.
- Admin có thể revoke token, disable device và xem audit trail. Revoke phải có hiệu lực ngay ở cả admin và attendance service.

#### Checklist triển khai

- [ ] Bỏ logic phát hành lại `claim_code` cho thiết bị existing/approved.
- [ ] Thêm bảng/model `DeviceCredential` hoặc mở rộng Device với credential hash, version, expiry, revokedAt, lastUsedAt.
- [ ] Dùng `crypto.timingSafeEqual` khi so sánh secret hash phù hợp.
- [ ] Thêm device enrollment rate limiter theo IP, device ID và fingerprint.
- [ ] Validate input bằng schema: device name, terminal identifier, platform/version, IP metadata.
- [ ] Thêm audit event: enrollment requested, approved, credential issued, token rotated, token revoked, claim rejected.
- [ ] Viết migration/revocation plan cho token hiện có; buộc kiosk re-enroll theo batch.
- [ ] Viết test tấn công: không thể nhận token chỉ với device name/id; replay challenge thất bại; token revoked bị từ chối.

#### Nghiệm thu

- Không endpoint công khai nào trả credential dùng để claim lại thiết bị đã approved.
- Token không thể replay hoặc dùng sau revoke/expiry.
- Security test cover các trường hợp enumeration, brute force, race condition và replay.

### 5.2 Xác thực Socket.IO và bảo vệ camera stream

#### Thiết kế đích

- Socket.IO handshake nhận access token; server verify JWT và loại token sai audience/type.
- Server giữ `socket.data.user`; chỉ role Admin/HR/Manager có quyền subscribe stream.
- `kiosk:join` kiểm tra `deviceId` và role trước khi join room.
- Kiosk stream dùng device token scope riêng; web monitor dùng user token, hai loại credential không thay thế cho nhau.
- Frame được giữ trong memory có TTL (ví dụ 30 giây), giới hạn số device/frame và được xóa khi device disconnect/revoke.
- Không gửi frame cũ tự động nếu subscriber chưa qua authorize.

#### Checklist triển khai

- [ ] Thêm Socket.IO middleware `io.use(authenticateSocket)`.
- [ ] Thêm hàm `authorizeKioskMonitor(user, deviceId)`.
- [ ] Loại bỏ join room không xác thực.
- [ ] Thêm event error chuẩn hóa và telemetry cho access denied.
- [ ] Thiết lập `maxHttpBufferSize`, per-socket rate limit, max connections và payload validation.
- [ ] Không log image payload, device token hay khuôn mặt.
- [ ] E2E test: anonymous/user không quyền bị từ chối; Admin được xem đúng kiosk; token kiosk không xem được stream.

### 5.3 TLS và network segmentation

- [ ] Tắt `usesCleartextTraffic` ở hai app Android production.
- [ ] Đặt reverse proxy có TLS trước frontend/backend; bật HSTS, security headers và redirect HTTP sang HTTPS.
- [ ] Chỉ reverse proxy publish port; MongoDB, Redis, attendance service và AI service dùng private Docker network.
- [ ] Thiết lập mTLS hoặc service credential rotation cho admin ↔ attendance ↔ AI.
- [ ] Dùng network policy/security group để chỉ admin service gọi attendance sync, chỉ attendance service gọi AI matching.
- [ ] Thêm certificate rotation runbook và test certificate expiry alert.

### 5.4 Giới hạn AI upload và chống DoS

- [ ] Giới hạn Content-Length trước khi đọc toàn bộ request; giới hạn file, MIME, extension, pixel và decode time.
- [ ] Từ chối image nhiều frame/ảnh nén bất thường; dùng allowlist JPEG/PNG.
- [ ] Chạy inference trong worker có timeout và concurrency limit.
- [ ] Thêm rate limit per kiosk/device, queue/backpressure và response code chuẩn.
- [ ] Chạy AI container bằng non-root user, readonly filesystem trừ thư mục model/cache cần thiết.

## 6. Giai đoạn 2 — Privacy và độ chính xác biometric (Tuần 3–7)

### 6.1 Bảo vệ dữ liệu nhạy cảm

- [ ] Phân loại dữ liệu: public, internal, confidential, restricted-biometric.
- [ ] Mã hóa application-level cho face embedding, CCCD, bank account và bản backup; key lấy từ KMS/secret manager, không hard-code.
- [ ] Tách encryption key theo environment; hỗ trợ key version và rotation.
- [ ] Mask PII trong log, Sentry, test fixture, export và UI không cần thiết.
- [ ] Backup phải mã hóa trước khi lưu; download dùng signed URL/short expiry hoặc encrypted archive có audit log.
- [ ] Chỉ Admin được export backup restricted; HR nhận báo cáo tối thiểu theo quyền nghiệp vụ.
- [ ] Thêm retention: camera snapshot 30–60 giây hoặc không lưu; embeddings xóa khi rút consent/nghỉ việc theo policy; audit log retention rõ ràng.
- [ ] Cung cấp quy trình subject request: xem, sửa, xóa và xuất dữ liệu khi có yêu cầu hợp lệ.

### 6.2 Nâng cấp biometric

- [ ] Xác định model card: model, version, dataset assumptions, accuracy boundaries, hardware/camera hỗ trợ.
- [ ] Implement liveness detection; chặn ảnh in, màn hình điện thoại, replay video theo rủi ro thực tế.
- [ ] Thu thập dataset đánh giá đã có consent, đại diện điều kiện ánh sáng/góc mặt/camera thực tế.
- [ ] Đo FAR, FRR, FTE, latency p50/p95 và tỷ lệ fallback thủ công.
- [ ] Chọn threshold bằng benchmark; không coi giá trị code hiện tại là chuẩn production.
- [ ] Có manual-review workflow cho case confidence vùng xám và dispute quy trình chấm công.
- [ ] Không gửi toàn bộ embeddings của nhân viên tới AI service trên từng request; dùng vector index có access control hoặc matching server-side trong trust boundary.

### Nghiệm thu

- Có privacy review và retention policy được phê duyệt.
- Có báo cáo benchmark biometric, threshold versioned và rollback threshold.
- Không có PII/embedding/token trong structured logs hoặc error report.

## 7. Giai đoạn 3 — Độ tin cậy dữ liệu và nghiệp vụ (Tuần 5–9)

### 7.1 Reliable attendance synchronization

#### Thiết kế đích

Khi attendance service ghi check-in/out, nó ghi đồng thời domain record và outbox event trong transaction. Worker gửi event sang admin service với `event_id` idempotent. Admin service lưu inbox/idempotency record trước khi áp dụng thay đổi. Event thất bại được retry với exponential backoff; quá số lần sẽ vào DLQ và tạo alert.

#### Checklist

- [ ] Thiết kế event schema versioned: `attendance.checked_in`, `attendance.checked_out`, `attendance.corrected`.
- [ ] Thêm outbox collection/index, worker polling hoặc queue broker.
- [ ] Add idempotency key/inbox ở admin endpoint.
- [ ] Đồng bộ cả recognize, manual check-in, manual check-out, correction.
- [ ] Cấm fire-and-forget không có persistence cho dữ liệu payroll.
- [ ] Dashboard cho pending, retrying, failed, DLQ và thao tác replay có audit.
- [ ] Test chaos: attendance service restart, admin down, timeout, duplicate event, out-of-order event.

### 7.2 Chuẩn hóa domain time/payroll

- [ ] Chuẩn hóa timezone business là `Asia/Ho_Chi_Minh`; chỉ lưu UTC trong database và convert ở boundary.
- [ ] Định nghĩa rule cho cross-midnight shift, nghỉ, OT, holiday, manual correction và cut-off payroll.
- [ ] Payroll finalized là immutable; correction tạo adjustment record mới, không sửa lịch sử.
- [ ] Có approval workflow hai bước cho manual attendance và payroll adjustment vượt ngưỡng.
- [ ] Mọi thao tác tác động lương phải có actor, reason, before/after value và audit event.
- [ ] Viết property/invariant tests cho tính lương và dữ liệu ca đêm.

### Nghiệm thu

- Mất mạng hoặc restart không làm mất/nhân đôi attendance.
- Có thể truy vết một attendance từ kiosk đến payroll bằng correlation/event ID.
- Kết quả payroll được tái lập từ input đã versioned.

## 8. Giai đoạn 4 — Quality engineering và supply chain (Tuần 6–11)

### 8.1 Test strategy

| Tầng test | Mục tiêu | Bắt buộc |
|---|---|---|
| Unit | Domain, validator, authorization, retry, payroll | PR bắt buộc |
| Integration | Mongo/Redis/queue/API giữa service | PR bắt buộc |
| Contract | Admin-attendance-AI schemas/version | PR bắt buộc |
| E2E | Login, RBAC, kiosk approval, biometric request, payroll | Staging/PR chính |
| Security regression | Device takeover, socket access, CSRF, IDOR, upload abuse | PR bắt buộc |
| Load/soak | Kiosk concurrency, sync queue, dashboard | Trước release |
| Backup restore | Backup encrypted và recovery | Theo lịch |

- [ ] Bật Playwright web server trong CI hoặc provision test environment rõ ràng.
- [ ] Thêm test AI: API key, oversized/malformed image, multiple face, no face, timeout, threshold.
- [ ] Thêm mobile test cho secure storage, permission, offline queue và device enrollment.
- [ ] Thêm lint/typecheck/test cho `employee-mobile-app` vào root scripts và CI.
- [ ] Đặt coverage threshold: backend tổng >=80%, security/auth/payroll >=90%; tăng dần với frontend/mobile thay vì dùng số liệu giả tạo.
- [ ] Không chấp nhận test phụ thuộc seed credential cố định ở môi trường dùng chung.

### 8.2 Dependency và CI/CD

- [ ] Sửa dependency theo PR nhỏ có lockfile review; không chạy `npm audit fix --force` trực tiếp.
- [ ] Ưu tiên Axios, Multer, Socket.IO/ws, Vite, React Router, Expo và dependency tree critical.
- [ ] Dùng Renovate/Dependabot theo nhóm dependency; auto-merge chỉ cho patch đã pass đầy đủ gate.
- [ ] Tạo SBOM cho từng container/release, quét SCA/SAST/secret/container image.
- [ ] Pin GitHub Actions theo commit SHA hoặc release version tin cậy; không dùng `@master`.
- [ ] Require branch protection, review, signed commit nếu phù hợp, status checks và environment approval.
- [ ] Staging deploy phải thực hiện deploy thật có smoke test, không chỉ in log.

## 9. Giai đoạn 5 — Platform, observability và release (Tuần 9–14)

### 9.1 Hạ tầng

- [ ] Chạy container non-root; pin base image digest; cập nhật image định kỳ.
- [ ] Thiết lập resource requests/limits, health/readiness/liveness và graceful shutdown.
- [ ] Redis/BullMQ là dependency được quản lý, không fallback im lặng cho nghiệp vụ critical.
- [ ] Dùng secret manager thay vì Docker env file cho production.
- [ ] Có migration strategy, backward compatibility và rollback database plan.
- [ ] Áp dụng rolling/canary deployment và rollback tự động khi health/SLO xấu.

### 9.2 Observability

- [ ] Structured JSON log có request ID, correlation ID, device ID đã mask; không log secret/embedding/image.
- [ ] Metrics: request rate/error/latency, DB pool, queue lag, outbox/DLQ count, biometric confidence distribution, device enrollment failures.
- [ ] Truy cập `/metrics` chỉ từ monitoring network hoặc dùng auth.
- [ ] Dashboard Grafana/Sentry: backend, attendance, AI, mobile crash, sync và payroll jobs.
- [ ] Alert có owner và runbook: service down, queue lag, high error rate, credential abuse, backup failure, certificate expiry.

### 9.3 Backup và disaster recovery

- [ ] Backup MongoDB tự động, encrypted, offsite, versioned và kiểm tra integrity.
- [ ] RPO/RTO được thống nhất: đề xuất RPO <= 15 phút, RTO <= 4 giờ cho giai đoạn đầu.
- [ ] Restore drill ít nhất mỗi quý vào môi trường cô lập.
- [ ] Runbook cho mất Mongo, Redis, AI, admin service, token kiosk bị lộ và dữ liệu biometric bị lộ.

## 10. Release gates

### Gate A — Staging security readiness

- P0 device claim và Socket.IO đã hoàn thành/tested.
- TLS, private network, secret separation đã kiểm chứng.
- Không còn dependency Critical; High có owner, mitigation và deadline được phê duyệt.
- Penetration test nội bộ không còn issue P0/P1 mở.

### Gate B — Business reliability readiness

- Outbox/idempotency/DLQ hoạt động, có chaos test pass.
- Payroll/attendance invariant tests pass.
- Biometric benchmark và liveness review pass.
- Backup restore drill pass.

### Gate C — Production go-live

- CI green cho commit release; image/SBOM được lưu.
- Có monitoring, alert, on-call owner và runbook.
- Có rollback đã diễn tập.
- Product, Security/Privacy và Engineering Owner ký duyệt.

## 11. Chỉ số theo dõi

| Nhóm | Chỉ số mục tiêu ban đầu |
|---|---|
| Availability | Admin/attendance API >= 99.9% theo tháng |
| Latency | API p95 < 500 ms, trừ inference/large export |
| Sync | >= 99.99% event hoàn thành; DLQ được xử lý < 4 giờ |
| Security | 0 Critical mở; High có SLA <= 14 ngày |
| Quality | PR main branch có pass đủ gate; change failure rate < 10% |
| Biometric | Threshold dựa benchmark; FAR/FRR được theo dõi theo version model |
| Recovery | Restore drill đạt RPO/RTO đã thống nhất |

## 12. Kế hoạch nguồn lực tham khảo

| Vai trò | Trọng tâm | Nhu cầu tối thiểu |
|---|---|---|
| Engineering Lead | Architecture, sequencing, review, release | 1 |
| Backend engineer | Auth, outbox, API, payroll, encryption | 1–2 |
| Mobile engineer | Kiosk credential, TLS, offline/retry, liveness UX | 1 |
| Frontend engineer | Socket auth UI, observability UI, E2E | 1 |
| DevOps/SRE | CI/CD, network, monitoring, backup, secrets | 1 |
| QA/Security | Test plan, regression, pentest coordination | 0.5–1 |
| Privacy/Legal | Biometric consent/retention/compliance | Theo nhu cầu |

Với đội 4–6 người, P0/P1 hợp lý trong 8–12 tuần. Thời gian biometric/liveness có thể dài hơn vì phụ thuộc benchmark và quy trình consent.

## 13. Backlog triển khai đầu tiên

1. Viết security regression tests tái hiện device-token takeover và anonymous Socket.IO join.
2. Khóa route/device claim theo challenge + bootstrap credential.
3. Thêm Socket.IO authentication/authorization và TTL cho kiosk frame.
4. Tắt cleartext Android, dựng reverse proxy TLS và private Docker network.
5. Thiết kế data classification + encrypted backup + biometric retention.
6. Xây outbox/idempotency cho attendance sync.
7. Remediate dependency critical/high theo lockfile có kiểm thử.
8. Đưa E2E, employee mobile và AI tests vào CI.
9. Thiết lập staging thật, monitoring, alert và restore drill.
10. Thực hiện external/internal penetration test trước go-live.

## 14. Quy tắc làm việc khi triển khai

- Mỗi ticket security phải có test chống tái phát trước khi đóng.
- Thay đổi database/service contract phải có migration, backward compatibility và rollback note.
- Không log token, password, claim code, raw face image hay embedding.
- Không đưa API key hoặc service secret vào Vite/Expo public environment.
- Không merge dependency upgrade lớn cùng lúc với feature/architecture thay đổi.
- Mọi exception với roadmap này phải có owner, thời hạn, lý do và chấp thuận rủi ro bằng văn bản.

