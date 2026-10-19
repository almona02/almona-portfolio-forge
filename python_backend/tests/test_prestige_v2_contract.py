"""Contract tests for the shipped v2 router without external services."""
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from apis.v2 import prestige


class PrestigeV2Contract(unittest.TestCase):
    def setUp(self):
        app = FastAPI()
        app.include_router(prestige.router, prefix="/api/v2")
        self.client = TestClient(app)

    def test_all_prestige_operations_exist(self):
        paths = self.client.get("/openapi.json").json()["paths"]
        for suffix in (
            "chat",
            "diagnose",
            "gcode/explain",
            "gcode/validate",
            "gcode/sample",
            "learn/modules",
            "knowledge/stats",
            "machine/capabilities",
        ):
            self.assertIn("/api/v2/prestige/" + suffix, paths)

    def test_chat_returns_engine_result_without_shared_session_history(self):
        answer = SimpleNamespace(content="Knowledge answer", confidence=.8, sources=["manual"],
                                 suggested_actions=[], visual_aids={})
        with patch.object(prestige, "_answer", return_value=answer):
            result = self.client.post("/api/v2/prestige/chat", json={"message": "Explain maintenance"})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["data"]["response"], "Knowledge answer")
        self.assertTrue(result.json()["data"]["advisory_only"])

    def test_missing_engine_is_explicitly_unavailable(self):
        with patch.object(prestige, "get_engine", side_effect=HTTPException(503, "Knowledge unavailable")):
            result = self.client.get("/api/v2/prestige/knowledge/stats")
        self.assertEqual(result.status_code, 503)

    def test_gcode_never_returns_mock_validation_success(self):
        result = self.client.post("/api/v2/prestige/gcode/validate", json={
            "gcode_program": "G999", "operation_type": "milling"})
        self.assertEqual(result.status_code, 200)
        body = result.json()
        self.assertTrue(body["data"]["advisory_only"])
        # Never a mock "valid":true success — the unknown command is reported.
        self.assertNotIn('"valid":true', result.text)
        self.assertIn("G999", result.text)

    def test_packaged_knowledge_loads_for_metadata(self):
        prestige.get_engine.cache_clear()
        result = self.client.get("/api/v2/prestige/machine/capabilities")
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["data"]["specifications"]["model_code"], "AIM-7510")

    def test_oversized_message_is_rejected(self):
        result = self.client.post("/api/v2/prestige/chat", json={"message": "x" * 8001})
        self.assertEqual(result.status_code, 422)


if __name__ == "__main__":
    unittest.main()
