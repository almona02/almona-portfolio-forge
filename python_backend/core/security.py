"""Security utilities for enhanced API protection."""

import os
import secrets
from functools import wraps
from flask import request, jsonify
import jwt
from datetime import datetime, timedelta

class SecurityConfig:
    """Security configuration constants."""
    
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', secrets.token_urlsafe(32))
    JWT_ALGORITHM = 'HS256'
    JWT_ACCESS_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_EXPIRES = timedelta(days=30)
    
    # Rate limiting
    RATE_LIMIT_STORAGE_URL = os.getenv('REDIS_URL', 'memory://')
    DEFAULT_RATE_LIMITS = ["100 per hour", "20 per minute"]
    
    # CORS
    ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
    
    # Security headers
    SECURITY_HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'",
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    }

def validate_api_key(api_key: str) -> bool:
    """Validate API key against environment variables."""
    valid_keys = os.getenv('VALID_API_KEYS', '').split(',')
    return api_key in valid_keys

def generate_secure_token(user_id: str) -> str:
    """Generate secure JWT token."""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + SecurityConfig.JWT_ACCESS_EXPIRES,
        'iat': datetime.utcnow(),
        'jti': secrets.token_urlsafe(16)
    }
    return jwt.encode(payload, SecurityConfig.JWT_SECRET_KEY, algorithm=SecurityConfig.JWT_ALGORITHM)

def validate_token(token: str) -> dict:
    """Validate JWT token and return payload."""
    try:
        payload = jwt.decode(token, SecurityConfig.JWT_SECRET_KEY, algorithms=[SecurityConfig.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid token")

def security_headers_middleware(response):
    """Add security headers to all responses."""
    for header, value in SecurityConfig.SECURITY_HEADERS.items():
        response.headers[header] = value
    return response

def sanitize_input(data: str) -> str:
    """Sanitize user input to prevent injection attacks."""
    if not isinstance(data, str):
        return str(data)
    
    # Remove potentially dangerous characters
    dangerous_chars = ['<', '>', '&', '"', "'"]
    for char in dangerous_chars:
        data = data.replace(char, '')
    
    return data.strip()

def validate_file_upload(file) -> bool:
    """Validate uploaded file for security."""
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff'}
    filename = file.filename.lower()
    
    if not any(filename.endswith(ext) for ext in allowed_extensions):
        return False
    
    # Check file size (max 10MB)
    file.seek(0, 2)
    file_size = file.tell()
    file.seek(0)
    
    return file_size <= 10 * 1024 * 1024

def rate_limit_exceeded_handler(request_limit):
    """Custom rate limit exceeded handler."""
    return jsonify({
        'error': 'Rate limit exceeded',
        'message': f'Limit: {request_limit.limit}',
        'retry_after': str(request_limit.retry_after)
    }), 429
