## 5. Biểu đồ Trình tự (Sequence Diagrams)

### A. Sequence Diagram: Check-in bằng Khuôn mặt

```mermaid
sequenceDiagram
    participant Employee as Nhân viên
    participant Kiosk as Kiosk Terminal
    participant AttService as Attendance Service
    participant AIService as AI Service
    participant AdminDB as Admin Database

    Employee->>Kiosk: Bước trước camera
    Kiosk->>Kiosk: Quét camera
    Kiosk->>AIService: POST /recognize (ảnh)
    AIService->>AIService: Trích xuất face embedding
    AIService->>AdminDB: Query embedding
    AdminDB-->>AIService: Danh sách embedding
    AIService->>AIService: So khớp (matching)
    AIService-->>Kiosk: ID nhân viên
    
    alt Nhân viên không tìm thấy
        Kiosk->>Employee: Quét lại
    else Nhân viên tìm thấy
        Kiosk->>AttService: POST /check-in (employee_id, timestamp)
        AttService->>AttService: Kiểm tra đã check-in
        alt Chưa check-in
            AttService->>AdminDB: Lưu check-in record
            AdminDB-->>AttService: OK
            AttService-->>Kiosk: ✓ Thành công
            Kiosk->>Employee: Hiển thị: Check-in thành công!
        else Đã check-in
            AttService-->>Kiosk: ⚠ Đã check-in
            Kiosk->>Employee: Hiển thị: Bạn đã check-in rồi
        end
    end
```

---

### B. Sequence Diagram: Xin Phép

```mermaid
sequenceDiagram
    participant Employee as Nhân viên
    participant AdminUI as Admin UI
    participant AdminAPI as Admin API
    participant AdminDB as Admin Database
    participant Admin as HR Admin

    Employee->>AdminUI: Click "Gửi đơn xin phép"
    AdminUI->>AdminAPI: POST /leave-requests
    AdminAPI->>AdminDB: Kiểm tra số phép còn
    AdminDB-->>AdminAPI: Số phép
    
    alt Không đủ phép
        AdminAPI-->>AdminUI: ❌ Không đủ phép
        AdminUI->>Employee: Thông báo lỗi
    else Đủ phép
        AdminAPI->>AdminDB: Tạo request (status=pending)
        AdminDB-->>AdminAPI: OK
        AdminAPI-->>AdminUI: ✓ Gửi thành công
        AdminUI->>Employee: Thông báo gửi thành công
        
        AdminAPI->>Admin: Thông báo có đơn xin phép
        Admin->>AdminUI: Xem đơn chi tiết
        AdminUI->>AdminAPI: GET /leave-requests/:id
        AdminAPI->>AdminDB: Lấy chi tiết request
        AdminDB-->>AdminAPI: Chi tiết
        AdminAPI-->>AdminUI: Dữ liệu
        
        Admin->>AdminUI: Click "Duyệt"
        AdminUI->>AdminAPI: PUT /leave-requests/:id/approve
        AdminAPI->>AdminDB: Cập nhật status = approved
        AdminDB-->>AdminAPI: OK
        AdminAPI->>AdminDB: Cập nhật số phép còn
        AdminDB-->>AdminAPI: OK
        AdminAPI->>Employee: Gửi email thông báo
        AdminAPI-->>AdminUI: ✓ Đã duyệt
    end
```

---

### C. Sequence Diagram: Tính Lương

```mermaid
sequenceDiagram
    participant Admin as HR Admin
    participant AdminUI as Admin UI
    participant AdminAPI as Admin API
    participant AdminDB as Admin Database
    participant PayrollService as Payroll Service

    Admin->>AdminUI: Click "Tính lương"
    AdminUI->>AdminAPI: POST /payroll/calculate
    AdminAPI->>AdminDB: Lấy danh sách nhân viên
    AdminDB-->>AdminAPI: Danh sách
    AdminAPI->>AdminDB: Lấy dữ liệu chấm công
    AdminDB-->>AdminAPI: Dữ liệu chấm công
    AdminAPI->>AdminDB: Lấy dữ liệu tăng ca
    AdminDB-->>AdminAPI: Dữ liệu tăng ca
    
    loop Mỗi nhân viên
        AdminAPI->>PayrollService: Tính lương (emp_data)
        PayrollService->>PayrollService: Tính lương cơ bản
        PayrollService->>PayrollService: Tính phụ cấp
        PayrollService->>PayrollService: Tính tăng ca
        PayrollService->>PayrollService: Tính khấu trừ
        PayrollService->>PayrollService: Tính thuế
        PayrollService->>PayrollService: Tính lương ròng
        PayrollService-->>AdminAPI: Kết quả lương
        AdminAPI->>AdminDB: Lưu payroll record
        AdminDB-->>AdminAPI: OK
    end
    
    AdminAPI-->>AdminUI: ✓ Hoàn thành
    AdminUI->>Admin: Hiển thị bảng lương
    Admin->>AdminUI: Review và click "Xác nhận"
    AdminUI->>AdminAPI: PUT /payroll/:id/confirm
    AdminAPI->>AdminDB: Cập nhật status = confirmed
    AdminDB-->>AdminAPI: OK
    AdminAPI-->>AdminUI: ✓ Đã xác nhận
```

