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
import jwt

from core.database import get_db, get_redis
from core.config import settings
from models.auth_models import Customer, SmsOtp, FacebookAuthToken

router = APIRouter(prefix="/api/auth", tags=["authentication"])
security = HTTPBearer()

JWT_SECRET_KEY = settings.JWT_SECRET_KEY
JWT_ALGORITHM = "HS256"

# Facebook OAuth configuration
FACEBOOK_APP_ID = settings.FACEBOOK_APP_ID
FACEBOOK_APP_SECRET = settings.FACEBOOK_APP_SECRET
FACEBOOK_REDIRECT_URI = settings.FACEBOOK_REDIRECT_URI



class SmsOtpRequest(BaseModel):
    phone_number: str
    country_code: str

class SmsOtpVerify(BaseModel):
    phone_number: str
    country_code: str
    otp: str

class FacebookAuth(BaseModel):
    access_token: str

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

@router.post("/sms/send-otp")
async def send_sms_otp(
    request: SmsOtpRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
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
        
        # Store OTP in database with 5-minute expiration
        new_otp_entry = SmsOtp(
            id=secrets.token_urlsafe(16),
            phone_number=request.phone_number,
            country_code=request.country_code,
            otp=otp,
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(minutes=5)
        )
        db.add(new_otp_entry)
        await db.commit()
        await db.refresh(new_otp_entry)
        
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
        
        
        # Get stored OTP from DB
        result = await db.execute(
            select(SmsOtp).where(
                SmsOtp.phone_number == request.phone_number,
                SmsOtp.country_code == request.country_code,
                SmsOtp.otp == request.otp,
                SmsOtp.is_used == False,
                SmsOtp.expires_at > datetime.utcnow()
            ).order_by(SmsOtp.created_at.desc())
        )
        otp_entry = result.scalar_one_or_none()

        if not otp_entry:
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired OTP"
            )
        
        # Mark OTP as used
        otp_entry.is_used = True
        await db.commit()

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
                country_code=request.country_code,
                phone_number=request.phone_number,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(new_user)
            await db.commit()
            await db.refresh(new_user)
            user = new_user

        # Clean up OTP from Redis (if it was stored there for rate limiting)
        otp_key = f"otp:{request.country_code}{request.phone_number}"
        await redis_client.delete(otp_key)

        # Generate JWT token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.id}, expires_delta=access_token_expires
        )

        return {
            "success": True,
            "user_id": user.id,
            "message": "Phone number verified successfully",
            "access_token": access_token,
            "token_type": "bearer"
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}"))

@router.get("/facebook/login")
async def facebook_login(redis_client: redis.Redis = Depends(get_redis)):
    """Initiate Facebook OAuth login"""
    state = secrets.token_urlsafe(16)
    await redis_client.setex(f"facebook_oauth_state:{state}", 300, "valid")  # 5-minute expiry
    facebook_auth_url = (
        f"https://www.facebook.com/v18.0/dialog/oauth?"
        f"client_id={FACEBOOK_APP_ID}&redirect_uri={FACEBOOK_REDIRECT_URI}&state={state}&scope=email,public_profile"
    )
    return {"url": facebook_auth_url}

@router.get("/facebook/callback")
async def facebook_callback(
    state: str,
    code: str,
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis)
):
    """Handle Facebook OAuth callback"""
    try:
        # Verify CSRF state
        stored_state = await redis_client.get(f"facebook_oauth_state:{state}")
        if not stored_state or stored_state.decode() != "valid":
            raise HTTPException(status_code=400, detail="Invalid or expired state parameter")
        await redis_client.delete(f"facebook_oauth_state:{state}")

        # Exchange code for access token
        async with httpx.AsyncClient() as client:
            token_response = await client.get(
                "https://graph.facebook.com/v18.0/oauth/access_token",
                params={
                    "client_id": FACEBOOK_APP_ID,
                    "redirect_uri": FACEBOOK_REDIRECT_URI,
                    "client_secret": FACEBOOK_APP_SECRET,
                    "code": code
                }
            )
            token_response.raise_for_status()
            access_token_data = token_response.json()
            access_token = access_token_data["access_token"]
            expires_in = access_token_data.get("expires_in", 0)
            token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

            # Get user info
            user_info_response = await client.get(
                "https://graph.facebook.com/me",
                params={
                    "fields": "id,name,email,picture",
                    "access_token": access_token
                }
            )
            user_info_response.raise_for_status()
            fb_data = user_info_response.json()
        
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
            await db.refresh(new_user)
            user = new_user
        
        # Store or update Facebook access token
        facebook_token = await db.execute(
            select(FacebookAuthToken).where(FacebookAuthToken.facebook_id == fb_data["id"])
        )
        facebook_token = facebook_token.scalar_one_or_none()

        if facebook_token:
            facebook_token.access_token = access_token
            facebook_token.token_expires_at = token_expires_at
            facebook_token.updated_at = datetime.utcnow()
        else:
            facebook_token = FacebookAuthToken(
                id=secrets.token_urlsafe(16),
                user_id=user.id,
                facebook_id=fb_data["id"],
                access_token=access_token,
                token_expires_at=token_expires_at,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(facebook_token)
        await db.commit()
        await db.refresh(facebook_token)

        # Generate JWT token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        jwt_token = create_access_token(
            data={"sub": user.id}, expires_delta=access_token_expires
        )
        
        return {
            "success": True,
            "user_id": user.id,
            "message": "Facebook authentication successful",
            "access_token": jwt_token,
            "token_type": "bearer",
            "user_data": {
                "name": user.name,
                "email": user.email,
                "avatar_url": user.avatar_url
            }
        }
        
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"Facebook API error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

from twilio.rest import Client

# Initialize Twilio client
twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

async def send_sms(to: str, message: str) -> bool:
    """Send SMS using Twilio"""
    try:
        message = twilio_client.messages.create(
            to=to,
            from_=TWILIO_PHONE_NUMBER,
            body=message
        )
        return message.sid is not None
    except Exception as e:
        print(f"Error sending SMS: {e}")
        return False
