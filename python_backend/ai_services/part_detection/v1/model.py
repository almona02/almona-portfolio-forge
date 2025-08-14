"""Part Detection Model v1 - Basic TensorFlow implementation."""

import tensorflow as tf
import numpy as np
from typing import Dict, List, Tuple
import cv2

class PartDetectionModel:
    """Basic part detection model for industrial machinery."""
    
    def __init__(self, model_path: str = None):
        self.model_path = model_path or "models/part_detection_v1.h5"
        self.model = None
        self.input_shape = (224, 224, 3)
        self.class_names = [
            "cutting_blade", "motor", "frame", "control_panel", 
            "safety_guard", "conveyor", "sensor", "fastener"
        ]
        
    def load_model(self) -> None:
        """Load the trained model."""
        try:
            self.model = tf.keras.models.load_model(self.model_path)
            print(f"Model v1 loaded successfully from {self.model_path}")
        except Exception as e:
            print(f"Error loading model: {e}")
            # Fallback to basic architecture
            self._create_basic_model()
    
    def _create_basic_model(self) -> None:
        """Create basic model architecture for testing."""
        self.model = tf.keras.Sequential([
            tf.keras.layers.Conv2D(32, (3, 3), activation='relu', input_shape=self.input_shape),
            tf.keras.layers.MaxPooling2D(2, 2),
            tf.keras.layers.Conv2D(64, (3, 3), activation='relu'),
            tf.keras.layers.MaxPooling2D(2, 2),
            tf.keras.layers.Conv2D(128, (3, 3), activation='relu'),
            tf.keras.layers.MaxPooling2D(2, 2),
            tf.keras.layers.Flatten(),
            tf.keras.layers.Dense(512, activation='relu'),
            tf.keras.layers.Dropout(0.5),
            tf.keras.layers.Dense(len(self.class_names), activation='softmax')
        ])
        
        self.model.compile(
            optimizer='adam',
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
    
    def predict(self, image: np.ndarray) -> Dict[str, float]:
        """Run inference on input image."""
        if self.model is None:
            self.load_model()
            
        processed_image = self._preprocess_image(image)
        predictions = self.model.predict(processed_image)
        
        results = {}
        for i, prob in enumerate(predictions[0]):
            results[self.class_names[i]] = float(prob)
            
        return results
    
    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for model input."""
        if len(image.shape) == 3 and image.shape[2] == 3:
            image = cv2.resize(image, self.input_shape[:2])
            image = image / 255.0
            return np.expand_dims(image, axis=0)
        else:
            raise ValueError("Invalid image format")
    
    def get_model_info(self) -> Dict[str, any]:
        """Get model information for versioning."""
        return {
            "version": "1.0.0",
            "input_shape": self.input_shape,
            "class_names": self.class_names,
            "framework": "TensorFlow",
            "model_path": self.model_path
        }
