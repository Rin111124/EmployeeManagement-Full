# QUICK START: Face Enrollment Implementation Tasks

**Format**: Copy-paste ready code snippets  
**Target**: Engineering team to start implementation immediately

---

## 📋 TASK ASSIGNMENTS

### Backend Engineer (Node.js)
- Validate embedding dimension & values
- Implement face matching endpoint
- Integrate with check-in
- Add rate limiting

### Mobile Engineer (Expo/React Native)
- Camera permission & integration
- Face capture UI
- Upload pipeline
- Error handling

### Frontend Engineer (React)
- Face management pages
- Status displays
- Delete functionality

### AI Engineer
- Test AI Service with real images
- Validate embedding quality
- Document confidence thresholds

---

## 🚀 BACKEND TASKS

### Task 1: Add Embedding Validation

**File**: `admin-system/backend/validators/employee.validator.js`

**Replace**:
```javascript
const faceData = Joi.object({
    label: Joi.string().trim().allow('', null),
    embedding: Joi.array().items(Joi.number()).default([]),
    image_path: Joi.string().trim().allow('', null),
    provider: Joi.string().trim().default('manual'),
}).or('embedding', 'image_path');
```

**With**:
```javascript
const faceData = Joi.object({
    label: Joi.string().trim().allow('', null),
    embedding: Joi.array()
        .items(Joi.number().min(-2).max(2))
        .length(512)
        .required(),
    image_path: Joi.string().trim().allow('', null),
    provider: Joi.string()
        .valid('manual', 'kiosk', 'insightface')
        .default('manual'),
}).unknown(false);
```

**Why**: Prevent invalid embeddings

---

### Task 2: Implement Face Matching

**New File**: `attendance-system/attendance-service/src/utils/faceMatching.js`

```javascript
/**
 * Calculate cosine similarity between two embeddings
 * @param {number[]} a - First embedding (512-dim)
 * @param {number[]} b - Second embedding (512-dim)
 * @returns {number} Similarity score (0-1)
 */
function cosineSimilarity(a, b) {
    if (a.length !== 512 || b.length !== 512) {
        throw new Error('Embeddings must be 512-dimensional');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < 512; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
}

module.exports = { cosineSimilarity };
```

---

**Update File**: `attendance-system/attendance-service/src/controllers/registration.controller.js`

**Add this method**:
```javascript
const LocalEmployee = require('../models/LocalEmployee');
const { cosineSimilarity } = require('../utils/faceMatching');

/**
 * @desc    Match face embedding against enrolled employees
 * @route   POST /api/registration/match
 * @access  Public (should add auth in production)
 */
exports.matchFace = async (req, res) => {
    try {
        const { embedding } = req.body;
        const threshold = Number(req.query.confidence_threshold || 0.6);

        // Validate input
        if (!Array.isArray(embedding) || embedding.length !== 512) {
            return res.status(400).json({
                success: false,
                message: 'Invalid embedding: must be 512-dimensional array'
            });
        }

        // Get all enrolled employees
        const employees = await LocalEmployee.find({
            face_embedding: { $exists: true, $ne: null, $not: { $size: 0 } }
        });

        if (employees.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No enrolled employees in system'
            });
        }

        // Calculate similarities
        const results = employees.map(emp => {
            try {
                const confidence = cosineSimilarity(embedding, emp.face_embedding);
                return {
                    employee_id: emp.employee_id,
                    full_name: emp.full_name,
                    confidence: parseFloat(confidence.toFixed(4)),
                    matched: confidence >= threshold
                };
            } catch (err) {
                console.error(`Error matching against ${emp.employee_id}:`, err.message);
                return null;
            }
        }).filter(r => r !== null);

        // Find best match
        const bestMatch = results.reduce((best, curr) =>
            curr.confidence > best.confidence ? curr : best,
            { employee_id: null, confidence: 0, matched: false }
        );

        if (!bestMatch.matched) {
            return res.status(404).json({
                success: false,
                message: 'No matching face found',
                top_match: {
                    employee_id: bestMatch.employee_id,
                    confidence: bestMatch.confidence
                }
            });
        }

        res.status(200).json({
            success: true,
            data: {
                employee_id: bestMatch.employee_id,
                full_name: bestMatch.full_name,
                confidence: bestMatch.confidence
            }
        });

    } catch (err) {
        console.error('[matchFace] Error:', err);
        res.status(500).json({ 
            success: false, 
            message: err.message 
        });
    }
};
```

