"""
Comprehensive test suite for YDT Prestige API endpoints
"""

from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

try:
    from api.prestige_endpoints import app
except ImportError:
    # Fallback if module structure is different
    sys.path.append(str(Path(__file__).parent.parent.parent))
    from python_backend.api.prestige_endpoints import app

client = TestClient(app)


class TestPrestigeAPI:
    """Comprehensive test suite for Prestige API endpoints"""

    def test_health_check(self):
        """Test health endpoint"""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert data["service"] == "YDT Prestige Agent API"
        print("[PASS] Health check passed")

    def test_chat_endpoint_basic(self):
        """Test basic chat functionality"""
        test_payload = {
            "message": "What is the power rating of AIM 7510?",
            "persona": "professor",
            "language": "en",
            "session_id": "test_session_001",
        }

        response = client.post("/api/v1/chat", json=test_payload)
        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert "data" in data
        assert "response" in data["data"]
        assert "confidence" in data["data"]
        assert data["data"]["persona"] == "professor"
        assert data["data"]["language"] == "en"
        # Can be 0 for very fast responses
        assert data["data"]["response_time"] >= 0

        conf = data["data"]["confidence"]
        print(f"[PASS] Chat endpoint basic test passed - Confidence: {conf}%")
        return data

    def test_chat_different_personas(self):
        """Test all persona modes"""
        personas = [
            "professor",
            "doctor",
            "tour-guide",
            "code-master",
            "nervous-system",
        ]

        for persona in personas:
            test_payload = {
                "message": "Explain this machine",
                "persona": persona,
                "language": "en",
            }

            response = client.post("/api/v1/chat", json=test_payload)
            assert response.status_code == 200
            data = response.json()

            assert data["success"] is True
            assert data["data"]["persona"] == persona
            print(f"[PASS] Persona '{persona}' test passed")

    def test_chat_multilingual(self):
        """Test all supported languages"""
        languages = ["tr", "en", "ru", "ar"]

        for lang in languages:
            test_payload = {
                "message": "Merhaba" if lang == "tr" else "Hello",
                "persona": "professor",
                "language": lang,
            }

            response = client.post("/api/v1/chat", json=test_payload)
            assert response.status_code == 200
            data = response.json()

            assert data["success"] is True
            assert data["data"]["language"] == lang
            print(f"[PASS] Language '{lang}' test passed")

    def test_gcode_validation(self):
        """Test G-code validation endpoint"""
        sample_gcode = """
G00 X100 Y100
G01 Z-10 F1000
G02 X150 Y150 I25 J0
G00 Z50
M30
"""

        test_payload = {
            "gcode_program": sample_gcode,
            "operation_type": "milling",
            "material": "aluminum",
            "language": "en",
        }

        response = client.post("/api/v1/gcode/validate", json=test_payload)
        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert "data" in data
        validation = "validation" in data["data"]
        optimal = "optimal_parameters" in data["data"]
        assert validation or optimal

        print("[PASS] G-code validation test passed")

    def test_learning_modules(self):
        """Test learning modules endpoint"""
        response = client.get("/api/v1/learn/modules?language=en")
        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert "modules" in data["data"]
        assert isinstance(data["data"]["modules"], list)
        assert len(data["data"]["modules"]) > 0

        # Check module structure
        first_module = data["data"]["modules"][0]
        assert "id" in first_module
        assert "title" in first_module
        assert "description" in first_module
        assert "lessons" in first_module

        module_count = len(data["data"]["modules"])
        msg = f"[PASS] Learning modules test passed - Found {module_count} modules"
        print(msg)

    def test_diagnosis_endpoint(self):
        """Test machine diagnosis endpoint"""
        test_payload = {
            "symptoms": ["Machine not starting", "No power to spindle"],
            "error_codes": ["0x1200"],
            "language": "en",
        }

        response = client.post("/api/v1/diagnose", json=test_payload)
        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert "diagnosis" in data["data"]
        assert "confidence" in data["data"]
        assert "probable_causes" in data["data"]
        assert "immediate_actions" in data["data"]

        print("[PASS] Diagnosis endpoint test passed")

    def test_knowledge_stats(self):
        """Test knowledge statistics endpoint"""
        response = client.get("/api/v1/knowledge/stats")
        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert "knowledge_base" in data["data"]
        assert "extraction_accuracy" in data["data"]
        assert "coverage" in data["data"]

        # Verify some expected values
        kb = data["data"]["knowledge_base"]
        assert kb["components"] == 1193
        assert kb["connections"] == 1253
        assert kb["spare_parts"] == 281

        print("[PASS] Knowledge stats test passed")

    def test_machine_capabilities(self):
        """Test machine capabilities endpoint"""
        response = client.get("/api/v1/machine/capabilities")
        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert "machine" in data["data"]
        assert data["data"]["machine"] == "AIM 7510"
        assert "capabilities" in data["data"]
        assert "specifications" in data["data"]

        caps = data["data"]["capabilities"]
        assert "operations" in caps
        assert "materials" in caps
        assert "applications" in caps
        assert "features" in caps

        print("[PASS] Machine capabilities test passed")

    def test_error_handling(self):
        """Test error cases"""
        # Test invalid persona (should handle gracefully)
        test_payload = {
            "message": "Test",
            "persona": "invalid_persona",  # Invalid
            "language": "en",
        }

        response = client.post("/api/v1/chat", json=test_payload)
        # Should handle gracefully
        assert response.status_code == 200

        # Test missing required field
        test_payload = {
            "persona": "professor",
            "language": "en",
            # Missing "message"
        }

        response = client.post("/api/v1/chat", json=test_payload)
        # Validation error
        assert response.status_code == 422

        print("[PASS] Error handling test passed")

    def test_performance_metrics(self):
        """Test response time and performance"""
        import time

        test_payload = {
            "message": "Performance test",
            "persona": "professor",
            "language": "en",
        }

        # Run multiple requests to test performance
        response_times = []
        for i in range(5):
            start_time = time.time()
            response = client.post("/api/v1/chat", json=test_payload)
            end_time = time.time()

            assert response.status_code == 200
            response_times.append(end_time - start_time)

            # Small delay between requests
            time.sleep(0.1)

        avg_response_time = sum(response_times) / len(response_times)
        max_response_time = max(response_times)
        all_under_1_2 = all(t < 1.2 for t in response_times)

        print("[PERF] Performance metrics:")
        print(f"   Average response time: {avg_response_time:.3f}s")
        print(f"   Max response time: {max_response_time:.3f}s")
        print(f"   All under 1.2s: {all_under_1_2}")

        assert avg_response_time < 1.2, "Response time too slow"
        print("[PASS] Performance test passed")


