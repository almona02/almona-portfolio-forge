import time
import requests
import concurrent.futures
import psutil
import os
import tempfile
from PIL import Image
import numpy as np
from typing import List, Dict
import statistics

class PerformanceBenchmark:
    """Performance benchmarking for the API"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.client = requests.Session()
    
    def create_test_image(self, width: int = 640, height: int = 480) -> str:
        """Create a test image file"""
        img = Image.new('RGB', (width, height), color='blue')
        temp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
        img.save(temp_file.name, 'JPEG', quality=85)
        temp_file.close()
        return temp_file.name
    
    def test_health_endpoint_latency(self, num_requests: int = 100) -> Dict:
        """Test health endpoint latency"""
        print(f"Testing health endpoint latency with {num_requests} requests...")
        
        latencies = []
        for _ in range(num_requests):
            start = time.time()
            response = self.client.get(f"{self.base_url}/health")
            end = time.time()
            latencies.append((end - start) * 1000)  # Convert to milliseconds
        
        return {
            "endpoint": "/health",
            "requests": num_requests,
            "avg_latency_ms": statistics.mean(latencies),
            "p95_latency_ms": statistics.quantiles(latencies, n=20)[18],
            "p99_latency_ms": statistics.quantiles(latencies, n=100)[98],
            "min_latency_ms": min(latencies),
            "max_latency_ms": max(latencies)
        }
    
    def test_concurrent_requests(self, num_concurrent: int = 50) -> Dict:
        """Test concurrent request handling"""
        print(f"Testing concurrent request handling with {num_concurrent} requests...")
        
        def make_request():
            return self.client.get(f"{self.base_url}/health")
        
        start = time.time()
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_concurrent) as executor:
            futures = [executor.submit(make_request) for _ in range(num_concurrent)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        end = time.time()
        
        return {
            "concurrent_requests": num_concurrent,
            "total_time_ms": (end - start) * 1000,
            "avg_time_per_request_ms": ((end - start) * 1000) / num_concurrent,
            "successful_requests": len([r for r in results if r.status_code == 200])
        }
    
    def test_throughput_benchmark(self, num_requests: int = 100) -> Dict:
        """Test throughput benchmark"""
        print(f"Testing throughput benchmark with {num_requests} requests...")
        
        start = time.time()
        successful_requests = 0
        
        for _ in range(num_requests):
            response = self.client.get(f"{self.base_url}/health")
            if response.status_code == 200:
                successful_requests += 1
        
        end = time.time()
        
        return {
            "throughput_rps": num_requests / (end - start),
            "successful_requests": successful_requests,
            "total_time_ms": (end - start) * 1000,
            "avg_time_per_request_ms": ((end - start) * 1000) / num_requests
        }
    
    def test_memory_usage(self, num_requests: int = 100) -> Dict:
        """Test memory usage during requests"""
        print(f"Testing memory usage with {num_requests} requests...")
        
        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # Convert to MB
        
        for _ in range(num_requests):
            response = self.client.get(f"{self.base_url}/health")
        
        final_memory = process.memory_info().rss / 1024 / 1024
        
        return {
            "initial_memory_mb": initial_memory,
            "final_memory_mb": final_memory,
            "memory_increase_mb": final_memory - initial_memory,
            "memory_per_request_mb": (final_memory - initial_memory) / num_requests
        }
    
    def run_full_benchmark(self) -> Dict:
        """Run full performance benchmark"""
        print("Running full performance benchmark...")
        
        results = {}
        
        # Test health endpoint latency
        results["health_latency"] = self.test_health_endpoint_latency()
        
        # Test concurrent requests
        results["concurrent_requests"] = self.test_concurrent_requests()
        
        # Test throughput
        results["throughput"] = self.test_throughput_benchmark()
        
        # Test memory usage
        results["memory_usage"] = self.test_memory_usage()
        
        return results
