import os
import tempfile
import asyncio
import time
from collections import defaultdict
from typing import List, Optional
import numpy as np
from fastapi import FastAPI, File, HTTPException, Header, UploadFile, Request
from insightface.app import FaceAnalysis
from pydantic import BaseModel
import onnxruntime as ort
import cv2
import hashlib
import hmac
import json
import uuid

# Concurrency control & inference timeout
MAX_CONCURRENT_INFERENCES = int(os.environ.get("MAX_CONCURRENT_INFERENCES", "3"))
INFERENCE_TIMEOUT_SECONDS = float(os.environ.get("INFERENCE_TIMEOUT_SECONDS", "10.0"))
_inference_semaphore = asyncio.Semaphore(MAX_CONCURRENT_INFERENCES)

# Per-device / per-client rate limiting (DoS prevention)
AI_RATE_LIMIT_REQUESTS = int(os.environ.get("AI_RATE_LIMIT_REQUESTS", "60"))
AI_RATE_LIMIT_WINDOW_SECONDS = int(os.environ.get("AI_RATE_LIMIT_WINDOW_SECONDS", "60"))
_request_history = defaultdict(list)
_rate_limit_lock = asyncio.Lock()

async def _check_rate_limit(client_id: str) -> None:
    now = time.time()
    async with _rate_limit_lock:
        window_start = now - AI_RATE_LIMIT_WINDOW_SECONDS
        recent = [t for t in _request_history[client_id] if t > window_start]
        if len(recent) >= AI_RATE_LIMIT_REQUESTS:
            retry_after = int(recent[0] + AI_RATE_LIMIT_WINDOW_SECONDS - now) + 1
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Maximum {AI_RATE_LIMIT_REQUESTS} requests per {AI_RATE_LIMIT_WINDOW_SECONDS}s.",
                headers={"Retry-After": str(max(1, retry_after))}
            )
        recent.append(now)
        _request_history[client_id] = recent

app = FastAPI(title="Attendance AI Engine (InsightFace)")

# ── API Key Authentication ────────────────────────────────────────────────────
# Set AI_API_KEY in your environment (or .env.docker).
# If not set, auth is disabled and a warning is printed (development only).
_AI_API_KEY = os.environ.get("AI_API_KEY", "")
_AI_ATTESTATION_SECRET = os.environ.get("AI_ATTESTATION_SECRET", "")
_ENVIRONMENT = os.environ.get("ENVIRONMENT") or os.environ.get("NODE_ENV") or "development"
if _ENVIRONMENT.lower() in {"production", "prod"}:
    if not _AI_API_KEY:
        raise RuntimeError("AI_API_KEY is required in production")
    if not _AI_ATTESTATION_SECRET or len(_AI_ATTESTATION_SECRET) < 32:
        raise RuntimeError("AI_ATTESTATION_SECRET must be at least 32 characters in production")

if not _AI_API_KEY:
    print(
        "WARNING: AI_API_KEY is not set. "
        "The /extract-features endpoint is unprotected. "
        "Set AI_API_KEY in production."
    )

def _verify_api_key(x_api_key: str = Header(default="")) -> None:
    """Raise 401 if the provided API key does not match the configured key."""
    if _AI_API_KEY and x_api_key != _AI_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")

# ── InsightFace Initialization ────────────────────────────────────────────────
# buffalo_l is the full model pack. First run downloads models (~200 MB).
# Uses DirectML for Windows GPU acceleration with CPU fallback.
available_providers = ort.get_available_providers()
preferred_providers = []
if "DmlExecutionProvider" in available_providers:
    preferred_providers.append("DmlExecutionProvider")
preferred_providers.append("CPUExecutionProvider")

DET_THRESH = float(os.environ.get("DET_THRESH", "0.45"))

try:
    face_app = FaceAnalysis(name='buffalo_l', providers=preferred_providers)
    face_app.prepare(ctx_id=0, det_size=(640, 640), det_thresh=DET_THRESH)
except Exception as e:
    print(f"Warning: Failed to initialize preferred providers, falling back to CPU: {e}")
    face_app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
    face_app.prepare(ctx_id=-1, det_size=(640, 640), det_thresh=DET_THRESH)

# ── Liveness / Presentation Attack Detection (PAD) ───────────────────────────
LIVENESS_ENABLED = os.environ.get("LIVENESS_ENABLED", "true").lower() in {"1", "true", "yes"}
LIVENESS_MODEL_PATH = os.environ.get("LIVENESS_MODEL_PATH", "")
LIVENESS_THRESHOLD = float(os.environ.get("LIVENESS_THRESHOLD", "0.70"))

