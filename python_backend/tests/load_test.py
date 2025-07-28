#!/usr/bin/env python3
"""
Load testing script using Locust
Run with: locust -f load_test.py --host=http://localhost:8000
"""

from locust import HttpUser, task, between
import random
import json

class AlmonaAPIUser(HttpUser):
    """Load test user for Almona API"""
    
    wait_time = between(1, 3)
    
    @task(3)
    def health_check(self):
        self.client.get("/health")
    
    @task(2)
    def get_products(self):
        self.client.get("/api/products")
    
    @task(1)
    def post_contact(self):
        payload = {
            "name": "Test User",
            "email": "testuser@example.com",
            "message": "This is a load test message."
        }
        self.client.post("/api/contact", json=payload)
    
    @task(1)
    def search(self):
        queries = ["machine", "fabrication", "cutting", "welding"]
        query = random.choice(queries)
        self.client.get(f"/api/search?q={query}")
