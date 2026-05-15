## 3. Biểu đồ Usecase Chi tiết cho các Chức năng Chính

### A. Employee Management (Quản lý Nhân viên)

```mermaid
usecase diagram
    package "Employee Management" {
        (Create Employee) as Create
        (Read Employee Info) as Read
        (Update Employee) as Update
        (Delete Employee) as Delete
        (Assign Position) as AssignPos
        (Manage Department) as ManageDept
        (View Employee List) as ViewList
    }

    Admin --> Create
    Admin --> Read
    Admin --> Update
    Admin --> Delete
    Admin --> AssignPos
    Admin --> ManageDept
    Admin --> ViewList
    
    Employee --> Read
    Employee --> ViewList
```

**Đặc tả Usecase: Create Employee**
- Actor: HR Admin
- Preconditions: Admin đã đăng nhập, có quyền tạo nhân viên
- Steps:
  1. Admin click "Thêm nhân viên"
  2. Nhập thông tin cơ bản (tên, email, điện thoại)
  3. Chọn bộ phận
  4. Chọn chức vụ
  5. Nhập thông tin hợp đồng
  6. Click "Lưu"
- Postconditions: Nhân viên được tạo, hệ thống gửi email chào mừng
- Alternative flows: Nếu email đã tồn tại, thông báo lỗi

---

### B. Attendance Management (Quản lý Chấm công)

```mermaid
usecase diagram
    package "Attendance Management" {
        (Check In) as CheckIn
        (Check Out) as CheckOut
        (View Attendance) as ViewAtt
        (View Report) as ReportAtt
        (Export Attendance) as ExportAtt
        (Mark Manual) as MarkManual
    }

    Kiosk --> CheckIn
    Kiosk --> CheckOut
    
    Employee --> ViewAtt
    
    Admin --> ViewAtt
    Admin --> ReportAtt
    Admin --> ExportAtt
    Admin --> MarkManual
```

**Đặc tả Usecase: Check In (Chấm công vào)**
- Actor: Employee (thông qua Kiosk)
- Preconditions: Kiosk hoạt động, Employee chưa check-in hôm nay
- Steps:
  1. Employee đứng trước camera kiosk
  2. Kiosk quét khuôn mặt
  3. AI service nhận diện nhân viên
  4. Lưu thời gian check-in
  5. Hiển thị thông báo "Check-in thành công"
- Postconditions: Bản ghi chấm công được tạo với timestamp
- Alternative flows: 
  - Nếu không nhận diện được, yêu cầu quét lại
  - Nếu không tìm thấy nhân viên, cho phép nhập ID thủ công

---

### C. Leave Request Management (Quản lý Đơn xin phép)

```mermaid
usecase diagram
    package "Leave Management" {
        (Submit Request) as Submit
        (Approve Request) as Approve
        (Reject Request) as Reject
        (View Balance) as ViewBalance
        (View History) as ViewHist
        (Configure Leave Types) as ConfigType
    }

    Employee --> Submit
    Employee --> ViewBalance
    Employee --> ViewHist
    
    Admin --> Approve
    Admin --> Reject
    Admin --> ConfigType
    Admin --> ViewHist
```

**Đặc tả Usecase: Submit Leave Request**
- Actor: Employee
- Preconditions: Employee đã đăng nhập, có ngày phép còn
- Steps:
  1. Employee click "Gửi đơn xin phép"
  2. Chọn loại phép (phép năm, phép ốm...)
  3. Chọn ngày bắt đầu và kết thúc
  4. Nhập lý do (nếu cần)
  5. Click "Gửi"
- Postconditions: Đơn được gửi, Admin nhận thông báo
- Alternative flows: Nếu không đủ ngày phép, thông báo và từ chối

---

### D. Payroll Management (Quản lý Lương)

```mermaid
usecase diagram
    package "Payroll Management" {
        (Calculate Salary) as CalcSal
        (View Payslip) as ViewSlip
        (Export Salary) as ExportSal
        (Manage Deductions) as ManageDed
        (Generate Report) as GenReport
    }

    Admin --> CalcSal
    Admin --> ManageDed
    Admin --> ExportSal
    Admin --> GenReport
    
    Employee --> ViewSlip
```

**Đặc tả Usecase: Calculate Salary**
- Actor: HR Admin
- Preconditions: Hết tháng, tất cả dữ liệu chấm công hoàn tất
- Steps:
  1. Admin click "Tính lương"
  2. Chọn tháng/năm
  3. Hệ thống tính toán:
     - Lương cơ bản
     - Tính từng phụ cấp
     - Trừ những khoản khấu trừ
     - Tính thuế
  4. Review kết quả
  5. Click "Xác nhận"
- Postconditions: Bảng lương được tạo, có thể xuất
- Alternative flows: Nếu có dữ liệu bất thường, cảnh báo Admin

---

### E. Face Recognition (Nhận diện Khuôn mặt)

```mermaid
usecase diagram
    package "Face Recognition" {
        (Register Face) as RegFace
        (Recognize Face) as RecFace
        (Update Face) as UpdateFace
        (Delete Face) as DelFace
        (View Face Log) as ViewLog
    }

    Kiosk --> RegFace
    Kiosk --> RecFace
    
    Admin --> UpdateFace
    Admin --> DelFace
    Admin --> ViewLog
    
    Employee --> ViewLog
```

**Đặc tả Usecase: Register Face (Đăng ký Khuôn mặt)**
- Actor: Kiosk (thông qua Employee)
- Preconditions: Employee chưa đăng ký khuôn mặt hoặc cần cập nhật
- Steps:
  1. Kiosk hướng dẫn Employee đứng trước camera
  2. Quét khuôn mặt từ nhiều góc độ
  3. AI service trích xuất embedding (đặc trưng)
  4. Lưu embedding vào hệ thống
  5. Xác nhận thành công
- Postconditions: Face embedding được lưu, có thể dùng cho nhận diện
- Alternative flows: Nếu ảnh không rõ, yêu cầu quét lại

---

### F. System Settings (Cấu hình Hệ thống)

```mermaid
usecase diagram
    package "System Settings" {
        (Configure Shifts) as ConfigShift
        (Manage Devices) as ManageDev
        (System Configuration) as SysConfig
        (View Audit Log) as ViewAudit
        (Backup Data) as Backup
    }

    Admin --> ConfigShift
    Admin --> ManageDev
    Admin --> SysConfig
    Admin --> ViewAudit
    Admin --> Backup
```

