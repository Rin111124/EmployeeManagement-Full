# Huong Dan Trien Khai Thuc Te

Tai lieu nay huong dan dua he thong EmployeeManagement vao su dung thuc te, bao gom backend, database, admin web, AI service va cac ung dung mobile APK.

## 1. Kien Truc Trien Khai Khuyen Nghi

Mo hinh nen dung:

```text
Server production
├── MongoDB
├── Admin backend
├── Admin frontend
├── Attendance service
└── AI service

Thiet bi Android
├── Kiosk app APK
└── Employee app APK
```

Mobile app khong nen dong goi backend/database ben trong APK. APK chi la client goi API ve server.

## 2. Chuan Bi Server

Chon mot may chay 24/7 lam server production.

Cau hinh khuyen nghi:

```text
CPU: 4 core tro len
RAM: toi thieu 8GB, nen 16GB neu dung AI service
Disk: SSD 100GB tro len
OS: Ubuntu Server hoac Windows Server
Network: IP tinh trong LAN hoac domain co dinh
```

Cai dat:

```text
Docker
Docker Compose
```

Vi du dia chi server:

```text
192.168.1.25
```

Hoac domain:

```text
hrm.example.com
```

Tat ca may tinh va dien thoai chay app phai truy cap duoc IP/domain nay.

## 3. Chuan Bi Source Tren Server

Copy source code len server, vi du:

```text
C:\EmployeeManagement
```

hoac:

```text
/opt/EmployeeManagement
```

Di chuyen vao thu muc goc du an:

```powershell
cd C:\EmployeeManagement
```

Neu dung Linux:

```bash
cd /opt/EmployeeManagement
```

## 4. Cau Hinh Moi Truong Production

Tao file `.env.docker` tu file mau:

```powershell
Copy-Item .env.docker.example .env.docker
```

Neu dung Linux:

```bash
cp .env.docker.example .env.docker
```

Sua file `.env.docker`:

```powershell
notepad .env.docker
```

Can thay cac gia tri sau bang secret that. Production that nen dung
HTTPS/domain; backend se tu choi chay voi `NODE_ENV=production` neu
`COOKIE_SECURE` khong phai `true`.

```env
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=CHANGE_TO_STRONG_PASSWORD

JWT_SECRET=CHANGE_TO_64_RANDOM_CHARS
JWT_ACCESS_SECRET=CHANGE_TO_64_RANDOM_CHARS
JWT_REFRESH_SECRET=CHANGE_TO_64_RANDOM_CHARS

NODE_ENV=production
CORS_ORIGIN=https://hrm.example.com
VITE_API_BASE=https://hrm.example.com/api/v1
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax

SYNC_SECRET=CHANGE_TO_32_RANDOM_CHARS
AI_API_KEY=CHANGE_TO_RANDOM_AI_SERVICE_KEY

CHATBOT_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-pro
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.2
```

Neu chi chay thu nghiem trong LAN bang HTTP, khong dat `NODE_ENV=production`.
Dung moi truong staging/development rieng va khong xem day la cau hinh go-live:

```env
NODE_ENV=development
CORS_ORIGIN=http://192.168.1.25:3000
VITE_API_BASE=http://192.168.1.25:5000/api/v1
COOKIE_SECURE=false
```

Khong commit hoac gui file `.env.docker` that cho ben khong co quyen truy cap.

## 5. Khoi Dong He Thong Bang Docker Compose

Chay lenh:

```powershell
docker compose --env-file .env.docker up -d --build
```

Kiem tra container:

```powershell
docker compose --env-file .env.docker ps
```

Trang thai mong muon:

```text
mongodb              healthy
admin-backend        healthy
attendance-service   healthy
ai-service           healthy
admin-frontend       running
```

Lan chay dau tien, `ai-service` co the mat vai phut de tai model `buffalo_l`. Model duoc luu trong Docker volume `ai_models`, nen cac lan restart sau se nhanh hon.

## 6. Kiem Tra Healthcheck

Thay `SERVER_IP_OR_DOMAIN` bang IP/domain that:

```text
http://SERVER_IP_OR_DOMAIN:3000
http://SERVER_IP_OR_DOMAIN:5000/health
http://SERVER_IP_OR_DOMAIN:5001/health
http://SERVER_IP_OR_DOMAIN:8000/
```

Vi du:

```text
http://192.168.1.25:3000
http://192.168.1.25:5000/health
http://192.168.1.25:5001/health
http://192.168.1.25:8000/
```

Neu truy cap tu dien thoai, dam bao dien thoai cung mang LAN hoac truy cap duoc domain public.

## 7. Tao Tai Khoan Admin Va Du Lieu Ban Dau

Neu can tao tai khoan admin mac dinh:

```powershell
docker compose --env-file .env.docker exec admin-backend npm run seed:admin
```

Neu can du lieu demo:

```powershell
docker compose --env-file .env.docker exec admin-backend npm run seed:demo
```

Chi chay seed demo tren moi truong demo/staging. Khong nen dua du lieu demo vao production that neu khach hang da co du lieu rieng.

