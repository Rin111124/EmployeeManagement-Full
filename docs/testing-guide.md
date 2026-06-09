# Hướng dẫn chạy Scripts Test & Công cụ hỗ trợ

Tài liệu này hướng dẫn cách sử dụng các script kiểm thử và các công cụ dòng lệnh (scripts) để đảm bảo hệ thống HRMS hoạt động ổn định.

---

## 1. Kiểm thử Backend (Admin System)

Tất cả các lệnh dưới đây đều được chạy từ thư mục `admin-system/backend`.

### Chạy toàn bộ Unit & Integration Tests
Hệ thống sử dụng bộ chạy test mặc định của Node.js.
```bash
cd admin-system/backend
npm test
```

### Các file test chính:
- `tests/payrollEngine.test.js`: Kiểm tra logic tính lương cơ bản.
- `tests/payrollEngine_extended.test.js`: Kiểm tra logic trừ giờ nghỉ, tăng ca và các trường hợp biên.
- `tests/api.test.js`: Kiểm tra tích hợp các API đầu cuối (Auth, Employees, Attendance...).

---

## 2. Kiểm tra An ninh (Security Smoke Tests)

Để đảm bảo các cấu hình môi trường và bảo mật cơ bản (như CORS, JWT secrets) đã được thiết lập đúng:

```bash
cd admin-system/backend
npm run security:test
```
*Lệnh này bao gồm `security:env` (kiểm tra biến môi trường) và `security:smoke` (thử nghiệm tấn công giả lập cơ bản).*

---

## 3. Các Script Tiện ích & Chẩn đoán (Database Scripts)

Hệ thống cung cấp một số script hỗ trợ quản lý dữ liệu trực tiếp từ dòng lệnh:

### Tính toán lại toàn bộ giờ làm việc
Sử dụng khi bạn thay đổi cấu hình thời gian nghỉ (Break settings) và muốn áp dụng cho dữ liệu cũ:
```bash
cd admin-system/backend
node scripts/recalculateAllAttendance.js
```

### Kiểm tra luồng Chatbot AI
Kiểm tra xem Gemini API có đang hoạt động và nhận diện đúng dữ liệu không:
```bash
cd admin-system/backend
node test_chatbot.js
```

### Khởi tạo dữ liệu mẫu (Seeding)
```bash
cd admin-system/backend
npm run seed:professional  # Dữ liệu chuyên nghiệp cho demo
npm run seed:admin         # Chỉ tạo tài khoản Admin hệ thống
```

---

## 4. Kiểm thử Frontend (Admin Portal)

Hiện tại Frontend tập trung vào kiểm tra kiểu dữ liệu (Static Analysis).

```bash
cd admin-system/frontend
npm run lint
```
*Lệnh này sử dụng TypeScript Compiler để kiểm tra lỗi cú pháp và logic kiểu trong toàn bộ code React.*

---

## 5. Lưu ý quan trọng
- **Môi trường:** Luôn đảm bảo file `.env` đã được cấu hình đúng trước khi chạy test.
- **Database:** Hầu hết các test API sẽ sử dụng Database thật (hoặc In-memory tùy cấu hình). Cẩn trọng khi chạy trên môi trường Production.
- **Restart Server:** Sau khi thay đổi bất kỳ cấu hình nào trong `.env`, bạn cần khởi động lại server (`npm run dev`) để thay đổi có hiệu lực.
