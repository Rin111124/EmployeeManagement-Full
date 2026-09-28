# Data Classification — EmployeeManagement

**Phiên bản:** 1.0  
**Ngày lập:** 23-09-2026  
**Owner:** Security/Privacy Owner (SEC)  
**Trạng thái:** Draft — Cần SEC phê duyệt trước khi áp dụng encryption

> [!IMPORTANT]
> Tài liệu này là cơ sở pháp lý nội bộ cho việc chọn biện pháp bảo vệ dữ liệu.
> Phải được SEC phê duyệt trước khi bắt đầu P1-PRIV-02 (application-level encryption).

---

## Cấp độ phân loại

| Cấp độ | Tên | Mô tả | Ví dụ |
|---|---|---|---|
| 0 | **Public** | Dữ liệu công khai, không gây hại nếu lộ | Thông báo chung, tên công ty |
| 1 | **Internal** | Dữ liệu nội bộ, không dành cho bên ngoài | Cơ cấu tổ chức, policy nội bộ |
| 2 | **Confidential** | Dữ liệu nhạy cảm, chỉ người có nhu cầu công việc | Thông tin nhân viên, lịch làm việc, lương |
| 3 | **Restricted-Biometric** | Dữ liệu sinh trắc học và định danh pháp lý | Face embedding, CCCD, số tài khoản |

---

## Bảng phân loại chi tiết

### Hệ thống Admin (admin-system)

| Loại dữ liệu | Trường / Field | Cấp độ | Nơi lưu | Mã hóa yêu cầu | Retention | Ghi chú |
|---|---|---|---|---|---|---|
| Thông tin đăng nhập | `email`, `password_hash` | Confidential | MongoDB `users` | `password_hash` đã bcrypt | Đến khi xóa user | Password không bao giờ lưu plaintext |
| Thông tin nhân viên cơ bản | `full_name`, `employee_code`, `department`, `position` | Internal | MongoDB `employees` | Không | Đến khi xóa employee | |
| Thông tin liên lạc | `phone`, `address` | Confidential | MongoDB `employees` | Khuyến nghị at-rest | Đến khi xóa | |
| **CCCD / CMND** | `id_number` | **Restricted-Biometric** | MongoDB `employees` | **Bắt buộc app-level AES-256** | Đến khi xóa, có thể sớm hơn theo luật | P1-PRIV-02 |
| **Số tài khoản ngân hàng** | `bank_account` | **Restricted-Biometric** | MongoDB `employees` | **Bắt buộc app-level AES-256** | Đến khi xóa | P1-PRIV-02 |
| Thông tin hợp đồng | `contract_type`, `start_date`, `salary_base` | Confidential | MongoDB `contracts` | Khuyến nghị | Theo pháp luật lao động | |
| **Lương chi tiết** | `net_salary`, `deductions`, `allowances` | Confidential | MongoDB `payrolls` | Khuyến nghị at-rest | Theo pháp luật kế toán | |
| Chấm công | `check_in`, `check_out`, `method` | Internal | MongoDB `attendances` | Không | Tối thiểu 3 năm | |
| **Face embedding** | `face_data[].embedding` | **Restricted-Biometric** | MongoDB `employees` | **Bắt buộc app-level AES-256** | Xóa khi nhân viên nghỉ việc hoặc rút consent | P1-PRIV-02, P1-BIO-07 |
| **Ảnh khuôn mặt (frame)** | Camera frame buffer | **Restricted-Biometric** | Memory (TTL 30s), không persist | Không persist | ≤ 60 giây hoặc không lưu | P1-PRIV-07 |
| Audit log | `action`, `user_id`, `ip`, `metadata` | Internal | MongoDB `auditlogs` | Không | 2 năm (đề xuất) | `metadata` không được chứa PII/embedding |
| JWT / Token | Access token, refresh token | Confidential | HttpOnly cookie / DB hash | Token hash (SHA-256) | Theo expiry | Không log token |
| Device token | `device_token_hash` | Confidential | MongoDB `devices` | Hash đã lưu, không plaintext | Đến khi revoke | |
| Bootstrap hash | `bootstrap_hash` | Confidential | MongoDB `devices` | Hash đã lưu | Đến khi xóa device | |

