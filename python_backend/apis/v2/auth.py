"""Enhanced authentication endpoints for API v2."""

from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
from datetime import datetime, timedelta
import os
from werkzeug.security import check_password_hash, generate_password_hash
import uuid

auth_bp = Blueprint('auth_v2', __name__, url_prefix='/api/v2/auth')

# JWT configuration
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key')
JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

def generate_tokens(user_id):
    """Generate access and refresh tokens."""
    access_payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + JWT_ACCESS_TOKEN_EXPIRES,
        'type': 'access'
    }
    
    refresh_payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + JWT_REFRESH_TOKEN_EXPIRES,
        'type': 'refresh'
    }
    
    access_token = jwt.encode(access_payload, JWT_SECRET_KEY, algorithm='HS256')
    refresh_token = jwt.encode(refresh_payload, JWT_SECRET_KEY, algorithm='HS256')
    
    return access_token, refresh_token

def token_required(f):
    """Decorator to require valid JWT token."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(' ')[1]
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            data = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
            current_user = data['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

@auth_bp.route('/login', methods=['POST'])
def login():
    """Enhanced login with refresh tokens."""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        # Validate credentials (mock implementation)
        if username == 'admin' and password == 'password':
            access_token, refresh_token = generate_tokens('admin')
            
            return jsonify({
                'success': True,
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': {
                    'id': 'admin',
                    'username': username
                }
            })
        
        return jsonify({'message': 'Invalid credentials'}), 401
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/refresh', methods=['POST'])
def refresh_token():
    """Refresh access token using refresh token."""
    try:
        data = request.get_json()
        refresh_token = data.get('refresh_token')
        
        if not refresh_token:
            return jsonify({'message': 'Refresh token is missing'}), 401
        
        data = jwt.decode(refresh_token, JWT_SECRET_KEY, algorithms=['HS256'])
        
        if data['type'] != 'refresh':
            return jsonify({'message': 'Invalid token type'}), 401
        
        # Generate new tokens
        access_token, new_refresh_token = generate_tokens(data['user_id'])
        
        return jsonify({
            'success': True,
            'access_token': access_token,
            'refresh_token': new_refresh_token
        })
        
    except jwt.ExpiredSignatureError:
        return jsonify({'message': 'Refresh token has expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'message': 'Invalid refresh token'}), 401

@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout(current_user):
    """Logout endpoint to invalidate tokens."""
    return jsonify({
        'success': True,
        'message': 'Logged out successfully'
    })

@auth_bp.route('/verify', methods=['GET'])
@token_required
def verify_token(current_user):
    """Verify token validity."""
    return jsonify({
        'success': True,
        'user_id': current_user,
        'valid': True
    })
