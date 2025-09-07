import pytest
from fastapi import status
from httpx import AsyncClient
import respx
from core.config import settings
from apis.v2.yilmaz_integration import router as yilmaz_router
from apis.v2.auth_fastapi import create_access_token
from core.supabase_client import supabase_client, get_supabase_client
from fastapi import FastAPI

# create a minimal app for tests to avoid importing apis.main (heavy deps)
app = FastAPI()
app.include_router(yilmaz_router, prefix="/api/v2")


# include router for tests
app.include_router(yilmaz_router, prefix="/api/v2")


@pytest.mark.asyncio
@respx.mock
async def test_validate_serial_success():
    base = settings.YILMAZ_API_BASE_URL or "https://yilmaz.example"
    respx.post(base + "/validate-serial").respond(200, json={
        "is_valid": True,
        "model_code": "AIM 7420",
        "warranty_status": "valid",
        "production_date": "2022-01-01"
    })

    token = create_access_token({"sub": "test@example.com"})

    async with AsyncClient(app=app, base_url="http://testserver") as ac:
        resp = await ac.post(
            "/api/v2/yilmaz/validate-serial",
            json={"serial_number": "YM-123", "region": "egypt"},
            headers={"Authorization": f"Bearer {token}"}
        )

    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data.get('is_valid') is True


@pytest.mark.asyncio
async def test_register_machine(monkeypatch):
    # simulate supabase insert responses
    class FakeResponse:
        def __init__(self, status_code, data=None, error=None):
            self.status_code = status_code
            self.data = data or []
            self.error = error

    class FakeTable:
        def __init__(self, name):
            self.name = name

        def insert(self, payload):
            return self

        def execute(self):
            return FakeResponse(201, data=[{"id": "uuid-machine-1"}])

    def fake_table(name):
        return FakeTable(name)

    # Provide a fake client via FastAPI dependency override so we don't trigger real client init
    class FakeClient:
        def table(self, name):
            return FakeTable(name)

    app.dependency_overrides[get_supabase_client] = lambda: FakeClient()

    token = create_access_token({"sub": "test@example.com"})

    async with AsyncClient(app=app, base_url="http://testserver") as ac:
        resp = await ac.post(
            "/api/v2/yilmaz/register",
            json={
                "serial_number": "YM-123",
                "region": "egypt",
                "model_code": "AIM 7420",
                "production_date": "2022-01-01",
                "warranty_expiry": "2023-01-01"
            },
            headers={"Authorization": f"Bearer {token}"}
        )

    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data.get('success') is True
    assert data.get('machine_id') == 'uuid-machine-1'
