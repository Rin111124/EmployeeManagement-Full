## 6. Biểu đồ Lớp (Class Diagrams)

### A. Class Diagram: Employee Management Module

```mermaid
classDiagram
    class User {
        -_id: ObjectId
        -employee_id: ObjectId
        -username: string
        -password_hash: string
        -roles: string[]
        -is_active: boolean
        -failed_login_attempts: number
        -lock_until: Date
        -last_login_at: Date
        +isLocked()
    }

    class Employee {
        -_id: ObjectId
        -employee_code: string
        -full_name: string
        -date_of_birth: Date
        -gender: string
        -place_of_birth: string
        -identity: object
        -contact: object
        -position: string
        -department: string
        -insurance: object
        -bank_accounts: BankAccount[]
        -status: string
        -hire_date: Date
        -face_data: FaceData[]
        -avatar: string
    }

    class Department {
        -_id: ObjectId
        -department_name: string
        -department_code: string
        -parent_id: ObjectId
        -manager_id: ObjectId
        -level: number
        -description: string
        -default_allowances: Allowance[]
    }

    class EmployeePosition {
        -_id: ObjectId
        -employee_id: ObjectId
        -department_id: ObjectId
        -position_name: string
        -start_date: Date
        -end_date: Date
        -is_current: boolean
    }

    class Contract {
        -_id: ObjectId
        -employee_id: ObjectId
        -type: string
        -start_date: Date
        -end_date: Date
        -base_salary: number
        -allowances: Allowance[]
        -status: string
        -template_id: ObjectId
    }

    class Asset {
        -_id: ObjectId
        -asset_name: string
        -status: string
        -assigned_to: ObjectId
        -assigned_date: Date
    }

    User "0..1" --> "1" Employee : employee_id
    Employee "1" --> "0..*" EmployeePosition : position history
    Department "1" --> "0..*" EmployeePosition : department_id
    Department "0..1" --> "0..*" Department : parent_id
    Department "0..1" --> "0..1" Employee : manager_id
    Employee "1" --> "0..*" Contract : employee_id
    Employee "1" --> "0..*" Asset : assigned_to
```

---

### B. Class Diagram: Attendance Module

```mermaid
classDiagram
    class Attendance {
        -id: ObjectId
        -employee: ObjectId
        -checkInTime: Date
        -checkOutTime: Date
        -date: Date
        -status: string
        -device: ObjectId
        -notes: string
        +calculateWorkingHours()
        +isLateCheckIn()
        +isEarlyCheckOut()
    }

    class Device {
        -id: ObjectId
        -code: string
        -name: string
        -location: string
        -status: string
        -firmwareVersion: string
        -ipAddress: string
        -registeredAt: Date
        -lastSyncAt: Date
        +register()
        +getStatus()
        +sync()
    }

    class FaceLog {
        -id: ObjectId
        -employee: ObjectId
        -embedding: number[]
        -quality: number
        -capturedAt: Date
        -device: ObjectId
        -status: string
        +compareWithEmployee()
        +updateEmbedding()
    }

    class FaceRecord {
        -id: ObjectId
        -employee: ObjectId
        -embeddings: number[][]
        -registeredAt: Date
        -updatedAt: Date
        -status: string
        +addEmbedding()
        +removeEmbedding()
        +isRegistered()
    }

    Attendance "0..*" --> "1" Employee
    Attendance "0..*" --> "1" Device
    FaceLog "0..*" --> "1" Employee
    FaceLog "0..*" --> "1" Device
    FaceRecord "1" --> "1" Employee
    Device "1" --> "0..*" Attendance
```

---

### C. Class Diagram: Leave Request Module

