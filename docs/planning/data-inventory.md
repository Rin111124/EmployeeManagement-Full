# Data Inventory — EmployeeManagement

**Phiên bản:** 1.0  
**Ngày lập:** 22-09-2026  
**Owner:** Security / Privacy Owner  
**Tài liệu liên quan:** [RACI.md](./RACI.md) · [biometric-consent-checklist.md](./biometric-consent-checklist.md) · [production-excellence-roadmap.md](./production-excellence-roadmap.md)  
**Trạng thái phê duyệt:** ⏳ Chờ Security/Privacy Owner review

---

## Mức phân loại dữ liệu

| Mức | Định nghĩa | Ví dụ |
|---|---|---|
| **Public** | Thông tin có thể chia sẻ công khai | Tên công ty, địa chỉ văn phòng |
| **Internal** | Dữ liệu nội bộ không nhạy cảm | Lịch làm việc, phòng ban, chức danh |
| **Confidential** | Dữ liệu nhạy cảm nghiệp vụ | Lương, hợp đồng, thông tin cá nhân |
| **Restricted-Biometric** | Dữ liệu sinh trắc học và tài chính cá nhân | Khuôn mặt, CCCD, tài khoản ngân hàng |

---

## 1. Dữ liệu Nhân sự (HR / PII)

| Trường | Mức phân loại | Nguồn thu thập | Nơi lưu trữ | Nơi truyền | Quyền truy cập | Retention đề xuất |
|---|---|---|---|---|---|---|
| Họ tên đầy đủ | Internal | HR nhập | MongoDB (admin-system) | Frontend UI | Admin, HR, Manager | Vô thời hạn (nhân sự active); 5 năm sau nghỉ việc |
| Mã nhân viên | Internal | Hệ thống tạo | MongoDB | Attendance, AI service | Admin, HR | Vô thời hạn |
| Ngày sinh | Confidential | HR nhập | MongoDB (admin-system) | — | Admin, HR | 5 năm sau nghỉ việc |
| Số CCCD / CMND | **Restricted-Biometric** | HR nhập | MongoDB (admin-system) — **cần mã hóa** | — | Admin, HR (cần audit log khi xem) | 5 năm sau nghỉ việc |
| Email công ty | Internal | HR nhập | MongoDB | Frontend, email service | Admin, HR, nhân viên (của mình) | Vô thời hạn |
| Số điện thoại | Confidential | HR nhập | MongoDB | — | Admin, HR | 5 năm sau nghỉ việc |
| Địa chỉ | Confidential | HR nhập | MongoDB | — | Admin, HR | 5 năm sau nghỉ việc |
| Ảnh profile | Internal | HR/nhân viên upload | MongoDB (GridFS) hoặc file storage | Frontend UI | Tất cả (xem), Admin/HR (sửa) | Vô thời hạn (active); xóa 30 ngày sau nghỉ việc |
| Hợp đồng lao động (file) | Confidential | HR upload | File storage | — | Admin, HR | Theo quy định pháp lý (7–10 năm) |

---

## 2. Dữ liệu Lương (Payroll)

| Trường | Mức phân loại | Nguồn | Nơi lưu trữ | Nơi truyền | Quyền truy cập | Retention đề xuất |
|---|---|---|---|---|---|---|
| Lương cơ bản | **Confidential** | HR nhập | MongoDB (admin-system) — **cần mã hóa** | — | Admin, HR | 10 năm (theo quy định kế toán) |
| Phụ cấp / khấu trừ | Confidential | HR nhập | MongoDB | — | Admin, HR | 10 năm |
| Tài khoản ngân hàng | **Restricted-Biometric** | HR nhập | MongoDB — **cần mã hóa AES-256** | — | Admin, HR (audit log bắt buộc) | 10 năm |
| Bảng lương tháng (finalized) | Confidential | Hệ thống tính | MongoDB (immutable record) | Export PDF | Admin, HR, nhân viên (của mình) | 10 năm |
| Điều chỉnh lương (adjustment) | Confidential | HR/Manager tạo | MongoDB (audit record) | — | Admin, HR | 10 năm |
| Export payroll (file PDF/CSV) | Confidential | Hệ thống tạo | Temporary (signed URL, TTL 15 phút) | Download link | Admin, HR | Không lưu file xuất; audit log lưu vĩnh viễn |