if _ENVIRONMENT.lower() in {"production", "prod"} and not LIVENESS_ENABLED:
    raise RuntimeError("LIVENESS_ENABLED must be true in production (Presentation Attack Detection cannot be disabled)")

_pad_session = None
_pad_model_load_error = None
if LIVENESS_MODEL_PATH:
    if os.path.isfile(LIVENESS_MODEL_PATH):
        try:
            _pad_session = ort.InferenceSession(LIVENESS_MODEL_PATH, providers=['CPUExecutionProvider'])
            print(f"[AI] Loaded dedicated ONNX PAD model from {LIVENESS_MODEL_PATH}")
        except Exception as e:
            _pad_model_load_error = str(e)
            print(f"[AI] Warning: Failed to load ONNX PAD model from {LIVENESS_MODEL_PATH}: {e}")
    else:
        _pad_model_load_error = f"Model file not found at: {LIVENESS_MODEL_PATH}"
        print(f"[AI] Warning: PAD model path specified but file does not exist: {LIVENESS_MODEL_PATH}")

if _ENVIRONMENT.lower() in {"production", "prod"}:
    if not LIVENESS_MODEL_PATH or not os.path.isfile(LIVENESS_MODEL_PATH) or _pad_session is None:
        err_msg = f"Production requires a verified ONNX PAD model. Error: {_pad_model_load_error or 'LIVENESS_MODEL_PATH not configured'}"
        raise RuntimeError(err_msg)

def evaluate_face_liveness(img_bgr, face) -> dict:
    """Evaluate Presentation Attack Detection (PAD) according to ISO/IEC 30107.
    
    Performs multi-factor analysis:
    1. Texture frequency & Laplacian sharpness (detects printed paper / screens)
    2. HSV color saturation dispersion (detects flat/re-photographed displays)
    3. Facial detection confidence & geometric proportion
    4. ONNX model inference if model file is mounted
    """
    if not LIVENESS_ENABLED:
        return {
            "is_live": False,
            "score": 0.0,
            "method": "disabled",
            "warning": "Liveness evaluation disabled"
        }

    try:
        bbox = [int(max(0, v)) for v in face.bbox]
        x1, y1, x2, y2 = bbox[0], bbox[1], bbox[2], bbox[3]
        h, w = img_bgr.shape[:2]
        x2 = min(w, x2)
        y2 = min(h, y2)

        face_crop = img_bgr[y1:y2, x1:x2]
        if face_crop.size == 0 or (x2 - x1) < 20 or (y2 - y1) < 20:
            return {"is_live": False, "score": 0.0, "method": "invalid-crop"}

        # 1. Texture analysis (Laplacian variance)
        gray_crop = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        lap_var = float(cv2.Laplacian(gray_crop, cv2.CV_64F).var())
        # Genuine high-quality faces: 80 - 1200. Screen re-captures or blurred photos: < 40 or > 2000
        texture_score = min(1.0, max(0.1, (lap_var - 25.0) / 180.0))
        if lap_var > 2200.0:  # moire / halftone print grid artifact
            texture_score *= 0.6

        # 2. Color saturation dispersion
        hsv_crop = cv2.cvtColor(face_crop, cv2.COLOR_BGR2HSV)
        sat_std = float(np.std(hsv_crop[:, :, 1]))
        sat_score = min(1.0, max(0.2, sat_std / 45.0))

        # 3. Detection confidence
        det_conf = float(face.det_score) if face.det_score is not None else 0.5

        # Heuristic score
        heuristic_score = (0.45 * texture_score) + (0.25 * sat_score) + (0.30 * det_conf)

        final_score = heuristic_score
        if _pad_session is not None:
            method_name = "rgb-pad-model"
            try:
                inp = _pad_session.get_inputs()[0]
                inp_shape = inp.shape
                th = inp_shape[2] if len(inp_shape) >= 4 and isinstance(inp_shape[2], int) else 128
                tw = inp_shape[3] if len(inp_shape) >= 4 and isinstance(inp_shape[3], int) else 128
                resized = cv2.resize(face_crop, (tw, th))
                blob = cv2.dnn.blobFromImage(resized, 1.0/255.0, (tw, th), (0, 0, 0), swapRB=True, crop=False)
                outputs = _pad_session.run(None, {inp.name: blob})
                raw_output = outputs[0]
                arr = raw_output if isinstance(raw_output, np.ndarray) else np.asarray(raw_output)
                model_score = float(arr.flatten()[0]) if arr.size > 0 else heuristic_score
                final_score = (0.75 * model_score) + (0.25 * heuristic_score)
            except Exception as e:
                final_score = heuristic_score
        else:
            if _ENVIRONMENT.lower() in {"production", "prod"}:
                return {
                    "is_live": False,
                    "score": 0.0,
                    "method": "fail-closed-no-model",
                    "warning": "Production requires verified ONNX PAD model file"
                }
            method_name = "heuristic-texture-color"

        final_score = max(0.0, min(1.0, float(final_score)))
        is_live = bool(final_score >= LIVENESS_THRESHOLD)

        return {
            "is_live": is_live,
            "score": round(final_score, 4),
            "method": method_name
        }
    except Exception as e:
        return {
            "is_live": False,
            "score": 0.0,
            "method": "error"
        }

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "message": "AI Engine is running",
        "status": "operational",
        "model": "InsightFace (buffalo_l)",
        "mode": "insightface-production",
        "auth": "api-key" if _AI_API_KEY else "disabled (development)",
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy" if (_pad_session is not None or _ENVIRONMENT.lower() not in {"production", "prod"}) else "degraded",
        "service": "attendance-ai-engine",
        "timestamp": time.time(),
        "environment": _ENVIRONMENT,
        "face_engine": {
            "status": "ready",
            "model": "InsightFace (buffalo_l)",
            "providers": preferred_providers
        },
        "liveness_pad": {
            "enabled": LIVENESS_ENABLED,
            "threshold": LIVENESS_THRESHOLD,
            "model_path": LIVENESS_MODEL_PATH or None,
            "model_loaded": _pad_session is not None,
            "error": _pad_model_load_error,
            "mode": "rgb-pad-model" if _pad_session else ("heuristic-texture-color" if _ENVIRONMENT.lower() not in {"production", "prod"} else "fail-closed-no-model")
        }
    }

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5MB
MAX_PIXEL_DIMENSION = 4096
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/pjpeg"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}

