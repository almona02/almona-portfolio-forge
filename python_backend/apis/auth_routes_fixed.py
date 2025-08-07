"""
Authentication routes for multi-method authentication
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update
from pydantic import BaseModel, EmailStr
import httpx
import secrets
import redis.asyncio as redis
from datetime import datetime, timedelta
import hashlib

from core.database import get_db, get_redis
from core.config import settings

router = APIRouter(prefix="/api/auth", tags=["authentication"])
security = HTTPBearer()

# Facebook OAuth configuration
FACEBOOK_APP_ID = settings.FACEBOOK_APP_ID
FACEBOOK_APP_SECRET = settings.FACEBOOK_APP_SECRET
FACEBOOK_REDIRECT_URI = settings.FACEBOOK_REDIRECT_URI

# SMS configuration
SMS_API_KEY = settings.SMS_API_KEY
SMS_API_URL = settings.SMS_API_URL

class SmsOtpRequest(BaseModel):
    phone_number: str
    country_code: str

class SmsOtpVerify(BaseModel):
    phone_number: str
    country_code: str
    otp: str

class FacebookAuth(BaseModel):
    access_token: str

@router.post("/sms/send-otp")
async def send_sms_otp(
    request: SmsOtpRequest,
    background_tasks: BackgroundTasks,
    redis_client: redis.Redis = Depends(get_redis)
):
    """Send SMS OTP for phone number authentication"""
    try:
        # Rate limiting - max 3 attempts per phone number per hour
        rate_key = f"otp_rate_limit:{request.country_code}{request.phone_number}"
        attempts = await redis_client.incr(rate_key)
        if attempts == 1:
            await redis_client.expire(rate_key, 3600)  # 1 hour
        
        if attempts > 3:
            raise HTTPException(
                status_code=429,
                detail="Too many OTP requests. Please try again later."
            )
        
        # Generate 6-digit OTP
        otp = f"{secrets.randbelow(1000000):06d}"
        
        # Store OTP with 5-minute expiration
        otp_key = f"otp:{request.country_code}{request.phone_number}"
        await redis_client.setex(otp_key, 300, otp)  # 5 minutes
        
        # Send SMS via background task
        background_tasks.add_task(
            send_sms,
            f"{request.country_code}{request.phone_number}",
            f"Your Almona verification code is: {otp}. Valid for 5 minutes."
        )
        
        return {
            "success": True,
            "message": "OTP sent successfully",
            "expires_in": 300
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sms/verify-otp")
async def verify_sms_otp(
    request: SmsOtpVerify,
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis)
):
    """Verify SMS OTP and authenticate user"""
    try:
        # Get stored OTP
        otp_key = f"otp:{request.country_code}{request.phone_number}"
        stored_otp = await redis_client.get(otp_key)
        
        if not stored_otp:
            raise HTTPException(
                status_code=400,
                detail="OTP expired or not found"
            )
        
        if stored_otp != request.otp:
            raise HTTPException(
                status_code=400,
                detail="Invalid OTP"
            )
        
        # OTP is valid, create or get user
        phone_hash = hashlib.sha256(f"{request.country_code}{request.phone_number}".encode()).hexdigest()
        
        # Check if user exists
        result = await db.execute(
            select(Customer).where(Customer.phone_hash == phone_hash)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            # Create new user
            new_user = Customer(
                id=secrets.token_urlsafe(16),
                phone_hash=phone_hash,
                phone_number=request.phone_number,
                country_code=request.country_code,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            db.add(new_user)
            await db.commit()
            user = new_user
        
        # Clean up OTP
        await redis_client.delete(otp_key)
        
        return {
            "success": True,
            "user_id": user.id,
            "message": "Phone number verified successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/facebook/callback")
async def facebook_callback(
    request: FacebookAuth,
    db: AsyncSession = Depends(get_db)
):
    """Handle Facebook OAuth callback"""
    try:
        # Verify Facebook access token
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://graph.facebook.com/me",
                params={
                    "fields": "id,name,email,picture",
                    "access_token": request.access_token
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid Facebook access token"
                )
            
            fb_data = response.json()
        
        # Check if user exists
        result = await db.execute(
            select(Customer).where(Customer.facebook_id == fb_data["id"])
        )
        user = result.scalar_one_or_none()
        
        if not user:
            # Create new user
            new_user = Customer(
                id=secrets.token_urlsafe(16),
                facebook_id=fb_data["id"],
                email=fb_data.get("email"),
                name=fb_data.get("name"),
                avatar_url=fb_data.get("picture", {}).get("data", {}).get("url"),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            db.add(new_user)
            await db.commit()
            user = new_user
        
        return {
            "success": True,
            "user_id": user.id,
            "user_data": {
                "name": user.name,
                "email": user.email,
                "avatar_url": user.avatar_url
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def send_sms(to: str, message: str) -> bool:
    """Send SMS using configured SMS service"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                SMS_API_URL,
                json={
                    "to": to,
                    "message": message
                },
                headers={
                    "Authorization": f"Bearer {SMS_API_KEY}",
                    "Content-Type": "application/json"
                }
            )
            return response.status_code == 200
    except Exception:
        return False
