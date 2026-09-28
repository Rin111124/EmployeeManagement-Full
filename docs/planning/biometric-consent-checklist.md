# Checklist Consent & Pháp lý — Dữ liệu Sinh trắc học

**Phiên bản:** 1.0  
**Ngày lập:** 22-09-2026  
**Ngày cập nhật:** 23-09-2026  
**Owner:** Privacy / Legal (LEG) + Security / Privacy Owner (SEC)  
**Tài liệu liên quan:** [data-inventory.md](./data-inventory.md) · [data-classification.md](./data-classification.md) · [RACI.md](./RACI.md)  
**Trạng thái:** ⚠️ **Đang chờ LEG xác nhận** — Engineering đã triển khai sẵn sàng về kỹ thuật

---

> [!CAUTION]
> **Không được thu thập, lưu trữ hoặc xử lý dữ liệu sinh trắc học của nhân viên thật cho đến khi toàn bộ checklist này được hoàn thành và có xác nhận bằng văn bản từ bộ phận pháp chế.**

---

## 1. Xác định cơ sở pháp lý

### 1.1 Khung pháp lý áp dụng

- [ ] Xác định luật bảo vệ dữ liệu cá nhân áp dụng (Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân tại Việt Nam)
- [ ] Xác định cơ sở pháp lý để xử lý dữ liệu sinh trắc học: `[ ] Consent rõ ràng` `[ ] Thực hiện hợp đồng` `[ ] Nghĩa vụ pháp lý`
- [ ] Xác nhận dữ liệu sinh trắc học (khuôn mặt) có thuộc danh mục dữ liệu cá nhân nhạy cảm theo pháp luật hiện hành không
- [ ] Xác định có cần thông báo / đăng ký với cơ quan có thẩm quyền về việc xử lý dữ liệu sinh trắc học không
- [ ] Xác định có cần chỉ định Data Protection Officer (DPO) hoặc đầu mối tương đương không

**Cơ sở pháp lý được chọn:** `_______________`  
**Người xác nhận (LEG):** `_______________`  
**Ngày xác nhận:** `_______________`

---

### 1.2 Phạm vi xử lý

- [ ] Xác định rõ mục đích xử lý dữ liệu sinh trắc học: chấm công tự động bằng nhận dạng khuôn mặt
- [ ] Xác nhận không dùng dữ liệu sinh trắc học cho mục đích nào khác ngoài mục đích đã khai báo
- [ ] Xác nhận dữ liệu sinh trắc học không được bán, chuyển nhượng hoặc chia sẻ với bên thứ ba

---

## 2. Thông báo cho nhân viên (Privacy Notice)

### 2.1 Nội dung thông báo bắt buộc

Privacy notice phải giải thích rõ các nội dung sau trước khi thu thập:

- [ ] **Loại dữ liệu thu thập:** ảnh khuôn mặt và dữ liệu đặc trưng khuôn mặt (face embedding)
- [ ] **Mục đích:** xác thực chấm công tự động thay thế chấm công thủ công
- [ ] **Cách thức xử lý:** ảnh chuyển thành vector số học (embedding), ảnh gốc không lưu lại
- [ ] **Nơi lưu trữ:** server nội bộ của công ty (không lưu trên cloud bên thứ ba)
- [ ] **Thời gian lưu trữ:** trong thời gian làm việc tại công ty; xóa trong vòng 30 ngày sau khi nghỉ việc
- [ ] **Quyền của nhân viên:** xem dữ liệu, yêu cầu xóa, rút consent
- [ ] **Hậu quả khi từ chối:** phải dùng phương thức chấm công thủ công thay thế (không ảnh hưởng đến việc làm)
- [ ] **Đầu mối liên hệ:** tên và email của người phụ trách bảo vệ dữ liệu

### 2.2 Yêu cầu về hình thức

- [ ] Thông báo viết bằng ngôn ngữ rõ ràng, dễ hiểu (không dùng thuật ngữ kỹ thuật)
- [ ] Có phiên bản tiếng Việt
- [ ] Được cung cấp trước khi bắt đầu enrollment, không phải cùng lúc
- [ ] Không được gộp vào hợp đồng lao động theo cách khó tách biệt