**Update routes**:
```javascript
// attendance-system/attendance-service/src/routes/registration.routes.js

const express = require('express');
const router = express.Router();
const { enrollFace, matchFace } = require('../controllers/registration.controller');

router.post('/enroll', enrollFace);
router.post('/match', matchFace);  // ADD THIS

module.exports = router;
```

---

### Task 3: Add Rate Limiting

**File**: `attendance-system/attendance-service/src/routes/registration.routes.js`

```javascript
const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { enrollFace, matchFace } = require('../controllers/registration.controller');

// Rate limiter for enrollment (5 per minute per IP)
const enrollLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: 'Too many enrollment attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for matching (20 per minute per IP)
const matchLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: 'Too many match requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/enroll', enrollLimiter, enrollFace);
router.post('/match', matchLimiter, matchFace);

module.exports = router;
```

**Install dependency**:
```bash
cd attendance-system/attendance-service
npm install express-rate-limit
```

---

### Task 4: Test Endpoints

**File**: `attendance-system/attendance-service/tests/registration.test.js`

```javascript
const request = require('supertest');
const app = require('../src/app');
const LocalEmployee = require('../src/models/LocalEmployee');
const mongoose = require('mongoose');

describe('Face Registration & Matching', () => {
    beforeEach(async () => {
        await LocalEmployee.deleteMany({});
    });

    test('POST /api/registration/enroll - should save face embedding', async () => {
        const embedding = Array(512).fill(0.1);

        const response = await request(app)
            .post('/api/registration/enroll')
            .send({
                employee_id: '507f1f77bcf86cd799439011',
                full_name: 'John Doe',
                embedding,
                device_id: 'device-123'
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Verify in database
        const saved = await LocalEmployee.findOne({ 
            employee_id: '507f1f77bcf86cd799439011' 
        });
        expect(saved).toBeDefined();
        expect(saved.face_embedding.length).toBe(512);
    });

    test('POST /api/registration/match - should find enrolled employee', async () => {
        const embedding = Array(512).fill(0.1);

        // Setup
        await LocalEmployee.create({
            employee_id: '507f1f77bcf86cd799439011',
            full_name: 'John Doe',
            face_embedding: embedding,
            last_sync: Date.now()
        });

        // Test exact match
        const response = await request(app)
            .post('/api/registration/match')
            .send({ embedding })
            .query({ confidence_threshold: 0.9 });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.confidence).toBeGreaterThan(0.99);
    });

    test('POST /api/registration/match - should reject unknown face', async () => {
        const unknownEmbedding = Array(512).fill(0.9);

        const response = await request(app)
            .post('/api/registration/match')
            .send({ embedding: unknownEmbedding })
            .query({ confidence_threshold: 0.8 });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
    });

    test('POST /api/registration/match - should reject invalid embedding', async () => {
        const response = await request(app)
            .post('/api/registration/match')
            .send({ embedding: [0.1, 0.2] });

        expect(response.status).toBe(400);
    });
});
```

**Run tests**:
```bash
npm test -- tests/registration.test.js
```

---

## 📱 MOBILE TASKS

### Task 1: Face Registration Screen

**New File**: `attendance-system/mobile-app/src/components/FaceRegistration.tsx`

