"""
Performance Load Test for YDT Prestige API
"""

import asyncio
import aiohttp
import time
import statistics
from typing import List, Dict
import json
from pathlib import Path

class LoadTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results = []
        
    async def test_single_request(self, session, payload: Dict) -> Dict:
        """Test a single request"""
        start_time = time.time()
        try:
            async with session.post(f"{self.base_url}/api/v1/chat", json=payload) as response:
                end_time = time.time()
                response_time = end_time - start_time
                
                if response.status == 200:
                    data = await response.json()
                    return {
                        "success": True,
                        "response_time": response_time,
                        "confidence": data.get("data", {}).get("confidence", 0),
                        "status_code": response.status
                    }
                else:
                    return {
                        "success": False,
                        "response_time": response_time,
                        "error": f"HTTP {response.status}",
                        "status_code": response.status
                    }
        except Exception as e:
            end_time = time.time()
            return {
                "success": False,
                "response_time": end_time - start_time,
                "error": str(e),
                "status_code": 0
            }
    
    async def run_concurrent_tests(self, num_requests: int = 100, concurrency: int = 10):
        """Run concurrent load test"""
        print(f"🚀 Running load test: {num_requests} requests with {concurrency} concurrent")
        
        payload = {
            "message": "What is the working capacity of AIM 7510?",
            "persona": "professor",
            "language": "en"
        }
        
        connector = aiohttp.TCPConnector(limit=concurrency)
        async with aiohttp.ClientSession(connector=connector) as session:
            tasks = []
            for i in range(num_requests):
                task = self.test_single_request(session, payload)
                tasks.append(task)
            
            results = await asyncio.gather(*tasks)
            self.results = results
            
        return self.analyze_results()
    
    def analyze_results(self) -> Dict:
        """Analyze test results"""
        successful = [r for r in self.results if r["success"]]
        failed = [r for r in self.results if not r["success"]]
        
        if successful:
            response_times = [r["response_time"] for r in successful]
            confidences = [r["confidence"] for r in successful]
            
            analysis = {
                "total_requests": len(self.results),
                "successful": len(successful),
                "failed": len(failed),
                "success_rate": len(successful) / len(self.results) * 100,
                "response_time": {
                    "min": min(response_times),
                    "max": max(response_times),
                    "avg": statistics.mean(response_times),
                    "median": statistics.median(response_times),
                    "p95": statistics.quantiles(response_times, n=20)[18] if len(response_times) >= 20 else max(response_times),
                    "std_dev": statistics.stdev(response_times) if len(response_times) > 1 else 0
                },
                "confidence": {
                    "min": min(confidences),
                    "max": max(confidences),
                    "avg": statistics.mean(confidences),
                    "median": statistics.median(confidences)
                }
            }
        else:
            analysis = {
                "total_requests": len(self.results),
                "successful": 0,
                "failed": len(failed),
                "success_rate": 0
            }
        
        return analysis
    
    def generate_report(self, analysis: Dict):
        """Generate visual report"""
        print("\n" + "="*60)
        print("📊 LOAD TEST REPORT")
        print("="*60)
        
        print(f"Total Requests: {analysis['total_requests']}")
        print(f"Successful: {analysis['successful']}")
        print(f"Failed: {analysis['failed']}")
        print(f"Success Rate: {analysis['success_rate']:.1f}%")
        
        if analysis['successful'] > 0:
            rt = analysis['response_time']
            conf = analysis['confidence']
            
            print(f"\n⏱️ Response Time (seconds):")
            print(f"  Average: {rt['avg']:.3f}s")
            print(f"  Median: {rt['median']:.3f}s")
            print(f"  P95: {rt['p95']:.3f}s")
            print(f"  Min: {rt['min']:.3f}s")
            print(f"  Max: {rt['max']:.3f}s")
            print(f"  Std Dev: {rt['std_dev']:.3f}s")
            
            print(f"\n🎯 Confidence Scores:")
            print(f"  Average: {conf['avg']:.1f}%")
            print(f"  Median: {conf['median']:.1f}%")
            print(f"  Min: {conf['min']:.1f}%")
            print(f"  Max: {conf['max']:.1f}%")
            
            # Performance thresholds
            print(f"\n📈 Performance Assessment:")
            if rt['avg'] < 0.5:
                print("  ✅ Excellent: Average response time < 0.5s")
            elif rt['avg'] < 1.0:
                print("  ✅ Good: Average response time < 1.0s")
            elif rt['avg'] < 1.5:
                print("  ⚠️  Acceptable: Average response time < 1.5s")
            else:
                print("  ❌ Poor: Average response time > 1.5s")
            
            if analysis['success_rate'] >= 99:
                print("  ✅ Excellent: Success rate >= 99%")
            elif analysis['success_rate'] >= 95:
                print("  ✅ Good: Success rate >= 95%")
            elif analysis['success_rate'] >= 90:
                print("  ⚠️  Acceptable: Success rate >= 90%")
            else:
                print("  ❌ Poor: Success rate < 90%")
            
            if conf['avg'] >= 95:
                print("  ✅ Excellent: Average confidence >= 95%")
            elif conf['avg'] >= 90:
                print("  ✅ Good: Average confidence >= 90%")
            elif conf['avg'] >= 85:
                print("  ⚠️  Acceptable: Average confidence >= 85%")
            else:
                print("  ❌ Poor: Average confidence < 85%")
        
        print(f"\n🚀 Gold Tier Status: {'✅ PASS' if analysis.get('success_rate', 0) >= 95 and analysis.get('response_time', {}).get('avg', 10) < 1.2 else '❌ FAIL'}")

async def run_load_test():
    """Run comprehensive load test"""
    tester = LoadTester()
    
    # Test different loads
    test_scenarios = [
        {"requests": 10, "concurrency": 2},   # Light load
        {"requests": 50, "concurrency": 10},  # Medium load
        {"requests": 100, "concurrency": 20}, # Heavy load
    ]
    
    all_results = []
    
    for scenario in test_scenarios:
        print(f"\n{'='*60}")
        print(f"Testing: {scenario['requests']} requests, {scenario['concurrency']} concurrent")
        print('='*60)
        
        results = await tester.run_concurrent_tests(
            num_requests=scenario["requests"],
            concurrency=scenario["concurrency"]
        )
        
        tester.generate_report(results)
        all_results.append({
            "scenario": scenario,
            "results": results
        })
    
    # Save detailed results
    output_file = Path(__file__).parent / "load_test_detailed.json"
    with open(output_file, 'w') as f:
        json.dump(all_results, f, indent=2)
    
    print(f"\n📁 Detailed results saved to: {output_file}")

if __name__ == "__main__":
    # Run health check first
    import requests
    try:
        response = requests.get("http://localhost:8000/api/health", timeout=5)
        if response.status_code == 200:
            print("✅ API is running, starting load tests...")
            asyncio.run(run_load_test())
        else:
            print(f"❌ API health check failed: HTTP {response.status_code}")
    except Exception as e:
        print(f"❌ Cannot connect to API: {e}")
        print("Make sure the API is running on http://localhost:8000")
