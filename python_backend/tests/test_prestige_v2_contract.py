"""Contract tests for the shipped v2 router without external services."""
import sys
import importlib.util
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
# Loading this public router directly avoids importing the unrelated database,
# assembly and business routers through apis/__init__.py during an offline test.
spec = importlib.util.spec_from_file_location("prestige_contract_router", Path(__file__).resolve().parents[1] / "apis/v2/prestige.py")
prestige = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prestige)


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

    def test_guides_reach_the_api_in_all_four_languages(self):
        for language in ("en", "ar", "tr", "ru"):
            for persona, message, kind in (
                ("professor", "Teach me operation", "operation"),
                ("doctor", "Spindle vibration observed", "diagnosis"),
                ("tour-guide", "Explore applications", "applications"),
            ):
                with self.subTest(language=language, kind=kind):
                    result = self.client.post("/api/v2/prestige/chat", json={
                        "message": message, "persona": persona, "language": language,
                    })
                    self.assertEqual(result.status_code, 200)
                    data = result.json()["data"]
                    guide = data["visual_elements"]["guided_content"]
                    self.assertEqual(guide["version"], 1)
                    self.assertEqual(guide["kind"], kind)
                    self.assertEqual(guide["language"], language)
                    self.assertTrue(data["advisory_only"])
                    self.assertIn("editorial_learning_outline", data["knowledge_sources"])
                    self.assertTrue(guide["notice"])
                    self.assertGreaterEqual(len(guide["modules"]), 3)
                    for module in guide["modules"]:
                        for step in module["steps"]:
                            self.assertTrue(step["points"])
                            self.assertTrue(step["reference"])
                    if kind == "operation":
                        self.assertNotIn("400V", data["response"])
                        self.assertNotIn("G54", data["response"])
                    if kind == "diagnosis":
                        self.assertEqual(guide["symptom"], message)

    def test_localized_application_quick_actions(self):
        for language, message in (("ar", "استكشف التطبيقات"), ("tr", "Uygulamaları keşfet"), ("ru", "Обзор применений")):
            result = self.client.post("/api/v2/prestige/chat", json={"message": message, "language": language, "persona": "tour-guide"})
            self.assertEqual(result.status_code, 200)
            self.assertEqual(result.json()["data"]["visual_elements"]["guided_content"]["kind"], "applications")

    def test_screen_followup_focuses_the_matching_topic(self):
        result = self.client.post("/api/v2/prestige/chat", json={"message": "Explain: Set Offsets", "persona": "professor"})
        modules = result.json()["data"]["visual_elements"]["guided_content"]["modules"]
        self.assertEqual(len(modules), 1)
        self.assertEqual([step["title"] for step in modules[0]["steps"]], ["Set Offsets"])
        # Focusing one response must not mutate the next operator's full lesson.
        full = self.client.post("/api/v2/prestige/chat", json={"message": "Teach me operation"})
        self.assertEqual(len(full.json()["data"]["visual_elements"]["guided_content"]["modules"]), 4)

    def test_alarm_reference_stays_separate_from_general_guidance(self):
        result = self.client.post("/api/v2/prestige/chat", json={"message": "Alarm 0x0610", "persona": "doctor"})
        self.assertEqual(result.status_code, 200)
        self.assertNotIn("guided_content", result.json()["data"]["visual_elements"])
        self.assertIn("0x0610", result.json()["data"]["response"])


if __name__ == "__main__":
    unittest.main()
