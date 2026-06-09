import os
import tempfile
import numpy as np
from fastapi import FastAPI, File, HTTPException, Header, UploadFile
from insightface.app import FaceAnalysis
import onnxruntime as ort
import cv2

app = FastAPI(title="Attendance AI Engine (InsightFace)")

# ── API Key Authentication ────────────────────────────────────────────────────
# Set AI_API_KEY in your environment (or .env.docker).
# If not set, auth is disabled and a warning is printed (development only).
_AI_API_KEY = os.environ.get("AI_API_KEY", "")
_ENVIRONMENT = os.environ.get("ENVIRONMENT") or os.environ.get("NODE_ENV") or "development"
if _ENVIRONMENT.lower() in {"production", "prod"} and not _AI_API_KEY:
    raise RuntimeError("AI_API_KEY is required in production")

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

try:
    face_app = FaceAnalysis(name='buffalo_l', providers=preferred_providers)
    face_app.prepare(ctx_id=0, det_size=(640, 640))
except Exception as e:
    print(f"Warning: Failed to initialize preferred providers, falling back to CPU: {e}")
    face_app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
    face_app.prepare(ctx_id=-1, det_size=(640, 640))

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

@app.post("/extract-features")
async def extract_features(
    file: UploadFile = File(...),
    x_api_key: str = Header(default=""),
):
    """Extract a 512-dim face embedding from an uploaded image.

    Requires the `x-api-key` header to match the `AI_API_KEY` env variable
    when that variable is configured.
    """
    _verify_api_key(x_api_key)

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    # Save to temp file
    suffix = os.path.splitext(file.filename or ".jpg")[1] or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        # Load image with OpenCV
        img = cv2.imread(tmp_path)
        if img is None:
            raise HTTPException(status_code=422, detail="Invalid image format")

        # Detect faces and extract embeddings
        faces = face_app.get(img)

        if not faces:
            raise HTTPException(status_code=422, detail="No face detected")

        # Sort by bounding-box area — largest face is closest to the camera
        faces = sorted(
            faces,
            key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]),
            reverse=True,
        )

        face = faces[0]
        # InsightFace buffalo_l produces 512-dim normalised embeddings
        embedding = face.normed_embedding.tolist()

        return {
            "success": True,
            "embedding": embedding,
            "embedding_size": len(embedding),
            "face_count": len(faces),
            "face_confidence": float(face.det_score),
            "mode": "insightface-production",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing error: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

from typing import List, Optional
from pydantic import BaseModel

class MatchRequest(BaseModel):
    query_embedding: List[float]
    candidates: List[dict] # [{"id": "...", "embedding": [...]}]
    threshold: float = 0.82

@app.post("/compute-match")
async def compute_match(
    request: MatchRequest,
    x_api_key: str = Header(default=""),
):
    """Perform vectorized face matching using NumPy.
    
    This is significantly faster than looping in JavaScript as it uses
    optimized matrix operations.
    """
    _verify_api_key(x_api_key)

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
