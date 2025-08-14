"""Critical-path tests for Part Detection Model v1."""

import pytest
import numpy as np
import cv2
import os
from ai_services.part_detection.v1.model import PartDetectionModel
from ai_services.part_detection.v1.inference import run_inference

class TestPartDetectionV1:
    """Critical tests for Part Detection v1."""
    
    def test_model_initialization(self):
        """Test model initialization."""
        model = PartDetectionModel()
        assert model is not None
        assert model.version == "1.0.0"
        assert len(model.class_names) == 8
    
    def test_model_loading(self):
        """Test model loading functionality."""
        model = PartDetectionModel()
        model.load_model()
        assert model.model is not None
    
    def test_image_preprocessing(self):
        """Test image preprocessing."""
        from ai_services.part_detection.v1.utils import preprocess_image
        
        # Create dummy image
        dummy_image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        processed = preprocess_image(dummy_image)
        
        assert processed.shape == (224, 224, 3)
        assert np.max(processed) <= 1.0
    
    def test_model_prediction(self):
        """Test model prediction."""
        model = PartDetectionModel()
        model.load_model()
        
        # Create dummy image
        dummy_image = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
        results = model.predict(dummy_image)
        
        assert isinstance(results, dict)
        assert len(results) == 8
        assert all(0 <= prob <= 1 for prob in results.values())
    
    def test_inference_function(self):
        """Test inference function."""
        # Create test image
        test_image_path = "test_image.jpg"
        dummy_image = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
        cv2.imwrite(test_image_path, dummy_image)
        
        try:
            results = run_inference(test_image_path)
            assert isinstance(results, dict)
            assert len(results) == 8
        finally:
            if os.path.exists(test_image_path):
                os.remove(test_image_path)
    
    def test_model_info(self):
        """Test model information retrieval."""
        model = PartDetectionModel()
        info = model.get_model_info()
        
        assert info["version"] == "1.0.0"
        assert info["framework"] == "TensorFlow"
        assert "class_names" in info
        assert len(info["class_names"]) == 8