---

### D. Sequence Diagram: Đăng ký Khuôn mặt

```mermaid
sequenceDiagram
    participant Employee as Nhân viên
    participant Kiosk as Kiosk Terminal
    participant AIService as AI Service
    participant AttService as Attendance Service
    participant AdminDB as Admin Database

    Employee->>Kiosk: Click "Đăng ký khuôn mặt"
    Kiosk->>Employee: Hướng dẫn
    
    Note over Employee,Kiosk: Lần 1: Mặt chính diện
    Employee->>Kiosk: Đặt mặt trước camera
    Kiosk->>Kiosk: Quét camera
    Kiosk->>AIService: POST /enroll (ảnh 1)
    AIService->>AIService: Kiểm tra chất lượng
    AIService->>AIService: Trích xuất embedding
    AIService-->>Kiosk: Embedding 1
    
    Note over Employee,Kiosk: Lần 2: Góc trái
    Employee->>Kiosk: Quay mặt sang trái
    Kiosk->>AIService: POST /enroll (ảnh 2)
    AIService->>AIService: Trích xuất embedding
    AIService-->>Kiosk: Embedding 2
    
    Note over Employee,Kiosk: Lần 3: Góc phải
    Employee->>Kiosk: Quay mặt sang phải
    Kiosk->>AIService: POST /enroll (ảnh 3)
    AIService->>AIService: Trích xuất embedding
    AIService-->>Kiosk: Embedding 3
    
    Kiosk->>AIService: POST /enroll/save (embeddings)
    AIService->>AttService: Lưu embeddings
    AttService->>AdminDB: Lưu face data
    AdminDB-->>AttService: OK
    AttService-->>AIService: OK
    AIService-->>Kiosk: ✓ Đăng ký thành công
    Kiosk->>Employee: Hiển thị: Đăng ký thành công!
```

---

### E. Sequence Diagram: Đăng nhập Hệ thống

```mermaid
sequenceDiagram
    participant User as User
    participant FrontendUI as Frontend UI
    participant AdminAPI as Admin API
    participant AdminDB as Admin Database
    participant AuthService as Auth Service

    User->>FrontendUI: Truy cập ứng dụng
    FrontendUI->>FrontendUI: Kiểm tra token
    
    alt Token hợp lệ
        FrontendUI->>AdminAPI: Verify token
        AdminAPI->>AuthService: Verify JWT
        AuthService-->>AdminAPI: ✓ Valid
        AdminAPI-->>FrontendUI: ✓ Authorized
        FrontendUI->>User: Chuyển hướng về Dashboard
    else Token không hợp lệ hoặc hết hạn
        FrontendUI->>User: Hiển thị form đăng nhập
        User->>FrontendUI: Nhập email/password
        FrontendUI->>AdminAPI: POST /auth/login
        AdminAPI->>AdminDB: Tìm user
        AdminDB-->>AdminAPI: User data
        AdminAPI->>AuthService: Hash password và so khớp
        AuthService-->>AdminAPI: ✓ Match
        
        alt Bật 2FA
            AdminAPI->>AuthService: Tạo OTP
            AuthService->>AdminAPI: OTP code
            AdminAPI->>User: Gửi OTP qua email
            FrontendUI->>User: Nhập OTP
            User->>FrontendUI: Nhập OTP code
            FrontendUI->>AdminAPI: Verify OTP
            AdminAPI->>AuthService: Verify OTP
            AuthService-->>AdminAPI: ✓ Valid OTP
        else Không bật 2FA
            AdminAPI->>AdminDB: Cập nhật last_login
        end
        
        AdminAPI->>AuthService: Tạo JWT token
        AuthService-->>AdminAPI: Token
        AdminAPI-->>FrontendUI: {token, user}
        FrontendUI->>FrontendUI: Lưu token
        FrontendUI->>User: Chuyển hướng về Dashboard
    end
```

