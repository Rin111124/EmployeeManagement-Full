import io
import unittest
from fastapi.testclient import TestClient
from main import app, MAX_IMAGE_BYTES

client = TestClient(app)

class TestAIService(unittest.TestCase):
    def test_root_health_check(self):
        response = client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "operational")
        self.assertIn("InsightFace", data["model"])

    def test_compute_match_empty_candidates(self):
        payload = {
            "query_embedding": [0.0] * 512,
            "candidates": [],
            "threshold": 0.82
        }
        response = client.post("/compute-match", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["success"])
        self.assertIn("No candidates", data["message"])

    def test_compute_match_invalid_query_dimension(self):
        payload = {
            "query_embedding": [0.0] * 128,  # invalid dimension (must be 512)
            "candidates": [{"id": "emp-1", "embedding": [0.0] * 512}],
            "threshold": 0.82
        }
        response = client.post("/compute-match", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("512 values", response.json()["detail"])

    def test_compute_match_malformed_candidate(self):
        payload = {
            "query_embedding": [0.1] * 512,
            "candidates": [{"id": "emp-1"}],  # missing embedding
            "threshold": 0.82
        }
        response = client.post("/compute-match", json=payload)
        self.assertEqual(response.status_code, 400)

    def test_compute_match_exact_vector_match(self):
        # Normalized unit vector
        unit_vec = [1.0 / (512 ** 0.5)] * 512
        payload = {
            "query_embedding": unit_vec,
            "candidates": [
                {"id": "emp-wrong", "embedding": [-v for v in unit_vec]},
                {"id": "emp-target", "embedding": unit_vec},
            ],
            "threshold": 0.80
        }
        response = client.post("/compute-match", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertTrue(data["match_found"])
        self.assertEqual(data["match"]["id"], "emp-target")
        self.assertAlmostEqual(data["match"]["score"], 1.0, places=4)

    def test_extract_features_unsupported_extension(self):
        files = {
            "file": ("malicious.exe", io.BytesIO(b"executable content"), "application/octet-stream")
        }
        response = client.post("/extract-features", files=files)
        self.assertEqual(response.status_code, 415)

    def test_extract_features_empty_file(self):
        files = {
            "file": ("empty.jpg", io.BytesIO(b""), "image/jpeg")
        }
        response = client.post("/extract-features", files=files)
        self.assertEqual(response.status_code, 400)

    def test_extract_features_corrupt_image(self):
        files = {
            "file": ("corrupt.jpg", io.BytesIO(b"not an image"), "image/jpeg")
        }
        response = client.post("/extract-features", files=files)
        self.assertEqual(response.status_code, 422)

    def test_extract_features_oversized_file(self):
        # Oversized fake JPEG payload
        oversized = io.BytesIO(b"X" * (MAX_IMAGE_BYTES + 1024))
        files = {
            "file": ("huge.jpg", oversized, "image/jpeg")
        }
        response = client.post("/extract-features", files=files)
        self.assertEqual(response.status_code, 413)

    def test_health_diagnostic_endpoint(self):
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertEqual(data["service"], "attendance-ai-engine")
        self.assertIn("face_engine", data)
        self.assertEqual(data["face_engine"]["status"], "ready")
        self.assertIn("liveness_pad", data)
        self.assertTrue(data["liveness_pad"]["enabled"])

    def test_liveness_genuine_synthetic_face(self):
        import numpy as np
        from main import evaluate_face_liveness

        class MockFace:
            def __init__(self):
                self.bbox = [20, 20, 120, 120]
                self.det_score = 0.95

        # Create 150x150 image with realistic face texture (natural variations)
        img = np.random.randint(80, 180, (150, 150, 3), dtype=np.uint8)
        result = evaluate_face_liveness(img, MockFace())
        self.assertIn("is_live", result)
        self.assertIn("score", result)
        self.assertGreaterEqual(result["score"], 0.60)

    def test_liveness_screen_recapture_or_blur_spoof(self):
        import numpy as np
        from main import evaluate_face_liveness

        class MockFace:
            def __init__(self):
                self.bbox = [10, 10, 90, 90]
                self.det_score = 0.40

        # Uniform flat image (flat display re-photograph / low variance)
        img = np.full((120, 120, 3), 128, dtype=np.uint8)
        result = evaluate_face_liveness(img, MockFace())
        self.assertFalse(result["is_live"])
        self.assertLess(result["score"], 0.50)

    def test_liveness_invalid_tiny_crop(self):
        import numpy as np
        from main import evaluate_face_liveness

        class MockFace:
            def __init__(self):
                self.bbox = [5, 5, 15, 15] # 10x10 < 20x20
                self.det_score = 0.50

        img = np.zeros((50, 50, 3), dtype=np.uint8)
        result = evaluate_face_liveness(img, MockFace())
        self.assertFalse(result["is_live"])
        self.assertEqual(result["method"], "invalid-crop")

if __name__ == "__main__":
    unittest.main()

