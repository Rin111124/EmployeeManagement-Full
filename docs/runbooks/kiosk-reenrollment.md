# Runbook: Kiosk Re-enrollment

**Phạm vi:** P0-KIOSK-07 — Migration từ legacy token sang challenge-response enrollment  
**Người thực hiện:** Backend Engineer (BE) + Mobile Engineer (MOB)  
**Người phê duyệt:** Engineering Lead (EL)  
**Thời gian ước tính:** 2–4 giờ (tùy số lượng kiosk)

---

## Bối cảnh

Hệ thống đã được nâng cấp từ flow cấp token đơn giản (claim_code / plaintext token) sang
flow challenge-response với bootstrap credential. Tất cả token cũ phải bị revoke để đảm bảo
không còn thiết bị nào dùng phương thức xác thực không an toàn.

**Sau khi migration:**
- Kiosk sẽ bị ngắt kết nối (token cũ không còn hợp lệ).
- Kiosk phải re-enroll để nhận token mới.
- Chỉ thiết bị có `bootstrap_hash` đã đăng ký mới có thể re-enroll tự động.

---

## Điều kiện tiên quyết

- [ ] Bootstrap credential đã được cài trên firmware/app của tất cả kiosk.
- [ ] `bootstrap_hash` (SHA-256 của bootstrap credential) đã được cập nhật vào DB cho từng device.
- [ ] Đã thông báo trước cho đội vận hành tối thiểu **24 giờ** trước khi revoke production.
- [ ] Maintenance window đã được thống nhất.
- [ ] Backup DB MongoDB đã được tạo trong vòng 1 giờ trước khi thực hiện.

---

## Bước 1 — Dry-run kiểm tra

Chạy script ở chế độ dry-run để xem danh sách thiết bị sẽ bị ảnh hưởng:

```bash
cd admin-system/backend
node scripts/migrations/revoke-legacy-tokens.js --dry-run
```

Kiểm tra output:
- Xem bảng danh sách thiết bị: cột `has_bootstrap` phải là `YES` cho tất cả.
- Nếu có thiết bị `has_bootstrap = NO ⚠️`: **DỪNG** — cài bootstrap trước.

---

## Bước 2 — Cài bootstrap cho thiết bị chưa có (nếu cần)

Với mỗi kiosk chưa có `bootstrap_hash`:

1. Trên thiết bị kiosk: tạo hoặc lấy bootstrap credential từ Android Keystore / Expo SecureStore.
2. Tính hash: `SHA-256(bootstrap_credential)` → lấy hex string.
3. Cập nhật DB qua Admin API:
   ```bash
   curl -X POST https://your-admin-host/api/v1/devices/request-access \
     -H "Content-Type: application/json" \
     -d '{
       "device_name": "KIOSK_NAME",
       "device_id": "KIOSK_UUID",
       "bootstrap_hash": "SHA256_HEX_HERE",
       "ip_address": "KIOSK_IP",
       "location": "KIOSK_LOCATION"
     }'
   ```
   Hoặc chỉnh trực tiếp qua DB nếu device đã tồn tại:
   ```js
   db.devices.updateOne(
     { device_id: "KIOSK_UUID" },
     { $set: { bootstrap_hash: "SHA256_HEX_HERE" } }
   )
   ```

4. Chạy lại dry-run để xác nhận.

---

## Bước 3 — Thực hiện revoke production

> [!CAUTION]
> Chạy lệnh này sẽ ngắt kết nối tất cả kiosk ngay lập tức.

```bash
cd admin-system/backend
node scripts/migrations/revoke-legacy-tokens.js --execute
```

Script sẽ yêu cầu nhập `REVOKE` để xác nhận. Để bỏ qua (automation/CI):

```bash
node scripts/migrations/revoke-legacy-tokens.js --execute --yes
```

Options:
| Flag | Mô tả |
|---|---|
| `--dry-run` | Chỉ in danh sách, không thay đổi (mặc định) |
| `--execute` | Thực sự revoke |
| `--batch-size=N` | Số device/batch (mặc định 10) |
| `--mongo-uri=URI` | Override MongoDB URI |
| `--yes` | Bỏ qua xác nhận |

---

## Bước 4 — Xác nhận DB sạch

Sau khi script hoàn thành, verify qua MongoDB:

```js
// Phải trả về 0
db.devices.countDocuments({
  $or: [
    { device_token: { $exists: true } },
    { claim_code_hash: { $exists: true } }
  ]
})
```

Và kiểm tra audit log:
```js
db.auditlogs.find({ action: "DEVICE_LEGACY_TOKEN_REVOKED" }).count()
// Phải bằng số device đã revoke
```

---

## Bước 5 — Kiosk re-enroll

Mỗi kiosk cần thực hiện flow re-enrollment:

### 5a. Request challenge

```http
POST /api/v1/devices/enroll/challenge
Content-Type: application/json

{
  "device_id": "KIOSK_UUID"
}
```

Response:
```json
{
  "status": "success",
  "challenge": "abc123...hex64chars",
  "expires_in_seconds": 300
}
```

### 5b. Tính proof (trên kiosk)

```js
// HMAC-SHA256(bootstrap_credential, challenge)
const proof = HMAC_SHA256(bootstrap_credential, challenge);
```

### 5c. Claim token

```http
POST /api/v1/devices/claim-token
Content-Type: application/json

{
  "device_id": "KIOSK_UUID",
  "challenge": "abc123...hex64chars",
  "proof": "proof_hex_here"
}
```

Response:
```json
{
  "status": "success",
  "device_token": "new_token_here",
  "scopes": ["attendance:write", "biometric:request"]
}
```

### 5d. Lưu token an toàn

Token mới phải được lưu trong **Android Keystore / Expo SecureStore**, không bao giờ log ra.

---

## Bước 6 — Xác nhận hoạt động

Sau re-enrollment, test kiosk:

```http
POST /api/v1/devices/report-log
x-device-token: new_token_here
```

Phải trả về `200 OK`.

---

## Rollback

Nếu có lỗi nghiêm trọng trong quá trình:

1. **Restore MongoDB** từ backup đã tạo ở bước tiên quyết.
2. Chạy lại kiểm tra: `db.devices.countDocuments({ device_token: { $exists: true } })` — phải lớn hơn 0.
3. Kiosk sẽ hoạt động lại với token cũ.
4. Điều tra nguyên nhân, fix trước khi retry.

---

## Ghi chú

- Challenge có TTL 5 phút, one-time use, giới hạn 3 lần thử.
- Token mới có scope: `attendance:write`, `biometric:request`.
- Tất cả thao tác được ghi vào audit log — kiểm tra qua Admin UI → Audit Log.
- Nếu kiosk không có bootstrap credential, liên hệ Mobile Engineer (MOB) để cập nhật firmware.

---

**Người phê duyệt:** _________________ (EL)  
**Ngày thực hiện:** _________________  
**Kết quả:** ☐ Thành công  ☐ Rollback  
**Ghi chú thực hiện:** _________________
