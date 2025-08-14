"""Part Detection Model v2 - Enhanced version with improved accuracy and performance."""

import tensorflow as tf
import numpy as np
from typing import Dict, List, Tuple
import cv2

class PartDetectionModelV2:
    """Enhanced part detection model with improved architecture."""
    
    def __init__(self, model_path: str = None):
        self.model_path = model_path or "models/part_detection_v2.h5"
        self.model = None
        self.input_shape = (256, 256, 3)
        self.class_names = [
            "cutting_blade", "motor", "frame", "control_panel", 
            "safety_guard", "conveyor", "sensor", "fastener",
            "hydraulic_system", "electrical_panel", "cooling_system"
        ]
        self.version = "2.0.0"
        
    def load_model(self) -> None:
        """Load the trained model with enhanced architecture."""
        try:
            self.model = tf.keras.models.load_model(self.model_path)
            print(f"Model v2 loaded successfully from {self.model_path}")
        except Exception as e:
            print(f"Error loading model v2: {e}")
            self._create_enhanced_model()
    
    def _create_enhanced_model(self) -> None:
        """Create enhanced model architecture with ResNet backbone."""
        base_model = tf.keras.applications.ResNet50(
            weights='imagenet',
            include_top=False,
            input_shape=self.input_shape
        )
        
        inputs = tf.keras.layers.Input(shape=self.input_shape)
        
        # Data augmentation layers
        x = tf.keras.layers.RandomFlip("horizontal")(inputs)
        x = tf.keras.layers.RandomRotation(0.1)(x)
        x = tf.keras.layers.RandomZoom(0.1)(x)
        
        # Use pre-trained base
        x = base_model(x, training=False)
        x = tf.keras.layers.GlobalAveragePooling2D()(x)
        x = tf.keras.layers.Dense(512, activation='relu')(x)
        x = tf.keras.layers.Dropout(0.3)(x)
        x = tf.keras.layers.Dense(256, activation='relu')(x)
        x = tf.keras.layers.Dropout(0.3)(x)
        outputs = tf.keras.layers.Dense(len(self.class_names), activation='softmax')(x)
        
        self.model = tf.keras.Model(inputs, outputs)
        
        self.model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.0001),
            loss='categorical_crossentropy',
            metrics=['accuracy', 'precision', 'recall']
        )
    
    def predict(self, image: np.ndarray) -> Dict[str, float]:
        """Run inference on input image with enhanced preprocessing."""
        if self.model is None:
            self.load_model()
            
        processed_image = self._preprocess_image(image)
        predictions = self.model.predict(processed_image)
        
        results = {}
        for i, prob in enumerate(predictions[0]):
            results[self.class_names[i]] = float(prob)
            
        return results
    
    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Enhanced preprocessing with normalization."""
        if len(image.shape) == 3 and image.shape[2] == 3:
            image = cv2.resize(image, self.input_shape[:2])
            image = tf.keras.applications.resnet50.preprocess_input(image)
            return np.expand_dims(image, axis=0)
        else:
            raise ValueError("Invalid image format")
    
    def get_model_info(self) -> Dict[str, any]:
        """Get model information for versioning."""
        return {
            "version": self.version,
            "input_shape": self.input_shape,
            "class_names": self.class_names,
            "framework": "TensorFlow",
            "model_path": self.model_path,
            "architecture": "ResNet50 + Custom Head",
            "enhancements": ["Data augmentation", "Transfer learning", "Improved accuracy"]
        }
    
    def benchmark_performance(self, test_images: List[np.ndarray]) -> Dict[str, float]:
        """Benchmark model performance."""
        import time
        
        if self.model is None:
            self.load_model()
        
        start_time = time.time()
        predictions = []
        
        for image in test_images:
            pred = self.predict(image)
            predictions.append(pred)
        
        inference_time = time.time() - start_time
        
        return {
            "total_inference_time": inference_time,
            "avg_inference_time": inference_time / len(test_images),
            "images_processed": len(test_images),
            "fps": len(test_images) / inference_time
        }
