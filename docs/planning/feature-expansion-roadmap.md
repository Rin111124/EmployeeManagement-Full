# Backlog tính năng mở rộng EmployeeManagement

**Phiên bản:** 1.0  
**Ngày lập:** 21-09-2026  
**Mục đích:** Xác định các tính năng nên bổ sung theo mức ưu tiên, giá trị nghiệp vụ và mức sẵn sàng kỹ thuật.

> Quy tắc: Không triển khai tính năng mới làm mở rộng bề mặt kiosk, camera hoặc biometric trước khi các hạng mục P0 trong [production-excellence-roadmap.md](production-excellence-roadmap.md) được hoàn thành.

## Cách đọc mức ưu tiên

| Mức | Ý nghĩa | Khi nào làm |
|---|---|---|
| P0 | Điều kiện nền tảng để tính năng an toàn và đáng tin cậy | Trước khi có dữ liệu production |
| P1 | Giá trị cao, dùng thường xuyên, tác động trực tiếp vận hành HR | Ngay sau P0 |
| P2 | Mở rộng năng lực quản trị, tiết kiệm thời gian khi quy mô tăng | Sau P1 ổn định |
| P3 | Tối ưu/trải nghiệm hoặc tích hợp nâng cao | Chỉ làm khi có nhu cầu và ROI rõ |

## P0 — Năng lực nền tảng cần hoàn thiện

Các hạng mục này không phải tính năng mới thuần túy, nhưng là điều kiện để các tính năng phía sau không làm tăng rủi ro dữ liệu hoặc sai lệch lương.

### 1. Điều chỉnh chấm công có kiểm soát

**Giá trị:** Giải quyết tình huống quên check-in/out, kiosk lỗi, ca qua đêm mà vẫn giữ tính minh bạch payroll.

**MVP:**

- Nhân viên tạo yêu cầu sửa công theo ngày/ca, với loại yêu cầu và lý do.
- Quản lý/HR duyệt hoặc từ chối; có nhận xét bắt buộc khi từ chối.
- Lưu giá trị trước/sau, người gửi, người duyệt, thời điểm và lý do.
- Attendance đã dùng để chốt lương không được sửa trực tiếp; hệ thống tạo adjustment record.
- Có thông báo trạng thái và lịch sử riêng của nhân viên.

**Tiêu chí nghiệm thu:**

- Người dùng không thể sửa attendance của người khác.
- Không thể sửa record payroll finalized mà không tạo adjustment/audit event.
- Hai yêu cầu đồng thời không làm tạo dữ liệu trùng hoặc ghi đè quyết định.

**Phụ thuộc:** RBAC, audit log, timezone thống nhất, outbox/idempotent sync.

### 2. Kiosk offline-first và đồng bộ an toàn

**Giá trị:** Kiosk vẫn hoạt động khi Wi-Fi/server chập chờn; tránh mất công nhân viên.

**MVP:**

- Lưu encrypted local queue cho check-in/out chưa gửi được.
- Mỗi event có UUID/idempotency key, thời gian client/server, device ID và chữ ký/token hợp lệ.
- UI thể hiện rõ online/offline, số bản ghi chờ và lần đồng bộ cuối.
- Auto retry exponential backoff khi mạng phục hồi.
- Admin có màn hình theo dõi kiosk offline, hàng đợi lỗi và thao tác replay có audit.

**Tiêu chí nghiệm thu:**

- Tắt mạng rồi bật lại không làm mất hoặc tạo trùng event.
- Nhân viên nhận được trạng thái rõ ràng, không bị báo thành công giả.
- Dữ liệu offline được đồng bộ theo đúng event ID sau restart app.

**Phụ thuộc:** Device authentication an toàn, outbox/inbox, TLS, secure storage.

### 3. Quyền truy cập theo phạm vi tổ chức

**Giá trị:** Khi số phòng ban/chi nhánh tăng, Manager chỉ xem và duyệt người thuộc quyền quản lý.

**MVP:**

- Thiết lập organization, branch, department và manager relationship.
- Scope policy cho employee, attendance, payroll, leave, asset và report.
- Delegation có thời hạn cho người thay thế.
- Trang “My team” dành cho manager.

**Tiêu chí nghiệm thu:**

- Kiểm tra quyền được thực hiện ở backend, không chỉ ẩn nút frontend.
- Test IDOR chứng minh manager không đọc/sửa dữ liệu ngoài scope.