```typescript
import React, { useState, useRef } from 'react';
import {
    View,
    Button,
    StyleSheet,
    Text,
    ActivityIndicator,
    Alert,
    Image
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import axios from 'axios';

interface FaceRegistrationProps {
    employeeId: string;
    employeeName: string;
    deviceToken: string;
    onSuccess: () => void;
}

export function FaceRegistration({
    employeeId,
    employeeName,
    deviceToken,
    onSuccess
}: FaceRegistrationProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [facing, setFacing] = useState<'front' | 'back'>('front');
    const [photo, setPhoto] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cameraRef = useRef<CameraView>(null);

    // Step 1: Request permission
    if (!permission) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Camera Permission Required</Text>
                <Button
                    title="Grant Permission"
                    onPress={requestPermission}
                />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.error}>Camera permission denied</Text>
            </View>
        );
    }

    // Step 2: Capture photo
    const handleCapture = async () => {
        if (!cameraRef.current) return;

        try {
            setLoading(true);
            setError(null);

            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
                base64: false,
                skipProcessing: false
            });

            setPhoto(photo.uri);
        } catch (err: any) {
            setError('Failed to capture photo: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Upload to AI & Register
    const handleRegister = async () => {
        if (!photo) return;

        try {
            setLoading(true);
            setError(null);

            // 3.1: Extract embedding from AI Service
            const formData = new FormData();
            formData.append('file', {
                uri: photo,
                type: 'image/jpeg',
                name: `${employeeId}-face.jpg`
            } as any);

            console.log('[FaceReg] Extracting features from AI...');
            const aiResponse = await axios.post(
                'http://localhost:8000/extract-features',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    },
                    timeout: 30000
                }
            );

            if (!aiResponse.data.success) {
                throw new Error(aiResponse.data.detail || 'AI processing failed');
            }

            console.log(
                `[FaceReg] Got embedding, confidence: ${aiResponse.data.face_confidence}`
            );

            // 3.2: Register with Attendance Service
            console.log('[FaceReg] Registering with Attendance Service...');
            const enrollResponse = await axios.post(
                'http://localhost:3001/api/registration/enroll',
                {
                    employee_id: employeeId,
                    full_name: employeeName,
                    embedding: aiResponse.data.embedding,
                    device_token: deviceToken,
                    admin_url: 'http://localhost:5000'
                },
                { timeout: 10000 }
            );

            if (!enrollResponse.data.success) {
                throw new Error(enrollResponse.data.message);
            }

            Alert.alert('Success', 'Face registered successfully!');
            setPhoto(null);
            onSuccess();

        } catch (err: any) {
            const message = err.response?.data?.message || err.message;
            setError('Registration failed: ' + message);
            console.error('[FaceReg] Error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Step 4: Retry
    const handleRetry = () => {
        setPhoto(null);
        setError(null);
    };

    // Show camera
    if (!photo) {
        return (
            <View style={styles.container}>
                <CameraView
                    style={styles.camera}
                    facing={facing}
                    ref={cameraRef}
                />
                <View style={styles.controls}>
                    <Button
                        title={loading ? 'Capturing...' : 'Capture Face'}
                        onPress={handleCapture}
                        disabled={loading}
                    />
                    <Button
                        title="Flip Camera"
                        onPress={() =>
                            setFacing(facing === 'front' ? 'back' : 'front')
                        }
                    />
                    {error && <Text style={styles.error}>{error}</Text>}
                </View>
            </View>
        );
    }

    // Show preview
    return (
        <View style={styles.container}>
            <Image source={{ uri: photo }} style={styles.preview} />
            <View style={styles.controls}>
                {loading && <ActivityIndicator size="large" color="#0000ff" />}
                <Button
                    title={loading ? 'Registering...' : 'Register Face'}
                    onPress={handleRegister}
                    disabled={loading}
                />
                <Button
                    title="Retake"
                    onPress={handleRetry}
                    disabled={loading}
                />
                {error && <Text style={styles.error}>{error}</Text>}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff'
    },
    camera: {
        flex: 1
    },
    preview: {
        flex: 1
    },
    controls: {
        padding: 20,
        gap: 10,
        backgroundColor: '#f5f5f5'
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center'
    },
    error: {
        color: '#d32f2f',
        marginTop: 10
    }
});
```

---

### Task 2: Integrate into App Navigation

**File**: `attendance-system/mobile-app/src/screens/RegistrationFlow.tsx`

```typescript
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { FaceRegistration } from '@/components/FaceRegistration';
import { useEmployeeContext } from '@/hooks/useEmployeeContext';

export function RegistrationFlowScreen() {
    const { employee, device } = useEmployeeContext();
    const [registered, setRegistered] = useState(false);

    if (!employee || !device) {
        return (
            <View>
                <Text>Loading...</Text>
            </View>
        );
    }

    if (registered) {
        return (
            <View>
                <Text>✅ Face registration complete!</Text>
                <Text>Welcome, {employee.full_name}</Text>
            </View>
        );
    }

    return (
        <FaceRegistration
            employeeId={employee._id}
            employeeName={employee.full_name}
            deviceToken={device.device_token}
            onSuccess={() => setRegistered(true)}
        />
    );
}
```

---

## 🎨 FRONTEND TASKS

### Task 1: Face Data Display Component

**New File**: `admin-system/frontend/src/features/employees/EmployeeFaceSection.tsx`