---

## 3. Dữ liệu Sinh trắc học (Biometric)

| Trường | Mức phân loại | Nguồn | Nơi lưu trữ | Nơi truyền | Quyền truy cập | Retention đề xuất |
|---|---|---|---|---|---|---|
| Face embedding (vector đặc trưng) | **Restricted-Biometric** | AI service từ ảnh enrollment | MongoDB (attendance-system) — **cần mã hóa** | Attendance ↔ AI service (trong trust boundary) | Backend service (không expose trực tiếp) | Xóa khi nhân viên nghỉ việc hoặc rút consent; tối đa 30 ngày sau |
| Ảnh enrollment gốc | **Restricted-Biometric** | Kiosk hoặc HR upload | Không lưu (chỉ dùng để tạo embedding) hoặc lưu tối thiểu với consent rõ ràng | Attendance service → AI service | Không expose qua API | Xóa ngay sau khi tạo embedding |
| Lịch sử khuôn mặt nhận diện được (confidence score) | Restricted-Biometric | AI service | MongoDB (attendance event) | Attendance → Admin | Admin, HR | 6 tháng; sau đó aggregate anonymized |
| Kết quả liveness detection | Restricted-Biometric | AI service | MongoDB (attendance event) | Attendance → Admin | Admin, HR | 6 tháng |

---

## 4. Dữ liệu Camera / Kiosk Stream

| Trường | Mức phân loại | Nguồn | Nơi lưu trữ | Nơi truyền | Quyền truy cập | Retention đề xuất |
|---|---|---|---|---|---|---|
| Camera frame (live) | **Restricted-Biometric** | Mobile kiosk app | **Không lưu** — chỉ giữ in-memory với TTL 30 giây | Socket.IO: kiosk → admin-backend → monitor | Admin, HR, Manager (role-based socket auth) | TTL 30 giây in-memory; không persist |
| Camera snapshot tại thời điểm check-in | Restricted-Biometric | Kiosk | Tùy chính sách: không lưu (đề xuất) hoặc lưu ≤60 giây | Attendance service (tạm thời) | Chỉ cho mục đích audit — cần consent | Không lưu (đề xuất); nếu lưu, xóa sau 60 giây |
| Device ID / Fingerprint kiosk | Internal | Kiosk app | MongoDB (attendance-system, Device model) | Admin service (enrollment) | Admin, Backend service | Vô thời hạn (thiết bị active); 1 năm sau decommission |

---

## 5. Dữ liệu Chấm công (Attendance)

| Trường | Mức phân loại | Nguồn | Nơi lưu trữ | Nơi truyền | Quyền truy cập | Retention đề xuất |
|---|---|---|---|---|---|---|
| Bản ghi check-in / check-out | Internal | Kiosk, manual HR | MongoDB (attendance-system + admin-system qua outbox) | Attendance → Admin (sync) | Admin, HR, Manager, nhân viên (của mình) | 3 năm (theo quy định lao động) |
| Manual attendance (HR tạo) | Internal | HR | MongoDB (admin-system) | — | Admin, HR | 3 năm |
| Attendance correction | Confidential | HR/Manager | MongoDB (audit record) | — | Admin, HR | 3 năm |
| Outbox event | Internal | Hệ thống | MongoDB (outbox collection) | Attendance → Admin sync | Backend service | Xóa sau sync thành công + 7 ngày |
| DLQ event | Internal | Hệ thống | MongoDB hoặc queue | — | Admin (dashboard) | 30 ngày; replay hoặc discard có audit |

---

## 6. Dữ liệu Xác thực & Phiên (Auth / Session)