**Phụ thuộc:** RBAC hiện có, data model department/employee position, audit log.

## P1 — Tính năng giá trị cao nên làm tiếp theo

### 4. Employee self-service portal hoàn chỉnh

**Giá trị:** Giảm tải cho HR, giúp nhân viên tự tra cứu thông tin và gửi yêu cầu.

**MVP:**

- Hồ sơ cá nhân: thông tin liên hệ, người liên hệ khẩn cấp, thông tin ngân hàng với luồng yêu cầu cập nhật.
- Lịch ca, lịch sử chấm công, phép còn lại, tăng ca, hợp đồng và tài sản đang nhận.
- Gửi đơn nghỉ phép/tăng ca/sửa công; xem trạng thái và lịch sử.
- Tải phiếu lương được cấp quyền.
- Thông báo trong ứng dụng.

**Không đưa vào MVP:** Nhân viên tự sửa lương, hợp đồng đã ký hoặc dữ liệu CCCD trực tiếp.

**Tiêu chí nghiệm thu:**

- Employee chỉ truy cập dữ liệu của chính mình.
- Tất cả thay đổi dữ liệu nhạy cảm đi qua workflow, audit và thông báo.
- Hoạt động tốt trên web mobile và employee mobile app.

### 5. Workflow phê duyệt nhiều cấp

**Giá trị:** Phù hợp mô hình công ty có trưởng nhóm, quản lý phòng ban, HR và Finance.

**MVP:**

- Template workflow theo loại: leave, overtime, attendance correction, payroll adjustment, asset request.
- Bước tuần tự/song song; điều kiện theo phòng ban, cấp bậc, số giờ/tổng tiền.
- Delegation, escalation và SLA quá hạn.
- Comment, attachment metadata, timeline bất biến.
- Notification khi đến lượt duyệt hoặc quá hạn.

**Tiêu chí nghiệm thu:**

- Không thể approve bỏ qua bước bắt buộc.
- Người duyệt không được tự duyệt yêu cầu của bản thân nếu policy cấm.
- Dòng lịch sử tái dựng được toàn bộ quyết định.

**Phụ thuộc:** Organization scope, notification, audit log.

### 6. Quản lý ca làm và phân ca trực quan

**Giá trị:** Giảm thao tác Excel, hạn chế xếp ca trùng hoặc thiếu nhân sự.

**MVP:**

- Lịch tuần/tháng theo nhân viên, phòng ban và địa điểm.
- Gán ca đơn lẻ/hàng loạt; copy lịch tuần trước.
- Cảnh báo xung đột ca, vượt giờ, nhân viên inactive/nghỉ phép, thiếu tối thiểu nhân sự.
- Publish schedule; nhân viên nhận thông báo thay đổi.
- Lưu lịch sử thay đổi ca và lý do.

**Tiêu chí nghiệm thu:**

- Xung đột được backend từ chối, không chỉ cảnh báo giao diện.
- Ca qua đêm và timezone xử lý đúng trong attendance/payroll.

### 7. Phiếu lương và quy trình payroll chuyên nghiệp

**Giá trị:** Minh bạch với nhân viên, giảm sai lệch và giảm xử lý thủ công cuối tháng.

**MVP:**

- Payroll period có trạng thái Draft → Review → Approved → Finalized → Paid.
- Payslip PDF có mã số, kỳ lương, breakdown thu nhập/khấu trừ, lịch sử adjustment.
- Bulk export CSV/XLSX theo định dạng ngân hàng; không export dữ liệu vượt quyền.
- Payment status và reconciliation import.
- Recalculate chỉ được phép ở Draft/Review; Finalized chỉ có adjustment.

**Tiêu chí nghiệm thu:**

- Mỗi payslip truy vết được contract, attendance, OT và adjustment đầu vào.
- Export có audit event, phân quyền và watermark/metadata phù hợp.

### 8. Notification center đa kênh

**Giá trị:** Tránh yêu cầu bị bỏ quên và giảm việc HR phải nhắc thủ công.

**MVP:**

- In-app notification, email; tích hợp Teams/Slack là tùy chọn sau.
- Preference theo loại thông báo và quiet hours.
- Template có localization Việt/Anh.
- Retry, delivery status và dead-letter cho notification thất bại.
- Nhắc việc theo SLA cho approver.

**Tiêu chí nghiệm thu:**

