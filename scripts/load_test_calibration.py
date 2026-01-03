#!/usr/bin/env python3
"""
Calibration Safety Net - Load Test
==================================

Simulates concurrent certification and prediction requests to test
performance and concurrency control under load.
"""

import os
import sys
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any

# Add python_backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python_backend'))

try:
    from ai_services.calibration.calibration_safety_net import CalibrationSafetyNet
    from core.operation_mode import OperationModeManager, OperationMode
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running from the project root and dependencies are installed")
    sys.exit(1)


class LoadTestResult:
    """Result of a load test operation."""
    def __init__(self, operation: str, success: bool, duration_ms: float, error: str = ""):
        self.operation = operation
        self.success = success
        self.duration_ms = duration_ms
        self.error = error


def simulate_certification(
    safety_net: CalibrationSafetyNet,
    profile_id: str,
    joint_type: str,
    workshop_id: str,
    k_factor: float,
    confidence: float
) -> LoadTestResult:
    """Simulate a baseline certification request."""
    start_time = time.time()
    
    try:
        safety_net.certify_baseline(
            profile_id=profile_id,
            joint_type=joint_type,
            workshop_id=workshop_id,
            k_factor=k_factor,
            confidence=confidence,
            certified_by=f"load_test_{threading.current_thread().ident}"
        )
        
        duration_ms = (time.time() - start_time) * 1000
        
        return LoadTestResult(
            operation="certify",
            success=True,
            duration_ms=duration_ms
        )
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        
        return LoadTestResult(
            operation="certify",
            success=False,
            duration_ms=duration_ms,
            error=str(e)
        )


def simulate_prediction(
    safety_net: CalibrationSafetyNet,
    profile_id: str,
    joint_type: str,
    context: Any,
    workshop_id: str
) -> LoadTestResult:
    """Simulate a K-factor prediction request."""
    start_time = time.time()
    
    try:
        safety_net.predict(
            profile_data={"id": profile_id},
            joint_type=joint_type,
            context=context,
            workshop_id=workshop_id
        )
        
        duration_ms = (time.time() - start_time) * 1000
        
        return LoadTestResult(
            operation="predict",
            success=True,
            duration_ms=duration_ms
        )
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        
        return LoadTestResult(
            operation="predict",
            success=False,
            duration_ms=duration_ms,
            error=str(e)
        )


def run_load_test(
    num_threads: int = 10,
    operations_per_thread: int = 5,
    test_type: str = "mixed"
) -> Dict[str, Any]:
    """
    Run load test with concurrent operations.
    
    Args:
        num_threads: Number of concurrent threads
        operations_per_thread: Operations per thread
        test_type: "certify", "predict", or "mixed"
    
    Returns:
        Dictionary with test results
    """
    print(f"\n🚀 Starting load test...")
    print(f"   Threads: {num_threads}")
    print(f"   Operations per thread: {operations_per_thread}")
    print(f"   Test type: {test_type}\n")
    
    safety_net = CalibrationSafetyNet()
    context = OperationModeManager.resolve(
        workshop_id="load_test",
        explicitMode=OperationMode.PRODUCTION
    )
    
    results: List[LoadTestResult] = []
    start_time = time.time()
    
    def run_operations(thread_id: int):
        """Run operations for a single thread."""
        thread_results = []
        
        for op_id in range(operations_per_thread):
            profile_id = f"load_test_profile_{thread_id}_{op_id}"
            joint_type = "miter_45"
            workshop_id = f"workshop_{thread_id}"
            
            if test_type == "certify" or (test_type == "mixed" and op_id % 2 == 0):
                # Certification
                result = simulate_certification(
                    safety_net,
                    profile_id=profile_id,
                    joint_type=joint_type,
                    workshop_id=workshop_id,
                    k_factor=2.5 + (op_id * 0.1),
                    confidence=0.90
                )
                thread_results.append(result)
            else:
                # Prediction
                result = simulate_prediction(
                    safety_net,
                    profile_id=profile_id,
                    joint_type=joint_type,
                    context=context,
                    workshop_id=workshop_id
                )
                thread_results.append(result)
        
        return thread_results
    
    # Run concurrent operations
    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [
            executor.submit(run_operations, thread_id)
            for thread_id in range(num_threads)
        ]
        
        for future in as_completed(futures):
            thread_results = future.result()
            results.extend(thread_results)
    
    total_duration = time.time() - start_time
    
    # Analyze results
    total_operations = len(results)
    successful_operations = sum(1 for r in results if r.success)
    failed_operations = total_operations - successful_operations
    
    certify_results = [r for r in results if r.operation == "certify"]
    predict_results = [r for r in results if r.operation == "predict"]
    
    # Calculate statistics
    def calculate_stats(result_list: List[LoadTestResult]) -> Dict[str, float]:
        if not result_list:
            return {
                "count": 0,
                "success_rate": 0.0,
                "avg_duration_ms": 0.0,
                "min_duration_ms": 0.0,
                "max_duration_ms": 0.0
            }
        
        successful = [r for r in result_list if r.success]
        durations = [r.duration_ms for r in successful]
        
        return {
            "count": len(result_list),
            "success_rate": len(successful) / len(result_list) * 100,
            "avg_duration_ms": sum(durations) / len(durations) if durations else 0.0,
            "min_duration_ms": min(durations) if durations else 0.0,
            "max_duration_ms": max(durations) if durations else 0.0
        }
    
    certify_stats = calculate_stats(certify_results)
    predict_stats = calculate_stats(predict_results)
    
    return {
        "total_operations": total_operations,
        "successful_operations": successful_operations,
        "failed_operations": failed_operations,
        "success_rate": (successful_operations / total_operations * 100) if total_operations > 0 else 0.0,
        "total_duration_seconds": total_duration,
        "operations_per_second": total_operations / total_duration if total_duration > 0 else 0.0,
        "certify_stats": certify_stats,
        "predict_stats": predict_stats,
        "errors": [r.error for r in results if not r.success and r.error]
    }


