```mermaid
graph TB
    subgraph Actors["Tác nhân (Actors)"]
        Admin["🧑‍💼 HR Admin/Manager"]
        Employee["👨‍💼 Employee"]
        Kiosk["🖥️ Kiosk Terminal"]
        System["🤖 System/AI Service"]
    end

    subgraph AdminSystem["Admin System (Quản lý)"]
        Auth["Authentication"]
        EmpMgmt["Employee Management"]
        LeaveReq["Leave Request"]
        Attendance["Attendance Tracking"]
        Payroll["Payroll"]
        Device["Device Management"]
        Dashboard["Dashboard & Reports"]
        Settings["System Settings"]
    end

    subgraph AttendanceSystem["Attendance System (Chấm công)"]
        FaceReg["Face Registration"]
        FaceRecog["Face Recognition"]
        AttendanceLog["Attendance Log"]
        Sync["Data Sync"]
    end

    Admin -->|Manage| EmpMgmt
    Admin -->|View| Dashboard
    Admin -->|Configure| Settings
    Admin -->|Approve| LeaveReq
    Admin -->|Manage| Device
    Admin -->|View| Attendance

    Employee -->|Request| LeaveReq
    Employee -->|View| Dashboard
    Employee -->|Use| Attendance

    Kiosk -->|Register Face| FaceReg
    Kiosk -->|Check In/Out| FaceRecog
    Kiosk -->|Record| AttendanceLog
    Kiosk -->|Sync| Sync

    System -->|Process| FaceRecog
    System -->|Extract Feature| FaceReg

    Attendance -->|View| Dashboard
    AttendanceLog -->|Sync| Sync
```

## Biểu đồ Usecase Tổng quát

Hệ thống Employee Management gồm hai hệ thống chính:

**1. Admin System:**
- Quản lý nhân viên, bộ phận, chức vụ
- Quản lý chấm công
- Quản lý đơn xin phép
- Tính lương
- Xem báo cáo
- Cấu hình hệ thống
- Quản lý thiết bị

**2. Attendance System:**
- Đăng ký khuôn mặt
- Nhận diện và chấm công
- Lưu trữ và đồng bộ dữ liệu

**Tác nhân chính:**
- HR Admin: Quản lý toàn bộ hệ thống
- Employee: Sử dụng hệ thống để xem thông tin và chấm công
- Kiosk Terminal: Thiết bị chấm công
- AI System: Xử lý nhận diện khuôn mặt