### Hệ thống Attendance (attendance-system)

| Loại dữ liệu | Trường / Field | Cấp độ | Nơi lưu | Mã hóa yêu cầu | Retention | Ghi chú |
|---|---|---|---|---|---|---|
| Outbox event | `payload` (check_in/out) | Internal | MongoDB `attendanceoutboxes` | Không | Purge sau khi completed > 30 ngày | |
| **Face embedding (sync)** | Payload khi sync từ admin | **Restricted-Biometric** | Memory only, không persist | Không persist | Không lưu | P1-BIO-07: Không gửi toàn bộ DB embedding |
| **Face embedding (matching)** | Embedding tạm thời khi match | **Restricted-Biometric** | Memory only, TTL | Không persist | < 5 giây (request lifetime) | |
| Kết quả nhận diện | `confidence`, `employee_id` | Internal | MongoDB `attendances` | Không | Tối thiểu 3 năm | |

### AI Service

| Loại dữ liệu | Trường / Field | Cấp độ | Nơi lưu | Mã hóa yêu cầu | Retention | Ghi chú |
|---|---|---|---|---|---|---|
| **Frame ảnh (request)** | Image bytes | **Restricted-Biometric** | Memory only | Không persist | Không lưu — xử lý xong là xóa | |
| Model weights | `.onnx`, `.pkl` | Internal | Docker volume | Không | Đến khi update model | |
| Inference log | Chỉ log `confidence` range, không log ảnh | Internal | Stdout/log | Không | Theo log rotation | |

---

## Ma trận kiểm soát truy cập

| Cấp độ | Admin | HR | Manager | Employee | Device (Kiosk) | Attendance Service |
|---|---|---|---|---|---|---|
| Public | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Internal | ✅ | ✅ của phòng ban | ✅ của phòng ban | Của bản thân | Chỉ employee list tối thiểu | Chỉ attendance data |
| Confidential | ✅ | ✅ (HR scope) | Xem lương phòng ban | Chỉ của bản thân | ❌ | ❌ |
| Restricted-Biometric | ✅ (audit only) | ❌ | ❌ | ❌ | Chỉ embedding khi match | Chỉ nhận, không lưu |

---

## Quy tắc bắt buộc

1. **Không log Restricted-Biometric**: Embedding, frame ảnh, CCCD, số tài khoản không được xuất hiện trong log, Sentry, export, test fixture.
2. **Không truyền embedding toàn bộ**: AI service chỉ nhận embedding của candidate, không phải toàn bộ DB.
3. **Mask trong UI**: Chỉ hiển thị 4 số cuối tài khoản, không hiển thị CCCD trừ khi cần thiết với xác nhận.
4. **Backup encryption**: Backup DB phải mã hóa trước khi lưu offsite.
5. **Retention enforcement**: Embedding phải được xóa tự động khi nhân viên nghỉ việc hoặc rút consent.

---

## Trạng thái encryption hiện tại

| Loại | Trạng thái | Ghi chú |
|---|---|---|
| Password | ✅ bcrypt | Đã implement |
| Device token | ✅ SHA-256 hash | Đã implement |
| CCCD | ❌ Chưa mã hóa | **P1-PRIV-02** — cần làm Tuần 4 |
| Bank account | ❌ Chưa mã hóa | **P1-PRIV-02** — cần làm Tuần 4 |
| Face embedding | ❌ Chưa mã hóa | **P1-PRIV-02** — ưu tiên cao nhất |
| Backup MongoDB | ❌ Chưa mã hóa | **P1-PRIV-05** — cần làm Tuần 5 |

---

## Phê duyệt

| Người | Vai trò | Ngày | Chữ ký |
|---|---|---|---|
| [TBD] | Security/Privacy Owner (SEC) | | |
| [TBD] | Engineering Lead (EL) | | |
| [TBD] | Privacy/Legal (LEG) | | |

> [!CAUTION]
> Tài liệu này chưa có hiệu lực cho đến khi được phê duyệt bởi SEC và LEG.
> Không được bắt đầu P1-PRIV-02 (encryption) khi chưa có phê duyệt.
