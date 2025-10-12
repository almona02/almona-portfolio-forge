import pytest
import tempfile
import os
from PIL import Image
import numpy as np
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient

# Mock ML models before importing the app to avoid long load times
import sys
sys.modules['ultralytics'] = Mock()
sys.modules['tensorflow'] = Mock()

from apis.main import app

@pytest.fixture
def client():
    """Create a test client for the FastAPI app"""
    return TestClient(app)

@pytest.fixture
def sample_image():
    """Create a sample test image"""
    # Create a simple test image
    img = Image.new('RGB', (640, 480), color='red')
    
    # Save to temporary file
    temp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
    img.save(temp_file.name, 'JPEG')
    temp_file.close()
    
    yield temp_file.name
    
    # Cleanup
    os.unlink(temp_file.name)

@pytest.fixture
def large_image():
    """Create a large test image (>15MB)"""
    # Create a large image array
    large_array = np.random.randint(0, 255, (4000, 4000, 3), dtype=np.uint8)
    img = Image.fromarray(large_array)
    
    # Save to temporary file
    temp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
    img.save(temp_file.name, 'JPEG', quality=95)
    temp_file.close()
    
    yield temp_file.name
    
    # Cleanup
    os.unlink(temp_file.name)

@pytest.fixture
def invalid_file():
    """Create an invalid file for testing"""
    temp_file = tempfile.NamedTemporaryFile(suffix='.txt', delete=False)
    temp_file.write(b"This is not an image file")
    temp_file.close()
    
    yield temp_file.name
    
    # Cleanup
    os.unlink(temp_file.name)
