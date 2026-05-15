## 4. Biểu đồ Hoạt động (Activity Diagrams)

### A. Activity Diagram: Quy trình Chấm công (Check-in)

```mermaid
graph TD
    Start([Start: Nhân viên đến kiosk])
    ShowUI["Hiển thị giao diện chấm công"]
    Scan["Quét khuôn mặt"]
    SendAI["Gửi ảnh tới AI Service"]
    Extract["Trích xuất Face Embedding"]
    Compare["So khớp với database"]
    Found{Tìm thấy?}
    GetInfo["Lấy thông tin nhân viên"]
    CheckTime["Kiểm tra thời gian"]
    AlreadyIn{Đã check-in?}
    CreateRecord["Tạo bản ghi check-in"]
    SaveDB["Lưu vào database"]
    Sync["Đồng bộ với Admin server"]
    Success["✓ Check-in thành công"]
    Retry["⚠ Quét lại"]
    Manual["Cho phép nhập ID thủ công"]
    End([End])

    Start --> ShowUI
    ShowUI --> Scan
    Scan --> SendAI
    SendAI --> Extract
    Extract --> Compare
    Compare --> Found
    
    Found -->|Có| GetInfo
    Found -->|Không| Manual
    
    GetInfo --> CheckTime
    CheckTime --> AlreadyIn
    
    AlreadyIn -->|Chưa| CreateRecord
    AlreadyIn -->|Rồi| Retry
    
    CreateRecord --> SaveDB
    SaveDB --> Sync
    Sync --> Success
    Success --> End
    
    Retry --> Scan
    Manual --> End
```

---

### B. Activity Diagram: Quy trình Xin Phép

```mermaid
graph TD
    Start([Start: Nhân viên xin phép])
    ViewBalance["Xem số ngày phép còn"]
    ChooseType["Chọn loại phép"]
    SelectDate["Chọn ngày bắt đầu/kết thúc"]
    ValidateDate{Ngày hợp lệ?}
    CalcDays["Tính số ngày xin"]
    HasBalance{Đủ phép?}
    Review["Review thông tin đơn"]
    Submit["Gửi đơn"]
    NotifyAdmin["Thông báo Admin"]
    SaveDB["Lưu vào database"]
    Approved{Admin duyệt?}
    Accept["✓ Chấp nhận"]
    Reject["✗ Từ chối"]
    UpdateBalance["Cập nhật số phép"]
    End([End])

    Start --> ViewBalance
    ViewBalance --> ChooseType
    ChooseType --> SelectDate
    SelectDate --> ValidateDate
    
    ValidateDate -->|Không| Start
    ValidateDate -->|Có| CalcDays
    
    CalcDays --> HasBalance
    
    HasBalance -->|Không| Reject
    HasBalance -->|Có| Review
    
    Review --> Submit
    Submit --> NotifyAdmin
    NotifyAdmin --> SaveDB
    SaveDB --> Approved
    
    Approved -->|Có| Accept
    Approved -->|Không| Reject
    
    Accept --> UpdateBalance
    UpdateBalance --> End
    
    Reject --> End
```

---

### C. Activity Diagram: Quy trình Tính Lương

```mermaid
graph TD
    Start([Start: Tính lương tháng])
    SelectMonth["Chọn tháng/năm"]
    GetEmployees["Lấy danh sách nhân viên"]
    CalcBaseSalary["Tính lương cơ bản"]
    CalcAllowance["Tính các phụ cấp"]
    CalcOvertime["Tính tiền tăng ca"]
    CalcDeduction["Tính các khoản khấu trừ"]
    CalcTax["Tính thuế thu nhập"]
    CalcNetSalary["Tính lương ròng"]
    CheckAnomalies{Có dữ liệu bất thường?}
    Alert["Cảnh báo Admin"]
    Review["Review bảng lương"]
    Confirm{Xác nhận?}
    GenPayslip["Tạo bảng lương"]
    Notify["Thông báo nhân viên"]
    End([End])

    Start --> SelectMonth
    SelectMonth --> GetEmployees
    GetEmployees --> CalcBaseSalary
    CalcBaseSalary --> CalcAllowance
    CalcAllowance --> CalcOvertime
    CalcOvertime --> CalcDeduction
    CalcDeduction --> CalcTax
    CalcTax --> CalcNetSalary
    CalcNetSalary --> CheckAnomalies
    
    CheckAnomalies -->|Có| Alert
    CheckAnomalies -->|Không| Review
    
    Alert --> Review
    Review --> Confirm
    
    Confirm -->|Không| Start
    Confirm -->|Có| GenPayslip
    
    GenPayslip --> Notify
    Notify --> End
```

---

### D. Activity Diagram: Quy trình Đăng ký Khuôn mặt (Face Enrollment)

```mermaid
graph TD
    Start([Start: Đăng ký khuôn mặt])
    Guide["Hướng dẫn vị trí mặt"])
    Scan1["Quét mặt chính diện"]
    Quality1{Chất lượng tốt?}
    Scan2["Quét mặt góc trái"])
    Quality2{Chất lượng tốt?}
    Scan3["Quét mặt góc phải"])
    Quality3{Chất lượng tốt?}
    Extract["Trích xuất Face Embedding"]
    Store["Lưu embedding vào database"]
    Confirm["✓ Đăng ký thành công"]
    Error["⚠ Lỗi, quét lại"]
    End([End])

    Start --> Guide
    Guide --> Scan1
    Scan1 --> Quality1
    
    Quality1 -->|Không| Error
    Quality1 -->|Có| Scan2
    
    Scan2 --> Quality2
    Quality2 -->|Không| Error
    Quality2 -->|Có| Scan3
    
    Scan3 --> Quality3
    Quality3 -->|Không| Error
    Quality3 -->|Có| Extract
    
    Extract --> Store
    Store --> Confirm
    Confirm --> End
    
    Error --> Guide
```

---

### E. Activity Diagram: Quy trình Đăng nhập Hệ thống

```mermaid
graph TD
    Start([Start: User truy cập hệ thống])
    CheckLogin{Đã đăng nhập?}
    ShowLogin["Hiển thị form đăng nhập"]
    InputCreds["Nhập email/password"]
    Validate{Thông tin đúng?}
    CheckMFA{Bật 2FA?}
    SendOTP["Gửi OTP"]
    InputOTP["Nhập OTP"]
    VerifyOTP{OTP đúng?}
    CheckRole["Lấy thông tin role/quyền"]
    CreateSession["Tạo session"]
    Redirect["Chuyển hướng về dashboard"]
    Failed["❌ Đăng nhập thất bại"]
    End([End])

    Start --> CheckLogin
    
    CheckLogin -->|Rồi| Redirect
    CheckLogin -->|Chưa| ShowLogin
    
    ShowLogin --> InputCreds
    InputCreds --> Validate
    
    Validate -->|Không| Failed
    Validate -->|Có| CheckMFA
    
    CheckMFA -->|Có| SendOTP
    SendOTP --> InputOTP
    InputOTP --> VerifyOTP
    
    VerifyOTP -->|Không| Failed
    VerifyOTP -->|Có| CheckRole
    
    CheckMFA -->|Không| CheckRole
    
    CheckRole --> CreateSession
    CreateSession --> Redirect
    
    Redirect --> End
    Failed --> End
```