- Không gửi dữ liệu lương/biometric nhạy cảm trong tiêu đề hoặc payload bên thứ ba.
- Notification duplicate-safe và có thể unsubscribe theo policy.

## P2 — Nâng cấp quản trị khi hệ thống mở rộng

### 9. Onboarding và offboarding

**Giá trị:** Chuẩn hóa quy trình nhân sự mới/nghỉ việc, giảm sót tài khoản, tài sản và quyền truy cập.

**MVP:**

- Template checklist theo vị trí/phòng ban.
- Tasks cho HR, IT, manager, finance và nhân viên.
- Theo dõi hợp đồng, tài khoản, thiết bị, đào tạo bắt buộc, bàn giao.
- Offboarding tự động revoke account/device token, thu hồi asset, xóa biometric theo retention policy.
- Báo cáo task quá hạn.

**Tiêu chí nghiệm thu:**

- Offboarding không hoàn tất khi còn tài sản/quyền truy cập chưa được xử lý.
- Các revoke/xóa dữ liệu đều có audit log.

### 10. Quản lý tài sản bằng QR/barcode

**Giá trị:** Kiểm kê nhanh, giảm thất lạc laptop/điện thoại/đồng phục/thiết bị văn phòng.

**MVP:**

- Asset có QR/serial, tình trạng, vị trí, người sở hữu, bảo hành và lịch sử.
- Bàn giao/thu hồi bằng quét QR, có xác nhận hai phía nếu cần.
- Maintenance ticket, mất/hỏng và depreciation metadata.
- Báo cáo tài sản quá hạn bảo hành/chưa kiểm kê.

**Tiêu chí nghiệm thu:**

- Không thể assign một asset active cho hai người cùng lúc.
- Mỗi lần custody change có actor, timestamp và attachment/biên bản tùy chọn.

### 11. Dashboard và báo cáo quản trị

**Giá trị:** Giúp quản lý ra quyết định thay vì chỉ xem danh sách CRUD.

**MVP:**

- Headcount và biến động nhân sự theo phòng ban/chi nhánh.
- Tỷ lệ đi làm, đi muộn, vắng mặt, OT và yêu cầu chờ duyệt.
- Payroll cost theo tháng/phòng ban/cost center.
- Device health: kiosk online, sync lag, enrollment errors.
- Export báo cáo theo scope quyền.

**Tiêu chí nghiệm thu:**

- Số liệu có định nghĩa nghiệp vụ/version rõ ràng.
- Report không làm chậm API vận hành; dùng aggregation/caching/asynchronous export khi cần.

### 12. Document và contract lifecycle

**Giá trị:** Quản lý hợp đồng, phụ lục, quyết định và thời hạn thay vì lưu file rời rạc.

**MVP:**

- Template versioning, metadata, expiry reminder.
- Sinh document từ thông tin nhân viên đã được phê duyệt.
- Approval/signing workflow; tích hợp e-signature sau khi chọn nhà cung cấp phù hợp.
- Access policy, download audit và retention.

**Tiêu chí nghiệm thu:**

- Document đã ký immutable; bản cập nhật tạo version mới.
- Chỉ người được ủy quyền xem/tải tài liệu nhạy cảm.

### 13. Training và compliance management

**Giá trị:** Theo dõi đào tạo an toàn lao động, onboarding, chứng chỉ và hạn sử dụng.

**MVP:**

- Catalog khóa học, assignment theo role/department.
- Due date, completion, quiz/certificate attachment.
- Reminder khi chứng chỉ sắp hết hạn.
- Báo cáo compliance theo team.

## P3 — Tích hợp và tối ưu nâng cao

### 14. Tích hợp hệ thống ngoài

Chỉ làm sau khi API, audit và quyền truy cập ổn định.

- SSO OIDC/SAML với Microsoft Entra ID hoặc Google Workspace.
- Đồng bộ directory/organization từ HRIS/ERP.
- Tích hợp payroll/bank theo API hoặc file chuẩn.
- Teams/Slack/Email calendar cho notification và lịch ca.
- Webhook versioned cho hệ thống bên thứ ba.

**Yêu cầu bắt buộc:** OAuth/OIDC đúng chuẩn, secret manager, scopes tối thiểu, signing webhook, replay protection, integration audit log.

### 15. Advanced analytics có kiểm soát

