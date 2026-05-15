# Huong Dan Dong Goi Ban Giao

Tai lieu nay huong dan cach dong goi du an EmployeeManagement de ban giao cho khach hang, bao gom source code, cau hinh trien khai Docker, tai lieu, database va file APK cho cac ung dung mobile.

## 1. Chuan Bi Truoc Khi Dong Goi

Di chuyen vao thu muc goc du an:

```powershell
cd E:\EmployeeManagement
```

Kiem tra trang thai Git:

```powershell
git status --short
```

Neu co thay doi can ban giao, hay commit hoac dam bao chung duoc dua vao goi source code.

Khong dua cac file va thu muc sau vao goi ban giao source:

```text
.env
.env.*
!.env.example
!.env.docker.example
node_modules/
.venv/
dist/
build/
coverage/
uploads/
.expo/
.cache/
__pycache__/
*.log
```

Chi ban giao cac file cau hinh mau nhu:

```text
.env.example
.env.docker.example
```

## 2. Kiem Thu Truoc Khi Ban Giao

Chay cac lenh kiem tra tu thu muc goc:

```powershell
npm run test:admin-backend
npm run test:attendance-service
npm run lint:admin-frontend
npm run build:admin-frontend
npm run lint:mobile
```

Neu co loi, nen xu ly truoc khi tao goi ban giao.

## 3. Tao Thu Muc Ban Giao

```powershell
New-Item -ItemType Directory -Path E:\EmployeeManagement-delivery -Force
New-Item -ItemType Directory -Path E:\EmployeeManagement-delivery\deployment -Force
New-Item -ItemType Directory -Path E:\EmployeeManagement-delivery\documentation -Force
New-Item -ItemType Directory -Path E:\EmployeeManagement-delivery\mobile-builds -Force
New-Item -ItemType Directory -Path E:\EmployeeManagement-delivery\database -Force
```

Ket qua mong muon:

```text
EmployeeManagement-delivery/
├── source-code.zip
├── deployment/
├── documentation/
├── mobile-builds/
└── database/
```

## 4. Dong Goi Source Code Sach

