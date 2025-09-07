import pytest
from fastapi import FastAPI
from httpx import AsyncClient
import respx
import importlib.util
from pathlib import Path
from core.config import settings
from core.supabase_client import supabase_client

# dynamically load yilmaz_integration to avoid importing apis.v2 package init
base_path = Path(__file__).parents[1]
yilmaz_path = base_path / 'apis' / 'v2' / 'yilmaz_integration.py'
spec = importlib.util.spec_from_file_location('yilmaz_integration', yilmaz_path)
yilmaz_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(yilmaz_mod)
yilmaz_router = yilmaz_mod.router

# dynamically load auth helpers
auth_path = base_path / 'apis' / 'v2' / 'auth_fastapi.py'
spec2 = importlib.util.spec_from_file_location('auth_fastapi', auth_path)
auth_mod = importlib.util.module_from_spec(spec2)
spec2.loader.exec_module(auth_mod)
create_access_token = auth_mod.create_access_token

app = FastAPI()
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

    assert resp.status_code == 200

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

    monkeypatch.setattr(supabase_client.client, 'table', fake_table)

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

    assert resp.status_code == 200
    assert resp.json().get('machine_id') == 'uuid-machine-1'
