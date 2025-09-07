import pytest
from httpx import AsyncClient
from main import app
import asyncio

# Assuming a test image exists for upload
TEST_IMAGE_PATH = "public/images/machines/cutting-machine.jpg"
# Assuming a valid API key for v2 endpoints
V2_API_KEY = "your-secret-api-key" # Replace with a valid API key from your .env

@pytest.mark.asyncio
async def test_v1_identify_part_latency_simulation():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Simulate network latency by adding a delay before the request
        await asyncio.sleep(0.1) # 100ms delay
        with open(TEST_IMAGE_PATH, "rb") as f:
            response = await ac.post("/api/v1/part-detection/identify-part", files={"image": f})
    
    assert response.status_code == 200
    assert "success" in response.json()

@pytest.mark.asyncio
async def test_v2_detect_latency_simulation():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Simulate network latency by adding a delay before the request
        await asyncio.sleep(0.1) # 100ms delay
        with open(TEST_IMAGE_PATH, "rb") as f:
            response = await ac.post(
                "/api/v2/part-detection/detect", 
                files={"image": f}, 
                headers={"X-API-Key": V2_API_KEY}
            )
    
    assert response.status_code == 200
    assert "success" in response.json()

@pytest.mark.asyncio
async def test_v1_identify_part_error_simulation():
    # This test requires modifying the application's behavior to inject errors.
    # For a real chaos engineering setup, you would use tools like Toxiproxy or a custom middleware.
    # For this example, we'll just assert that a 500 error is handled.
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # In a real scenario, you'd have a mechanism to trigger an internal server error
        # For demonstration, we'll just make a request that we expect to fail if the API is robust
        # This is a placeholder and needs actual error injection logic
        with open(TEST_IMAGE_PATH, "rb") as f:
            response = await ac.post("/api/v1/part-detection/identify-part?simulate_error=true", files={"image": f})
    
    # Assert that the API returns a 500 error (or whatever error code is expected for the injected fault)
    assert response.status_code == 500
    assert "detail" in response.json()

@pytest.mark.asyncio
async def test_v2_detect_error_simulation():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        with open(TEST_IMAGE_PATH, "rb") as f:
            response = await ac.post(
                "/api/v2/part-detection/detect?simulate_error=true", 
                files={"image": f}, 
                headers={"X-API-Key": V2_API_KEY}
            )
    
    assert response.status_code == 500
    assert "detail" in response.json()
