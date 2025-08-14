import pytest
from httpx import AsyncClient
from main import app  # Assuming main.py is in the same directory as tests
from models.api_v1_models import PartDetectionResponse, GetModelsResponse
from models.api_v2_models import PartDetectionResponse as V2PartDetectionResponse, \
    BatchPartDetectionResponse as V2BatchPartDetectionResponse, \
    HealthCheckResponse as V2HealthCheckResponse, \
    GetModelInfoResponse as V2GetModelInfoResponse

# Assuming a test image exists for upload
TEST_IMAGE_PATH = "public/images/machines/cutting-machine.jpg"
# Assuming a valid API key for v2 endpoints
V2_API_KEY = "your-secret-api-key" # Replace with a valid API key from your .env

@pytest.mark.asyncio
async def test_v1_identify_part_contract():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        with open(TEST_IMAGE_PATH, "rb") as f:
            response = await ac.post("/api/v1/part-detection/identify-part", files={"image": f})
    
    assert response.status_code == 200
    # Validate response against Pydantic model
    PartDetectionResponse(**response.json())

@pytest.mark.asyncio
async def test_v1_get_models_contract():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/v1/part-detection/models")
    
    assert response.status_code == 200
    # Validate response against Pydantic model
    GetModelsResponse(**response.json())

@pytest.mark.asyncio
async def test_v2_detect_contract():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        with open(TEST_IMAGE_PATH, "rb") as f:
            response = await ac.post(
                "/api/v2/part-detection/detect", 
                files={"image": f}, 
                headers={"X-API-Key": V2_API_KEY}
            )
    
    assert response.status_code == 200
    # Validate response against Pydantic model
    V2PartDetectionResponse(**response.json())

@pytest.mark.asyncio
async def test_v2_batch_detect_contract():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        files = [("images", open(TEST_IMAGE_PATH, "rb")), ("images", open(TEST_IMAGE_PATH, "rb"))]
        response = await ac.post(
            "/api/v2/part-detection/batch-detect", 
            files=files, 
            headers={"X-API-Key": V2_API_KEY}
        )
    
    assert response.status_code == 200
    # Validate response against Pydantic model
    V2BatchPartDetectionResponse(**response.json())

@pytest.mark.asyncio
async def test_v2_health_contract():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/v2/part-detection/health")
    
    assert response.status_code == 200
    # Validate response against Pydantic model
    V2HealthCheckResponse(**response.json())

@pytest.mark.asyncio
async def test_v2_model_info_contract():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/v2/part-detection/model-info")
    
    assert response.status_code == 200
    # Validate response against Pydantic model
    V2GetModelInfoResponse(**response.json())