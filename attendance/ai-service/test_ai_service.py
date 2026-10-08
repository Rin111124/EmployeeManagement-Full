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

if __name__ == "__main__":
    unittest.main()
