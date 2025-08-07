"""
Authentication models for multi-method authentication
"""
from sqlalchemy import Column, String, DateTime, Boolean, Text, Integer
from sqlalchemy.sql import func
from sqlalchemy.ext.declive_base import declarative_base

Base = declarative_base()

class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(String(50), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(255))
    company = Column(String(255))
    phone_number = Column(String(20))
    country_code = Column(String(5))
    phone_hash = Column(String(64), unique=True)
    facebook_id = Column(String(50), unique=True)
    google_id = Column(String(50), unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_verified = Column(Boolean, default=False)
    avatar_url = Column(Text)

class SmsOtp(Base):
    __tablename__ = "sms_otps"
    
    id = Column(String(50), primary_key=True)
    phone_number = Column(String(20), nullable=False)
    country_code = Column(String(5), nullable=False)
    otp = Column(String(6), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False)
    attempts = Column(Integer, default=0)

class FacebookAuthToken(Base):
    __tablename__ = "facebook_auth_tokens"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), nullable=False)
    facebook_id = Column(String(50), unique=True, nullable=False)
    access_token = Column(Text, nullable=False)
    token_expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