| Trường | Mức phân loại | Nguồn | Nơi lưu trữ | Nơi truyền | Quyền truy cập | Retention đề xuất |
|---|---|---|---|---|---|---|
| Password hash (bcrypt) | Confidential | Người dùng | MongoDB (admin-system) | — | Backend service (so sánh, không đọc) | Xóa ngay khi account bị xóa |
| JWT access token | Confidential | Backend phát hành | Client-side (memory / cookie HTTPOnly) | API request headers | Client | TTL 15 phút (hết hạn tự nhiên) |
| JWT refresh token | Confidential | Backend phát hành | HTTPOnly cookie | — | Client | TTL 7 ngày; xóa khi logout/revoke |
| Device bootstrap credential hash | **Restricted-Biometric** | Admin phát hành | MongoDB (DeviceCredential) — **hash only** | Enrollment challenge | Backend service | Xóa khi device revoked/decommissioned |
| Device access token | Confidential | Backend phát hành | Android Keystore / SecureStore | API request headers | Kiosk app | Theo policy rotation; vô hiệu ngay khi revoke |
| Refresh token blacklist / jti revocation | Internal | Backend | Redis | — | Backend service | TTL = max token expiry (7 ngày) |

---

## 7. Audit Log

| Loại event | Mức phân loại | Nơi lưu | Quyền đọc | Retention đề xuất |
|---|---|---|---|---|
| Auth events (login, logout, failed) | Internal | MongoDB (audit collection) | Admin, SEC | 1 năm |
| Device enrollment/revocation | Internal | MongoDB | Admin, SEC | 2 năm |
| Payroll access / export | Confidential | MongoDB | Admin, SEC | 5 năm |
| Biometric enrollment / deletion | Restricted-Biometric | MongoDB | Admin, SEC | 5 năm |
| Subject request (xem/xóa/xuất dữ liệu) | Confidential | MongoDB | Admin, SEC, LEG | 5 năm |
| Admin config changes | Internal | MongoDB | Admin, SEC | 2 năm |
| Socket.IO access denied events | Internal | Structured log / SIEM | SEC, OPS | 90 ngày |
| Backup create / restore | Internal | MongoDB | Admin, OPS | 2 năm |

---

## 8. Luồng dữ liệu giữa các service (Data Flow)

```
[Mobile Kiosk App]
    │── Enrollment credential ──────────────────────────────► [Admin Backend]
    │── Camera frame (Socket.IO, no persist) ───────────────► [Admin Backend] ──► [Web Monitor (Admin/HR/Manager)]
    │── Check-in request (face image) ──────────────────────► [Attendance Service]
                                                                    │── Face image ──► [AI Service]
                                                                    │                    (embedding match, NO full DB transfer)
                                                                    │◄── Match result ──
                                                                    │── Outbox event ──► [Admin Backend] (sync)
                                                                    └── Attendance record ──► MongoDB (attendance DB)

[HR / Admin Web]
    │── API requests (JWT auth) ──────────────────────────► [Admin Backend]
    │── View kiosk stream (Socket.IO, role-checked) ──────► [Admin Backend]
    └── Payroll export (role-checked, signed URL TTL 15m) ─► [Admin Backend]

[Admin Backend] ──► MongoDB (admin DB, encrypted fields)
[Admin Backend] ──► Redis (session blacklist, BullMQ queues)
```

> [!WARNING]
> AI Service **không được** nhận toàn bộ embedding của nhân viên trong mỗi request. Chỉ truyền candidate embeddings có access control phù hợp (xem ticket P1-BIO-07).

---

## Hành động tiếp theo

| # | Hành động | Owner | Deadline |
|---|---|---|---|
| 1 | Xác nhận và ký duyệt data inventory này | SEC | Tuần 1, Ngày 5 |
| 2 | Implement mã hóa cho Restricted-Biometric fields | BE | Tuần 4 (P1-PRIV-02) |
| 3 | Implement retention job tự động | BE | Tuần 6 (P1-PRIV-07) |
| 4 | Implement subject request workflow | BE + FE | Tuần 7 (P1-PRIV-08) |
| 5 | Review data flow diagram với Security Owner | SEC + EL | Tuần 2 |
| 6 | Xác nhận consent pháp lý sinh trắc học | LEG | Tuần 2 (P0-SETUP-06) |

---

> [!CAUTION]
> **CCCD, tài khoản ngân hàng và face embedding hiện chưa được mã hóa application-level.** Đây là rủi ro P1 phải được xử lý trước public rollout (xem ticket P1-PRIV-02).