def print_results(results: Dict[str, Any]) -> None:
    """Print load test results."""
    print("\n" + "=" * 60)
    print("  Load Test Results")
    print("=" * 60 + "\n")
    
    print(f"Total Operations: {results['total_operations']}")
    print(f"Successful: {results['successful_operations']}")
    print(f"Failed: {results['failed_operations']}")
    print(f"Success Rate: {results['success_rate']:.2f}%")
    print(f"Total Duration: {results['total_duration_seconds']:.2f}s")
    print(f"Operations/Second: {results['operations_per_second']:.2f}\n")
    
    print("Certification Operations:")
    print(f"  Count: {results['certify_stats']['count']}")
    print(f"  Success Rate: {results['certify_stats']['success_rate']:.2f}%")
    print(f"  Avg Duration: {results['certify_stats']['avg_duration_ms']:.2f}ms")
    print(f"  Min Duration: {results['certify_stats']['min_duration_ms']:.2f}ms")
    print(f"  Max Duration: {results['certify_stats']['max_duration_ms']:.2f}ms\n")
    
    print("Prediction Operations:")
    print(f"  Count: {results['predict_stats']['count']}")
    print(f"  Success Rate: {results['predict_stats']['success_rate']:.2f}%")
    print(f"  Avg Duration: {results['predict_stats']['avg_duration_ms']:.2f}ms")
    print(f"  Min Duration: {results['predict_stats']['min_duration_ms']:.2f}ms")
    print(f"  Max Duration: {results['predict_stats']['max_duration_ms']:.2f}ms\n")
    
    if results['errors']:
        print("Errors:")
        for error in results['errors'][:10]:  # Show first 10 errors
            print(f"  - {error}")
        if len(results['errors']) > 10:
            print(f"  ... and {len(results['errors']) - 10} more errors")
    
    print("\n" + "=" * 60 + "\n")


def main():
    """Main load test flow."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Load test Calibration Safety Net")
    parser.add_argument(
        "--threads",
        type=int,
        default=10,
        help="Number of concurrent threads (default: 10)"
    )
    parser.add_argument(
        "--operations",
        type=int,
        default=5,
        help="Operations per thread (default: 5)"
    )
    parser.add_argument(
        "--type",
        choices=["certify", "predict", "mixed"],
        default="mixed",
        help="Test type (default: mixed)"
    )
    
    args = parser.parse_args()
    
    print("\n" + "=" * 60)
    print("  Calibration Safety Net - Load Test")
    print("=" * 60)
    
    results = run_load_test(
        num_threads=args.threads,
        operations_per_thread=args.operations,
        test_type=args.type
    )
    
    print_results(results)
    
    # Exit with error if success rate is too low
    if results['success_rate'] < 95.0:
        print("⚠️  Warning: Success rate below 95%")
        sys.exit(1)
    else:
        print("✅ Load test passed!")
        sys.exit(0)


if __name__ == "__main__":
    main()

