# Review Luồng Đăng Ký Khuôn Mặt cho Nhân Viên Mới

**Ngày Review**: May 6, 2026  
**Trạng Thái**: ⚠️ WIP - Có gap lớn cần xử lý  
**Ưu Tiên**: 🔴 Critical - Khối chặn attendance system  

---

## 📋 EXECUTIVE SUMMARY

Luồng đăng ký khuôn mặt hiện tại có **3 thành phần chính** tương tác:
1. **Admin System** (Backend + Frontend) - Quản lý nhân viên & xác nhận đăng ký
2. **Attendance Service** - Lưu trữ face embedding cục bộ & liên lạc với Admin
3. **Mobile App** (Expo/React Native) - Kiosk terminal chụp ảnh & đăng ký
4. **AI Service** (Python FastAPI) - Trích xuất face embedding từ ảnh

**Kết luận**: Kiến trúc tổng thể tốt, nhưng **có gaps lớn trong implementation**:
- ❌ Mobile app **không có** camera & face capture logic
- ❌ AI Service dùng **fallback mock** (không real face recognition)
- ❌ Face embedding không được **xác minh/so khớp** khi check-in
- ⚠️ Frontend **chưa có UI** để quản lý face data

---

## 🏗️ KIẾN TRÚC HIỆN TẠI

### 1️⃣ Admin System - Backend (Node.js/Express)

#### Face Data Model
```typescript
// Employee.face_data: Array of FaceData
interface FaceData {
  label?: string                    // Mô tả (e.g., "REGISTERED_AT_KIOSK")
  embedding: number[]              // 512-dim vector từ InsightFace
  image_path?: string              // Path ảnh (tùy chọn)
  provider: string                 // 'manual' | 'kiosk' | 'insightface'
  created_at: Date
}

// Face Logs (tách biệt): Lưu lịch sử face recognition attempts
interface FaceLog {
  employee_id: ObjectId
  confidence: number (0-1)
  captured_image: string
  detected_at: Date
  status: string
}
```

#### Face Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/employees/:id/face-data` | POST | Admin | Thêm face data manual |
| `/api/v1/employees/:id/confirm-biometrics` | PATCH | Device \| Admin \| Sync | Xác nhận đăng ký (được gọi từ Attendance Service) |

**Lưu ý**: Endpoint `confirm-biometrics` không lưu vector embedding, chỉ lưu placeholder:
```javascript
{
  label: 'REGISTERED_AT_KIOSK',
  provider: 'kiosk',
  embedding: []  // Vector được lưu cục bộ trong Attendance Service
}
```

#### Authorization
- **`/face-data` (POST)**: Yêu cầu admin role
- **`/confirm-biometrics` (PATCH)**: Linh hoạt - chấp nhận:
  - `x-sync-secret` header (từ Attendance Service)
  - `x-device-token` header (từ Mobile App)
  - JWT token (từ Admin Frontend)

---

### 2️⃣ Attendance Service - Local Database (Node.js)

#### Local Models
```javascript
// LocalEmployee: Lưu face embedding cục bộ
{
  employee_id: String    // Tham chiếu đến Employee._id từ Admin
  full_name: String
  face_embedding: Number[]  // 512-dim InsightFace vector
  last_sync: Date
}

// LocalDevice: Lưu thiết bị Kiosk đã đăng ký
{
  device_id: String
  device_name: String
  location: String
  ip_address: String
  status: 'online' | 'offline'
  last_seen: Date
}
```

#### Registration Endpoint
```
POST /api/registration/enroll
Headers: (none required - public endpoint)
Body: {
  employee_id: string,
  full_name: string,
  embedding: number[],          // 512-dim vector
  device_id: string,
  device_token: string,         // (tùy chọn)
  admin_url: string             // URL callback đến Admin
}

Response:
{
  success: true,
  data: { employee_id }
}
```

**Luồng**:
1. Lưu face embedding vào `LocalEmployee` database (Attendance Service)
2. Gọi Admin API: `PATCH /api/v1/employees/{id}/confirm-biometrics`
   - Headers: `x-sync-secret` hoặc `x-device-token`
   - Admin thêm placeholder vào `face_data` array

---

### 3️⃣ AI Service - Face Extraction (Python FastAPI)

#### Model
- **InsightFace** (buffalo_l model)
- 512-dim embeddings
- GPU acceleration (DirectML cho Windows)

#### Endpoint
```
POST /extract-features
Content-Type: multipart/form-data
File: image (JPEG/PNG)

Response:
{
  success: true,
  embedding: number[],           // 512-dim vector
  embedding_size: 512,
  face_count: number,
  face_confidence: float (0-1)
}

Errors:
- 400: File trống
- 422: Không phát hiện khuôn mặt / Format ảnh sai
- 500: AI processing error
```

---

### 4️⃣ Mobile App (Expo/React Native)

#### Hiện Trạng
- ❌ **Chưa implement** camera integration
- ❌ **Chưa implement** face capture flow
- ❌ **Chưa implement** gọi AI Service
- ❌ **Chưa implement** gọi Attendance Service

---

## 🔄 FACE ENROLLMENT FLOW - HIỆN TẠI

```
┌─────────────────────────────────────────────────────────────┐
│ FLOW: Đăng Ký Khuôn Mặt Nhân Viên Mới (IDEAL - INCOMPLETE) │
└─────────────────────────────────────────────────────────────┘

1. NHÂN VIÊN ĐẾN KIOSK
   ├─ Mobile App hiển thị màn hình "Face Registration"
   ├─ Yêu cầu cấp phép camera ❌ NOT IMPLEMENTED
   └─ Hiển thị camera preview ❌ NOT IMPLEMENTED

2. NHÂN VIÊN CHỤP ÃNH
   ├─ Bấm nút "Capture" ❌ NOT IMPLEMENTED
   ├─ Mobile chụp ảnh từ camera ❌ NOT IMPLEMENTED
   └─ Preview ảnh trước khi gửi ❌ NOT IMPLEMENTED

3. GỬI ĐẾN AI SERVICE
   ├─ Mobile POST /extract-features ❌ NOT IMPLEMENTED
   │  (Image file → AI Service)
   ├─ AI: Detect face & extract embedding ✅ IMPLEMENTED
   └─ Response: 512-dim vector ✅ IMPLEMENTED

4. LƯU VÀO ATTENDANCE SERVICE
   ├─ Mobile POST /api/registration/enroll ❌ LOGIC OK, BUT NO MOBILE CODE
   │  {
   │    employee_id,
   │    embedding: [512-dim vector],
   │    device_token,
   │    admin_url
   │  }
   ├─ Attendance Service:
   │  ├─ Lưu vào LocalEmployee ✅ IMPLEMENTED
   │  └─ Gọi Admin API: confirm-biometrics ✅ IMPLEMENTED
   └─ Response: success

5. XÁC NHẬN TẠI ADMIN
   ├─ Admin API nhận callback từ Attendance ✅ IMPLEMENTED
   ├─ Thêm placeholder vào Employee.face_data ✅ IMPLEMENTED
   │  {
   │    label: "REGISTERED_AT_KIOSK",
   │    provider: "kiosk",
   │    embedding: []
   │  }
   ├─ Frontend hiển thị thông báo ❌ NOT IMPLEMENTED
   └─ Database đã lưu ✅ IMPLEMENTED (DATABASE)

6. FLOW HOÀN THÀNH
   ├─ Attendance Service: Vector lưu cục bộ ✅
   ├─ Admin System: Biết nhân viên đã đăng ký ✅
   └─ Mobile App: Xác nhận với user ❌ NOT IMPLEMENTED
```

---

## 🔍 GAPS & ISSUES

### 🔴 CRITICAL BLOCKERS

#### 1. Mobile App: Không có Camera & Capture Logic
**Impact**: Không thể đăng ký khuôn mặt từ kiosk  
**Current**: App structure exists nhưng zero camera implementation  
**Files**: 
- `attendance-system/mobile-app/app/` (empty)
- `attendance-system/mobile-app/src/` (no registration screens)

**Fix Required**:
```typescript
// TODO: Implement in mobile app
1. Permission request (Camera)
2. CameraView component
3. Capture handler
4. Image validation (size, format)
5. Upload to AI Service
6. Call Attendance Service /enroll
7. UI feedback (success/error/retry)
```

**Estimate**: 1-1.5 weeks | Owner: Mobile Engineer

---

#### 2. AI Service: Fallback Mock Implementation
**Impact**: Không phát hiện/xác minh khuôn mặt thực tế  
**Current**: InsightFace code có sẵn trong `main.py` ✅  
**Issue**: Có vẻ là placeholder, chưa test kỹ  

**Verify**:
```bash
cd attendance-system/ai-service
pip install -r requirements.txt
python main.py
# POST http://localhost:8000/extract-features with real image
```

**Potential Issues**:
- [ ] Model download failed (buffalo_l ~200MB)
- [ ] GPU/DirectML not properly initialized
- [ ] Image preprocessing edge cases
- [ ] Confidence threshold

**Fix**: Complete testing & add safeguards  
**Estimate**: 3-5 days | Owner: AI Engineer

---

#### 3. Face Matching During Check-in: MIA
**Impact**: Check-in không xác minh khuôn mặt, chỉ lưu log  
**Current**: 
- `FaceLog` model tồn tại nhưng **chưa được sử dụng**
- Attendance check-in chỉ log `method: 'face'` nhưng không so khớp
- Không có API endpoint để match embedding

**Missing Components**:
```javascript
// TODO: Implement face verification
1. GET /api/registration/match-face
   Input: { image_file, confidence_threshold: 0.6 }
   Output: { matched_employee_id, confidence }
   
2. Attendance check-in validation:
   - Receive image from kiosk
   - Extract embedding
   - Match against LocalEmployee.face_embedding
   - Return employee_id + confidence
   - Create Attendance record
   
3. Error handling:
   - No face detected
   - Low confidence
   - Multiple faces detected
   - Unknown face (not enrolled)
```

**Estimate**: 1 week | Owner: Backend + Mobile Engineer

---

#### 4. Frontend: Zero Face Management UI
**Impact**: Admin không thể xem/quản lý face data  
**Current**: 
- Backend endpoints tồn tại ✅
- Frontend pages chưa được build ❌

**Missing Screens**:
```
Employee Detail Page:
├─ [✅] Basic info (name, code, position)
├─ [❌] Face Data Section
│  ├─ Gallery: Show registered faces
│  ├─ Status: "Registered" / "Not Registered" / "Pending"
│  ├─ Timestamp: When registered
│  ├─ Provider: "kiosk" / "manual" / "admin"
│  └─ Actions: Delete / Re-register
├─ [❌] Registration History
│  └─ Timeline: All face upload attempts
└─ [❌] Quick Actions
   ├─ "View Face Logs"
   └─ "Initiate Re-registration"
```

**Estimate**: 3-5 days | Owner: Frontend Engineer

---

### ⚠️ MEDIUM PRIORITY

#### 5. Device Token Management
**Issue**: Device token validation hiện tại **không strict**

```javascript
// Current flow in device.controller.js
// Device token được tạo... đâu? 🤔
```

**Missing**:
- [ ] Device registration endpoint (public) - có ✅
- [ ] Device approval workflow - có ✅
- [ ] Device token generation - **MISSING** ❓

**Check**: `admin-system/backend/models/device.model.js`

---

#### 6. Error Handling & Validation
**Issue**: Enrollment endpoints không validate chặt chẽ

```javascript
// Current: registration.controller.js line 8-10
if (!employee_id || !Array.isArray(embedding) || embedding.length === 0) {
    return res.status(400).json({ success: false, message: 'Missing...' });
}

// Should also validate:
// - Embedding dimension (must be 512)
// - Embedding values range (should be normalized)
// - Employee exists in admin system
// - Device token validity
// - Rate limiting (prevent spam enrollments)
```

**Estimate**: 2-3 days | Owner: Backend Engineer

---

#### 7. Database Synchronization
**Issue**: Vector embedding không được sync từ Attendance → Admin

**Current**:
- Admin lưu placeholder embedding: `[]`
- Attendance Service lưu actual embedding: `[...]`
- **Admin không biết employee có enrolled hay không** ❓

**Recommended Fix**:
```javascript
// Option 1: Bi-directional sync
// Attendance → Admin (scheduled job, mỗi 5 phút)
// Admin → Attendance (on demand)

// Option 2: Thick attendance service
// Keep all business logic in Attendance Service
// Admin chỉ query status
```

---

## ✅ NHỮNG GÌ HOẠT ĐỘNG TỐT

### Backend Architecture
- ✅ Modular routes, controllers, services
- ✅ Proper authentication middleware (device + user)
- ✅ Audit logging cho face operations
- ✅ Error handling & async handlers

### Database Models
- ✅ `faceDataSchema` tốt (embedding + metadata)
- ✅ Referential integrity (employee_id)
- ✅ Timestamps tracking

### AI Service
- ✅ InsightFace integration sẵn
- ✅ Proper error responses
- ✅ GPU acceleration support

---

## 🎯 ROADMAP HOÀN THIỆN

### Phase 1: Validate & Fix (1 week)
- [ ] Test AI Service /extract-features với ảnh thực
- [ ] Verify Device token flow
- [ ] Add embedding validation
- [ ] Add rate limiting

### Phase 2: Mobile Implementation (2 weeks)
- [ ] Camera integration
- [ ] Face capture UI
- [ ] Upload pipeline
- [ ] Error handling

### Phase 3: Face Matching & Check-in (1 week)
- [ ] Implement /match-face endpoint
- [ ] Integrate with check-in flow
- [ ] Test confidence thresholds

### Phase 4: Frontend UI (1 week)
- [ ] Employee face management pages
- [ ] Registration status display
- [ ] Face logs viewer

### Phase 5: Testing & Hardening (1 week)
- [ ] Unit tests
- [ ] Integration tests
- [ ] Load testing (1000+ faces)
- [ ] Edge case handling

**Total Estimate**: 6-7 weeks | Full team: 3 people

---

## 🔧 IMMEDIATE ACTION ITEMS

### For Backend Team
```
[ ] 1. Check device.model.js - xem token được tạo thế nào
[ ] 2. Add embedding validation (512-dim, normalized)
[ ] 3. Test registration.controller.js với real data
[ ] 4. Implement /api/registration/match-face endpoint
[ ] 5. Add rate limiting to /registration/enroll
[ ] 6. Document API response format & errors
```

### For AI Team
```
[ ] 1. Run test: python main.py & POST /extract-features
[ ] 2. Test with low quality images (darkness, angle, etc.)
[ ] 3. Test with multiple faces in image
[ ] 4. Document confidence score interpretation
[ ] 5. Set up logging for model inference
```

### For Mobile Team
```
[ ] 1. Create FaceRegistrationScreen component
[ ] 2. Implement camera permission flow (Expo Camera)
[ ] 3. Implement image capture & preview
[ ] 4. Implement upload to AI Service
[ ] 5. Implement call to /api/registration/enroll
[ ] 6. Add error handling & retry logic
[ ] 7. Add success/failure feedback UI
```

### For Frontend Team
```
[ ] 1. Create EmployeeFaceDataSection component
[ ] 2. Add face status badge to employee list
[ ] 3. Create face gallery modal
[ ] 4. Create face registration history page
[ ] 5. Add delete face action
[ ] 6. Connect to backend /employees/:id/face-data endpoint
```

---

## 📊 TRẠNG THÁI CHECKLIST

| Component | Logic | DB | API | Frontend | Test |
|-----------|-------|----|----|----------|------|
| **Face Data** | ✅ | ✅ | ✅ | ❌ | ⚠️ |
| **Device Auth** | ✅ | ✅ | ✅ | N/A | ⚠️ |
| **AI Service** | ✅ | N/A | ✅ | N/A | ⚠️ |
| **Enrollment** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Matching** | ❌ | ❌ | ❌ | N/A | ❌ |
| **Mobile UI** | ❌ | N/A | N/A | ❌ | ❌ |

---

## 🚀 NEXT STEPS

1. **Ngay**: Họp kỹ thuật review document này
2. **Hôm nay**: Assign tasks theo priority
3. **Tuần 1**: Hoàn thành Phase 1 (Validation)
4. **Tuần 2-3**: Mobile implementation
5. **Tuần 4**: Face matching
6. **Tuần 5**: Frontend
7. **Tuần 6-7**: Testing & hardening

---

**Document Owner**: Tech Lead  
**Last Updated**: May 6, 2026  
**Status**: Ready for Discussion
