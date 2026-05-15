# 1. Xác định Yêu cầu và Tác nhân (Actors)

## Yêu cầu chính của hệ thống

### Hệ thống Admin (Quản lý)
- Quản lý nhân viên (CRUD - Create, Read, Update, Delete)
- Quản lý bộ phận/phòng ban
- Quản lý chức vụ và gán công việc
- Quản lý chấm công
- Quản lý đơn xin phép (nghỉ phép, tăng ca)
- Tính lương
- Xem báo cáo/thống kê
- Quản lý thiết bị kiosk
- Kiểm toán (audit log)
- Cấu hình hệ thống

### Hệ thống Chấm Công (Attendance)
- Đăng ký khuôn mặt (Face Enrollment)
- Chấm công vào/ra bằng nhận diện khuôn mặt
- Lưu trữ dữ liệu chấm công cục bộ
- Đồng bộ với hệ thống chính

## Các Tác nhân (Actors)

### 1. **Admin / HR Manager** (Quản lý nhân sự)
   - Quản lý dữ liệu nhân viên
   - Phê duyệt đơn xin phép
   - Xem báo cáo
   - Cấu hình hệ thống
   - Duyệt thiết bị kiosk

### 2. **Employee** (Nhân viên)
   - Xem thông tin cá nhân
   - Gửi đơn xin phép
   - Xem lịch chấm công
   - Sử dụng thiết bị kiosk để chấm công

### 3. **Kiosk Terminal** (Thiết bị chấm công)
   - Chươc nhập cơ thể (khuôn mặt)
   - Tạo bản ghi chấm công
   - Đồng bộ dữ liệu với server

### 4. **System / AI Service** (Dịch vụ nhận diện)
   - Trích xuất đặc trưng khuôn mặt
   - So khớp khuôn mặt với dữ liệu đã lưu
   - Hỗ trợ đăng ký và nhận diện

### 5. **Device Manager** (Quản lý thiết bị - có thể là Admin hoặc người khác)
   - Đăng ký thiết bị kiosk
   - Xác thực thiết bị
   - Cập nhật firmware

## Danh sách các Chức năng chính

### Authentication & Authorization
- Đăng nhập/đăng xuất
- Quản lý quyền truy cập
- Xác thực thiết bị

### Employee Management
- Thêm/sửa/xóa nhân viên
- Quản lý chức vụ
- Quản lý hợp đồng
- Quản lý tài sản

### Attendance
- Chấm công (check-in/check-out)
- Xem lịch sử chấm công
- Báo cáo chấm công

### Leave Management
- Tạo đơn xin phép
- Phê duyệt/từ chối
- Quản lý loại phép
- Quản lý quota phép

### Payroll
- Tính lương
- Quản lý các khoản khấu trừ
- Xuất bảng lương

### Dashboard & Reports
- Thống kê chấm công
- Thống kê nhân viên
- Báo cáo lương
- Kiểm toán (audit log)

### Settings
- Cấu hình hệ thống
- Quản lý ca làm việc
- Quản lý thiết bị
- Cấu hình phép theo hợp đồng

### Face Recognition
- Đăng ký khuôn mặt
- Nhận diện khuôn mặt
- Lưu trữ embedding (đặc trưng khuôn mặt)

