#!/usr/bin/env python3
"""
Assembly Intelligence Smoke Test
Runs a few shop drawings through /api/v2/smart-scan/assembly and logs metrics.
"""
import json
import time
from pathlib import Path

from fastapi.testclient import TestClient

from apis.main import app


def smoke_test_assembly() -> bool:
    client = TestClient(app)
    test_dir = Path("test_samples/assembly")
    test_dir.mkdir(parents=True, exist_ok=True)

    test_files = [
        "sliding_window_sample.pdf",
        "casement_window_sample.png",
        "fixed_window_sample.jpg",
    ]

    results = []
    metrics = {
        "total_tests": 0,
        "successful_scans": 0,
        "avg_processing_time": 0.0,
        "avg_confidence": 0.0,
        "component_counts": [],
    }

    print("Running Assembly Intelligence Smoke Tests")
    print("=" * 60)

    for test_file in test_files:
        file_path = test_dir / test_file
        if not file_path.exists():
            print(f"Skipping {test_file} - file not found in {test_dir}")
            continue

        print(f"\nTesting: {test_file}")
        start_time = time.time()
        try:
            with open(file_path, "rb") as f:
                response = client.post(
                    "/api/v2/smart-scan/assembly",
                    files={
                        "file": (
                            test_file,
                            f,
                            "application/pdf"
                            if file_path.suffix.lower() == ".pdf"
                            else "image/png",
                        )
                    },
                )
        except Exception as exc:
            print(f"  Error invoking endpoint: {exc}")
            continue

        processing_time = time.time() - start_time

        if response.status_code == 200:
            result = response.json()
            metrics["total_tests"] += 1
            if result.get("success"):
                metrics["successful_scans"] += 1
                metrics["avg_confidence"] += result.get("confidence", 0.0)
                metrics["component_counts"].append(len(result.get("components", [])))

            test_result = {
                "file": test_file,
                "success": result.get("success"),
                "processing_time": round(processing_time, 2),
                "system_type": result.get("system", {}).get("system_type", "unknown"),
                "confidence": round(result.get("confidence", 0), 2),
                "components": len(result.get("components", [])),
                "connections": len(result.get("connections", [])),
                "requires_review": result.get("requires_user_review", True),
                "issues": result.get("validation_results", {}).get("issues", []),
                "missing": result.get("missing_components", []),
            }
            results.append(test_result)

            print(f"  Success: {test_result['success']}")
            print(f"  Time: {test_result['processing_time']}s")
            print(f"  System: {test_result['system_type']}")
            print(f"  Confidence: {test_result['confidence']}")
            print(f"  Components: {test_result['components']}")
            print(f"  Connections: {test_result['connections']}")
            if test_result["issues"]:
                print(f"  Issues: {len(test_result['issues'])}")
            if test_result["missing"]:
                print(f"  Missing: {test_result['missing']}")
        else:
            print(f"  API Error: {response.status_code}")
            print(f"  Response: {response.text[:200]}")

    if metrics["successful_scans"] > 0:
        metrics["avg_confidence"] /= metrics["successful_scans"]
        metrics["avg_processing_time"] = sum(
            r["processing_time"] for r in results if r.get("success")
        ) / metrics["successful_scans"]

    report = {
        "timestamp": time.time(),
        "metrics": metrics,
        "results": results,
        "summary": {
          "success_rate": metrics["successful_scans"] / max(metrics["total_tests"], 1),
          "avg_components": (
              sum(metrics["component_counts"])
              / max(len(metrics["component_counts"]), 1)
          ),
          "recommended_action": "Ready for user testing"
          if metrics["successful_scans"] / max(metrics["total_tests"], 1) > 0.7
          else "Needs improvement",
        },
    }

    report_file = test_dir / "smoke_test_report.json"
    with open(report_file, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)

    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Total Tests: {metrics['total_tests']}")
    print(f"Successful: {metrics['successful_scans']}")
    print(f"Success Rate: {report['summary']['success_rate']:.1%}")
    print(f"Avg Confidence: {metrics['avg_confidence']:.1%}")
    print(f"Avg Processing Time: {metrics.get('avg_processing_time', 0):.2f}s")
    print(f"Avg Components: {report['summary']['avg_components']:.1f}")
    print(f"Report saved to: {report_file}")

    return report["summary"]["success_rate"] > 0.7


if __name__ == "__main__":
    success = smoke_test_assembly()
    if success:
        print("Smoke tests passed. Ready for user testing.")
    else:
        print("Smoke tests indicate issues. Please review the implementation.")

