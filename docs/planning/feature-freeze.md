# Thông báo Tạm dừng Phát triển Tính năng (Feature Freeze)

**Phiên bản:** 1.0  
**Ngày hiệu lực:** 22-09-2026  
**Ngày dự kiến hết hiệu lực:** Khi hoàn thành toàn bộ hạng mục P0 và Gate A được ký duyệt  
**Owner:** Product Owner (PO) + Engineering Lead (EL)  
**Tài liệu liên quan:** [production-excellence-roadmap.md](./production-excellence-roadmap.md) · [backlog.md](./backlog.md)

---

> [!CAUTION]
> **FEATURE FREEZE đang có hiệu lực.** Mọi yêu cầu tính năng mới phải được PO và EL đánh giá trước khi bắt đầu. Không merge PR tính năng mới vào `main` khi chưa được phê duyệt.

---

## Lý do tạm dừng

Hệ thống EmployeeManagement hiện chưa đủ điều kiện vận hành production với dữ liệu nhân sự thật do còn tồn tại các rủi ro P0 về bảo mật và riêng tư:

1. **Rủi ro bảo mật:** Một số lỗ hổng P0 (kiosk token, Socket.IO, network) chưa hoàn toàn được vá.
2. **Thiếu privacy safeguards:** Dữ liệu sinh trắc học, CCCD và lương chưa được mã hóa application-level.
3. **Thiếu độ tin cậy:** Một số thành phần chấm công chưa có chaos test, chưa có disaster recovery được kiểm chứng.
4. **Thiếu CI/CD gates:** Dependency scan, SAST và branch protection chưa được thiết lập đầy đủ.

Tập trung nguồn lực vào roadmap production excellence là ưu tiên cao nhất cho đến khi Gate A được ký duyệt.

---

## Phân loại công việc

### ✅ Được tiếp tục trong thời gian freeze

Các công việc sau được phép tiến hành bình thường:

| Loại | Điều kiện |
|---|---|
| Fix bug P0/P1 trên production/staging | Không giới hạn |
| Security patch khẩn cấp | Cần EL phê duyệt, deploy ngay sau review |
| Các hạng mục trong backlog production excellence (P0, P1) | Theo thứ tự ưu tiên trong [backlog.md](./backlog.md) |
| Refactor không thay đổi API contract | Cần review kỹ, không introduce breaking change |
| Cải thiện test coverage (unit, integration, E2E) | Ưu tiên cao |
| Cập nhật tài liệu kỹ thuật | Không giới hạn |
| Dependency security patches (theo quy trình P1-DEP-01) | Theo PR nhỏ có review |

### ❌ Bị tạm dừng trong thời gian freeze

Các công việc sau **không được bắt đầu** mà không có phê duyệt đặc biệt:

| Tính năng | Lý do tạm dừng |
|---|---|
| Tính năng UI/UX mới (frontend, mobile) | Cần tập trung nguồn lực FE/MOB vào security và quality |
| Tích hợp service bên thứ ba mới | Có thể introduce rủi ro supply chain mới |
| Thay đổi schema database lớn | Chưa có migration strategy được kiểm chứng |
| Tính năng export/import dữ liệu mới | Cần privacy review trước |
| Tính năng AI/ML mới | Chưa có biometric benchmark và liveness detection |
| Tăng thêm role/permission mới | Cần security review RBAC đầy đủ |
| Thay đổi authentication flow | Rủi ro cao, cần security test |
| Tính năng thông báo (notification/email) | Có thể lộ PII nếu không được review kỹ |

---

## Quy trình ngoại lệ

Nếu có yêu cầu tính năng khẩn cấp từ business trong thời gian freeze:

1. **Requestor** tạo ticket với tiêu đề `[FREEZE-EXCEPTION]` và mô tả lý do kinh doanh
2. **PO** đánh giá mức độ ưu tiên business
3. **EL** đánh giá rủi ro kỹ thuật và security impact
4. **SEC** review nếu có tác động đến security/privacy
5. Phê duyệt cần cả PO và EL đồng ý bằng văn bản
6. Nếu được phép, exception phải được ghi lại ở cuối file này

---

## Điều kiện kết thúc freeze

Feature freeze sẽ được dỡ bỏ khi:

- [x] Tất cả hạng mục P0 trong [backlog.md](./backlog.md) có trạng thái `Done ✅` — **XONG** (23-09-2026)
- [ ] Gate A được ký duyệt bởi EL + SEC
- [ ] Dependency không còn Critical finding chưa có mitigation — **⏳ Cần chạy `npm audit`**
- [ ] CI pipeline chạy đầy đủ: unit, integration, security regression, dependency scan — **⏳ Unit/security pass; cần thêm SAST**

**Tiến độ hiện tại:** 1/4 điều kiện đã đạt. Gate A dự kiến hoàn thành Tuần 4.

**Ngày dự kiến dỡ freeze:** Tuần 4 (sau khi Gate A pass)

---

## Ký xác nhận

> [!IMPORTANT]
> PO và EL vui lòng điền tên và ngày vào bảng dưới để xác nhận đã đọc và đồng ý với feature freeze này.
> Sau khi ký, notify team qua kênh Engineering.

| Vai trò | Tên | Ngày |
|---|---|---|
| Product Owner | [**👉 Điền tên của bạn**] | [**Điền ngày**] |
| Engineering Lead | [**👉 Điền tên của bạn**] | [**Điền ngày**] |

> [!NOTE]
> Sau khi ký, đổi trạng thái P0-SETUP-07 trong [backlog.md](./backlog.md) thành `Done ✅`.

---

## Danh sách ngoại lệ đã được phê duyệt

_Chưa có ngoại lệ nào được phê duyệt._

| ID | Tính năng | Requestor | PO | EL | Ngày | Lý do |
|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — |
