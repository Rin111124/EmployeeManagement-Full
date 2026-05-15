# TECHNICAL DEEP DIVE: Face Enrollment Implementation

**Purpose**: Hướng dẫn chi tiết kỹ thuật cho developers  
**Audience**: Backend, Mobile, AI Engineers  

---

## 🔗 COMPONENT INTERACTIONS

### Sequence Diagram: Face Enrollment (Current State)

```
Mobile App          AI Service          Attendance-Svc      Admin Backend
    |                   |                      |                    |
    |--POST /extract-features (image)--------->|
    |                   |                      |
    |                   |<--embedding[512]-----|
    |                   |                      |
    |--POST /enroll (employee_id, embedding)---|
    |                   |                      |
    |                   |<--success------------|
    |                   |
    |                   |---PATCH /confirm-biometrics (x-sync-secret)--->|
    |                   |                      |                    |
    |                   |                      |<--{placeholder}---|
    |                   |                      |                    |
    |                   |          [LocalEmployee.face_embedding]
    |                   |          [saved in Attendance DB]
    |                   |
    |<--display success-|
```

---

## 🛠️ DETAILED IMPLEMENTATION GUIDE

### 1. Backend: Validate Embedding Quality

**File**: `admin-system/backend/validators/employee.validator.js`

```javascript
// Current (line 1-7)
const faceData = Joi.object({
    label: Joi.string().trim().allow('', null),
    embedding: Joi.array().items(Joi.number()).default([]),
    image_path: Joi.string().trim().allow('', null),
    provider: Joi.string().trim().default('manual'),
}).or('embedding', 'image_path');

// SHOULD BE
const faceData = Joi.object({
    label: Joi.string().trim().allow('', null),
    embedding: Joi.array()
        .items(Joi.number().min(-2).max(2))  // InsightFace range
        .max(512)                             // Exactly 512 dims
        .required(),                          // Must have embedding
    image_path: Joi.string().trim().allow('', null),
    provider: Joi.string()
        .valid('manual', 'kiosk', 'insightface')  // Strict provider
        .default('manual'),
})
    .required();  // Face data is required in enrollment
```

**Why**: Prevent invalid embeddings from being stored

---

### 2. Backend: Implement Face Matching

**File**: `attendance-system/attendance-service/src/routes/registration.routes.js`

```javascript
// CURRENT
const express = require('express');
const router = express.Router();
const { enrollFace } = require('../controllers/registration.controller');

router.post('/enroll', enrollFace);

module.exports = router;

// SHOULD ADD
const { enrollFace, matchFace } = require('../controllers/registration.controller');

router.post('/enroll', enrollFace);  // Enrollment
router.post('/match', matchFace);    // Check-in matching

module.exports = router;
```

**New Controller Method**: `attendance-system/attendance-service/src/controllers/registration.controller.js`