@app.post("/extract-features")
async def extract_features(
    request: Request,
    file: UploadFile = File(...),
    x_api_key: str = Header(default=""),
    x_device_id: str = Header(default=""),
):
    """Extract a 512-dim face embedding from an uploaded image with DoS protection.

    Requires the `x-api-key` header to match the `AI_API_KEY` env variable
    when that variable is configured.
    """
    _verify_api_key(x_api_key)

    client_id = x_device_id.strip() or (request.client.host if request.client else "unknown")
    await _check_rate_limit(client_id)

    # Validate MIME type
    content_type = (file.content_type or "").lower()
    if content_type and content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported media type: {content_type}. Only JPEG and PNG are allowed."
        )

    # Validate file extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file extension: {ext}. Only .jpg, .jpeg, and .png are allowed."
        )

    # Read with size limit to prevent memory exhaustion DoS
    chunk_size = 64 * 1024
    total_size = 0
    chunks = []

    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > MAX_IMAGE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File exceeds maximum allowed size of {MAX_IMAGE_BYTES // (1024 * 1024)}MB"
            )
        chunks.append(chunk)

    contents = b"".join(chunks)
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    # Save to temp file safely
    suffix = ext if ext in ALLOWED_EXTENSIONS else ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        # Load image with OpenCV
        img = cv2.imread(tmp_path)
        if img is None:
            raise HTTPException(status_code=422, detail="Invalid or corrupt image format")

        # Check resolution limits
        height, width = img.shape[:2]
        if height > MAX_PIXEL_DIMENSION or width > MAX_PIXEL_DIMENSION:
            raise HTTPException(
                status_code=422,
                detail=f"Image resolution ({width}x{height}) exceeds maximum allowed dimension of {MAX_PIXEL_DIMENSION}px"
            )

        # Detect faces and extract embeddings with concurrency limit & timeout
        async with _inference_semaphore:
            try:
                faces = await asyncio.wait_for(
                    asyncio.to_thread(face_app.get, img),
                    timeout=INFERENCE_TIMEOUT_SECONDS,
                )
                # If no face is found in default orientation, check if the image
                # was captured by a device/emulator without orientation metadata (e.g. 90, 270, 180 degrees).
                if not faces:
                    for rot_mode in (cv2.ROTATE_90_CLOCKWISE, cv2.ROTATE_90_COUNTERCLOCKWISE, cv2.ROTATE_180):
                        rot_img = cv2.rotate(img, rot_mode)
                        rot_faces = await asyncio.wait_for(
                            asyncio.to_thread(face_app.get, rot_img),
                            timeout=INFERENCE_TIMEOUT_SECONDS,
                        )
                        if rot_faces:
                            faces = rot_faces
                            img = rot_img
                            break
            except asyncio.TimeoutError:
                raise HTTPException(
                    status_code=504,
                    detail=f"AI inference request timed out after {INFERENCE_TIMEOUT_SECONDS}s"
                )

        if not faces:
            raise HTTPException(status_code=422, detail="No face detected in the image")

        # Filter out any face objects with a missing or malformed bounding box.
        # InsightFace can occasionally return face objects where bbox is None (when
        # bounding-box estimation fails despite a landmark detection), which would
        # cause a TypeError when indexing into it during the sort below.
        faces = [f for f in faces if f.bbox is not None and len(f.bbox) >= 4]

        if not faces:
            raise HTTPException(status_code=422, detail="No face detected with a valid bounding box")

        # Sort by bounding-box area — largest face is closest to the camera
        faces = sorted(
            faces,
            key=lambda x: (float(x.bbox[2]) - float(x.bbox[0])) * (float(x.bbox[3]) - float(x.bbox[1])),
            reverse=True,
        )

        face = faces[0]
        # InsightFace buffalo_l produces 512-dim normalised embeddings
        if face.normed_embedding is None:
            raise HTTPException(status_code=422, detail="Face detected but embedding extraction failed")
        embedding = face.normed_embedding.tolist()

        # Evaluate Presentation Attack Detection (PAD) / Face Liveness
        pad_result = evaluate_face_liveness(img, face)

        result_data = {
            "success": True,
            "embedding": embedding,
            "embedding_size": len(embedding),
            "face_count": len(faces),
            "face_confidence": float(face.det_score) if face.det_score is not None else 0.0,
            "mode": "insightface-production",
            "is_live": pad_result["is_live"],
            "liveness_score": pad_result["score"],
            "liveness": {
                "method": pad_result["method"],
                "confidence": pad_result["score"],
                "threshold": LIVENESS_THRESHOLD,
            },
        }

        if _AI_ATTESTATION_SECRET:
            nonce = str(uuid.uuid4())
            issued_at = int(time.time() * 1000)
            claims = {
                "embedding": embedding,
                "is_live": pad_result["is_live"],
                "liveness_score": pad_result["score"],
                "nonce": nonce,
            }
            if x_device_id.strip():
                claims["device_id"] = x_device_id.strip()

            body_hash = hashlib.sha256(json.dumps(claims, separators=(',', ':')).encode('utf-8')).hexdigest()
            signature = hmac.new(
                _AI_ATTESTATION_SECRET.encode('utf-8'),
                f"{issued_at}:{body_hash}".encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            result_data["ai_attestation"] = {
                "issued_at": issued_at,
                "nonce": nonce,
                "signature": signature,
                **({"device_id": x_device_id.strip()} if x_device_id.strip() else {}),
            }

        return result_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="AI processing encountered an unexpected error.")
    finally:
        if os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

