"""Part Detection API v2 with enhanced security and versioning."""

from flask import Blueprint, request, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from functools import wraps
import jwt
from datetime import datetime, timedelta
import os
from ai_services.part_detection.v2.inference import run_inference_v2, batch_inference
from ai_services.part_detection.v2.model import PartDetectionModelV2

part_detection_bp = Blueprint('part_detection_v2', __name__, url_prefix='/api/v2')

# Rate limiting
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100 per hour", "20 per minute"]
)

def require_api_key(f):
    """Decorator to require valid API key."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        if not api_key or not validate_api_key(api_key):
            return jsonify({'error': 'Invalid API key'}), 401
        return f(*args, **kwargs)
    return decorated_function

def validate_api_key(api_key: str) -> bool:
    """Validate API key against environment variables."""
    valid_keys = os.getenv('VALID_API_KEYS', '').split(',')
    return api_key in valid_keys

@part_detection_bp.route('/detect', methods=['POST'])
@limiter.limit("10 per minute")
@require_api_key
def detect_parts():
    """Enhanced part detection endpoint with security."""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        image_file = request.files['image']
        if not image_file.filename:
            return jsonify({'error': 'No image selected'}), 400
        
        # Save uploaded file
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_file:
            image_file.save(tmp_file.name)
            
            # Run inference
            confidence = float(request.form.get('confidence', 0.7))
            results = run_inference_v2(tmp_file.name, confidence)
            
            # Clean up
            os.unlink(tmp_file.name)
            
            return jsonify({
                'success': True,
                'data': results,
                'timestamp': datetime.utcnow().isoformat(),
                'api_version': '2.0.0'
            })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@part_detection_bp.route('/batch-detect', methods=['POST'])
@limiter.limit("5 per minute")
@require_api_key
def batch_detect_parts():
    """Batch processing endpoint for multiple images."""
    try:
        if 'images' not in request.files:
            return jsonify({'error': 'No images provided'}), 400
        
        files = request.files.getlist('images')
        if len(files) > 10:
            return jsonify({'error': 'Maximum 10 images allowed'}), 400
        
        import tempfile
        image_paths = []
        
        for file in files:
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_file:
                file.save(tmp_file.name)
                image_paths.append(tmp_file.name)
        
        confidence = float(request.form.get('confidence', 0.7))
        results = batch_inference(image_paths, confidence)
        
        # Clean up
        for path in image_paths:
            os.unlink(path)
        
        return jsonify({
            'success': True,
            'data': results,
            'processed_count': len(results),
            'timestamp': datetime.utcnow().isoformat(),
            'api_version': '2.0.0'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@part_detection_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'version': '2.0.0',
        'timestamp': datetime.utcnow().isoformat()
    })

@part_detection_bp.route('/model-info', methods=['GET'])
def model_info():
    """Get model information."""
    model = PartDetectionModelV2()
    return jsonify({
        'success': True,
        'data': model.get_model_info()
    })
