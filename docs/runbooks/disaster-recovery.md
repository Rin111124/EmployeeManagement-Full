# Disaster Recovery Runbook — EmployeeManagement

**Phiên bản:** 1.0  
**Ngày lập:** 24-09-2026  
**Chủ quản:** DevOps / SRE Lead & Engineering Lead  
**Mục tiêu khôi phục:**
- **RPO (Recovery Point Objective):** $\le$ 15 phút
- **RTO (Recovery Time Objective):** $\le$ 4 giờ

---

## 1. Cơ chế sao lưu tự động (Automated Encrypted Backup)

Dữ liệu MongoDB được sao lưu định kỳ, nén Gzip và mã hóa AES-256-GCM với checksum SHA-256:

```bash
# Thực hiện sao lưu thủ công hoặc qua cron job (mỗi 15 phút)
# The key must be 32 random bytes encoded as exactly 64 hex characters; store it in a secret manager.
# Generate once with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Docker Compose reads the key file path from BACKUP_ENCRYPTION_KEY_FILE and mounts the file only into admin-backend.
BACKUP_ENCRYPTION_KEY="<vault-secret-key>" node scripts/backup/backup-encrypted-mongo.mjs
```

### Chính sách lưu trữ sao lưu (Retention Policy):
- **Hourly backups:** Giữ trong 24 giờ.
- **Daily backups:** Giữ trong 30 ngày.
- **Monthly backups:** Giữ trong 12 tháng (mã hóa lưu trữ offsite S3/GCS bucket).

---

## 2. Quy trình diễn tập khôi phục (Restore Drill)

Quy trình diễn tập được thực hiện hàng quý trên môi trường staging cô lập:

1. **Chuẩn bị file sao lưu gần nhất:**
   ```bash
   ls -lt ./backups/mongo-backup-*.enc
   ```
2. **Khởi chạy script khôi phục:**
   ```bash
   MONGODB_URI="mongodb://localhost:27017/employee_management_drill" \
   BACKUP_ENCRYPTION_KEY="<vault-secret-key>" \
   node scripts/backup/restore-encrypted-mongo.mjs ./backups/mongo-backup-<timestamp>.enc
   ```
3. **Kiểm tra tính toàn vẹn dữ liệu:**
   - Chạy `npm run test:all` để kiểm tra các invariant nghiệp vụ.
   - Xác minh số lượng bản ghi của các collection `employees`, `payrolls`, `attendances`.

---

## 3. Playbooks xử lý sự cố (Failure Scenarios)

### Kịch bản 1: Mất hoàn toàn cơ sở dữ liệu MongoDB (Primary Crash)
1. Kích hoạt standby MongoDB replica hoặc tạo instance mới.
2. Tải bản backup mã hóa mới nhất từ bucket offsite.
3. Chạy `restore-encrypted-mongo.mjs`.
4. Khởi động lại `admin-system` và `attendance-service`.
5. Trigger worker outbox replay để đồng bộ các sự kiện chấm công đang chờ.

### Kịch bản 2: AI Service ngừng hoạt động (Outage / Degradation)
1. If the AI matching endpoint is unavailable, attendance-service may use its bounded local matching fallback; if feature extraction or signed liveness is unavailable, face attendance fails closed.
2. The kiosk has no durable offline attendance queue and does not persist face embeddings for later submission. Do not represent an offline scan as recorded attendance.
3. During a feature-extraction outage, use the approved manual attendance correction workflow with a reason, reviewer, and audit record. Resume kiosk use only after AI health and signed PAD checks pass.

### Kịch bản 3: Token Kiosk bị nghi ngờ lộ / chiếm quyền (Credential Compromise)
1. Vào Admin Dashboard hoặc chạy script thu hồi:
   ```bash
   node scripts/migrations/revoke-legacy-tokens.js
   ```
2. Thu hồi token của thiết bị tại bảng điều khiển thiết bị (`Device.status = 'rejected'`).
3. Socket.IO và REST API lập tức từ chối mọi kết nối từ deviceId bị thu hồi.
4. Kiosk tạo challenge mới và yêu cầu Admin duyệt lại (Re-enrollment).

### Kịch bản 4: Nghi ngờ rò rỉ dữ liệu sinh trắc học
1. Khóa API endpoint `/api/registration/match` và cô lập mạng AI service.
2. Xoay khóa mã hóa `APP_ENCRYPTION_KEY` và mã hóa lại database qua `cryptoVault.js`.
3. Kiểm tra AuditLog truy vết các request xuất dữ liệu trái phép.
4. Thông báo cho Privacy & Legal Owner (LEG) theo quy trình sự cố dữ liệu cá nhân áp dụng tại nơi triển khai.