---

## 3. Thu thập Consent

### 3.1 Yêu cầu về consent

- [ ] Consent phải là tự nguyện, rõ ràng, cụ thể và có thể rút lại
- [ ] Consent không được là điều kiện bắt buộc để ký hợp đồng lao động
- [ ] Có phương thức chấm công thủ công thay thế cho nhân viên không đồng ý
- [ ] Consent được ghi lại bằng văn bản (có chữ ký hoặc xác nhận điện tử có timestamp)
- [ ] Có cơ chế cho nhân viên rút consent bất kỳ lúc nào mà không bị trừng phạt

### 3.2 Mẫu consent form

```
─────────────────────────────────────────────────────────────
ĐỒNG Ý THU THẬP VÀ XỬ LÝ DỮ LIỆU SINH TRẮC HỌC
─────────────────────────────────────────────────────────────

Tôi, [Họ tên nhân viên], Mã NV: [Mã NV]

Đã được thông báo và hiểu rõ về:
- Mục đích: xác thực chấm công bằng nhận dạng khuôn mặt
- Dữ liệu thu thập: ảnh khuôn mặt và dữ liệu đặc trưng (embedding)
- Ảnh gốc không được lưu lại sau khi tạo đặc trưng
- Dữ liệu sẽ được xóa trong vòng 30 ngày sau khi tôi nghỉ việc
- Tôi có thể rút consent bất kỳ lúc nào bằng cách liên hệ HR

□ TÔI ĐỒNG Ý cho phép công ty thu thập và xử lý dữ liệu sinh trắc học
  của tôi cho mục đích chấm công như đã mô tả ở trên.

□ TÔI KHÔNG ĐỒNG Ý. Tôi sẽ sử dụng phương thức chấm công thủ công.

Chữ ký nhân viên: _______________  Ngày: _______________
Xác nhận HR:      _______________  Ngày: _______________
─────────────────────────────────────────────────────────────
```

### 3.3 Lưu trữ consent

- [ ] Consent form được lưu trong hồ sơ nhân viên (file cứng hoặc hệ thống HR)
- [ ] Có trường `consentGivenAt`, `consentWithdrawnAt` trong database nhân viên
- [ ] Audit log ghi lại khi consent được cho và rút

---

## 4. Quyền của nhân viên (Subject Rights)

### 4.1 Quyền cần được hỗ trợ

| Quyền | Mô tả | Thời hạn xử lý | Đầu mối | Trạng thái |
|---|---|---|---|---|
| Quyền truy cập | Xem dữ liệu sinh trắc học liên quan đến mình | 15 ngày làm việc | HR | ❌ Chưa có |
| Quyền sửa đổi | Yêu cầu sửa dữ liệu không chính xác (ví dụ re-enroll) | 15 ngày làm việc | HR + BE | ❌ Chưa có |
| Quyền xóa | Yêu cầu xóa toàn bộ dữ liệu sinh trắc học | 15 ngày làm việc | HR + BE | ❌ Chưa có |
| Quyền rút consent | Ngừng dùng biometric, chuyển sang thủ công | Ngay lập tức | HR | ❌ Chưa có |
| Quyền xuất dữ liệu | Nhận bản sao dữ liệu theo định dạng phổ biến | 15 ngày làm việc | HR + BE | ❌ Chưa có |
| Quyền phản đối | Phản đối xử lý dữ liệu nếu có căn cứ | 15 ngày làm việc | HR + LEG | ❌ Chưa có |

> **Lưu ý:** Các quyền này cần được implement trong hệ thống (ticket P1-PRIV-08). Trong thời gian chờ, phải có quy trình thủ công để xử lý yêu cầu.

### 4.2 Quy trình thủ công tạm thời

1. Nhân viên gửi yêu cầu bằng văn bản đến HR
2. HR xác minh danh tính
3. HR chuyển yêu cầu đến Engineering Lead và Backend Engineer
4. Backend Engineer thực hiện thao tác và xác nhận bằng văn bản
5. HR thông báo kết quả cho nhân viên trong 15 ngày làm việc
6. Toàn bộ quy trình được ghi vào audit log

---

## 5. Bảo mật dữ liệu sinh trắc học

