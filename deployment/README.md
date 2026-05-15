# Huong Dan Trien Khai Backend Va Database

Tai lieu nay huong dan trien khai backend, database, admin web app, attendance service va AI service bang Docker Compose.

## Cac Service Duoc Trien Khai

```text
mongodb             MongoDB database
admin-backend       Express API cho admin system
admin-frontend      React admin web app chay bang Nginx
attendance-service  Express API cho cham cong
ai-service          FastAPI face recognition service
```

## Yeu Cau Server

Cai dat cac thanh phan sau tren server:

```text
Docker
Docker Compose
```

Server can mo cac cong sau neu client truy cap truc tiep:

```text
3000  Admin web app
5000  Admin backend API
5001  Attendance API
8000  AI service
27017 MongoDB, tuy chon va nen de private
```

Voi production, chi nen de MongoDB truy cap trong mang Docker, tru khi co ly do van hanh ro rang.

## 1. Chuan Bi File Moi Truong

Tu thu muc goc du an:

```powershell
Copy-Item .env.docker.example .env.docker
```

Sua `.env.docker`:

```powershell
notepad .env.docker
```

Dien cac gia tri production manh:

```text
MONGO_ROOT_USER
MONGO_ROOT_PASSWORD
JWT_SECRET
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
SYNC_SECRET
AI_API_KEY
```

Dien URL theo IP hoac domain that cua server:

```env
CORS_ORIGIN=http://SERVER_IP_OR_DOMAIN:3000
VITE_API_BASE=http://SERVER_IP_OR_DOMAIN:5000/api/v1
```

Neu dung HTTPS:

```env
CORS_ORIGIN=https://your-domain.com
VITE_API_BASE=https://your-domain.com/api/v1
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
```

Khong commit hoac gui file `.env.docker` that trong goi source code.

## 2. Khoi Dong He Thong

Tu thu muc goc du an:

```powershell
docker compose --env-file .env.docker up -d --build
```

Lan khoi dong dau tien cua `ai-service` co the mat vai phut vi service phai tai model nhan dien khuon mat `buffalo_l`. Model nay duoc luu trong Docker volume `ai_models`, nen cac lan restart sau se nhanh hon.

Kiem tra container dang chay:

```powershell
docker compose --env-file .env.docker ps
```

Kiem tra logs:

```powershell
docker compose --env-file .env.docker logs -f admin-backend
docker compose --env-file .env.docker logs -f attendance-service
docker compose --env-file .env.docker logs -f ai-service
```

## 3. Kiem Tra Healthcheck

Mo cac URL sau tu server hoac may khac cung mang:

```text
http://SERVER_IP_OR_DOMAIN:3000
http://SERVER_IP_OR_DOMAIN:5000/health
http://SERVER_IP_OR_DOMAIN:5001/health
http://SERVER_IP_OR_DOMAIN:8000/
```

Neu mobile app chay tren dien thoai that, dien thoai phai truy cap duoc IP/domain cua server qua mang.

## 4. Cau Hinh URL Cho Mobile App

Build APK voi URL khop voi server deployment.

Kiosk app `.env` example:

```env
EXPO_PUBLIC_API_HOST=SERVER_IP_OR_DOMAIN
EXPO_PUBLIC_ADMIN_URL=http://SERVER_IP_OR_DOMAIN:5000
EXPO_PUBLIC_AI_SERVICE_URL=http://SERVER_IP_OR_DOMAIN:8000
EXPO_PUBLIC_ATTENDANCE_URL=http://SERVER_IP_OR_DOMAIN:5001/api
```

Employee app `.env` example:

```env
EXPO_PUBLIC_API_HOST=SERVER_IP_OR_DOMAIN
EXPO_PUBLIC_ADMIN_URL=http://SERVER_IP_OR_DOMAIN:5000/api/v1
```

Khong dung `localhost` khi build APK. Tren dien thoai, `localhost` la chinh dien thoai, khong phai server deployment.

## 5. Dung He Thong

Dung service ma khong xoa du lieu database:

```powershell
docker compose --env-file .env.docker down
```

Dung service va xoa MongoDB volume:

```powershell
docker compose --env-file .env.docker down -v
```

Chi dung `down -v` khi that su muon xoa du lieu database.

## 6. Database Backup

Tao MongoDB dump tu Docker deployment dang chay:

```powershell
docker compose --env-file .env.docker exec mongodb mongodump --username admin --password YOUR_PASSWORD --authenticationDatabase admin --out /tmp/backup
```

Copy dump tu container ra may host:

```powershell
$mongoContainer = docker compose --env-file .env.docker ps -q mongodb
docker cp "${mongoContainer}:/tmp/backup" E:\EmployeeManagement-delivery\database\mongo-backup
```

Kiem tra container id:

```powershell
docker compose --env-file .env.docker ps
```

## 7. Restore Database

Copy thu muc backup vao MongoDB container:

```powershell
$mongoContainer = docker compose --env-file .env.docker ps -q mongodb
docker cp E:\EmployeeManagement-delivery\database\mongo-backup "${mongoContainer}:/tmp/restore"
```

Restore:

```powershell
docker compose --env-file .env.docker exec mongodb mongorestore --username admin --password YOUR_PASSWORD --authenticationDatabase admin /tmp/restore
```

## 8. File Can Ban Giao

Doi voi backend/database deployment, can bao gom:

```text
source-code.zip
deployment/README.md
docker-compose.yml
.env.docker.example
```

Khong bao gom:

```text
.env.docker
.env
node_modules/
.venv/
dist/
build/
database dump production neu khach hang khong yeu cau ro rang
```
