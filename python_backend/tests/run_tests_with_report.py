"""
Automated Test Runner with HTML Report
"""

import unittest
import sys
import os
import json
from datetime import datetime
from pathlib import Path

class TestRunner:
    def __init__(self, email_config=None):
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "tests": [],
            "summary": {},
            "environment": self.get_environment_info()
        }
        self.email_config = email_config
    
    def get_environment_info(self):
        """Get system and environment information"""
        import platform
        return {
            "python_version": platform.python_version(),
            "system": platform.system(),
            "release": platform.release(),
            "processor": platform.processor(),
            "cwd": os.getcwd()
        }
    
    def run_all_tests(self):
        """Run all test suites"""
        print("🧪 Running YDT Prestige API Test Suite")
        print("=" * 60)
        
        # Import and run test suites
        try:
            from test_prestige_endpoints import run_all_tests as run_api_tests
            
            # Run API tests
            print("\n1. Running API Endpoint Tests...")
            api_success = run_api_tests()
            self.results["tests"].append({
                "name": "API Endpoint Tests",
                "passed": api_success,
                "timestamp": datetime.now().isoformat()
            })
        except Exception as e:
            print(f"❌ API test error: {e}")
            self.results["tests"].append({
                "name": "API Endpoint Tests",
                "passed": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
        
        # Run performance test
        print("\n2. Running Performance Tests...")
        perf_success = self.run_performance_test()
        self.results["tests"].append({
            "name": "Performance Tests",
            "passed": perf_success,
            "timestamp": datetime.now().isoformat()
        })
        
        # Run integration test
        print("\n3. Running Integration Tests...")
        int_success = self.run_integration_test()
        self.results["tests"].append({
            "name": "Integration Tests",
            "passed": int_success,
            "timestamp": datetime.now().isoformat()
        })
        
        # Calculate summary
        total_tests = len(self.results["tests"])
        passed_tests = sum(1 for test in self.results["tests"] if test.get("passed", False))
        
        self.results["summary"] = {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": total_tests - passed_tests,
            "success_rate": (passed_tests / total_tests * 100) if total_tests > 0 else 0,
            "all_passed": passed_tests == total_tests
        }
        
        # Generate report
        self.generate_report()
        
        return self.results["summary"]["all_passed"]
    
    def run_performance_test(self):
        """Run performance tests"""
        try:
            import requests
            import time
            
            # Simple performance test
            test_payload = {
                "message": "Performance test",
                "persona": "professor",
                "language": "en"
            }
            
            response_times = []
            for i in range(5):
                start = time.time()
                response = requests.post("http://localhost:8000/api/v1/chat", json=test_payload, timeout=10)
                end = time.time()
                
                if response.status_code == 200:
                    response_times.append(end - start)
            
            if response_times:
                avg_time = sum(response_times) / len(response_times)
                if avg_time < 1.2:
                    print("✅ Performance tests passed")
                    return True
            
            print("❌ Performance tests failed")
            return False
            
        except Exception as e:
            print(f"❌ Performance test error: {e}")
            return False
    
    def run_integration_test(self):
        """Run integration tests"""
        try:
            import requests
            
            # Check if API is accessible
            api_response = requests.get("http://localhost:8000/api/health", timeout=5)
            
            if api_response.status_code == 200:
                print("✅ Integration tests passed")
                return True
            else:
                print("❌ Integration tests failed")
                return False
                
        except Exception as e:
            print(f"❌ Integration test error: {e}")
            return False
    
    def generate_report(self):
        """Generate HTML report"""
        summary = self.results["summary"]
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>YDT Prestige API Test Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }}
                .header {{ background: linear-gradient(to right, #3b82f6, #8b5cf6); 
                          color: white; padding: 20px; border-radius: 10px; }}
                .summary {{ background: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0; }}
                .test {{ padding: 15px; margin: 10px 0; border-radius: 5px; }}
                .passed {{ background: #d1fae5; border-left: 5px solid #10b981; }}
                .failed {{ background: #fee2e2; border-left: 5px solid #ef4444; }}
                .metrics {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                           gap: 20px; margin: 20px 0; }}
                .metric-card {{ background: white; padding: 20px; border-radius: 10px; 
                               box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }}
                .success-rate {{ font-size: 2em; font-weight: bold; color: #10b981; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🧪 YDT Prestige API Test Report</h1>
                <p>Generated: {self.results['timestamp']}</p>
            </div>
            
            <div class="summary">
                <h2>📊 Test Summary</h2>
                <div class="metrics">
                    <div class="metric-card">
                        <div class="success-rate">{summary['success_rate']:.1f}%</div>
                        <div>Success Rate</div>
                    </div>
                    <div class="metric-card">
                        <div style="font-size: 2em; font-weight: bold;">{summary['passed_tests']}/{summary['total_tests']}</div>
                        <div>Tests Passed</div>
                    </div>
                    <div class="metric-card">
                        <div style="font-size: 2em; font-weight: bold; color: {'#10b981' if summary['all_passed'] else '#ef4444'};">
                            {'✅ PASS' if summary['all_passed'] else '❌ FAIL'}
                        </div>
                        <div>Overall Status</div>
                    </div>
                </div>
            </div>
            
            <h2>🔍 Test Details</h2>
        """
        
        for test in self.results["tests"]:
            status_class = "passed" if test.get("passed", False) else "failed"
            status_icon = "✅" if test.get("passed", False) else "❌"
            html += f"""
            <div class="test {status_class}">
                <h3>{status_icon} {test['name']}</h3>
                <p>Status: <strong>{'PASSED' if test.get('passed', False) else 'FAILED'}</strong></p>
                <p>Time: {test['timestamp']}</p>
                {f"<p>Error: {test.get('error', '')}</p>" if test.get('error') else ""}
            </div>
            """
        
        html += """
            <div style="margin-top: 40px; padding: 20px; background: #f1f5f9; border-radius: 10px;">
                <h3>🌐 Environment Information</h3>
                <pre style="background: white; padding: 15px; border-radius: 5px;">
        """
        
        html += json.dumps(self.results["environment"], indent=2)
        
        html += """
                </pre>
            </div>
        </body>
        </html>
        """
        
        # Save report
        report_file = Path(__file__).parent / "test_report.html"
        with open(report_file, "w", encoding='utf-8') as f:
            f.write(html)
        
        print(f"\n📄 Report generated: {report_file}")
        
        # Also generate JSON report
        json_file = Path(__file__).parent / "test_report.json"
        with open(json_file, "w", encoding='utf-8') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"📄 JSON report generated: {json_file}")

def main():
    """Main entry point"""
    runner = TestRunner()
    all_passed = runner.run_all_tests()
    
    # Print summary
    summary = runner.results["summary"]
    print("\n" + "=" * 60)
    print("📊 FINAL SUMMARY")
    print("=" * 60)
    print(f"Total Tests: {summary['total_tests']}")
    print(f"Passed: {summary['passed_tests']}")
    print(f"Failed: {summary['failed_tests']}")
    print(f"Success Rate: {summary['success_rate']:.1f}%")
    print(f"Status: {'✅ ALL TESTS PASSED' if all_passed else '❌ SOME TESTS FAILED'}")
    
    # Exit with appropriate code
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()