### 5.1 Biện pháp kỹ thuật bắt buộc

- [ ] Face embedding được mã hóa application-level trước khi lưu vào MongoDB (ticket P1-PRIV-02 — ⏳ kế hoạch Tuần 4)
- [x] Ảnh enrollment gốc không được lưu sau khi tạo embedding — **Đã implement** (AI service process và discard frame)
- [x] Không log, không hiển thị embedding trong UI hoặc export thông thường — **Đã implement** (audit metadata không chứa embedding)
- [ ] AI service chỉ nhận candidate embeddings, không toàn bộ DB (ticket P1-BIO-07 — ⏳ kế hoạch Tuần 7)
- [x] Camera frame chỉ tồn tại in-memory với TTL 30 giây — **Đã implement** (FrameMemory TTL, test pass)
- [ ] Backup dữ liệu sinh trắc học được mã hóa (ticket P1-PRIV-05 — ⏳ kế hoạch Tuần 5)

### 5.2 Biện pháp tổ chức bắt buộc

- [ ] Chỉ nhân viên HR và Admin có quyền truy cập thông tin enrollment
- [ ] Mọi truy cập vào dữ liệu sinh trắc học phải được ghi audit log
- [ ] Không sử dụng dữ liệu sinh trắc học thật trong môi trường test/development
- [ ] Có incident response plan cho trường hợp lộ dữ liệu sinh trắc học (xem runbook DR)

---

## 6. Báo cáo sự cố (Data Breach)

- [ ] Xác định ngưỡng phải thông báo cơ quan quản lý (theo Nghị định 13/2023)
- [ ] Xác định thời hạn thông báo: ____ giờ sau khi phát hiện sự cố
- [ ] Xác định mẫu thông báo cho nhân viên bị ảnh hưởng
- [ ] Có runbook chi tiết cho "biometric data breach" (xem DR runbook)

---

## 7. Kiểm tra định kỳ

| Tần suất | Nội dung kiểm tra | Owner |
|---|---|---|
| Hàng quý | Review danh sách nhân viên có consent; xóa dữ liệu nhân viên đã nghỉ | HR + BE |
| Hàng năm | Review privacy notice và consent form; cập nhật nếu luật thay đổi | LEG + SEC |
| Khi thay đổi hệ thống | Re-assessment nếu thay đổi cách xử lý dữ liệu sinh trắc học | SEC + EL |

---

## 8. Ký duyệt

> [!IMPORTANT]
> **Hướng dẫn:** Vui lòng đọc toàn bộ checklist, điền tất cả các ô `[TBD]` ở trên (mục 1.1 cơ sở pháp lý, 5.2 tên đầu mối), rồi điền tên và ngày vào bảng dưới.
> Sau khi ký, đổi trạng thái P0-SETUP-06 trong [backlog.md](./backlog.md) thành `Done ✅`.

**Tóm tắt trạng thái hiện tại:**

| Hạng mục | Trạng thái |
|---|---|
| Biện pháp kỹ thuật cơ bản (TTL, no-log, frame discard) | ✅ Đã implement |
| Mã hóa embedding (P1-PRIV-02) | ⏳ Kế hoạch Tuần 4 |
| Privacy notice và consent form | ⏳ Cần HR chuẩn bị với mẫu ở mục 3.2 |
| Cơ sở pháp lý (mục 1.1) | ⚠️ **Cần LEG xác nhận** |
| Quy trình thủ công quyền chủ thể (mục 4.2) | ⏳ Cần HR + BE phối hợp |

| Vai trò | Tên | Chữ ký | Ngày |
|---|---|---|---|
| Privacy / Legal Owner | [**👉 LEG: Điền tên của bạn**] | | |
| Security / Privacy Owner | [**👉 SEC: Điền tên của bạn**] | | |
| Engineering Lead | [**👉 EL: Điền tên của bạn**] | | |
| Product Owner | [**👉 PO: Điền tên của bạn**] | | |

> [!IMPORTANT]
> Tài liệu này chỉ có hiệu lực sau khi tất cả 4 bên ký duyệt. Lưu bản gốc có chữ ký thật trong hồ sơ pháp lý của công ty.
