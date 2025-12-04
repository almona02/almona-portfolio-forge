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

    @task(2)
    def heavy_cutting_optimization(self):
        """
        Exercise the Python heavy optimization endpoint with a realistic
        batch of cuts and stock bars to validate performance under load.
        """
        cuts = [
            {
                "id": f"cut-{i}",
                "length_mm": random.randint(400, 2400),
                "quantity": random.randint(1, 4),
                "priority": random.randint(1, 3),
                "profile_id": "profile-60mm",
                "allow_defects": False,
            }
            for i in range(40)
        ]

        stock = [
            {
                "id": "bar-6000",
                "length_mm": 6000,
                "quantity": 10,
                "cost_per_unit": 120.0,
                "is_remnant": False,
                "profile_id": "profile-60mm",
            },
            {
                "id": "rem-4500",
                "length_mm": 4500,
                "quantity": 4,
                "cost_per_unit": 60.0,
                "is_remnant": True,
                "profile_id": "profile-60mm",
            },
        ]

        payload = {
            "cuts": cuts,
            "stock": stock,
            "objective": "balanced",
            "kerf_width_mm": 3.0,
            "min_usable_remnant_mm": 100.0,
            "time_limit_seconds": 10.0,
            "workshop_id": "load-test-workshop",
            "project_ids": ["LT-1", "LT-2"],
        }

        self.client.post(
            "/api/v2/heavy/optimize/cutting",
            data=json.dumps(payload),
            headers={"Content-Type": "application/json"},
        )