```javascript
// @desc    Match face embedding against enrolled employees
// @route   POST /api/registration/match
// @query   ?confidence_threshold=0.6
exports.matchFace = async (req, res) => {
    try {
        const { embedding } = req.body;
        const threshold = Number(req.query.confidence_threshold || 0.6);

        if (!Array.isArray(embedding) || embedding.length !== 512) {
            return res.status(400).json({
                success: false,
                message: 'Invalid embedding: must be 512-dim array'
            });
        }

        // Load all enrolled employees from LocalEmployee
        const employees = await LocalEmployee.find({
            face_embedding: { $exists: true, $ne: [] }
        });

        if (employees.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No enrolled employees found'
            });
        }

        // Calculate cosine similarity for each enrolled face
        const similarities = employees.map(emp => {
            const similarity = cosineSimilarity(embedding, emp.face_embedding);
            return {
                employee_id: emp.employee_id,
                employee_name: emp.full_name,
                confidence: similarity,
                matched: similarity >= threshold
            };
        });

        // Find best match
        const bestMatch = similarities.reduce((best, curr) =>
            curr.confidence > best.confidence ? curr : best,
            { confidence: 0 }
        );

        if (!bestMatch.matched) {
            return res.status(404).json({
                success: false,
                message: 'No matching face found',
                confidence: bestMatch.confidence
            });
        }

        res.status(200).json({
            success: true,
            data: {
                employee_id: bestMatch.employee_id,
                employee_name: bestMatch.employee_name,
                confidence: bestMatch.confidence.toFixed(4)
            }
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Helper: Cosine similarity
function cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

---

### 3. Backend: Attendance Check-in with Face Verification

**File**: `admin-system/backend/services/attendance.service.js`

```javascript
// ADD THIS METHOD
async function checkInWithFace(payload) {
    // payload: { device_id, face_image, employee_code }
    
    const { device_id, employee_code, face_image } = payload;
    
    // 1. Extract embedding from image
    const aiResponse = await axios.post(
        'http://localhost:8000/extract-features',
        { file: face_image },
        { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    
    if (!aiResponse.data.success) {
        throw new AppError('Failed to extract face', 422);
    }
    
    // 2. Match face in attendance service
    const matchResponse = await axios.post(
        'http://localhost:3001/api/registration/match',
        { embedding: aiResponse.data.embedding }
    );
    
    if (!matchResponse.data.success) {
        throw new AppError('Face not recognized', 403);
    }
    
    // 3. Get employee from admin
    const employee = await Employee.findById(matchResponse.data.data.employee_id);
    
    // 4. Create attendance record
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await Attendance.findOneAndUpdate(
        { employee_id: employee._id, work_date: today },
        {
            $set: {
                check_in: new Date(),
                method: 'face',
                device_id,
                confidence: matchResponse.data.data.confidence,
                status: 'CheckedIn'
            }
        },
        { upsert: true, new: true }
    );
    
    return attendance;
}

module.exports = { checkInWithFace, ... };
```

---

### 4. Mobile App: Camera Integration (Expo)

**File**: `attendance-system/mobile-app/src/components/FaceRegistrationScreen.tsx`

```typescript
import { useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button, View, Text, Image } from 'react-native';
import axios from 'axios';

export function FaceRegistrationScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [facing, setFacing] = useState<'front' | 'back'>('front');
    const [photo, setPhoto] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    let cameraRef: CameraView | null;

    // Step 1: Request camera permission
    if (!permission) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Button title="Request Camera" onPress={requestPermission} />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View>
                <Text>Camera permission is required</Text>
            </View>
        );
    }

    // Step 2: Capture image
    const handleCapture = async () => {
        if (cameraRef) {
            setLoading(true);
            try {
                const photo = await cameraRef.takePictureAsync({
                    quality: 0.8,
                    base64: true
                });
                setPhoto(photo.uri);
                setError(null);
            } catch (err) {
                setError('Failed to capture photo');
            } finally {
                setLoading(false);
            }
        }
    };

    // Step 3: Upload to AI Service & Register
    const handleRegister = async () => {
        if (!photo) return;
        
        setLoading(true);
        try {
            // 3a. Extract embedding from AI Service
            const formData = new FormData();
            formData.append('file', {
                uri: photo,
                type: 'image/jpeg',
                name: 'face.jpg'
            } as any);

            const aiResponse = await axios.post(
                'http://localhost:8000/extract-features',
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            if (!aiResponse.data.success) {
                throw new Error('Failed to extract face');
            }

            // 3b. Register with Attendance Service
            const enrollResponse = await axios.post(
                'http://localhost:3001/api/registration/enroll',
                {
                    employee_id: employeeId,  // from params/context
                    full_name: fullName,
                    embedding: aiResponse.data.embedding,
                    device_id: deviceId,
                    device_token: deviceToken,
                    admin_url: 'http://localhost:5000'
                }
            );

            if (enrollResponse.data.success) {
                setPhoto(null);
                setError(null);
                // Show success message & navigate
                alert('Face registration successful!');
            }

        } catch (err: any) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    // Step 4: Retry
    const handleRetry = () => {
        setPhoto(null);
        setError(null);
    };

    // UI: Show camera or preview
    if (!photo) {
        return (
            <View style={{ flex: 1 }}>
                <CameraView
                    ref={(ref) => (cameraRef = ref)}
                    facing={facing}
                    style={{ flex: 1 }}
                />
                <View style={{ padding: 20, gap: 10 }}>
                    <Button
                        title="Capture Face"
                        onPress={handleCapture}
                        disabled={loading}
                    />
                    <Button
                        title="Flip Camera"
                        onPress={() => setFacing(facing === 'front' ? 'back' : 'front')}
                    />
                    {error && <Text style={{ color: 'red' }}>{error}</Text>}
                </View>
            </View>
        );
    }

    // UI: Show preview
    return (
        <View style={{ flex: 1 }}>
            <Image source={{ uri: photo }} style={{ flex: 1 }} />
            <View style={{ padding: 20, gap: 10 }}>
                <Button
                    title="Register Face"
                    onPress={handleRegister}
                    disabled={loading}
                />
                <Button title="Retake" onPress={handleRetry} />
                {error && <Text style={{ color: 'red' }}>{error}</Text>}
            </View>
        </View>
    );
}
```

---

### 5. Frontend: Face Data Management Component

**File**: `admin-system/frontend/src/components/EmployeeFaceData.tsx`

```typescript
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export function EmployeeFaceData({ employeeId }: { employeeId: string }) {
    const [faceData, setFaceData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchFaceData();
    }, [employeeId]);

    const fetchFaceData = async () => {
        try {
            const response = await api.get(`/employees/${employeeId}`);
            setFaceData(response.data.face_data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (index: number) => {
        // Call DELETE endpoint (if exists)
        // Or use PATCH to remove from array
        // TODO: Implement endpoint first
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div style={{ color: 'red' }}>{error}</div>;

    return (
        <div className="border rounded-lg p-4">
            <h3 className="text-lg font-bold mb-4">Face Registration</h3>

            {faceData.length === 0 ? (
                <div className="text-gray-500">
                    No faces registered yet
                </div>
            ) : (
                <div className="space-y-4">
                    {faceData.map((face: any, idx) => (
                        <div key={idx} className="border p-3 rounded flex justify-between">
                            <div>
                                <p className="font-semibold">{face.provider}</p>
                                <p className="text-sm text-gray-600">
                                    {new Date(face.created_at).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <span className="badge bg-green-100">Registered</span>
                                <button
                                    onClick={() => handleDelete(idx)}
                                    className="ml-2 text-red-600 text-sm"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
```

---

## ✅ TESTING CHECKLIST

### Unit Tests

```javascript
// attendance-service/tests/registration.test.js
describe('Face Registration', () => {
    test('enrollFace: saves embedding correctly', async () => {
        const data = {
            employee_id: '507f1f77bcf86cd799439011',
            full_name: 'John Doe',
            embedding: Array(512).fill(0.1),
            device_id: 'device-123'
        };
        
        const response = await request(app)
            .post('/api/registration/enroll')
            .send(data);
        
        expect(response.status).toBe(200);
        expect(response.body.data.employee_id).toBe(data.employee_id);
    });

    test('matchFace: returns correct employee', async () => {
        // Setup: Create test embedding
        const testEmbedding = Array(512).fill(0.1);
        await LocalEmployee.create({
            employee_id: '507f1f77bcf86cd799439011',
            face_embedding: testEmbedding
        });

        // Match same embedding
        const response = await request(app)
            .post('/api/registration/match')
            .send({ embedding: testEmbedding });

        expect(response.status).toBe(200);
        expect(response.body.data.confidence).toBeGreaterThan(0.99);
    });

    test('matchFace: rejects unknown face', async () => {
        const unknownEmbedding = Array(512).fill(0.9);

        const response = await request(app)
            .post('/api/registration/match')
            .send({ embedding: unknownEmbedding })
            .query({ confidence_threshold: 0.8 });

        expect(response.status).toBe(404);
    });
});
```

### Integration Tests

```javascript
// Full workflow test
describe('Face Enrollment Workflow', () => {
    test('Complete flow: mobile -> AI -> attendance -> admin', async () => {
        // 1. Simulate mobile upload to AI
        const aiResponse = await request(aiService)
            .post('/extract-features')
            .attach('file', './test-face.jpg');
        
        expect(aiResponse.body.embedding.length).toBe(512);

        // 2. Enroll in attendance service
        const enrollResponse = await request(attendanceService)
            .post('/api/registration/enroll')
            .send({
                employee_id: 'emp-123',
                embedding: aiResponse.body.embedding,
                admin_url: 'http://localhost:5000'
            });

        expect(enrollResponse.status).toBe(200);

        // 3. Check admin was notified
        const adminEmployee = await Employee.findById('emp-123');
        expect(adminEmployee.face_data.length).toBeGreaterThan(0);
    });
});
```

---

## 🚨 ERROR HANDLING EDGE CASES

```javascript
// What can go wrong?

1. No face in image
   Response: 422 "No face detected"

2. Multiple faces in image
   Response: 200 with largest face (OK) or 422 with error?
   → Recommendation: Use largest face, log warning

3. Low confidence (<0.3)
   Response: 422 "Face confidence too low"

4. Invalid image format
   Response: 422 "Invalid image format"

5. Employee not found
   Response: 404 "Employee not found"

6. Device not approved
   Response: 403 "Device not approved"

7. Embedding already exists
   Response: 409 "Face already registered" (optional warning)

8. Network timeout
   Response: 503 "Service unavailable"

9. AI service down
   Response: 503 "AI Service unavailable"

10. Rate limit exceeded
    Response: 429 "Too many requests"
```

---

## 🔐 SECURITY CONSIDERATIONS

### 1. Rate Limiting on Enrollment
```javascript
const rateLimit = require('express-rate-limit');

const enrollLimiter = rateLimit({
    windowMs: 60 * 1000,  // 1 minute
    max: 5,               // 5 enrollments per minute per IP
    message: 'Too many enrollment attempts, please try again later'
});

router.post('/enroll', enrollLimiter, enrollFace);
```

### 2. Image Size Validation
```javascript
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

if (req.file.size > MAX_IMAGE_SIZE) {
    throw new AppError('Image too large (max 5MB)', 400);
}
```

### 3. Embedding Validation
```javascript
function validateEmbedding(embedding) {
    // Must be 512-dim
    if (embedding.length !== 512) throw new Error('Invalid dimension');
    
    // Values should be normalized (-2 to +2 for InsightFace)
    const invalidValues = embedding.filter(v => v < -2 || v > 2);
    if (invalidValues.length > 0) throw new Error('Invalid values');
    
    // Not all zeros
    if (embedding.every(v => v === 0)) throw new Error('Empty embedding');
    
    return true;
}
```

### 4. Device Token Validation
```javascript
// Don't just check existence, also check:
- Device.status === 'approved'
- Device.last_seen < 24 hours ago (not stale)
- Device.ip_address matches (if possible)
```

---

## 📊 PERFORMANCE CONSIDERATIONS

### Batch Face Matching (Multiple Employees)
```javascript
// Instead of doing N calls to match:
// - Load all LocalEmployee at once
// - Calculate similarities in memory
// - O(n) instead of O(n²)

const LocalEmployee = require('../models/LocalEmployee');

async function matchFaceOptimized(embedding, limit = 5) {
    const allEmployees = await LocalEmployee.find({
        face_embedding: { $exists: true, $type: 'array' }
    });

    const matches = allEmployees
        .map(emp => ({
            ...emp.toObject(),
            similarity: cosineSimilarity(embedding, emp.face_embedding)
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

    return matches;
}
```

### Caching
```javascript
// Cache frequently matched employees
const Redis = require('redis');
const client = Redis.createClient();

async function matchFaceWithCache(embedding) {
    const cacheKey = `face:${hashEmbedding(embedding)}`;
    
    const cached = await client.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = await actualMatch(embedding);
    await client.setex(cacheKey, 3600, JSON.stringify(result));
    
    return result;
}
```

---

## 📝 DEPLOYMENT CHECKLIST

- [ ] AI Service requirements installed (`pip install -r requirements.txt`)
- [ ] AI model downloaded & tested (buffalo_l)
- [ ] Attendance Service .env configured
- [ ] Admin Backend .env configured  
- [ ] Database indices created for performance
- [ ] Rate limiting configured
- [ ] Error logging set up
- [ ] Monitoring/alerting for AI service
- [ ] Load test with 1000+ faces
- [ ] Security audit completed

---

**Document Version**: 1.0  
**Last Updated**: May 6, 2026  
**Review Date**: May 13, 2026