- Forecast nhu cầu nhân sự theo lịch sử ca và mùa vụ.
- Phân tích tỷ lệ vắng mặt theo nhóm tổng hợp, không dùng để tự động kỷ luật cá nhân.
- Capacity planning theo phòng ban/cost center.
- Scheduled report cho lãnh đạo.

**Không khuyến nghị:** chấm điểm cảm xúc qua camera, theo dõi năng suất cá nhân bằng camera, nhận diện liên tục hoặc geolocation liên tục. Rủi ro privacy/bias cao hơn giá trị vận hành trong đa số doanh nghiệp.

### 16. Khả năng mở rộng đa công ty/đa tenant

Chỉ phù hợp khi sản phẩm được định hướng SaaS.

- Tenant isolation rõ ở database, cache, storage, queue và audit.
- Tenant-aware RBAC, billing/plan, custom domain/branding.
- Quota/rate limit per tenant, data export/delete per tenant.
- Security review bắt buộc để tránh cross-tenant data leak.

## Ma trận lựa chọn nhanh

| Tính năng | Giá trị | Độ phức tạp | Ưu tiên |
|---|---:|---:|---:|
| Điều chỉnh chấm công có workflow | Rất cao | Trung bình | P0 |
| Kiosk offline-first | Rất cao | Cao | P0 |
| Scope quyền theo tổ chức | Rất cao | Trung bình | P0 |
| Employee self-service | Rất cao | Trung bình | P1 |
| Workflow nhiều cấp | Cao | Cao | P1 |
| Lập/phân ca trực quan | Cao | Trung bình | P1 |
| Payslip và payroll lifecycle | Cao | Trung bình | P1 |
| Notification center | Cao | Trung bình | P1 |
| Onboarding/offboarding | Cao | Trung bình | P2 |
| Asset QR | Trung bình–cao | Trung bình | P2 |
| Dashboard/reporting | Cao | Trung bình | P2 |
| Contract lifecycle | Trung bình–cao | Cao | P2 |
| SSO/integration | Cao | Cao | P3 |
| Advanced analytics | Trung bình | Cao | P3 |
| Multi-tenant SaaS | Tùy chiến lược | Rất cao | P3 |

## Lộ trình sản phẩm đề xuất

### Release 1 — Reliable HR operations

- Điều chỉnh chấm công có workflow.
- Kiosk offline-first.
- Scope quyền theo tổ chức.
- Hoàn tất các P0 bảo mật/nền tảng.

### Release 2 — Employee experience

- Employee self-service.
- Notification center.
- Lịch/phân ca trực quan.
- Payslip và payroll lifecycle.

### Release 3 — Management scale

- Workflow nhiều cấp/delegation/SLA.
- Onboarding/offboarding.
- Asset QR.
- Dashboard/reporting.

### Release 4 — Ecosystem

- SSO.
- Tích hợp email/Teams/Slack/ERP/bank phù hợp.
- Contract lifecycle và analytics theo nhu cầu đã đo lường.

## Mẫu ticket cho từng tính năng

```text
Tên: [Feature] – [Outcome]
Mức ưu tiên: P0 | P1 | P2 | P3
Owner: [Tên/vai trò]
Giá trị nghiệp vụ: [KPI hoặc pain point được giải quyết]
Phạm vi MVP: [Danh sách hành vi có thể quan sát]
Không thuộc phạm vi: [Các phần hoãn]
API/data changes: [Endpoint, event, migration, contract version]
Bảo mật/privacy: [Role, scope, PII, retention, audit]
Nghiệm thu: [Given/When/Then hoặc test cases]
Observability: [Metric, log, alert, dashboard]
Rollback: [Cách tắt/revert/migrate ngược]
Phụ thuộc: [Ticket/hệ thống/owner]
```

## Quy tắc quyết định trước khi nhận tính năng mới

Mỗi đề xuất chỉ được đưa vào sprint khi trả lời được:

1. Người dùng nào gặp vấn đề, tần suất và mức độ ảnh hưởng là gì?
2. KPI nào chứng minh tính năng tạo giá trị?
3. Dữ liệu nào được thu thập/truyền/lưu; có phải PII/biometric không?
4. Quyền nào được cấp, ai có thể xem/sửa/xuất dữ liệu?
5. Nếu mạng/service lỗi, dữ liệu có mất hoặc bị nhân đôi không?
6. Test, monitoring, migration và rollback cụ thể là gì?

