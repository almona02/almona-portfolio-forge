"""Enhanced inference utilities for Part Detection Model v2."""

import cv2
import numpy as np
from typing import Dict, List, Tuple
from .model import PartDetectionModelV2

def run_inference_v2(image_path: str, confidence_threshold: float = 0.7) -> Dict[str, any]:
    """
    Enhanced inference with confidence filtering and batch processing support.
    
    Args:
        image_path: Path to input image
        confidence_threshold: Minimum confidence threshold for predictions
    
    Returns:
        Dictionary with predictions and metadata
    """
    model = PartDetectionModelV2()
    model.load_model()
    
    image = cv2.imread(image_path)
    if image is None:
        raise FileNotFoundError(f"Image not found at path: {image_path}")
    
    results = model.predict(image)
    
    # Filter results by confidence threshold
    filtered_results = {
        class_name: prob for class_name, prob in results.items()
        if prob >= confidence_threshold
    }
    
    return {
        "predictions": filtered_results,
        "all_predictions": results,
        "confidence_threshold": confidence_threshold,
        "model_version": "2.0.0",
        "top_prediction": max(results.items(), key=lambda x: x[1]) if results else None
    }

def batch_inference(image_paths: List[str], confidence_threshold: float = 0.7) -> List[Dict[str, any]]:
    """Process multiple images in batch."""
    model = PartDetectionModelV2()
    model.load_model()
    
    results = []
    for path in image_paths:
        try:
            result = run_inference_v2(path, confidence_threshold)
            results.append(result)
        except Exception as e:
            results.append({
                "error": str(e),
                "image_path": path
            })
    
    return results
