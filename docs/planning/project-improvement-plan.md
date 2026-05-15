# EmployeeManagement Improvement Plan

Tai lieu nay gom cac viec can lam de nang chat luong demo, bao cao thuc tap va kha nang trien khai thuc te cua du an.

## Uu tien cao

### 1. Khoa chat luong cham cong kiosk

- Giam log debug trong mobile app/kiosk o ban production.
- Kiem tra day du luong: dang ky thiet bi -> Admin duyet -> claim device token -> dong bo nhan vien -> dang ky khuon mat -> check-in/check-out.
- Khong ghi token, claim code, embedding hoac thong tin noi bo nhay cam ra console.

### 2. Gia co nghiep vu tinh luong

- Luong co ban va phu cap phai tinh theo gio cong thuc te.
- Nhan vien khong co gio cong trong ky thi khong nhan luong co ban/phu cap.
- Tang ca chi duoc tinh khi yeu cau da duoc duyet.
- Khong cho tao lai bang luong da finalized.
- Khong cho khoan khau tru lon hon tong thu nhap.

### 3. Hoan thien du lieu demo

- Tao san tai khoan Admin, HR va Employee.
- Tao du lieu nhan vien, phong ban, chuc vu, hop dong, ca lam, cham cong, nghi phep, tang ca va bang luong.
- Dam bao moi man hinh quan trong co du lieu de chup hinh bao cao.

## Uu tien trung binh

### 4. Cai thien frontend TypeScript

- Tao type dung chung cho Employee, Contract, Attendance, Payroll, LeaveRequest, OvertimeRequest va Device.
- Giam su dung `any` trong cac page va hook chinh.
- Chuan hoa response API trong `src/lib/api.ts`.

### 5. Bo sung thong ke va bao cao

- Ty le di lam/vang mat trong ngay.
- Tong gio cong theo thang.
- Tong quy luong theo thang.
- Danh sach nhan vien chua cham cong.
- Top nhan vien tang ca nhieu.
- Thong ke nghi phep theo trang thai.

### 6. Tai lieu hoa de bao ve

- So do kien truc tong the.
- So do use case tong quat.
- So do luong cham cong kiosk.
- So do luong tinh luong.
- Bang API chinh cho cac module quan trong.

## Uu tien dai han

### 7. Thay AI fallback bang model nhan dien that

`attendance-system/ai-service` hien tai phu hop demo, chua phai model sinh trac hoc chuyen dung. Khi dung thuc te can thay bang model nhu InsightFace hoac MediaPipe va danh gia lai nguong matching.

### 8. Trien khai va van hanh

- Docker hoa cac service: admin backend, admin frontend, attendance service, AI service va MongoDB.
- Them logging tap trung, health check va readiness check.
- Bo sung backup MongoDB va quy trinh restore.
- Them CI de chay test/lint/build truoc khi merge.

## Checklist truoc khi demo

- Chay `npm.cmd test` trong `admin-system/backend`.
- Chay lint/build frontend neu co thay doi giao dien.
- Kiem tra `.env` khong chua secret demo yeu.
- Kiem tra dashboard, employee, attendance, payroll, device va chatbot co du lieu.
- Chup hinh cac man hinh chinh cho Chương 3 cua bao cao.
