# IndustrialHR Employee Mobile App

Expo app rieng cho nhan vien. App nay dang nhap bang tai khoan `Employee` trong Admin backend va goi API `admin-system/backend`.

## Chay app

```bash
cd attendance-system/employee-mobile-app
npm install --legacy-peer-deps
npm start
```

Hoac tu thu muc goc:

```bash
npm run dev:employee-mobile
```

## Cau hinh API

Copy `.env.example` thanh `.env` va cau hinh Admin API:

```text
EXPO_PUBLIC_ADMIN_URL=http://<LAN_IP>:5000/api/v1
```

Chi dat endpoint public trong bien `EXPO_PUBLIC_*`. Khong dat API key, JWT,
refresh token, database URL, hoac password vao `.env` cua Expo vi cac gia tri
nay co the bi bundle vao app mobile.

Access token va refresh token duoc luu bang `expo-secure-store` tren thiet bi
ho tro. Ban web preview/dev fallback ve AsyncStorage, vi vay chi dung web
preview cho kiem thu noi bo.

Neu khong co `.env`, app se tu suy ra IP may chay Expo va goi:

```text
http://<LAN_IP>:5000/api/v1
```

Neu dien thoai khong ket noi duoc, mo nut `Cau hinh API` tren man hinh dang nhap va nhap URL backend, vi du:

```text
http://192.168.1.25:5000/api/v1
```

Dien thoai va may tinh chay backend can cung mang Wi-Fi. Backend admin phai dang chay.

## Tai khoan demo

Neu du lieu duoc seed bang `seed:demo`, co the dung:

```text
username: an.nguyen
password: password123
```

App nay chi phu hop cho user co role `Employee`.
