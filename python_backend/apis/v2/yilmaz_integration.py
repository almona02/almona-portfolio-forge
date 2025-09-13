from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
import httpx
import os
from core.config import settings
from apis.v2.auth_fastapi import get_current_user
from typing import Optional
from core.supabase_client import get_supabase_client
from datetime import datetime

router = APIRouter()


class ValidateSerialRequest(BaseModel):
    serial_number: str
    region: str


class ValidateSerialResponse(BaseModel):
    is_valid: bool
    model_code: Optional[str] = None
    warranty_status: Optional[str] = None
    production_date: Optional[str] = None


class RegisterMachineRequest(BaseModel):
    serial_number: str
    region: str
    model_code: Optional[str]
    production_date: Optional[str]
    warranty_expiry: Optional[str]


class RegisterMachineResponse(BaseModel):
    success: bool
    machine_id: Optional[str]


@router.post("/yilmaz/validate-serial", response_model=ValidateSerialResponse)
async def validate_serial(payload: ValidateSerialRequest, request: Request, current_user=Depends(get_current_user)):
    """Validate a Yilmaz machine serial with the official Yilmaz API.

    Expects environment variables: YILMAZ_API_BASE_URL, YILMAZ_API_KEY
    """
    base_url = os.getenv("YILMAZ_API_BASE_URL") or settings.YILMAZ_API_BASE_URL
    api_key = os.getenv("YILMAZ_API_KEY") or settings.YILMAZ_API_KEY

    if payload.region not in ("egypt", "turkey"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid region")

    if not base_url or not api_key:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Yilmaz integration not configured")

    url = base_url.rstrip("/") + "/validate-serial"

    json_body = {"serial_number": payload.serial_number, "region": payload.region}

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(url, json=json_body, headers=headers)
        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail=f"Upstream request failed: {exc}")

    if resp.status_code >= 500:
        raise HTTPException(status_code=502, detail="Yilmaz service error")

    if resp.status_code == 404:
        return {"is_valid": False}

    if resp.status_code >= 400:
        # bubble client errors as bad request
        raise HTTPException(status_code=400, detail=f"Yilmaz API returned {resp.status_code}")

    data = resp.json()
    # expected keys: is_valid, model_code, warranty_status, production_date
    return {
        "is_valid": bool(data.get("is_valid", False)),
        "model_code": data.get("model_code"),
        "warranty_status": data.get("warranty_status"),
        "production_date": data.get("production_date"),
    }



@router.post("/yilmaz/register", response_model=RegisterMachineResponse)
async def register_machine(
    payload: RegisterMachineRequest,
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase_client),
):
    """Create a machine record and initial yilmaz_service_history entry in Supabase.

    This uses the service-role Supabase client (configured with SUPABASE_SERVICE_KEY) to bypass RLS where needed.
    """
    try:
        # Insert machine into machines table
        machine_payload = {
            "serial": payload.serial_number,
            "yilmaz_model_code": payload.model_code,
            "production_date": payload.production_date,
            "official_warranty_expiry": payload.warranty_expiry,
            "region": payload.region,
            # user_id / owner mapping - assumes current_user contains username/email in TokenData
            "owner_id": current_user.username
        }

        insert_resp = supabase.table('machines').insert(machine_payload).execute()
        if insert_resp.status_code not in (200, 201):
            raise Exception(f"Failed to insert machine: {insert_resp.status_code} {getattr(insert_resp, 'error', None)}")

        machine_id = None
        if getattr(insert_resp, 'data', None) and len(insert_resp.data) > 0:
            machine_id = insert_resp.data[0].get('id')

        # Create initial service history entry
        if machine_id:
            history_payload = {
                "machine_id": machine_id,
                "service_date": datetime.utcnow().date().isoformat(),
                "service_type": "initial_registration",
                "yilmaz_tech_id": None,
                "official_service_code": None,
                "parts_used": None,
                "service_report": "Registered via YMSES integration",
            }
            hist_resp = supabase.table('yilmaz_service_history').insert(history_payload).execute()
            if getattr(hist_resp, 'status_code', None) not in (200, 201):
                # log but continue
                pass

        return {"success": True, "machine_id": machine_id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