```mermaid
classDiagram
    class LeaveRequest {
        -id: ObjectId
        -employee: ObjectId
        -leaveType: ObjectId
        -startDate: Date
        -endDate: Date
        -duration: number
        -reason: string
        -status: string
        -approvedBy: ObjectId
        -approvedAt: Date
        -comments: string
        +calculateDuration()
        +submit()
        +approve()
        +reject()
        +cancel()
    }

    class LeaveType {
        -id: ObjectId
        -name: string
        -code: string
        -color: string
        -description: string
        -maxDaysPerYear: number
        -isCarryOver: boolean
        -carryOverLimit: number
        +updateInfo()
    }

    class LeaveBalance {
        -id: ObjectId
        -employee: ObjectId
        -leaveType: ObjectId
        -year: number
        -entitlement: number
        -used: number
        -remaining: number
        -carriedOver: number
        +calculateRemaining()
        +deductDays()
        +addDays()
    }

    LeaveRequest "0..*" --> "1" Employee
    LeaveRequest "0..*" --> "1" LeaveType
    LeaveRequest "0..*" --> "1" User : approvedBy
    LeaveBalance "0..*" --> "1" Employee
    LeaveBalance "0..*" --> "1" LeaveType
```

---

### D. Class Diagram: Payroll Module

```mermaid
classDiagram
    class Payroll {
        -id: ObjectId
        -employee: ObjectId
        -month: number
        -year: number
        -baseSalary: number
        -allowances: Allowance[]
        -deductions: Deduction[]
        -tax: number
        -netSalary: number
        -status: string
        -generatedAt: Date
        -approvedBy: ObjectId
        -approvedAt: Date
        +calculateGrossSalary()
        +calculateNetSalary()
        +generatePayslip()
    }

    class Allowance {
        -id: ObjectId
        -name: string
        -type: string
        -amount: number
        -description: string
    }

    class Deduction {
        -id: ObjectId
        -name: string
        -type: string
        -amount: number
        -description: string
    }

    class SalaryConfig {
        -id: ObjectId
        -employee: ObjectId
        -baseSalary: number
        -allowances: Allowance[]
        -deductions: Deduction[]
        -taxRate: number
        -effectiveFrom: Date
        -effectiveTo: Date
        +updateConfig()
    }

    Payroll "0..*" --> "1" Employee
    Payroll "0..*" --> "1" User : approvedBy
    Payroll "*" --> "*" Allowance
    Payroll "*" --> "*" Deduction
    SalaryConfig "1" --> "1" Employee
    SalaryConfig "*" --> "*" Allowance
```

---

### E. Class Diagram: Authentication & Authorization

```mermaid
classDiagram
    class User {
        -id: ObjectId
        -email: string
        -password: string
        -firstName: string
        -lastName: string
        -role: Role
        -status: string
        -createdAt: Date
        -updatedAt: Date
        -lastLogin: Date
        +login()
        +logout()
        +changePassword()
        +hasPermission()
    }

    class Role {
        -id: ObjectId
        -name: string
        -description: string
        -permissions: Permission[]
        -status: string
        +addPermission()
        +removePermission()
        +hasPermission()
    }

    class Permission {
        -id: ObjectId
        -name: string
        -resource: string
        -action: string
        -description: string
    }

    class RefreshToken {
        -id: ObjectId
        -user: ObjectId
        -token: string
        -expiresAt: Date
        -createdAt: Date
        -revokedAt: Date
        +isValid()
        +revoke()
    }

    User "0..*" --> "1" Role
    Role "0..*" --> "0..*" Permission
    RefreshToken "0..*" --> "1" User
```

---

### F. Class Diagram: Audit Logging

```mermaid
classDiagram
    class AuditLog {
        -id: ObjectId
        -user: ObjectId
        -action: string
        -resource: string
        -resourceId: ObjectId
        -changes: Object
        -ipAddress: string
        -userAgent: string
        -status: string
        -timestamp: Date
        +log()
        +getHistory()
    }

    class AuditAction {
        -CREATE: string
        -UPDATE: string
        -DELETE: string
        -LOGIN: string
        -LOGOUT: string
        -EXPORT: string
    }

    AuditLog "0..*" --> "1" User
    AuditLog "0..*" --> "1" AuditAction
```