class MatchRequest(BaseModel):
    query_embedding: List[float]
    candidates: List[dict] # [{"id": "...", "embedding": [...]}]
    threshold: float = 0.82

@app.post("/compute-match")
async def compute_match(
    request_obj: Request,
    request: MatchRequest,
    x_api_key: str = Header(default=""),
    x_device_id: str = Header(default=""),
):
    """Perform vectorized face matching using NumPy.
    
    This is significantly faster than looping in JavaScript as it uses
    optimized matrix operations.
    """
    _verify_api_key(x_api_key)

    client_id = x_device_id.strip() or (request_obj.client.host if request_obj.client else "unknown")
    await _check_rate_limit(client_id)

    if not request.candidates:
        return {"success": False, "message": "No candidates provided"}

    if len(request.query_embedding) != 512:
        raise HTTPException(status_code=400, detail="query_embedding must contain 512 values")

    if len(request.candidates) > 5000:
        raise HTTPException(status_code=413, detail="Too many candidates")

    # Convert to numpy arrays
    query = np.array(request.query_embedding)
    
    # Extract IDs and embeddings matrix
    candidate_ids = []
    candidate_embeddings = []
    
    for c in request.candidates:
        if "id" not in c or "embedding" not in c:
            raise HTTPException(status_code=400, detail="Each candidate must include id and embedding")
        if len(c["embedding"]) != 512:
            raise HTTPException(status_code=400, detail="candidate embeddings must contain 512 values")
        candidate_ids.append(c["id"])
        candidate_embeddings.append(c["embedding"])
        
    matrix = np.array(candidate_embeddings)
    
    # Compute Cosine Similarity: (A . B) / (||A|| * ||B||)
    # Since InsightFace embeddings are already normalized (normed_embedding),
    # cosine similarity is just the dot product.
    similarities = np.dot(matrix, query)
    
    # Find the best match
    best_idx = np.argmax(similarities)
    best_score = float(similarities[best_idx])
    
    if best_score >= request.threshold:
        return {
            "success": True,
            "match": {
                "id": candidate_ids[best_idx],
                "score": best_score
            },
            "best_score": best_score,
            "match_found": True
        }
    
    return {
        "success": True,
        "match_found": False,
        "best_score": best_score,
        "message": "No match above threshold"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