def run_all_tests():
    """Run all tests and generate report"""
    import sys
    import io

    # Fix Windows encoding issues
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(
            sys.stdout.buffer, encoding="utf-8", errors="replace"
        )

    print("=" * 60)
    print("[TEST] YDT PRESTIGE API TEST SUITE")
    print("=" * 60)

    test_instance = TestPrestigeAPI()
    results = []

    # List of test methods
    test_methods = [
        test_instance.test_health_check,
        test_instance.test_chat_endpoint_basic,
        test_instance.test_chat_different_personas,
        test_instance.test_chat_multilingual,
        test_instance.test_gcode_validation,
        test_instance.test_learning_modules,
        test_instance.test_diagnosis_endpoint,
        test_instance.test_knowledge_stats,
        test_instance.test_machine_capabilities,
        test_instance.test_error_handling,
        test_instance.test_performance_metrics,
    ]

    # Run tests
    for test_method in test_methods:
        test_name = test_method.__name__
        try:
            test_method()
            results.append((test_name, "[PASS] PASSED"))
        except AssertionError as e:
            msg = f"[FAIL] FAILED: AssertionError - {str(e)}"
            results.append((test_name, msg))
        except Exception as e:
            import traceback

            error_msg = f"{type(e).__name__}: {str(e)}"
            results.append((test_name, f"[FAIL] FAILED: {error_msg}"))
            print(f"\n[ERROR] {test_name} failed with: {error_msg}")
            traceback.print_exc()

    # Generate report
    print("\n" + "=" * 60)
    print("[REPORT] TEST REPORT")
    print("=" * 60)

    passed = sum(1 for _, status in results if "PASS" in status)
    failed = len(results) - passed

    for test_name, status in results:
        print(f"{test_name:40} {status}")

    total = len(results)
    print(f"\n[SUMMARY] {passed} passed, {failed} failed out of {total} tests")

    if failed == 0:
        print("[SUCCESS] ALL TESTS PASSED! API is ready for production!")
    else:
        print("[WARNING] Some tests failed. Check the errors above.")

    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