## 8. Cau Hinh Va Build Kiosk App APK

Sua file kiosk app `.env` truoc khi build:

```powershell
notepad attendance-system\mobile-app\.env
```

Vi du server IP la `192.168.1.25`:

```env
EXPO_PUBLIC_API_HOST=192.168.1.25
EXPO_PUBLIC_ADMIN_URL=http://192.168.1.25:5000
EXPO_PUBLIC_AI_SERVICE_URL=http://192.168.1.25:8000
EXPO_PUBLIC_ATTENDANCE_URL=http://192.168.1.25:5001/api
```

Build APK:

```powershell
cd attendance-system\mobile-app
eas build -p android --profile preview
```

Tai file APK tu link EAS tra ve, dat ten de ban giao:

```text
kiosk-app-v1.0.0.apk
```

## 9. Cau Hinh Va Build Employee App APK

Sua file employee app `.env`:

```powershell
notepad attendance-system\employee-mobile-app\.env
```

Vi du:

```env
EXPO_PUBLIC_API_HOST=192.168.1.25
EXPO_PUBLIC_ADMIN_URL=http://192.168.1.25:5000/api/v1
```

Build APK:

```powershell
cd attendance-system\employee-mobile-app
eas build -p android --profile preview
```

Tai file APK tu link EAS tra ve, dat ten:

```text
employee-app-v1.0.0.apk
```

## 10. Cai Dat APK Len Thiet Bi Android

Tren thiet bi Android:

```text
1. Cho phep cai ung dung tu nguon ben ngoai neu can.
2. Cai kiosk-app-v1.0.0.apk tren thiet bi kiosk.
3. Cai employee-app-v1.0.0.apk tren dien thoai nhan vien.
4. Mo app va kiem tra dang nhap/ket noi server.
```

Kiosk app can quyen camera de nhan dien khuon mat.

## 11. Kiem Tra Quy Trinh Nghiep Vu

Truoc khi go-live, kiem tra cac luong sau:

```text
1. Dang nhap admin web.
2. Tao phong ban.
3. Tao nhan vien.
4. Dang ky khuon mat nhan vien.
5. Dong bo nhan vien sang kiosk/attendance service.
6. Cham cong bang kiosk app.
7. Xem lich su cham cong tren admin web.
8. Dang nhap employee app.
9. Xem thong tin ca nhan/cham cong tren employee app.
```

Neu kiosk khong ket noi duoc server, kiem tra lai:

```text
- Dien thoai va server co cung mang khong.
- IP/domain trong APK co dung khong.
- Firewall server co mo port 5000, 5001, 8000 khong.
- Backend co dang healthy khong.
```

## 12. Backup Database

Tao backup MongoDB:

```powershell
docker compose --env-file .env.docker exec mongodb mongodump --username admin --password YOUR_PASSWORD --authenticationDatabase admin --out /tmp/backup
```

Copy backup ra host:

```powershell
$mongoContainer = docker compose --env-file .env.docker ps -q mongodb
docker cp "${mongoContainer}:/tmp/backup" C:\EmployeeManagement-backups\mongo-backup
```

Nen dat lich backup hang ngay hoac hang tuan tuy quy mo su dung.

## 13. Restore Database

Copy backup vao container:

```powershell
$mongoContainer = docker compose --env-file .env.docker ps -q mongodb
docker cp C:\EmployeeManagement-backups\mongo-backup "${mongoContainer}:/tmp/restore"
```

Restore:

```powershell
docker compose --env-file .env.docker exec mongodb mongorestore --username admin --password YOUR_PASSWORD --authenticationDatabase admin /tmp/restore
```

Chi restore khi da xac dinh ro moi truong va co backup hien tai.

## 14. Cap Nhat Phien Ban

Khi co source moi:

```powershell
docker compose --env-file .env.docker down
docker compose --env-file .env.docker up -d --build
```

Khong dung lenh sau neu khong muon xoa database:

```powershell
docker compose down -v
```

`down -v` se xoa Docker volume, bao gom du lieu MongoDB va AI model cache.

## 15. Checklist Go-Live

- [ ] Server co IP tinh hoac domain co dinh.
- [ ] Docker va Docker Compose da cai dat.
- [ ] `.env.docker` da cau hinh secret production.
- [ ] `CORS_ORIGIN` va `VITE_API_BASE` dung IP/domain production.
- [ ] Docker Compose chay thanh cong.
- [ ] MongoDB healthy.
- [ ] Admin backend healthy.
- [ ] Attendance service healthy.
- [ ] AI service healthy.
- [ ] Admin frontend truy cap duoc.
- [ ] Kiosk APK build bang dung IP/domain production.
- [ ] Employee APK build bang dung IP/domain production.
- [ ] Thiet bi Android truy cap duoc server.
- [ ] Camera permission tren kiosk app da duoc cap.
- [ ] Tai khoan admin da tao.
- [ ] Quy trinh tao nhan vien, dang ky khuon mat, cham cong da test.
- [ ] Backup database da duoc thiet lap.
- [ ] File `.env.docker` that khong nam trong goi source code ban giao.