```typescript
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Props {
    employeeId: string;
}

export function EmployeeFaceSection({ employeeId }: Props) {
    const { data: employee, isLoading, error } = useQuery({
        queryKey: ['employee', employeeId],
        queryFn: async () => {
            const response = await api.get(`/api/v1/employees/${employeeId}`);
            return response.data.data;
        }
    });

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div className="text-red-600">Error loading employee</div>;
    if (!employee) return null;

    const faceData = employee.face_data || [];
    const isRegistered = faceData.length > 0;

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">Face Registration</h3>

            {/* Status Badge */}
            <div className="mb-4">
                {isRegistered ? (
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                        ✓ Registered
                    </span>
                ) : (
                    <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                        ⚠ Not Registered
                    </span>
                )}
            </div>

            {/* Face Data List */}
            {faceData.length === 0 ? (
                <div className="text-gray-500 text-sm">
                    No faces registered yet. Employee needs to register at kiosk.
                </div>
            ) : (
                <div className="space-y-3">
                    {faceData.map((face: any, idx: number) => (
                        <div
                            key={idx}
                            className="border border-gray-200 rounded p-3 flex justify-between items-center"
                        >
                            <div>
                                <p className="font-semibold text-sm">
                                    {face.label || 'Face #' + (idx + 1)}
                                </p>
                                <p className="text-xs text-gray-600">
                                    Provider: <span className="font-mono">{face.provider}</span>
                                </p>
                                <p className="text-xs text-gray-600">
                                    Registered: {formatDate(face.created_at)}
                                </p>
                                {face.image_path && (
                                    <p className="text-xs text-gray-600">
                                        Image: {face.image_path.split('/').pop()}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => handleDelete(idx)}
                                className="text-red-600 hover:text-red-800 text-sm"
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* History Link */}
            {faceData.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                    <a href={`/employees/${employeeId}/face-logs`} className="text-blue-600 hover:underline text-sm">
                        View full registration history →
                    </a>
                </div>
            )}
        </div>
    );
}

function handleDelete(index: number) {
    // TODO: Implement delete endpoint in backend first
    // Then call: await api.delete(`/api/v1/employees/${employeeId}/face-data/${index}`)
    alert('Delete not yet implemented');
}
```

---

## 🧪 AI SERVICE VERIFICATION

### Task: Test with Real Images

**Create**: `attendance-system/ai-service/test_extraction.py`

```python
import requests
import sys
from pathlib import Path

# Test the /extract-features endpoint

def test_extract_features():
    # Test with a real face image
    image_path = Path("test-face.jpg")  # Place test image here
    
    if not image_path.exists():
        print(f"❌ Test image not found: {image_path}")
        print("Please provide a test-face.jpg file")
        return False
    
    with open(image_path, 'rb') as f:
        files = {'file': ('face.jpg', f, 'image/jpeg')}
        
        try:
            response = requests.post(
                'http://localhost:8000/extract-features',
                files=files,
                timeout=30
            )
            
            print(f"Status: {response.status_code}")
            data = response.json()
            
            if data.get('success'):
                print(f"✓ Face detected")
                print(f"  - Confidence: {data.get('face_confidence'):.4f}")
                print(f"  - Face count: {data.get('face_count')}")
                print(f"  - Embedding size: {data.get('embedding_size')}")
                
                embedding = data.get('embedding', [])
                if len(embedding) == 512:
                    print(f"✓ Embedding valid (512-dim)")
                    print(f"  - First 5 values: {[round(v, 4) for v in embedding[:5]]}")
                    print(f"  - Value range: [{min(embedding):.4f}, {max(embedding):.4f}]")
                else:
                    print(f"❌ Invalid embedding size: {len(embedding)}")
                    return False
                
                return True
            else:
                print(f"❌ AI Service error: {data.get('detail')}")
                return False
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return False

if __name__ == '__main__':
    success = test_extract_features()
    sys.exit(0 if success else 1)
```

**Run**:
```bash
cd attendance-system/ai-service
python main.py  # In one terminal

# In another terminal
python test_extraction.py
```

---

## ✅ VALIDATION CHECKLIST

Before submitting, verify:

### Backend
- [ ] Embedding validation added
- [ ] Match endpoint working
- [ ] Rate limiting active
- [ ] Tests passing
- [ ] Error messages clear

### Mobile
- [ ] Camera permissions working
- [ ] Photo capture working
- [ ] Upload to AI working
- [ ] Upload to Attendance Service working
- [ ] UI feedback working

### Frontend
- [ ] Face section showing in employee detail
- [ ] Status badge displaying correctly
- [ ] Face list showing all registrations

### AI
- [ ] Tested with multiple real images
- [ ] Confidence scores reasonable
- [ ] Error handling for edge cases

---

## 📞 SUPPORT & DEBUGGING

### Common Issues

**AI Service returns: "No face detected"**
- Try different image angle/lighting
- Ensure face is clear and visible
- Try higher resolution image

**Embedding doesn't match after registration**
- Verify embedding size is 512
- Check value ranges (-2 to 2)
- Ensure exact same image is being used for testing

**Device token invalid**
- Verify device approved in admin
- Check token matches in database
- Try registering device again

---

**Created**: May 6, 2026  
**For**: Employee Management - Attendance System  
**Status**: Ready to Implement