Neu dang lam viec trong ban source hien tai, co the dung script san co:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\package-handover.ps1
```

Script nay se tao cau truc ban giao tai:

```text
E:\EmployeeManagement-delivery
```

va tao file:

```text
E:\EmployeeManagement-delivery\source-code.zip
```

Neu du an dang duoc quan ly bang Git, co the dung lenh sau de tao file source code sach thay cho script:

```powershell
git archive --format=zip --output=E:\EmployeeManagement-delivery\source-code.zip HEAD
```

Lenh `git archive` chi dung duoc khi thu muc hien tai co `.git`. Cach nay chi dong goi cac file da duoc Git theo doi, giup tranh dua nham `node_modules`, `.env`, `.venv`, cache hoac file build vao goi ban giao.

Neu co file moi chua commit nhung can ban giao, hay commit truoc hoac tao ban zip thu cong co kiem soat.

## 5. Dong Goi Cau Hinh Trien Khai Docker

Copy cac file trien khai can thiet:

```powershell
Copy-Item docker-compose.yml E:\EmployeeManagement-delivery\deployment\
Copy-Item .env.docker.example E:\EmployeeManagement-delivery\deployment\
Copy-Item deployment\README.md E:\EmployeeManagement-delivery\deployment\BACKEND_DATABASE_DEPLOYMENT.md
```

Khong copy file `.env.docker` that vao goi ban giao.

Khach hang se tao file cau hinh rieng:

```powershell
Copy-Item .env.docker.example .env.docker
```

Sau do dien cac gia tri production:

```text
MONGO_ROOT_USER
MONGO_ROOT_PASSWORD
JWT_SECRET
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
SYNC_SECRET
AI_API_KEY
GEMINI_API_KEY hoac OPENAI_API_KEY neu dung chatbot
CORS_ORIGIN
COOKIE_SECURE
COOKIE_SAME_SITE
```

Lenh chay production bang Docker Compose:

```powershell
docker compose --env-file .env.docker up -d --build
```

Lenh dung he thong:

```powershell
docker compose --env-file .env.docker down
```

Cac cong mac dinh:

```text
Admin frontend:     http://localhost:3000
Admin backend API:  http://localhost:5000
Attendance API:     http://localhost:5001
AI service:         http://localhost:8000
MongoDB:            localhost:27017
```

## 6. Dong Goi Tai Lieu

Copy tai lieu vao thu muc ban giao:

```powershell
Copy-Item README.md E:\EmployeeManagement-delivery\documentation\
Copy-Item docs E:\EmployeeManagement-delivery\documentation\docs -Recurse
Copy-Item uml-diagrams E:\EmployeeManagement-delivery\documentation\uml-diagrams -Recurse
Copy-Item admin-system\backend\README.md E:\EmployeeManagement-delivery\documentation\admin-backend-README.md
Copy-Item admin-system\backend\docs\api-examples.md E:\EmployeeManagement-delivery\documentation\api-examples.md
Copy-Item admin-system\frontend\README.md E:\EmployeeManagement-delivery\documentation\admin-frontend-README.md
Copy-Item attendance-system\README.md E:\EmployeeManagement-delivery\documentation\attendance-system-README.md
Copy-Item HANDOVER_PACKAGING_GUIDE.md E:\EmployeeManagement-delivery\documentation\
Copy-Item PRODUCTION_DEPLOYMENT_GUIDE.md E:\EmployeeManagement-delivery\documentation\
```

## 7. Build APK Cho Mobile App

Du an co 2 ung dung mobile:

```text
attendance-system/mobile-app              # Kiosk app
attendance-system/employee-mobile-app     # Employee app
```

Hai app da co file `eas.json` voi profile `preview` de build APK.

### 7.1. Cai EAS CLI

```powershell
npm install -g eas-cli
```

Dang nhap Expo:

```powershell
eas login
```

### 7.2. Kiem Tra Cau Hinh API Truoc Khi Build

Kiosk app:

```powershell
notepad E:\EmployeeManagement\attendance-system\mobile-app\.env
```

Employee app:

```powershell
notepad E:\EmployeeManagement\attendance-system\employee-mobile-app\.env
```

Chi de cac bien public trong file `.env`, vi cac bien `EXPO_PUBLIC_*` se duoc dong truc tiep vao APK.

Vi du cau hinh theo IP noi bo:

```env
EXPO_PUBLIC_API_HOST=192.168.1.25
EXPO_PUBLIC_ADMIN_URL=http://192.168.1.25:5000/api/v1
EXPO_PUBLIC_AI_SERVICE_URL=http://192.168.1.25:8000
EXPO_PUBLIC_ATTENDANCE_URL=http://192.168.1.25:5001/api
```

Khong dua password, JWT secret, database URL, API key rieng tu hoac token vao file `.env` cua Expo app.

### 7.3. Build APK Kiosk App

```powershell
cd E:\EmployeeManagement\attendance-system\mobile-app
eas build -p android --profile preview
```

Sau khi build xong, Expo se hien link tai file `.apk`.

Tai file APK ve va dat vao:

```text
E:\EmployeeManagement-delivery\mobile-builds\kiosk-app-v1.0.0.apk
```

### 7.4. Build APK Employee App

```powershell
cd E:\EmployeeManagement\attendance-system\employee-mobile-app
eas build -p android --profile preview
```

Tai file APK ve va dat vao:

```text
E:\EmployeeManagement-delivery\mobile-builds\employee-app-v1.0.0.apk
```

### 7.5. Build AAB Neu Dua Len Google Play

Neu khach hang can dua len Google Play, build file AAB thay vi APK:

```powershell
eas build -p android --profile production
```

Profile `production` trong `eas.json` dang duoc cau hinh de xuat Android App Bundle.

## 8. Dong Goi Database

Neu ban giao du lieu mau hoac du lieu production, dat file dump vao:

```text
E:\EmployeeManagement-delivery\database\
```

Khong de database dump trong source code.

Neu dung MongoDB trong Docker Compose, co the tao backup bang `mongodump` tuy theo moi truong trien khai thuc te. Nen ghi ro:

```text
- Ten database
- Thoi diem backup
- Moi truong backup: demo, staging hay production
- Cach restore
```

## 9. Tao File Nen Ban Giao Cuoi Cung

Sau khi da co source code, tai lieu, APK va database neu can, nen toan bo thu muc ban giao:

```powershell
Compress-Archive -Path E:\EmployeeManagement-delivery\* -DestinationPath E:\EmployeeManagement-delivery.zip -Force
```

File gui cho khach hang:

```text
E:\EmployeeManagement-delivery.zip
```

## 10. Checklist Truoc Khi Gui Khach Hang

- [ ] Da chay test/lint/build can thiet.
- [ ] `source-code.zip` khong chua `.env`, `.env.docker`, `node_modules`, `.venv`, `dist`, `build`, log hoac cache.
- [ ] Thu muc `deployment` co `docker-compose.yml` va `.env.docker.example`.
- [ ] Thu muc `documentation` co README, API examples, tai lieu backend/frontend/attendance va UML.
- [ ] Thu muc `mobile-builds` co APK kiosk app.
- [ ] Thu muc `mobile-builds` co APK employee app.
- [ ] APK da duoc build voi dung IP/domain backend cua khach hang.
- [ ] Neu co database dump, da dat trong thu muc `database` va ghi ro cach restore.
- [ ] Secret production duoc ban giao qua kenh rieng, khong nam trong source code.
- [ ] Da kiem tra chay thu bang Docker Compose tren mot may sach neu co the.
