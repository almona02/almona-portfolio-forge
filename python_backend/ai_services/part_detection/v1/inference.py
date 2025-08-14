"""Inference utilities for Part Detection Model v1."""

import cv2
import numpy as np
from .model import PartDetectionModel

def run_inference(image_path: str) -> dict:
    """Load image and run part detection inference."""
    model = PartDetectionModel()
    model.load_model()
    
    image = cv2.imread(image_path)
    if image is None:
        raise FileNotFoundError(f"Image not found at path: {image_path}")
    
    results = model.predict(image)
    return results
