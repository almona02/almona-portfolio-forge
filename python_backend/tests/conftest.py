import pytest
import tempfile
import os
import sys
import types
import importlib.machinery
from PIL import Image
import numpy as np
from unittest.mock import Mock
from fastapi.testclient import TestClient


def _stub_module(name: str):
    """Install a lightweight stub module with a valid __spec__ to prevent import errors."""
    mod = types.ModuleType(name)
    mod.__spec__ = importlib.machinery.ModuleSpec(name, loader=None)
    sys.modules[name] = mod


# Mock heavy/unused ML deps before importing the app to avoid long load times and tf spec errors
sys.modules['ultralytics'] = Mock()
_stub_module('tensorflow')
_stub_module('torchvision')
_stub_module('torchvision.transforms')
_stub_module('torchvision.ops')
_stub_module('torchvision.models')
_stub_module('easyocr')

# Import after mocking to avoid long load times
from apis.main import app  # noqa: E402


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
